import "server-only";
import Product from "@/lib/models/Product";

/**
 * Fetch the latest published products sorted by createdAt descending.
 * No new schema fields — reads directly off the existing createdAt timestamp.
 */
export async function getNewArrivals(limit: number = 8) {
  return Product.find({ status: "published" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
