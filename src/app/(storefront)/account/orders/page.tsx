import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Order from "@/lib/models/Order";
import Refund from "@/lib/models/Refund";
import { formatPrice } from "@/lib/format";
import { ShoppingBag, ChevronRight, Package, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-indigo-50 text-indigo-700",
  shipped: "bg-sky-50 text-sky-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
  refunded: "bg-orange-50 text-orange-700",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  refunded: "Fully Refunded",
  partially_refunded: "Partially Refunded",
};

export default async function CustomerOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/account/orders");

  await dbConnect();

  const orders = await Order.find({
    $or: [{ userId: session.user.id }, { email: session.user.email }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Batch-fetch refund totals for every order with refund activity in a
  // single query, instead of calling getOrderRefunds() per order in the
  // loop below (which would be an N+1 query pattern on this list page).
  const refundedOrderIds = orders
    .filter(
      (o) =>
        o.paymentStatus === "refunded" ||
        o.paymentStatus === "partially_refunded",
    )
    .map((o) => o._id);

  const refundTotalsByOrder = new Map<string, number>();
  if (refundedOrderIds.length > 0) {
    const refunds = await Refund.find({
      orderId: { $in: refundedOrderIds },
      status: { $in: ["approved", "processed"] },
    })
      .select("orderId totalAmount")
      .lean();

    for (const r of refunds) {
      const key = r.orderId.toString();
      refundTotalsByOrder.set(
        key,
        (refundTotalsByOrder.get(key) || 0) + r.totalAmount,
      );
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
        <h1 className="font-serif text-3xl font-semibold text-neutral-600 mb-8">
          My Orders
        </h1>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-neutral-200 mb-4" />
            <p className="text-neutral-500 mb-2">No orders yet</p>
            <Link
              href="/category/bags"
              className="inline-block mt-4 px-6 py-3 bg-primary-400 text-white font-semibold  hover:bg-primary-500 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderId = order._id.toString();
              const hasRefundActivity =
                order.paymentStatus === "refunded" ||
                order.paymentStatus === "partially_refunded";
              const totalRefunded = refundTotalsByOrder.get(orderId) || 0;
              const netPaid = order.grandTotal - totalRefunded;

              return (
                <Link
                  key={orderId}
                  href={`/account/orders/${orderId}`}
                  className="block bg-white border border-neutral-100 hover:border-neutral-200 hover:shadow-md transition-all group"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-neutral-50 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-neutral-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium text-neutral-600 truncate">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {new Date(order.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}
                          >
                            {order.status}
                          </span>
                          {hasRefundActivity && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700">
                              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-neutral-300 group-hover:text-primary-400 transition-colors mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <p className="text-xs text-neutral-400">
                        {order.lines.length} item
                        {order.lines.length !== 1 ? "s" : ""}
                        {order.trackingNumber && " • Has tracking"}
                      </p>

                      <div className="text-right">
                        {hasRefundActivity && totalRefunded > 0 ? (
                          <>
                            <p className="text-xs text-neutral-400 line-through">
                              {formatPrice(order.grandTotal)}
                            </p>
                            <p className="font-semibold text-neutral-600">
                              {formatPrice(netPaid)}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-neutral-600">
                            {formatPrice(order.grandTotal)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Refund strip — only rendered when money has actually
                      come back, kept visually distinct from the main card
                      body so it reads as a secondary detail, not a repeat
                      of the status badge above */}
                  {hasRefundActivity && totalRefunded > 0 && (
                    <div className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-orange-50/60 border-t border-orange-100">
                      <RotateCcw
                        size={12}
                        className="text-orange-500 shrink-0"
                      />
                      <span className="text-xs text-orange-700">
                        {formatPrice(totalRefunded)} refunded
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
