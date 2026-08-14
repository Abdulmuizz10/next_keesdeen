"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Plus, Edit, Trash2, Loader2, X, AlertCircle } from "lucide-react";

interface CouponData {
  _id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  firstTimeOnly: boolean;
  createdAt: string;
}

const ACCENT = "#04BB6E";
const DANGER = "#B3261E";

function fmtVal(type: string, value: number): string {
  if (type === "percentage") return `${value}%`;
  if (type === "fixed_amount") return `$${(value / 100).toFixed(2)}`;
  return "Free shipping";
}

function getStatus(c: CouponData): string {
  if (!c.isActive) return "disabled";
  if (new Date(c.startDate) > new Date()) return "upcoming";
  if (new Date(c.endDate) < new Date()) return "expired";
  return "active";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5 block">
      {children}
    </label>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]";

export function CouponsClient({
  initialCoupons,
}: {
  initialCoupons: CouponData[];
}) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [editing, setEditing] = useState<CouponData | "new" | null>(null);

  const [prevInitialCoupons, setPrevInitialCoupons] = useState(initialCoupons);
  if (initialCoupons !== prevInitialCoupons) {
    setPrevInitialCoupons(initialCoupons);
    setCoupons(initialCoupons);
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    setCoupons((p) => p.filter((c) => c._id !== id));
  };

  return (
    <>
      <PageHeader
        title="Coupons"
        description={`${coupons.length} coupons`}
        action={
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
          >
            <Plus size={14} /> Add Coupon
          </button>
        }
      />

      <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Value
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Usage
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Dates
                </th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    No coupons
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-[hsl(var(--foreground))]">
                        {c.code}
                      </span>
                      {c.description && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-40">
                          {c.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] capitalize">
                      {c.type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">
                      {fmtVal(c.type, c.value)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={getStatus(c)} />
                    </td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--foreground))]">
                      {c.usageCount}
                      {c.usageLimit ? `/${c.usageLimit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(c.startDate).toLocaleDateString()} —{" "}
                      {new Date(c.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditing(c)}
                          className="p-1.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => deleteCoupon(c._id)}
                          className="p-1.5 hover:bg-[hsl(var(--accent))]"
                          style={{ color: DANGER }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && (
        <CouponEditor
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function CouponEditor({
  coupon,
  onClose,
  onSave,
}: {
  coupon: CouponData | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !coupon;
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [form, setForm] = useState(() => {
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    return {
      code: coupon?.code || "",
      description: coupon?.description || "",
      type: coupon?.type || "percentage",
      value: coupon
        ? coupon.type === "percentage"
          ? String(coupon.value)
          : (coupon.value / 100).toFixed(2)
        : "",
      minPurchaseAmount: coupon?.minPurchaseAmount
        ? (coupon.minPurchaseAmount / 100).toFixed(2)
        : "",
      maxDiscountAmount: coupon?.maxDiscountAmount
        ? (coupon.maxDiscountAmount / 100).toFixed(2)
        : "",
      usageLimit: coupon?.usageLimit ? String(coupon.usageLimit) : "",
      usageLimitPerUser: coupon?.usageLimitPerUser
        ? String(coupon.usageLimitPerUser)
        : "",
      startDate: coupon
        ? toLocal(coupon.startDate)
        : today.toISOString().slice(0, 10),
      endDate: coupon
        ? toLocal(coupon.endDate)
        : thirtyDaysLater.toISOString().slice(0, 10),
      isActive: coupon?.isActive ?? true,
      firstTimeOnly: coupon?.firstTimeOnly ?? false,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.code.trim()) {
      setError("Code is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(coupon ? { _id: coupon._id } : {}),
        code: form.code.trim().toUpperCase(),
        description: form.description || undefined,
        type: form.type,
        value:
          form.type === "percentage"
            ? Number(form.value)
            : Math.round(Number(form.value) * 100),
        minPurchaseAmount: form.minPurchaseAmount
          ? Math.round(Number(form.minPurchaseAmount) * 100)
          : undefined,
        maxDiscountAmount: form.maxDiscountAmount
          ? Math.round(Number(form.maxDiscountAmount) * 100)
          : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        usageLimitPerUser: form.usageLimitPerUser
          ? Number(form.usageLimitPerUser)
          : undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isActive: form.isActive,
        firstTimeOnly: form.firstTimeOnly,
      };
      const res = await fetch("/api/admin/coupons", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {isNew ? "New Coupon" : `Edit: ${coupon.code}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {error && (
            <div
              className="pl-3 py-2.5 border-l-[3px] bg-[hsl(var(--muted))] flex items-center gap-2 text-sm text-[hsl(var(--foreground))]"
              style={{ borderColor: DANGER }}
            >
              <AlertCircle size={16} style={{ color: DANGER }} />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Code *</Label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as CouponData["type"],
                  }))
                }
                className={inputClass}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          {form.type !== "free_shipping" && (
            <div>
              <Label>
                {form.type === "percentage" ? "Discount (%)" : "Discount ($)"}
              </Label>
              <input
                type="number"
                step="0.01"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Purchase ($)</Label>
              <input
                type="number"
                step="0.01"
                value={form.minPurchaseAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minPurchaseAmount: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <Label>Max Discount ($)</Label>
              <input
                type="number"
                step="0.01"
                value={form.maxDiscountAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Usage Limit</Label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usageLimit: e.target.value }))
                }
                placeholder="Unlimited"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Per Customer</Label>
              <input
                type="number"
                value={form.usageLimitPerUser}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usageLimitPerUser: e.target.value }))
                }
                placeholder="Unlimited"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="w-4 h-4"
                style={{ accentColor: ACCENT }}
              />
              <span className="text-sm text-[hsl(var(--foreground))]">
                Active
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.firstTimeOnly}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstTimeOnly: e.target.checked }))
                }
                className="w-4 h-4"
                style={{ accentColor: ACCENT }}
              />
              <span className="text-sm text-[hsl(var(--foreground))]">
                First order only
              </span>
            </label>
          </div>
          {coupon && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Times used: {coupon.usageCount} (read-only)
            </p>
          )}
        </div>
        <div className="border-t border-[hsl(var(--border))] px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 disabled:opacity-50 transition-opacity"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
