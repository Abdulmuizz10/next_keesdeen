import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Review from "@/lib/models/Review";
import Product from "@/lib/models/Product";
import User from "@/lib/models/User";

export async function GET() {
  await requireRouteAccess("/admin/reviews");
  await dbConnect();

  const reviews = await Review.find().sort({ createdAt: -1 }).limit(200).lean();

  const userIds = [...new Set(reviews.map((r) => r.userId.toString()))];
  const productIds = [...new Set(reviews.map((r) => r.productId.toString()))];

  const [users, products] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("name email").lean(),
    Product.find({ _id: { $in: productIds } }).select("title slug").lean(),
  ]);

  const userMap = new Map(users.map((u) => [u._id.toString(), { name: u.name, email: u.email }]));
  const productMap = new Map(products.map((p) => [p._id.toString(), { title: p.title, slug: p.slug }]));

  return NextResponse.json(
    reviews.map((r) => ({
      _id: r._id.toString(),
      productId: r.productId.toString(),
      productTitle: productMap.get(r.productId.toString())?.title || "Unknown",
      productSlug: productMap.get(r.productId.toString())?.slug || "",
      userId: r.userId.toString(),
      userName: userMap.get(r.userId.toString())?.name || "Unknown",
      userEmail: userMap.get(r.userId.toString())?.email || "",
      rating: r.rating,
      title: r.title || "",
      content: r.content,
      images: r.images || [],
      isVerifiedPurchase: r.isVerifiedPurchase,
      status: r.status,
      helpfulCount: r.helpfulCount,
      reportCount: r.reportCount,
      adminResponse: r.adminResponse || "",
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

export async function PATCH(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/reviews");
  if (permission === "read") return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const { _id, status, adminResponse } = await request.json();

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (adminResponse !== undefined) {
    updates.adminResponse = adminResponse;
    updates.adminResponseAt = new Date();
  }

  const review = await Review.findByIdAndUpdate(_id, updates, { new: true });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Recompute product rating when status changes
  if (status) {
    const stats = await Review.aggregate([
      { $match: { productId: review.productId, status: "approved" } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]);
    const { avgRating = 0, reviewCount = 0 } = stats[0] || {};
    await Product.findByIdAndUpdate(review.productId, {
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/reviews");
  if (permission !== "full") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await dbConnect();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const review = await Review.findByIdAndDelete(id);
  if (review) {
    const stats = await Review.aggregate([
      { $match: { productId: review.productId, status: "approved" } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]);
    const { avgRating = 0, reviewCount = 0 } = stats[0] || {};
    await Product.findByIdAndUpdate(review.productId, {
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount,
    });
  }

  return NextResponse.json({ success: true });
}
