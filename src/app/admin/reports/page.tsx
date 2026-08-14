import { requireRouteAccess } from "@/lib/auth-helpers";
import dbConnect from "@/lib/db";
import Order from "@/lib/models/Order";
import Category from "@/lib/models/Category";
import Coupon from "@/lib/models/Coupon";
import User from "@/lib/models/User";
import Refund from "@/lib/models/Refund";
import Review from "@/lib/models/Review";
import Subscriber from "@/lib/models/Subscriber";
import Collection from "@/lib/models/Collection";
import Product from "@/lib/models/Product";
import { PageHeader } from "@/components/admin";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRouteAccess("/admin/reports");
  await dbConnect();

  const params = await searchParams;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const from = params.from
    ? new Date(`${params.from}T00:00:00.000Z`)
    : thirtyDaysAgo;

  const to = params.to ? new Date(`${params.to}T23:59:59.999Z`) : now;
  const baseMatch = {
    paymentStatus: "paid",
    createdAt: { $gte: from, $lte: to },
  };

  // Equal-length preceding window, for period-over-period deltas
  const rangeMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - rangeMs);
  const prevMatch = {
    paymentStatus: "paid",
    createdAt: { $gte: prevFrom, $lte: prevTo },
  };

  const refundMatch = {
    status: "processed",
    processedAt: { $gte: from, $lte: to },
  };

  const [
    revenueTrend,
    salesByCategory,
    salesByCoupon,
    customerCohort,
    summaryAgg,
    summaryPrevAgg,
    newCustomerTrend,
    newCustomersPrev,
    refundSummaryAgg,
    refundByReasonAgg,
    refundTrendAgg,
    reviewTrendAgg,
    reviewByCategoryAgg,
    productPerfAgg,
    soldProductIdsAgg,
    collectionRevenueAgg,
    subscriberTotal,
    subscriberLinked,
    subscriberConvertedAgg,
  ] = await Promise.all([
    // Revenue + orders + discount trend (per day)
    Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$grandTotal" },
          orders: { $sum: 1 },
          aov: { $avg: "$grandTotal" },
          discount: { $sum: "$discountTotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Sales by category
    Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "products",
          localField: "lines.productId",
          foreignField: "_id",
          as: "product",
          pipeline: [{ $project: { categoryIds: 1 } }],
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$product.categoryIds",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$product.categoryIds",
          revenue: { $sum: "$lines.totalPrice" },
          units: { $sum: "$lines.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),

    // Sales by coupon
    Order.aggregate([
      { $match: { ...baseMatch, couponCode: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$couponCode",
          revenue: { $sum: "$grandTotal" },
          orders: { $sum: 1 },
          discount: { $sum: "$discountTotal" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),

    // Customer cohort — repeat purchasers
    Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$userId",
          orderCount: { $sum: 1 },
          revenue: { $sum: "$grandTotal" },
        },
      },
      {
        $bucket: {
          groupBy: "$orderCount",
          boundaries: [1, 2, 3, 5, 10],
          default: "10+",
          output: { customers: { $sum: 1 }, revenue: { $sum: "$revenue" } },
        },
      },
    ]),

    // Current period summary
    Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 },
          aov: { $avg: "$grandTotal" },
          totalDiscount: { $sum: "$discountTotal" },
        },
      },
    ]),

    // Previous period summary (for delta comparison)
    Order.aggregate([
      { $match: prevMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 },
          aov: { $avg: "$grandTotal" },
          totalDiscount: { $sum: "$discountTotal" },
        },
      },
    ]),

    // Daily new-customer trend (for sparkline)
    User.aggregate([
      { $match: { role: "customer", createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Previous period new customers
    User.countDocuments({
      role: "customer",
      createdAt: { $gte: prevFrom, $lte: prevTo },
    }),

    // Refund summary — total refunded + count, this period
    Refund.aggregate([
      { $match: refundMatch },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Refund breakdown by reason
    Refund.aggregate([
      { $match: refundMatch },
      {
        $group: {
          _id: "$reason",
          amount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 6 },
    ]),

    // Refund trend per day (for gross-vs-net overlay)
    Refund.aggregate([
      { $match: refundMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$processedAt" },
          },
          amount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Review rating trend per day
    Review.aggregate([
      { $match: { status: "approved", createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Avg rating by category (all-time — ratings shift slowly)
    Review.aggregate([
      { $match: { status: "approved" } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
          pipeline: [{ $project: { categoryIds: 1 } }],
        },
      },
      { $unwind: "$product" },
      { $unwind: "$product.categoryIds" },
      {
        $group: {
          _id: "$product.categoryIds",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),

    // Product performance this period — revenue vs units (for scatter)
    Order.aggregate([
      { $match: baseMatch },
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
      { $limit: 20 },
    ]),

    // All product IDs that sold at least once this period (no limit — for stagnant diff)
    Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$lines" },
      { $group: { _id: "$lines.productId" } },
    ]),

    // Revenue by collection
    Order.aggregate([
      { $match: baseMatch },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "products",
          localField: "lines.productId",
          foreignField: "_id",
          as: "product",
          pipeline: [{ $project: { collectionIds: 1 } }],
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$product.collectionIds",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$product.collectionIds",
          revenue: { $sum: "$lines.totalPrice" },
          units: { $sum: "$lines.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),

    // Subscriber funnel — stage 1: total active subscribers
    Subscriber.countDocuments({ status: "active" }),

    // Stage 2: subscribers linked to a user account
    Subscriber.countDocuments({
      status: "active",
      userId: { $exists: true, $ne: null },
    }),

    // Stage 3: linked subscribers who have placed at least one paid order
    Subscriber.aggregate([
      {
        $match: { status: "active", userId: { $exists: true, $ne: null } },
      },
      {
        $lookup: {
          from: "orders",
          localField: "userId",
          foreignField: "userId",
          as: "orders",
          pipeline: [{ $match: { paymentStatus: "paid" } }, { $limit: 1 }],
        },
      },
      { $match: { "orders.0": { $exists: true } } },
      { $count: "converted" },
    ]),
  ]);

  // Resolve category names
  const catIds = salesByCategory
    .map((s: { _id: unknown }) => s._id)
    .filter(Boolean) as string[];

  const cats = await (Category as any)
    .find({ _id: { $in: catIds } })
    .select("_id name")
    .lean();

  const catNameMap = new Map(cats.map((c: any) => [c._id.toString(), c.name]));

  // Resolve category names for the review radar too (separate id set, same map source)
  const reviewCatIds = reviewByCategoryAgg
    .map((s: { _id: unknown }) => s._id)
    .filter(Boolean) as string[];
  const reviewCats = await (Category as any)
    .find({ _id: { $in: reviewCatIds } })
    .select("_id name")
    .lean();
  const reviewCatNameMap = new Map(
    reviewCats.map((c: any) => [c._id.toString(), c.name]),
  );

  // Resolve coupon descriptions
  const couponCodes = salesByCoupon
    .map((s: { _id: string }) => s._id)
    .filter(Boolean);
  const coupons = await Coupon.find({ code: { $in: couponCodes } })
    .select("code description type value")
    .lean();
  const couponMap = new Map(coupons.map((c) => [c.code, c]));

  // Resolve collection names
  const collectionIds = collectionRevenueAgg
    .map((s: { _id: unknown }) => s._id)
    .filter(Boolean) as string[];
  const collections = await Collection.find({ _id: { $in: collectionIds } })
    .select("_id name")
    .lean();
  const collectionNameMap = new Map(
    collections.map((c: any) => [c._id.toString(), c.name]),
  );

  // Current stock + status for the products that sold this period (for sell-through)
  const perfProductIds = productPerfAgg.map(
    (p: { _id: unknown }) => p._id,
  ) as string[];
  const perfProducts = await Product.find({ _id: { $in: perfProductIds } })
    .select("variants")
    .lean();
  const stockMap = new Map(
    perfProducts.map((p: any) => [
      p._id.toString(),
      (p.variants || []).reduce(
        (sum: number, v: any) => sum + (v.stock || 0),
        0,
      ),
    ]),
  );

  // Stagnant inventory — published products with zero sales this period
  const soldIds = soldProductIdsAgg.map(
    (s: { _id: unknown }) => s._id,
  ) as string[];
  const stagnantProducts = await Product.find({
    status: "published",
    _id: { $nin: soldIds },
  })
    .select("title createdAt")
    .sort({ createdAt: 1 })
    .limit(8)
    .lean();

  // Fill in missing days for trend (revenue, orders, aov, discount, newCustomers, refunds)
  const trendMap = new Map(
    revenueTrend.map(
      (dd: {
        _id: string;
        revenue: number;
        orders: number;
        aov: number;
        discount: number;
      }) => [dd._id, dd],
    ),
  );
  const newCustTrendMap = new Map(
    newCustomerTrend.map((c: { _id: string; count: number }) => [
      c._id,
      c.count,
    ]),
  );
  const refundTrendMap = new Map(
    refundTrendAgg.map((r: { _id: string; amount: number }) => [
      r._id,
      r.amount,
    ]),
  );
  const reviewTrendMap = new Map(
    reviewTrendAgg.map(
      (r: { _id: string; avgRating: number; count: number }) => [r._id, r],
    ),
  );

  const days: {
    date: string;
    revenue: number;
    netRevenue: number;
    refunds: number;
    orders: number;
    aov: number;
    discount: number;
    newCustomers: number;
    avgRating: number;
    reviewCount: number;
  }[] = [];
  const totalDays = Math.ceil((to.getTime() - from.getTime()) / 86400000);
  for (let i = 0; i < totalDays; i++) {
    const dte = new Date(from.getTime() + i * 86400000);
    const key = dte.toISOString().slice(0, 10);
    const found = trendMap.get(key) as
      | {
          _id: string;
          revenue: number;
          orders: number;
          aov: number;
          discount: number;
        }
      | undefined;
    const reviewDay = reviewTrendMap.get(key) as
      | { avgRating: number; count: number }
      | undefined;
    const revenue = Math.round((found?.revenue || 0) / 100);
    const refunds = Math.round(
      ((refundTrendMap.get(key) as number) || 0) / 100,
    );
    days.push({
      date: key.slice(5),
      revenue,
      netRevenue: revenue - refunds,
      refunds,
      orders: found?.orders || 0,
      aov: Math.round((found?.aov || 0) / 100),
      discount: Math.round((found?.discount || 0) / 100),
      newCustomers: (newCustTrendMap.get(key) as number) || 0,
      avgRating: reviewDay ? Math.round(reviewDay.avgRating * 10) / 10 : 0,
      reviewCount: reviewDay?.count || 0,
    });
  }

  const summary = summaryAgg[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    aov: 0,
    totalDiscount: 0,
  };
  const summaryPrev = summaryPrevAgg[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    aov: 0,
    totalDiscount: 0,
  };

  const totalRevenue = Math.round(summary.totalRevenue / 100);
  const totalOrders = summary.totalOrders;
  const aov = Math.round(summary.aov / 100);
  const totalDiscount = Math.round(summary.totalDiscount / 100);

  const prevRevenue = Math.round(summaryPrev.totalRevenue / 100);
  const prevOrders = summaryPrev.totalOrders;
  const prevAov = Math.round(summaryPrev.aov / 100);
  const prevDiscount = Math.round(summaryPrev.totalDiscount / 100);

  const newCustomers = await User.countDocuments({
    role: "customer",
    createdAt: { $gte: from, $lte: to },
  });

  const refundSummary = refundSummaryAgg[0] || { totalRefunded: 0, count: 0 };
  const totalRefunded = Math.round(refundSummary.totalRefunded / 100);
  const refundRate =
    totalRevenue > 0
      ? Math.round((totalRefunded / totalRevenue) * 1000) / 10
      : 0;

  const subscriberConverted = subscriberConvertedAgg[0]?.converted || 0;

  const serialized = {
    summary: {
      totalRevenue,
      totalOrders,
      aov,
      totalDiscount,
      newCustomers,
      totalRefunded,
      refundRate,
      deltaRevenue: pctChange(totalRevenue, prevRevenue),
      deltaOrders: pctChange(totalOrders, prevOrders),
      deltaAov: pctChange(aov, prevAov),
      deltaDiscount: pctChange(totalDiscount, prevDiscount),
      deltaNewCustomers: pctChange(newCustomers, newCustomersPrev as number),
    },
    trend: days,
    byCategory: salesByCategory.map(
      (s: { _id: unknown; revenue: number; units: number }) => ({
        name: String(
          (s._id ? catNameMap.get(String(s._id)) : null) || "Uncategorized",
        ),
        revenue: Math.round(s.revenue / 100),
        units: s.units,
      }),
    ),
    byCoupon: salesByCoupon.map(
      (s: {
        _id: string;
        revenue: number;
        orders: number;
        discount: number;
      }) => {
        const coupon = couponMap.get(s._id);
        return {
          code: s._id,
          description: coupon?.description || "",
          revenue: Math.round(s.revenue / 100),
          orders: s.orders,
          discount: Math.round(s.discount / 100),
        };
      },
    ),
    cohort: customerCohort.map(
      (c: { _id: string | number; customers: number; revenue: number }) => ({
        bucket:
          c._id === "10+"
            ? "10+ orders"
            : c._id === 1
              ? "1 order"
              : `${c._id} orders`,
        customers: c.customers,
        revenue: Math.round(c.revenue / 100),
      }),
    ),
    refunds: {
      total: totalRefunded,
      count: refundSummary.count,
      rate: refundRate,
      byReason: refundByReasonAgg.map(
        (r: { _id: string; amount: number; count: number }) => ({
          reason: r._id || "Unspecified",
          amount: Math.round(r.amount / 100),
          count: r.count,
        }),
      ),
    },
    reviews: {
      byCategory: reviewByCategoryAgg.map(
        (r: { _id: unknown; avgRating: number; count: number }) => ({
          category: String(
            (r._id ? reviewCatNameMap.get(String(r._id)) : null) ||
              "Uncategorized",
          ),
          avgRating: Math.round(r.avgRating * 10) / 10,
          count: r.count,
        }),
      ),
    },
    products: {
      performance: productPerfAgg.map(
        (p: {
          _id: unknown;
          title: string;
          revenue: number;
          units: number;
        }) => {
          const stock = (stockMap.get(String(p._id)) as number) || 0;
          const denom = p.units + stock;
          return {
            title: p.title || "Unknown",
            revenue: Math.round(p.revenue / 100),
            units: p.units,
            sellThrough: denom > 0 ? Math.round((p.units / denom) * 100) : 0,
          };
        },
      ),
      stagnant: stagnantProducts.map((p: any) => ({
        title: p.title,
        daysListed: Math.floor(
          (now.getTime() - new Date(p.createdAt).getTime()) / 86400000,
        ),
      })),
    },
    collections: collectionRevenueAgg.map(
      (s: { _id: unknown; revenue: number; units: number }) => ({
        name: String(
          (s._id ? collectionNameMap.get(String(s._id)) : null) ||
            "Uncategorized",
        ),
        revenue: Math.round(s.revenue / 100),
        units: s.units,
      }),
    ),
    subscriberFunnel: [
      { stage: "Subscribed", value: subscriberTotal },
      { stage: "Has account", value: subscriberLinked },
      { stage: "Made a purchase", value: subscriberConverted },
    ],
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Deep-dive analytics — use this page to investigate, not glance."
      />
      <ReportsClient
        initialData={serialized}
        fromDate={params.from || from.toISOString().slice(0, 10)}
        toDate={params.to || to.toISOString().slice(0, 10)}
      />
    </>
  );
}
