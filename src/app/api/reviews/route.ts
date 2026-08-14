import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Review from "@/lib/models/Review";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";

const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().min(10).max(2000),
  images: z.array(z.string().url()).max(5).optional(),
});

/**
 * GET /api/reviews?productId=xxx
 * Public: returns approved reviews for a product.
 */
export async function GET(request: NextRequest) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  await dbConnect();

  const reviews = await Review.find({ productId, status: "approved" })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Get user names
  const User = (await import("@/lib/models/User")).default;
  const userIds = [...new Set(reviews.map((r) => r.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("name image").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), { name: u.name, image: u.image }]));

  return NextResponse.json(
    reviews.map((r) => {
      const user = userMap.get(r.userId.toString());
      return {
        _id: r._id.toString(),
        rating: r.rating,
        title: r.title || "",
        content: r.content,
        images: r.images || [],
        isVerifiedPurchase: r.isVerifiedPurchase,
        helpfulCount: r.helpfulCount,
        authorName: user?.name || "Anonymous",
        authorImage: user?.image || null,
        adminResponse: r.adminResponse || null,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );
}

/**
 * POST /api/reviews
 * Auth required. Verified-purchase gated.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to leave a review" }, { status: 401 });
  }

  const body = await request.json();
  const validation = createReviewSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid review data", details: validation.error.flatten() }, { status: 400 });
  }

  const data = validation.data;
  await dbConnect();

  // Check for verified purchase
  const order = await Order.findOne({
    userId: session.user.id,
    "lines.productId": data.productId,
    paymentStatus: { $in: ["paid", "partially_refunded"] },
    status: { $nin: ["cancelled"] },
  });

  if (!order) {
    return NextResponse.json(
      { error: "You can only review products you have purchased" },
      { status: 403 }
    );
  }

  // Check for existing review
  const existing = await Review.findOne({
    productId: data.productId,
    userId: session.user.id,
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already reviewed this product" },
      { status: 409 }
    );
  }

  const review = await Review.create({
    productId: data.productId,
    userId: session.user.id,
    orderId: order._id,
    rating: data.rating,
    title: data.title,
    content: data.content,
    images: data.images || [],
    isVerifiedPurchase: true,
    status: "approved", // Auto-approve verified purchases
  });

  // Recompute product avgRating and reviewCount
  await recomputeProductRating(data.productId);

  return NextResponse.json({ _id: review._id.toString(), success: true });
}

async function recomputeProductRating(productId: string) {
  const stats = await Review.aggregate([
    { $match: { productId: { $eq: productId }, status: "approved" } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const { avgRating = 0, reviewCount = 0 } = stats[0] || {};

  await Product.findByIdAndUpdate(productId, {
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount,
  });
}
