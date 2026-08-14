import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Review from "@/lib/models/Review";
import Product from "@/lib/models/Product";
import User from "@/lib/models/User";
import { ReviewsClient } from "./ReviewsClient";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { permission } = await requireRouteAccess("/admin/reviews");
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

  const serialized = reviews.map((r) => ({
    _id: r._id.toString(),
    productId: r.productId.toString(),
    productTitle: productMap.get(r.productId.toString())?.title || "Unknown",
    productSlug: productMap.get(r.productId.toString())?.slug || "",
    userName: userMap.get(r.userId.toString())?.name || "Unknown",
    userEmail: userMap.get(r.userId.toString())?.email || "",
    rating: r.rating,
    title: r.title || "",
    content: r.content,
    images: r.images || [],
    isVerifiedPurchase: r.isVerifiedPurchase,
    status: r.status as "pending" | "approved" | "rejected",
    helpfulCount: r.helpfulCount,
    reportCount: r.reportCount,
    adminResponse: r.adminResponse || "",
    createdAt: r.createdAt.toISOString(),
  }));

  return <ReviewsClient initialReviews={serialized} permission={permission} />;
}
