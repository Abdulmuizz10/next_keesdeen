// components/admin/StatusBadge.tsx
//
// Single source of truth for status colors across the admin — orders,
// payments, and refunds all read from the same palette so the color
// of "delivered" or "processed" never drifts between screens.

export const STATUS_COLORS: Record<string, string> = {
  // order status
  pending: "#DA5B14",
  confirmed: "#E8A87C",
  processing: "#9C9C9C",
  shipped: "#7CC9A5",
  delivered: "#04BB6E",
  cancelled: "#B3261E",
  refunded: "#3C3C3C",
  // payment status
  paid: "#04BB6E",
  failed: "#B3261E",
  partially_refunded: "#DA5B14",
  // refund status
  approved: "#7CC9A5",
  processed: "#04BB6E",
  rejected: "#B3261E",

  // subscriber status
  active: "#04BB6E",
  unsubscribed: "#9C9C9C",
  bounced: "#B3261E",

  upcoming: "#DA5B14",
  disabled: "#9C9C9C",
};

export function statusColor(value: string) {
  return STATUS_COLORS[value] || "#9C9C9C";
}

export function StatusBadge({ value }: { value: string }) {
  const color = statusColor(value);
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <span className="w-2 h-2 shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] whitespace-nowrap">
        {value.replace(/_/g, " ")}
      </span>
    </span>
  );
}

/** 3px vertical rail — use on the left edge of a row or card to signal
 * status at a glance without repeating the badge everywhere. */
export function StatusRail({ value }: { value: string }) {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-0 bottom-0 w-[3px]"
      style={{ backgroundColor: statusColor(value) }}
    />
  );
}
