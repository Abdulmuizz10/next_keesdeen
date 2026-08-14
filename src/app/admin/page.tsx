import { getCurrentUser } from "@/lib/auth-helpers";
import { AlertCircle } from "lucide-react";
import dbConnect from "@/lib/db";
import Order from "@/lib/models/Order";
import Product from "@/lib/models/Product";
import User from "@/lib/models/User";
import Coupon from "@/lib/models/Coupon";
import Subscriber from "@/lib/models/Subscriber";
import Review from "@/lib/models/Review";
import { BentoDashboard } from "./BentoDashboard";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await getCurrentUser();
  const resolvedParams = await searchParams;

  let dashData = null;
  try {
    await dbConnect();
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY);
    const sixtyDaysAgo = new Date(Date.now() - 60 * DAY);

    const [
      revenueAgg,
      orderStatusAgg,
      topProductsAgg,
      productCount,
      customerCount,
      previousCustomerCount,
      currentPeriodAgg,
      previousPeriodAgg,
      categoryPerformanceAgg,
      hourlyAgg,
      countriesAgg,
      citiesAgg,
      paymentsAgg,
      shippingAgg,
      couponUsageAgg,
      couponTotal,
      couponActive,
      subscriberTotal,
      subscriberThisMonth,
      subscriberPrevMonth,
      reviewSummaryAgg,
      reviewDistributionAgg,
      reviewThisMonth,
      customerOrderCountsAgg,
      googleAuthUsers,
      passwordAuthUsers,
      adminUsers,
    ] = await Promise.all([
      Order.aggregate([
        {
          $match: { paymentStatus: "paid", createdAt: { $gte: thirtyDaysAgo } },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
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
      Product.countDocuments({ status: "published" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({
        role: "customer",
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),

      Order.aggregate([
        {
          $match: { paymentStatus: "paid", createdAt: { $gte: thirtyDaysAgo } },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$grandTotal" },
            orders: { $sum: 1 },
          },
        },
      ]),

      // Revenue by category — assumes default Mongoose collection names
      // ("products", "categories"). Update the `from` values if either
      // model overrides its collection name.
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$lines" },
        {
          $lookup: {
            from: "products",
            localField: "lines.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        { $unwind: "$product.categoryIds" },
        {
          $lookup: {
            from: "categories",
            localField: "product.categoryIds",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $group: {
            _id: "$category.name",
            revenue: { $sum: "$lines.totalPrice" },
            units: { $sum: "$lines.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
      ]),

      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $hour: "$createdAt" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: "$shippingAddress.country",
            orders: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: "$shippingAddress.city",
            orders: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),

      Order.aggregate([
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            amount: { $sum: "$grandTotal" },
          },
        },
      ]),

      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: null,
            totalShippingRevenue: { $sum: "$shippingTotal" },
            avgShippingCost: { $avg: "$shippingTotal" },
            freeShippingOrders: {
              $sum: { $cond: [{ $eq: ["$shippingTotal", 0] }, 1, 0] },
            },
            paidShippingOrders: {
              $sum: { $cond: [{ $gt: ["$shippingTotal", 0] }, 1, 0] },
            },
          },
        },
      ]),

      // Coupon usage derived from real Order.couponCode + discountTotal,
      // not an assumed usage counter on the Coupon document itself.
      Order.aggregate([
        { $match: { couponCode: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$couponCode",
            uses: { $sum: 1 },
            totalDiscount: { $sum: "$discountTotal" },
          },
        },
        { $sort: { uses: -1 } },
      ]),
      Coupon.countDocuments(),
      Coupon.countDocuments({ isActive: true, endDate: { $gte: now } }),

      Subscriber.countDocuments(),
      Subscriber.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Subscriber.countDocuments({
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),

      Review.aggregate([
        { $match: { status: "approved" } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
      ]),
      Review.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Review.countDocuments({
        status: "approved",
        createdAt: { $gte: thirtyDaysAgo },
      }),

      Order.aggregate([
        {
          $match: {
            userId: { $exists: true, $ne: null },
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: "$userId",
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$grandTotal" },
          },
        },
      ]),

      User.countDocuments({ googleId: { $exists: true, $ne: null } }),
      User.countDocuments({
        googleId: { $exists: false },
        passwordHash: { $exists: true, $ne: null },
      }),
      User.countDocuments({
        role: { $in: ["super_admin", "staff", "support"] },
      }),
    ]);

    const allPaidOrders = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]);
    const kpiOrders = allPaidOrders[0] || { total: 0, count: 0 };

    const revenueMap = new Map(
      revenueAgg.map((d: { _id: string; revenue: number; orders: number }) => [
        d._id,
        d,
      ]),
    );
    const revenueChart = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const key = d.toISOString().slice(0, 10);
      const found = revenueMap.get(key) as
        | { _id: string; revenue: number; orders: number }
        | undefined;
      revenueChart.push({
        date: key.slice(5),
        revenue: Math.round((found?.revenue || 0) / 100),
        orders: found?.orders || 0,
      });
    }

    const lowStockProds = (await Product.find({ status: "published" })
      .select("title variants")
      .limit(100)
      .lean()) as any[];
    const lowStock = lowStockProds
      .flatMap((p) =>
        (p.variants || [])
          .filter(
            (v: {
              lowStockThreshold?: number;
              stock: number;
              isActive: boolean;
            }) =>
              (v.lowStockThreshold || 0) > 0 &&
              v.stock <= (v.lowStockThreshold || 0) &&
              v.isActive,
          )
          .map(
            (v: {
              sku: string;
              stock: number;
              lowStockThreshold?: number;
            }) => ({
              productTitle: p.title,
              sku: v.sku,
              stock: v.stock,
              threshold: v.lowStockThreshold || 0,
            }),
          ),
      )
      .slice(0, 8);

    const current = currentPeriodAgg[0] || { revenue: 0, orders: 0 };
    const previous = previousPeriodAgg[0] || { revenue: 0, orders: 0 };
    const aov30d = current.orders > 0 ? current.revenue / current.orders : 0;
    const prevAov30d =
      previous.orders > 0 ? previous.revenue / previous.orders : 0;

    const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
      const period = h < 12 ? "AM" : "PM";
      const display = h % 12 === 0 ? 12 : h % 12;
      return `${display}${period}`;
    });
    const hourlyMap = new Map(
      hourlyAgg.map((h: { _id: number; orders: number }) => [h._id, h.orders]),
    );
    const hourlyActivity = HOUR_LABELS.map((label, h) => ({
      hour: label,
      orders: hourlyMap.get(h) || 0,
    })).filter((_, h) => h % 3 === 0);

    const paymentTotals = paymentsAgg.reduce(
      (
        acc: {
          total: number;
          paid: number;
          pending: number;
          failed: number;
          revenue: number;
        },
        p: { _id: string; count: number; amount: number },
      ) => {
        acc.total += p.count;
        if (p._id === "paid") {
          acc.paid = p.count;
          acc.revenue = p.amount;
        }
        if (p._id === "pending") acc.pending = p.count;
        if (p._id === "failed") acc.failed = p.count;
        return acc;
      },
      { total: 0, paid: 0, pending: 0, failed: 0, revenue: 0 },
    );

    const shipping = shippingAgg[0] || {
      totalShippingRevenue: 0,
      avgShippingCost: 0,
      freeShippingOrders: 0,
      paidShippingOrders: 0,
    };

    const couponTotalUses = couponUsageAgg.reduce(
      (s: number, c: { uses: number }) => s + c.uses,
      0,
    );
    const couponTotalDiscount = couponUsageAgg.reduce(
      (s: number, c: { totalDiscount: number }) => s + c.totalDiscount,
      0,
    );

    const newCustomers = customerOrderCountsAgg.filter(
      (c: { orderCount: number }) => c.orderCount === 1,
    ).length;
    const returningCustomers = customerOrderCountsAgg.filter(
      (c: { orderCount: number }) => c.orderCount > 1,
    ).length;
    const totalSpend = customerOrderCountsAgg.reduce(
      (s: number, c: { totalSpent: number }) => s + c.totalSpent,
      0,
    );
    const distinctCustomers = customerOrderCountsAgg.length;

    dashData = {
      kpi: {
        totalRevenue: kpiOrders.total,
        totalOrders: kpiOrders.count,
        productCount,
        customerCount,
        customerChange: pctChange(customerCount, previousCustomerCount),
        aov:
          kpiOrders.count > 0
            ? Math.round(kpiOrders.total / kpiOrders.count)
            : 0,
        revenueChange: pctChange(current.revenue, previous.revenue),
        ordersChange: pctChange(current.orders, previous.orders),
        aovChange: pctChange(aov30d, prevAov30d),
      },
      revenueChart,
      orderStatusChart: orderStatusAgg.map(
        (d: { _id: string; count: number }) => ({
          status: d._id,
          count: d.count,
        }),
      ),
      topProducts: topProductsAgg.map(
        (d: { title: string; revenue: number; units: number }) => ({
          title: d.title || "Unknown",
          revenue: Math.round(d.revenue / 100),
          units: d.units,
        }),
      ),
      lowStock,
      categoryPerformance: categoryPerformanceAgg.map(
        (c: { _id: string; revenue: number; units: number }) => ({
          category: c._id,
          revenue: Math.round(c.revenue / 100),
          units: c.units,
        }),
      ),
      hourlyActivity,
      geography: {
        topCountries: countriesAgg.map(
          (c: { _id: string; orders: number; revenue: number }) => ({
            location: c._id,
            orders: c.orders,
            revenue: c.revenue,
          }),
        ),
        topCities: citiesAgg.map(
          (c: { _id: string; orders: number; revenue: number }) => ({
            location: c._id,
            orders: c.orders,
            revenue: c.revenue,
          }),
        ),
      },
      payments: {
        paid: paymentTotals.paid,
        pending: paymentTotals.pending,
        failed: paymentTotals.failed,
        avgTransactionValue:
          paymentTotals.paid > 0
            ? Math.round(paymentTotals.revenue / paymentTotals.paid)
            : 0,
      },
      shipping: {
        avgShippingCost: Math.round(shipping.avgShippingCost || 0),
        freeShippingOrders: shipping.freeShippingOrders,
        paidShippingOrders: shipping.paidShippingOrders,
      },
      coupons: {
        totalCoupons: couponTotal,
        activeCoupons: couponActive,
        totalUses: couponTotalUses,
        totalDiscountGiven: couponTotalDiscount,
        mostUsed: couponUsageAgg[0]
          ? { code: couponUsageAgg[0]._id, uses: couponUsageAgg[0].uses }
          : null,
      },
      subscribers: {
        total: subscriberTotal,
        newThisMonth: subscriberThisMonth,
        growthChange: pctChange(subscriberThisMonth, subscriberPrevMonth),
      },
      reviews: {
        total: reviewSummaryAgg[0]?.total || 0,
        averageRating: reviewSummaryAgg[0]?.avgRating || 0,
        thisMonth: reviewThisMonth,
        ratingDistribution: reviewDistributionAgg.map(
          (r: { _id: number; count: number }) => ({
            rating: r._id,
            count: r.count,
          }),
        ),
      },
      customers: {
        newCustomers,
        returningCustomers,
        retentionRate:
          distinctCustomers > 0
            ? (returningCustomers / distinctCustomers) * 100
            : 0,
        avgLifetimeValue:
          distinctCustomers > 0
            ? Math.round(totalSpend / distinctCustomers)
            : 0,
      },
      auth: {
        google: googleAuthUsers,
        password: passwordAuthUsers,
        admins: adminUsers,
      },
    };
  } catch {
    // DB unavailable — render with null data
  }

  return (
    <>
      {resolvedParams.error === "forbidden" && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16} />
          You don&apos;t have permission to access that page.
        </div>
      )}
      <BentoDashboard data={dashData} userName={user?.name || "Admin"} />
    </>
  );
}
