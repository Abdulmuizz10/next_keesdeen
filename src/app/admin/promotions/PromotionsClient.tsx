"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/admin";
import {
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Tag,
  Percent,
  Truck,
  Gift,
  ImageIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import { PromotionEditor } from "./PromotionEditor";

export interface PromotionData {
  _id: string;
  name: string;
  code: string | null;
  type: "percentage" | "fixed_amount" | "buy_x_get_y" | "free_shipping";
  value: number;
  scope: "all" | "category" | "collection" | "product";
  scopeIds: string[];
  scopeNames: string[];
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isStackable: boolean;
  priority: number;
  createdAt: string;

  // Storefront banner
  showBanner: boolean;
  bannerImage: { url: string; publicId: string } | null;
  bannerHeadline: string | null;
  bannerSubheadline: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
}

interface PromotionsClientProps {
  initialPromotions: PromotionData[];
  permission: Permission;
}

function getStatus(
  p: PromotionData,
): "active" | "upcoming" | "expired" | "disabled" {
  if (!p.isActive) return "disabled";
  const now = new Date();
  if (new Date(p.startDate) > now) return "upcoming";
  if (new Date(p.endDate) < now) return "expired";
  return "active";
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  expired: "bg-gray-100 text-gray-500 border-gray-200",
  disabled: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const TYPE_ICONS: Record<string, typeof Tag> = {
  percentage: Percent,
  fixed_amount: Tag,
  buy_x_get_y: Gift,
  free_shipping: Truck,
};

function formatValue(type: string, value: number): string {
  if (type === "percentage") return `${value}% off`;
  if (type === "fixed_amount") return `$${(value / 100).toFixed(2)} off`;
  if (type === "free_shipping") return "Free shipping";
  if (type === "buy_x_get_y") return "BOGO";
  return String(value);
}

export function PromotionsClient({
  initialPromotions,
  permission,
}: PromotionsClientProps) {
  const router = useRouter();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [editing, setEditing] = useState<PromotionData | "new" | null>(null);
  const canWrite = permission === "full" || permission === "write";

  const [prevInitialPromotions, setPrevInitialPromotions] =
    useState(initialPromotions);
  if (initialPromotions !== prevInitialPromotions) {
    setPrevInitialPromotions(initialPromotions);
    setPromotions(initialPromotions);
  }

  // Detect overlapping promotions on the same scope
  const conflicts = useMemo(() => {
    const warnings: string[] = [];
    const active = promotions.filter((p) => getStatus(p) === "active");

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i],
          b = active[j];
        if (a.scope === "all" || b.scope === "all") {
          if (!a.isStackable && !b.isStackable) {
            warnings.push(
              `"${a.name}" and "${b.name}" both apply to all products and are not stackable.`,
            );
          }
          continue;
        }
        if (a.scope === b.scope) {
          const overlap = a.scopeIds.some((id) => b.scopeIds.includes(id));
          if (overlap && !a.isStackable && !b.isStackable) {
            warnings.push(
              `"${a.name}" and "${b.name}" overlap on the same ${a.scope} and are not stackable.`,
            );
          }
        }
      }
    }

    // A second, independent warning: more than one promotion flagged to
    // show on the homepage banner at once. Only the highest-priority
    // active one actually renders (see BannerSection), so this is just a
    // heads-up that the others are configured but currently invisible.
    const activeBanners = active.filter((p) => p.showBanner && p.bannerImage);
    if (activeBanners.length > 1) {
      const names = activeBanners.map((p) => `"${p.name}"`).join(", ");
      warnings.push(
        `${activeBanners.length} active promotions are flagged to show on the homepage banner (${names}) — only the highest-priority one will actually display.`,
      );
    }

    return warnings;
  }, [promotions]);

  const deletePromotion = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    await fetch(`/api/admin/promotions?id=${id}`, { method: "DELETE" });
    setPromotions((prev) => prev.filter((p) => p._id !== id));
  };

  const handleSave = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Manage automatic promotions and discounts"
        action={
          canWrite ? (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90"
            >
              <Plus size={16} /> Add Promotion
            </button>
          ) : undefined
        }
      />

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <div className="mb-6 space-y-2">
          {conflicts.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-sm text-amber-700"
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Promotions List */}
      <div className="space-y-3">
        {promotions.length === 0 ? (
          <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
            No promotions yet. Create one to start offering discounts.
          </div>
        ) : (
          promotions.map((promo) => {
            const status = getStatus(promo);
            const Icon = TYPE_ICONS[promo.type] || Tag;

            return (
              <div
                key={promo._id}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Banner thumbnail if configured, otherwise the type icon */}
                    {promo.bannerImage ? (
                      <div className="relative w-14 h-10 overflow-hidden shrink-0 bg-[hsl(var(--background))]">
                        <Image
                          src={promo.bannerImage.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-[hsl(var(--background))] flex items-center justify-center shrink-0">
                        <Icon
                          size={18}
                          className="text-[hsl(var(--foreground))]"
                        />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[hsl(var(--foreground))]">
                          {promo.name}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium border ${STATUS_STYLES[status]}`}
                        >
                          {status}
                        </span>
                        {promo.isStackable && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-200">
                            Stackable
                          </span>
                        )}
                        {promo.showBanner && (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-sky-50 text-sky-600 border border-sky-200">
                            <ImageIcon size={10} />
                            Banner
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {formatValue(promo.type, promo.value)}
                        </span>
                        <span>
                          Scope:{" "}
                          <strong className="text-[hsl(var(--foreground))]">
                            {promo.scope}
                          </strong>
                          {promo.scopeNames.length > 0 && (
                            <>
                              {" "}
                              — {promo.scopeNames.slice(0, 3).join(", ")}
                              {promo.scopeNames.length > 3 &&
                                ` +${promo.scopeNames.length - 3} more`}
                            </>
                          )}
                        </span>
                        {promo.code && (
                          <span className="font-mono bg-[hsl(var(--muted))] px-1.5 py-0.5 text-xs">
                            {promo.code}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                        <span>
                          {new Date(promo.startDate).toLocaleDateString()} —{" "}
                          {new Date(promo.endDate).toLocaleDateString()}
                        </span>
                        {promo.usageLimit && (
                          <span>
                            Usage: {promo.usageCount}/{promo.usageLimit}
                          </span>
                        )}
                        {promo.minPurchaseAmount && (
                          <span>
                            Min: ${(promo.minPurchaseAmount / 100).toFixed(2)}
                          </span>
                        )}
                        {promo.maxDiscountAmount && (
                          <span>
                            Max discount: $
                            {(promo.maxDiscountAmount / 100).toFixed(2)}
                          </span>
                        )}
                        <span>Priority: {promo.priority}</span>
                      </div>
                    </div>
                  </div>

                  {canWrite && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditing(promo)}
                        className="p-2 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deletePromotion(promo._id)}
                        className="p-2 hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Editor Modal */}
      {editing !== null && (
        <PromotionEditor
          key={editing === "new" ? "new" : editing._id}
          promotion={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
