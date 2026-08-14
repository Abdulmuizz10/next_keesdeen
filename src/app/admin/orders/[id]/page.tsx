import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/admin";
import { StatusBadge, statusColor } from "@/components/admin/StatusBadge";
import Order from "@/lib/models/Order";
import { getRefundableAmount, getOrderRefunds } from "@/lib/refunds";
import { formatPrice } from "@/lib/format";
import { RefundPanel } from "./RefundPanel";
import { TrackingPanel } from "./TrackingPanel";
import Link from "next/link";
import { ArrowLeft, Package, User, CreditCard, RotateCcw } from "lucide-react";
import Image from "next/image";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
      <Icon size={15} className="text-[hsl(var(--muted-foreground))]" />
      {children}
    </h2>
  );
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { permission } = await requireRouteAccess("/admin/orders");
  const { id } = await params;

  await dbConnect();

  const order = await Order.findById(id).lean();

  if (!order) {
    notFound();
  }

  const refundable = await getRefundableAmount(id);
  const refunds = await getOrderRefunds(id);

  const serializedOrder = {
    _id: order._id.toString(),
    orderNumber: order.orderNumber,
    email: order.email,
    phone: order.phone,
    lines: order.lines.map((line) => ({
      productId: line.productId.toString(),
      variantSku: line.variantSku,
      title: line.title,
      variantTitle: line.variantTitle,
      image: line.image,
      quantity: line.quantity,
      price: line.price,
      totalPrice: line.totalPrice,
      discountAmount: line.discountAmount,
    })),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    grandTotal: order.grandTotal,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    squarePaymentId: order.squarePaymentId,
    couponCode: order.couponCode,
    shippingMethod: order.shippingMethod,
    trackingNumber: order.trackingNumber || "",
    trackingUrl: order.trackingUrl || "",
    createdAt: order.createdAt.toISOString(),
  };

  const refundableByLine: Record<string, { quantity: number; amount: number }> =
    {};
  refundable.byLine.forEach((value, key) => {
    refundableByLine[key] = value;
  });

  const canRefund = permission === "full" || permission === "write";

  return (
    <>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Orders
      </Link>

      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={new Date(order.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge value={order.status} />
            <StatusBadge value={order.paymentStatus} />
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6 overflow-hidden">
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ backgroundColor: statusColor(order.status) }}
            />
            <SectionLabel icon={Package}>Items</SectionLabel>
            <div>
              {order.lines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 py-3 border-b border-[hsl(var(--border))] last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="my-2">
                      <Image
                        key={"Product-image"}
                        src={line.image}
                        alt="Brand logo"
                        width={100}
                        height={100}
                        className="w-28 h-18"
                        priority
                      />
                    </div>
                    <p className="font-medium text-[hsl(var(--foreground))] truncate">
                      {line.title}
                    </p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {line.variantTitle}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                      SKU: {line.variantSku}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {formatPrice(line.price)} × {line.quantity}
                    </p>
                    <p className="font-semibold text-[hsl(var(--foreground))]">
                      {formatPrice(line.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">
                  Subtotal
                </span>
                <span className="text-[hsl(var(--foreground))]">
                  {formatPrice(order.subtotal)}
                </span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Discount
                  </span>
                  <span style={{ color: "#04BB6E" }}>
                    -{formatPrice(order.discountTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">
                  Shipping
                </span>
                <span className="text-[hsl(var(--foreground))]">
                  {formatPrice(order.shippingTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Tax</span>
                <span className="text-[hsl(var(--foreground))]">
                  {formatPrice(order.taxTotal)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                <span>Total</span>
                <span>{formatPrice(order.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
            <SectionLabel icon={User}>Customer</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                  Contact
                </p>
                <p className="font-medium text-[hsl(var(--foreground))]">
                  {order.email}
                </p>
                {order.phone && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {order.phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                  Shipping Address
                </p>
                <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed">
                  {order.shippingAddress.firstName}{" "}
                  {order.shippingAddress.lastName}
                  <br />
                  {order.shippingAddress.address1}
                  {order.shippingAddress.address2 && (
                    <>
                      <br />
                      {order.shippingAddress.address2}
                    </>
                  )}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.postalCode}
                  <br />
                  {order.shippingAddress.country}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Info */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
            <SectionLabel icon={CreditCard}>Payment</SectionLabel>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[hsl(var(--muted-foreground))]">
                  Status
                </span>
                <StatusBadge value={order.paymentStatus} />
              </div>
              {order.squarePaymentId && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Payment ID
                  </span>
                  <span className="font-mono text-xs text-[hsl(var(--foreground))]">
                    {order.squarePaymentId.slice(0, 12)}...
                  </span>
                </div>
              )}
              {order.couponCode && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Coupon
                  </span>
                  <span className="font-mono text-xs font-medium text-[hsl(var(--foreground))]">
                    {order.couponCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking & Shipping */}
          {canRefund && (
            <TrackingPanel
              orderId={serializedOrder._id}
              currentStatus={serializedOrder.status}
              trackingNumber={serializedOrder.trackingNumber}
              trackingUrl={serializedOrder.trackingUrl}
            />
          )}

          {/* Refund Panel */}
          {(order.paymentStatus === "paid" ||
            order.paymentStatus === "partially_refunded") && (
            <RefundPanel
              order={serializedOrder}
              refundable={{ total: refundable.total, byLine: refundableByLine }}
              refunds={refunds}
              canRefund={canRefund}
            />
          )}

          {/* Refund History */}
          {refunds.length > 0 && (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
              <SectionLabel icon={RotateCcw}>Refund History</SectionLabel>
              <div>
                {refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="relative pl-3 py-3 border-b border-[hsl(var(--border))] last:border-b-0"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-3 bottom-3 w-[3px]"
                      style={{ backgroundColor: statusColor(refund.status) }}
                    />
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm text-[hsl(var(--foreground))]">
                        {refund.refundNumber}
                      </span>
                      <StatusBadge value={refund.status} />
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">
                      {refund.reason}
                    </p>
                    <p className="font-semibold text-[hsl(var(--foreground))]">
                      {formatPrice(refund.totalAmount)}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {new Date(refund.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
