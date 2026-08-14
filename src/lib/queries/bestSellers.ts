import "server-only";
import Product from "@/lib/models/Product";

/**
 * Fetch best-selling published products using the cached salesCount30d field.
 * This field is recomputed by the cron job — never re-aggregates Orders on
 * a storefront request.
 */
export async function getBestSellers(limit: number = 8) {
  return Product.find({ status: "published", salesCount30d: { $gt: 0 } })
    .sort({ salesCount30d: -1 })
    .limit(limit)
    .lean();
}
