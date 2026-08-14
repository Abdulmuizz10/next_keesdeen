import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Refund from "@/lib/models/Refund";
import { formatPrice } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const inputClass =
  "px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]";

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  await requireRouteAccess("/admin/refunds");
  await dbConnect();
  const p = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (p.status) query.status = p.status;
  if (p.from || p.to) {
    query.createdAt = {};
    if (p.from) query.createdAt.$gte = new Date(`${p.from}T00:00:00.000Z`);
    if (p.to) query.createdAt.$lte = new Date(`${p.to}T23:59:59.999Z`);
  }

  const refunds = await Refund.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <>
      <PageHeader title="Refunds" description={`${refunds.length} refunds`} />

      <form className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            Status
          </label>
          <select
            name="status"
            defaultValue={p.status || ""}
            className={inputClass}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processed">Processed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            From
          </label>
          <input
            type="date"
            name="from"
            defaultValue={p.from || ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            To
          </label>
          <input
            type="date"
            name="to"
            defaultValue={p.to || ""}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
        >
          Filter
        </button>
        <Link
          href="/admin/refunds"
          className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
        >
          Clear
        </Link>
      </form>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Refund #
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Order
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Reason
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Amount
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    No refunds match the filters
                  </td>
                </tr>
              ) : (
                refunds.map((r) => (
                  <tr
                    key={r._id.toString()}
                    className="border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-[hsl(var(--foreground))]">
                      {r.refundNumber}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${r.orderId.toString()}`}
                        className="font-mono text-sm text-[hsl(var(--foreground))] hover:underline"
                      >
                        {r.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={r.status} />
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
                      {r.reason}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[hsl(var(--foreground))]">
                      {formatPrice(r.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                      {new Date(r.createdAt).toLocaleDateString()}
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
