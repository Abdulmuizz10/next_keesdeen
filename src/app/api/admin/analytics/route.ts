import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRouteAccess("/admin");
  await dbConnect();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    revenueData,
    orderStatusData,
    topProductsData,
    kpiData,
    lowStockData,
  ] = await Promise.all([
    // Revenue by day (last 30 days)
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Order status breakdown
    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // Top-selling products
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.productId",
          title: { $first: "$lines.title" },
          revenue: { $sum: "$lines.totalPrice" },
          units: { $sum: "$lines.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),

    // KPI summary
    Promise.all([
      Order.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } }]),
      Product.countDocuments({ status: "published" }),
      User.countDocuments({ role: "customer" }),
    ]),

    // Low stock — simpler query, filter in JS
    Product.find({ status: "published" }).select("title variants").limit(100).lean(),
  ]);

  const [kpiOrders, productCount, customerCount] = kpiData;
  const kpiOrderData = kpiOrders[0] || { total: 0, count: 0 };
  const aov = kpiOrderData.count > 0 ? Math.round(kpiOrderData.total / kpiOrderData.count) : 0;

  // Fill in missing days for revenue chart
  const revenueMap = new Map(revenueData.map((d: { _id: string; revenue: number; orders: number }) => [d._id, d]));
  const filledRevenue: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const found = revenueMap.get(key) as { _id: string; revenue: number; orders: number } | undefined;
    filledRevenue.push({ date: key, revenue: found?.revenue || 0, orders: found?.orders || 0 });
  }

  // Low stock items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lowStock = lowStockData.flatMap((p) => {
    return (p.variants as any[])
      .filter((v) => (v.lowStockThreshold || 0) > 0 && v.stock <= (v.lowStockThreshold || 0) && v.isActive)
      .map((v) => ({ productTitle: p.title, sku: v.sku, stock: v.stock, threshold: v.lowStockThreshold || 0 }));
  }).slice(0, 8);

  return NextResponse.json({
    kpi: {
      totalRevenue: kpiOrderData.total,
      totalOrders: kpiOrderData.count,
      productCount,
      customerCount,
      aov,
    },
    revenueChart: filledRevenue,
    orderStatusChart: orderStatusData.map((d: { _id: string; count: number }) => ({ status: d._id, count: d.count })),
    topProducts: topProductsData.map((d: { _id: unknown; title: string; revenue: number; units: number }) => ({
      title: d.title || "Unknown",
      revenue: d.revenue,
      units: d.units,
    })),
    lowStock,
  });
}
