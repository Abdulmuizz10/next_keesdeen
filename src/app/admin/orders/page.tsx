import Link from "next/link";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/admin";
import { StatusBadge, statusColor } from "@/components/admin/StatusBadge";
import Order from "@/lib/models/Order";
import { formatPrice } from "@/lib/format";
import { FileSpreadsheet, FileText, SlidersHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  await requireRouteAccess("/admin/orders");
  await dbConnect();

  const params = await searchParams;
  const status = params.status || "";
  const from = params.from || "";
  const to = params.to || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (status) query.status = status;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const exportParams = new URLSearchParams();
  if (status) exportParams.set("status", status);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);

  const clearHref = "/admin/orders";

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${orders.length} visible orders`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/admin/export/orders?${new URLSearchParams({ ...Object.fromEntries(exportParams), format: "xlsx" }).toString()}`}
              className="inline-flex items-center gap-2 px-3 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] text-xs font-semibold uppercase tracking-wider hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <FileSpreadsheet size={14} /> Excel
            </a>
            <a
              href={`/api/admin/export/orders?${new URLSearchParams({ ...Object.fromEntries(exportParams), format: "docx" }).toString()}`}
              className="inline-flex items-center gap-2 px-3 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] text-xs font-semibold uppercase tracking-wider hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <FileText size={14} /> Word
            </a>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
          <SlidersHorizontal
            size={15}
            className="text-[hsl(var(--muted-foreground))]"
          />
          Filters
        </h2>
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))] min-w-40"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
          >
            Apply
          </button>
          <Link
            href={clearHref}
            className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            Clear
          </Link>
        </form>
      </div>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Payment
                </th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Total
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-[hsl(var(--muted-foreground))] text-sm"
                  >
                    No orders match the current filters
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order._id.toString()}
                    className="relative border-b border-[hsl(var(--border))] last:border-b-0 bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    <td className="relative px-6 py-4">
                      <span
                        aria-hidden
                        className="absolute left-0 top-0 bottom-0 w-[3px]"
                        style={{ backgroundColor: statusColor(order.status) }}
                      />
                      <Link
                        href={`/admin/orders/${order._id.toString()}`}
                        className="font-mono text-sm font-medium text-[hsl(var(--foreground))] hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[hsl(var(--foreground))]">
                        {order.email}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {order.shippingAddress.firstName}{" "}
                        {order.shippingAddress.lastName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={order.status} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={order.paymentStatus} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-[hsl(var(--foreground))]">
                        {formatPrice(order.grandTotal)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
