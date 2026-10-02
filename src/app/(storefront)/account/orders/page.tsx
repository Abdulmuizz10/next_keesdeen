import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Order from "@/lib/models/Order";
import Refund from "@/lib/models/Refund";
import OrdersView, {
  type OrderSummary,
} from "@/components/storefront/OrdersView";

export const dynamic = "force-dynamic";
export const metadata = { title: "My orders" };

const PREVIEW_LIMIT = 4;

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

  // One query for all refund totals instead of one per order (avoids N+1).
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

  // Serialize to plain objects: the client component can't receive
  // ObjectIds, Dates or Mongoose documents.
  const summaries: OrderSummary[] = orders.map((order) => {
    const id = order._id.toString();
    const created = new Date(order.createdAt);
    const totalRefunded = refundTotalsByOrder.get(id) || 0;
    // Adjust these field names to match your Order.lines schema.
    const lines = (order.lines ?? []) as Array<Record<string, any>>;

    return {
      id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus ?? "",
      createdAt: created.getTime(),
      dateLabel: created.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      grandTotal: order.grandTotal,
      totalRefunded,
      netPaid: order.grandTotal - totalRefunded,
      itemCount: lines.length,
      hasTracking: Boolean(order.trackingNumber),
      previews: lines.slice(0, PREVIEW_LIMIT).map((l) => ({
        name: l.name ?? l.title ?? "Item",
        image: l.image ?? l.imageUrl ?? l.thumbnail ?? null,
      })),
    };
  });

  return <OrdersView orders={summaries} />;
}
