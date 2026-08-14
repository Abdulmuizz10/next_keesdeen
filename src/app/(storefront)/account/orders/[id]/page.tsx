import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Order from "@/lib/models/Order";
import { formatPrice } from "@/lib/format";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { getOrderRefunds } from "@/lib/refunds";

interface OrderTrackingPageProps {
  params: Promise<{ id: string }>;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Payment Pending",
  paid: "Paid",
  failed: "Payment Failed",
  refunded: "Fully Refunded",
  partially_refunded: "Partially Refunded",
};

const STATUS_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
] as const;

// The dashed "tear" rule used across the ticket-stub motif. Local to this
// file — too small to justify a shared lib import.
function TearLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-full ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, #E5E5E5 0px, #E5E5E5 6px, transparent 6px, transparent 12px)",
      }}
    />
  );
}

// A receipt-style row: label, dotted leader, value.
function LedgerRow({
  label,
  value,
  emphasis = false,
  tone = "default",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "default" | "primary" | "orange";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary-500"
      : tone === "orange"
        ? "text-orange-600"
        : emphasis
          ? "text-neutral-600"
          : "text-neutral-500";

  return (
    <div className="flex items-baseline gap-3">
      <span
        className={`shrink-0 ${emphasis ? "font-semibold text-base text-neutral-600" : `text-sm ${toneClass}`}`}
      >
        {label}
      </span>
      <span className="flex-1 border-b border-dotted border-neutral-200 translate-y-[-3px]" />
      <span
        className={`shrink-0 tabular-nums ${emphasis ? "font-semibold text-base text-neutral-600" : `text-sm ${toneClass}`}`}
      >
        {value}
      </span>
    </div>
  );
}

export default async function OrderTrackingPage({
  params,
}: OrderTrackingPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/account/orders");

  const { id } = await params;
  await dbConnect();

  const order = await Order.findOne({
    _id: id,
    $or: [{ userId: session.user.id }, { email: session.user.email }],
  }).lean();

  if (!order) notFound();

  const hasRefundActivity =
    order.paymentStatus === "refunded" ||
    order.paymentStatus === "partially_refunded";

  // Only hit the refunds collection when there's actually something to show.
  // Exclude "rejected" refund attempts — those never actually returned money
  // to the customer, so surfacing them here would misleadingly suggest a
  // refund happened when it didn't.
  const allRefunds = hasRefundActivity
    ? await getOrderRefunds(order._id.toString())
    : [];
  const refunds = allRefunds.filter((r) => r.status !== "rejected");

  // Total actually refunded, used for the Summary's net-paid line. Only
  // "approved" and "processed" refunds represent money that has left (or is
  // guaranteed to leave) the business, matching the same statuses
  // getRefundableAmount() uses when computing what's still refundable.
  const totalRefunded = refunds
    .filter((r) => r.status === "approved" || r.status === "processed")
    .reduce((sum, r) => sum + r.totalAmount, 0);
  const netPaid = order.grandTotal - totalRefunded;

  // Find current step index
  const statusOrder = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];
  const currentIdx = statusOrder.indexOf(order.status);
  const isCancelled =
    order.status === "cancelled" || order.status === "refunded";

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-primary-500 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          My Orders
        </Link>

        {/* Ticket-stub header */}
        <div className="bg-white border border-neutral-100 mb-8">
          <div className="h-1 bg-primary-400" />
          <div className="p-6 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-300 mb-2">
                  Order №
                </p>
                <h1 className="font-serif text-4xl sm:text-6xl font-semibold text-neutral-600 tabular-nums leading-none">
                  {order.orderNumber}
                </h1>
              </div>
              {hasRefundActivity && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-orange-200 bg-orange-50 text-orange-700 text-[11px] font-medium uppercase tracking-[0.15em] shrink-0">
                  <span className="w-1.5 h-1.5 bg-orange-500" />
                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <TearLine />
        </div>

        {/* Cancelled / Refunded banner */}
        {isCancelled && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-red-500 mb-1">
              {order.status === "refunded" ? "Refunded" : "Cancelled"}
            </p>
            <p className="text-sm text-red-600">
              This order has been{" "}
              {order.status === "refunded" ? "refunded" : "cancelled"}.
              {order.cancelReason && <span> Reason: {order.cancelReason}</span>}
            </p>
          </div>
        )}

        {/* Partial refund notice — fires independently of isCancelled */}
        {order.paymentStatus === "partially_refunded" && (
          <div className="mb-8 p-5 bg-orange-50 border border-orange-200">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-orange-500 mb-1">
              Partial Refund
            </p>
            <p className="text-sm text-orange-700">
              Part of this order has been refunded. See the refund details
              below.
            </p>
          </div>
        )}

        {/* Status Tracker */}
        {!isCancelled && (
          <div className="bg-white border border-neutral-100 p-6 sm:p-10 mb-8">
            <h2 className="font-serif text-xl text-neutral-600 mb-10">
              Shipment Status
            </h2>
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-[22px] left-0 right-0 h-px bg-neutral-100" />
              <div
                className="absolute top-[22px] left-0 h-px bg-primary-400 transition-all duration-700"
                style={{
                  width: `${Math.max(0, (currentIdx / (STATUS_STEPS.length - 1)) * 100)}%`,
                }}
              />

              <div className="relative flex items-start justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isComplete =
                    currentIdx >= statusOrder.indexOf(step.key);
                  const isCurrent = order.status === step.key;
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center text-center flex-1"
                    >
                      <span className="text-[10px] font-medium tracking-[0.15em] text-neutral-300 mb-2">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div
                        className={`w-11 h-11 flex items-center justify-center border transition-colors ${
                          isComplete
                            ? "bg-primary-400 border-primary-400 text-white"
                            : "bg-white border-neutral-200 text-neutral-300"
                        }`}
                      >
                        {isComplete ? <Icon size={18} /> : <Clock size={18} />}
                      </div>
                      <p
                        className={`mt-3 text-xs font-medium ${
                          isCurrent
                            ? "text-primary-500"
                            : isComplete
                              ? "text-neutral-600"
                              : "text-neutral-400"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tracking info */}
            {order.trackingNumber && (
              <div className="mt-10 p-5 bg-primary-50">
                <p className="text-xs uppercase tracking-[0.2em] text-primary-600 mb-1.5">
                  Tracking Number
                </p>
                <p className="font-mono text-neutral-600">
                  {order.trackingNumber}
                </p>
                {order.trackingUrl && (
                  <Link
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Track Package <ExternalLink size={14} />
                  </Link>
                )}
              </div>
            )}

            {/* Shipped/Delivered dates */}
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-neutral-500">
              {order.shippedAt && (
                <span>
                  Shipped: {new Date(order.shippedAt).toLocaleDateString()}
                </span>
              )}
              {order.deliveredAt && (
                <span>
                  Delivered: {new Date(order.deliveredAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white border border-neutral-100 p-6 sm:p-8 mb-8">
          <h2 className="font-serif text-xl text-neutral-600 mb-6">Items</h2>
          <div className="divide-y divide-neutral-100">
            {order.lines.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="relative w-16 h-20 bg-neutral-100 overflow-hidden shrink-0">
                  {line.image && (
                    <Image
                      src={line.image}
                      alt={line.title}
                      width={100}
                      height={100}
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-600 truncate">
                    {line.title}
                  </p>
                  <p className="text-sm text-neutral-400">
                    {line.variantTitle}
                  </p>
                  <p className="text-xs text-neutral-400">
                    Qty: {line.quantity}
                  </p>
                </div>
                <p className="font-medium text-neutral-600 tabular-nums shrink-0">
                  {formatPrice(line.totalPrice)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Refund history */}
        {refunds.length > 0 && (
          <div className="bg-white border border-neutral-100 p-6 sm:p-8 mb-8">
            <h2 className="font-serif text-xl text-neutral-600 mb-6 flex items-center gap-2">
              <RotateCcw size={16} className="text-neutral-400" />
              Refunds
            </h2>
            <div className="space-y-6">
              {refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="border-b border-neutral-100 last:border-b-0 pb-6 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-sm text-neutral-600">
                      {refund.refundNumber}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {refund.processedAt
                        ? new Date(refund.processedAt).toLocaleDateString()
                        : new Date(refund.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-1.5 mb-2">
                    {refund.lines.map((line, idx) => (
                      <LedgerRow
                        key={idx}
                        label={`${line.title} × ${line.quantity}`}
                        value={formatPrice(line.amount)}
                      />
                    ))}
                  </div>
                  {refund.shippingRefund > 0 && (
                    <LedgerRow
                      label="Shipping refund"
                      value={formatPrice(refund.shippingRefund)}
                    />
                  )}
                  <div className="pt-2">
                    <LedgerRow
                      label="Total refunded"
                      value={formatPrice(refund.totalAmount)}
                      emphasis
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    {refund.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white border border-neutral-100 p-6 sm:p-8 mb-8">
          <h2 className="font-serif text-xl text-neutral-600 mb-6">Summary</h2>
          <div className="space-y-2.5">
            <LedgerRow label="Subtotal" value={formatPrice(order.subtotal)} />
            {order.discountTotal > 0 && (
              <LedgerRow
                label="Discount"
                value={`-${formatPrice(order.discountTotal)}`}
                tone="primary"
              />
            )}
            <LedgerRow
              label="Shipping"
              value={
                order.shippingTotal === 0
                  ? "Free"
                  : formatPrice(order.shippingTotal)
              }
            />
            <LedgerRow label="Tax" value={formatPrice(order.taxTotal)} />

            <TearLine className="my-4" />

            <LedgerRow
              label="Total"
              value={formatPrice(order.grandTotal)}
              emphasis
            />

            {/* Net paid line — only shown when a refund has actually moved
                money, so orders with no refund activity render exactly as
                before */}
            {totalRefunded > 0 && (
              <>
                <LedgerRow
                  label="Refunded"
                  value={`-${formatPrice(totalRefunded)}`}
                  tone="orange"
                />
                <TearLine className="my-4" />
                <LedgerRow
                  label="Net Paid"
                  value={formatPrice(netPaid)}
                  emphasis
                />
              </>
            )}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white border border-neutral-100 p-6 sm:p-8">
          <h2 className="font-serif text-xl text-neutral-600 mb-4">
            Shipping Address
          </h2>
          <address className="text-sm text-neutral-500 not-italic leading-relaxed">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            <br />
            {order.shippingAddress.address1}
            <br />
            {order.shippingAddress.address2 && (
              <>
                {order.shippingAddress.address2}
                <br />
              </>
            )}
            {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
            {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.country}
          </address>
        </div>
      </div>
    </main>
  );
}
