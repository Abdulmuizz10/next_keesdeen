import "server-only";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";

/**
 * Recompute salesCount30d and salesCount90d on every product from Order data.
 * Aggregates Order.lines[] where parent Order.paymentStatus is paid/partially_refunded
 * and status is not cancelled, grouped by productId, summing quantity.
 */
export async function recomputeBestSellers(): Promise<{ updated: number }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const baseMatch = {
    paymentStatus: { $in: ["paid", "partially_refunded"] },
    status: { $nin: ["cancelled"] },
  };

  // 30-day aggregation
  const sales30d = await Order.aggregate([
    { $match: { ...baseMatch, createdAt: { $gte: thirtyDaysAgo } } },
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$lines.productId",
        totalQty: { $sum: "$lines.quantity" },
      },
    },
  ]);

  // 90-day aggregation
  const sales90d = await Order.aggregate([
    { $match: { ...baseMatch, createdAt: { $gte: ninetyDaysAgo } } },
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$lines.productId",
        totalQty: { $sum: "$lines.quantity" },
      },
    },
  ]);

  const map30 = new Map<string, number>();
  const map90 = new Map<string, number>();

  for (const row of sales30d) {
    map30.set(row._id.toString(), row.totalQty);
  }
  for (const row of sales90d) {
    map90.set(row._id.toString(), row.totalQty);
  }

  // Collect all product IDs that appear in either window
  const allProductIds = new Set([...map30.keys(), ...map90.keys()]);

  // Reset every product first (to zero out products that fell off the window)
  await Product.updateMany(
    {},
    { $set: { salesCount30d: 0, salesCount90d: 0 } }
  );

  // Write the computed counts
  let updated = 0;
  for (const productId of allProductIds) {
    await Product.findByIdAndUpdate(productId, {
      salesCount30d: map30.get(productId) || 0,
      salesCount90d: map90.get(productId) || 0,
    });
    updated++;
  }

  return { updated };
}
