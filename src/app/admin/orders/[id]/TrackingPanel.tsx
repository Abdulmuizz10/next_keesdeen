"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck, CheckCircle } from "lucide-react";

interface TrackingPanelProps {
  orderId: string;
  currentStatus: string;
  trackingNumber: string;
  trackingUrl: string;
}

const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function TrackingPanel({
  orderId,
  currentStatus,
  trackingNumber: initialTracking,
  trackingUrl: initialUrl,
}: TrackingPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [trackingUrl, setTrackingUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: orderId,
          status,
          trackingNumber,
          trackingUrl,
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
      <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-5 flex items-center gap-2">
        <Truck size={15} className="text-[hsl(var(--muted-foreground))]" />
        Shipping & Tracking
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            Order Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setSaved(false);
            }}
            className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            Tracking Number
          </label>
          <input
            value={trackingNumber}
            onChange={(e) => {
              setTrackingNumber(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. 1Z999AA10123456784"
            className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm font-mono bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            Tracking URL
          </label>
          <input
            value={trackingUrl}
            onChange={(e) => {
              setTrackingUrl(e.target.value);
              setSaved(false);
            }}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 disabled:opacity-50 transition-opacity"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={14} style={{ color: "#04BB6E" }} />
          ) : (
            <Truck size={14} />
          )}
          {saved ? "Saved" : "Update Shipping"}
        </button>

        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Setting status to &ldquo;Shipped&rdquo; sends a shipping confirmation
          email to the customer.
        </p>
      </div>
    </div>
  );
}
