"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2, Search, Check, ImagePlus, Upload } from "lucide-react";
import Image from "next/image";
import type { PromotionData } from "./PromotionsClient";

interface PromotionEditorProps {
  promotion: PromotionData | null;
  onClose: () => void;
  onSave: () => void;
}

type PromoType =
  | "percentage"
  | "fixed_amount"
  | "buy_x_get_y"
  | "free_shipping";
type PromoScope = "all" | "category" | "collection" | "product";

interface ScopeItem {
  _id: string;
  label: string;
}

interface BannerImage {
  url: string;
  publicId: string;
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const getDefaultEndDate = () =>
  toLocalDatetime(new Date(Date.now() + 30 * 86400000).toISOString());

export function PromotionEditor({
  promotion,
  onClose,
  onSave,
}: PromotionEditorProps) {
  const isNew = !promotion;

  const [form, setForm] = useState({
    name: promotion?.name || "",
    code: promotion?.code || "",
    type: (promotion?.type || "percentage") as PromoType,
    value: promotion
      ? promotion.type === "percentage"
        ? String(promotion.value)
        : (promotion.value / 100).toFixed(2)
      : "",
    scope: (promotion?.scope || "all") as PromoScope,
    scopeIds: promotion?.scopeIds || ([] as string[]),
    minPurchaseAmount: promotion?.minPurchaseAmount
      ? (promotion.minPurchaseAmount / 100).toFixed(2)
      : "",
    maxDiscountAmount: promotion?.maxDiscountAmount
      ? (promotion.maxDiscountAmount / 100).toFixed(2)
      : "",
    usageLimit: promotion?.usageLimit ? String(promotion.usageLimit) : "",
    startDate: promotion
      ? toLocalDatetime(promotion.startDate)
      : toLocalDatetime(new Date().toISOString()),
    // endDate: promotion
    //   ? toLocalDatetime(promotion.endDate)
    //   : toLocalDatetime(new Date(Date.now() + 30 * 86400000).toISOString()),
    endDate: promotion
      ? toLocalDatetime(promotion.endDate)
      : getDefaultEndDate(),
    isActive: promotion?.isActive ?? true,
    isStackable: promotion?.isStackable ?? false,
    priority: promotion?.priority ?? 0,
    // Storefront banner
    showBanner: promotion?.showBanner ?? false,
    bannerImage: (promotion?.bannerImage as BannerImage | null) ?? null,
    bannerHeadline: promotion?.bannerHeadline || "",
    bannerSubheadline: promotion?.bannerSubheadline || "",
    ctaLabel: promotion?.ctaLabel || "",
    ctaHref: promotion?.ctaHref || "",
  });

  // Scope picker state
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>(() =>
    promotion
      ? promotion.scopeIds.map((id, i) => ({
          _id: id,
          label: promotion.scopeNames[i] || id,
        }))
      : [],
  );
  const [scopeSearch, setScopeSearch] = useState("");
  const [scopeResults, setScopeResults] = useState<ScopeItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Banner image upload state
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search scope entities
  const searchScope = useCallback(
    async (q: string, signal: AbortSignal) => {
      if (form.scope === "all") return;
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/admin/promotions/scope-search?scope=${form.scope}&q=${encodeURIComponent(q)}`,
          { signal },
        );
        const data = await res.json();
        setScopeResults(data);
      } catch {
        // Ignore — covers both real failures and aborted requests from
        // a fast-typing user; the next debounced call supersedes this one.
        setScopeResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [form.scope],
  );

  // Debounced, same 300ms pattern used by ProductEditor's bundle search and
  // CollectionEditor's product search — this previously fired on every
  // keystroke with no debounce, hammering the endpoint while typing.
  useEffect(() => {
    if (form.scope === "all") return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchScope(scopeSearch, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.scope, scopeSearch, searchScope]);

  const toggleScopeItem = (item: ScopeItem) => {
    const exists = scopeItems.some((s) => s._id === item._id);
    if (exists) {
      setScopeItems((prev) => prev.filter((s) => s._id !== item._id));
      setForm((f) => ({
        ...f,
        scopeIds: f.scopeIds.filter((id) => id !== item._id),
      }));
    } else {
      setScopeItems((prev) => [...prev, item]);
      setForm((f) => ({ ...f, scopeIds: [...f.scopeIds, item._id] }));
    }
  };

  // Deletes a Cloudinary asset. Fire-and-forget — the DB reference is the
  // source of truth; a stray upload can be cleaned up manually if this
  // fails, so we don't block the UI on it.
  const deleteBannerAsset = (publicId: string) => {
    fetch(`/api/admin/promotions?publicId=${encodeURIComponent(publicId)}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  const handleBannerFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBannerUploadError("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setBannerUploadError("Image must be under 8MB");
      return;
    }

    setBannerUploadError(null);
    setUploadingBanner(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const previous = form.bannerImage;
      setForm((f) => ({
        ...f,
        bannerImage: { url: data.url, publicId: data.publicId },
      }));
      if (previous?.publicId) deleteBannerAsset(previous.publicId);
    } catch (err) {
      setBannerUploadError(
        err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = () => {
    if (form.bannerImage?.publicId)
      deleteBannerAsset(form.bannerImage.publicId);
    setForm((f) => ({ ...f, bannerImage: null }));
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.value && form.type !== "free_shipping") {
      setError("Value is required");
      return;
    }
    if (form.scope !== "all" && form.scopeIds.length === 0) {
      setError("Select at least one scope item");
      return;
    }
    if (form.showBanner && !form.bannerImage) {
      setError('Upload a banner image, or turn off "Show as homepage banner"');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(promotion ? { _id: promotion._id } : {}),
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || undefined,
        type: form.type,
        value:
          form.type === "percentage"
            ? Number(form.value)
            : Math.round(Number(form.value) * 100),
        scope: form.scope,
        scopeIds: form.scope === "all" ? [] : form.scopeIds,
        minPurchaseAmount: form.minPurchaseAmount
          ? Math.round(Number(form.minPurchaseAmount) * 100)
          : undefined,
        maxDiscountAmount: form.maxDiscountAmount
          ? Math.round(Number(form.maxDiscountAmount) * 100)
          : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isActive: form.isActive,
        isStackable: form.isStackable,
        priority: form.priority,

        // Storefront banner
        showBanner: form.showBanner,
        bannerImage: form.bannerImage || undefined,
        bannerHeadline: form.bannerHeadline.trim() || undefined,
        bannerSubheadline: form.bannerSubheadline.trim() || undefined,
        ctaLabel: form.ctaLabel.trim() || undefined,
        ctaHref: form.ctaHref.trim() || undefined,
      };

      const res = await fetch("/api/admin/promotions", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }

      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const TYPE_OPTIONS: { value: PromoType; label: string; desc: string }[] = [
    { value: "percentage", label: "Percentage Off", desc: "e.g. 15% off" },
    { value: "fixed_amount", label: "Fixed Amount Off", desc: "e.g. $10 off" },
    { value: "buy_x_get_y", label: "Buy X Get Y", desc: "BOGO deals" },
    { value: "free_shipping", label: "Free Shipping", desc: "Waive shipping" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto admin-sidebar">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] sticky top-0  z-10">
          <h2 className="text-lg font-semibold">
            {isNew ? "New Promotion" : `Edit: ${promotion.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--accent))]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name & Code */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Spring Sale"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Code (optional)
              </label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="SPRING15"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Discount Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                  className={`text-left p-3 border transition-colors ${
                    form.type === opt.value
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--card))]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
                  }`}
                >
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {opt.label}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          {form.type !== "free_shipping" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {form.type === "percentage"
                  ? "Discount Percentage *"
                  : "Discount Amount ($) *"}
              </label>
              <input
                type="number"
                step={form.type === "percentage" ? "1" : "0.01"}
                min="0"
                max={form.type === "percentage" ? "100" : undefined}
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                placeholder={form.type === "percentage" ? "15" : "10.00"}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
          )}

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium mb-2">Applies To</label>
            <div className="flex gap-2 mb-3">
              {(
                ["all", "category", "collection", "product"] as PromoScope[]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setForm((f) => ({ ...f, scope: s, scopeIds: [] }));
                    setScopeItems([]);
                    setScopeSearch("");
                  }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
                    form.scope === s
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]"
                  }`}
                >
                  {s === "all" ? "All Products" : s}
                </button>
              ))}
            </div>

            {/* Scope Picker */}
            {form.scope !== "all" && (
              <div className="border border-[hsl(var(--border))]">
                {/* Selected items */}
                {scopeItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-3 border-b border-[hsl(var(--border))]">
                    {scopeItems.map((item) => (
                      <span
                        key={item._id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] text-xs text-[hsl(var(--foreground))]"
                      >
                        {item.label}
                        <button
                          onClick={() => toggleScopeItem(item)}
                          className="hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Search */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                  />
                  <input
                    value={scopeSearch}
                    onChange={(e) => setScopeSearch(e.target.value)}
                    placeholder={`Search ${form.scope}…`}
                    className="w-full pl-8 pr-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                {/* Results */}
                <div className="max-h-36 overflow-y-auto border-t border-[hsl(var(--border))]">
                  {searchLoading ? (
                    <p className="p-3 text-sm text-[hsl(var(--muted-foreground))]">
                      Loading…
                    </p>
                  ) : scopeResults.length === 0 ? (
                    <p className="p-3 text-sm text-[hsl(var(--muted-foreground))]">
                      No results
                    </p>
                  ) : (
                    scopeResults.map((item) => {
                      const selected = form.scopeIds.includes(item._id);
                      return (
                        <button
                          key={item._id}
                          onClick={() => toggleScopeItem(item)}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[hsl(var(--accent))] ${selected ? "bg-[hsl(var(--accent))]" : ""}`}
                        >
                          <div
                            className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                              selected
                                ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white"
                                : "border-[hsl(var(--border))]"
                            }`}
                          >
                            {selected && <Check size={10} />}
                          </div>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Constraints */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Min Purchase ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minPurchaseAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minPurchaseAmount: e.target.value }))
                }
                placeholder="0.00"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Discount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.maxDiscountAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))
                }
                placeholder="No cap"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usageLimit: e.target.value }))
                }
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date *
              </label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                End Date *
              </label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
          </div>

          {/* Options */}
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              <span className="text-sm font-medium">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isStackable}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isStackable: e.target.checked }))
                }
              />
              <span className="text-sm font-medium">Stackable</span>
            </label>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <input
                type="number"
                min="0"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
          </div>

          {/* ── Storefront Banner ─────────────────────────────────── */}
          <div className="border-t border-[hsl(var(--border))] pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Storefront Banner</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Feature this promotion as the homepage hero banner.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.showBanner}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, showBanner: e.target.checked }))
                  }
                />
                <span className="text-sm font-medium">Show on homepage</span>
              </label>
            </div>

            {/* Image upload / preview */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Banner Image
              </label>

              {form.bannerImage ? (
                <div className="relative overflow-hidden border border-[hsl(var(--border))] aspect-21/9 bg-[hsl(var(--muted))]">
                  <Image
                    src={form.bannerImage.url}
                    alt="Banner preview"
                    fill
                    className="object-cover"
                    sizes="640px"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55)_0%,transparent_60%)]" />
                  <button
                    onClick={handleRemoveBanner}
                    type="button"
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white hover:bg-black/80 transition-colors"
                    aria-label="Remove banner image"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    disabled={uploadingBanner}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-neutral-900 text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {uploadingBanner ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  disabled={uploadingBanner}
                  className="w-full aspect-21/9 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors disabled:opacity-50"
                >
                  {uploadingBanner ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      <span className="text-sm">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus size={22} />
                      <span className="text-sm font-medium">
                        Click to upload a banner image
                      </span>
                      <span className="text-xs">
                        Recommended: wide landscape, under 8MB
                      </span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFileChange}
                className="hidden"
              />

              {bannerUploadError && (
                <p className="mt-2 text-xs text-red-500">{bannerUploadError}</p>
              )}
            </div>

            {/* Headline / Subheadline */}
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Headline
                </label>
                <input
                  value={form.bannerHeadline}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bannerHeadline: e.target.value }))
                  }
                  placeholder={form.name || "Falls back to promotion name"}
                  maxLength={120}
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Subheadline
                </label>
                <input
                  value={form.bannerSubheadline}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bannerSubheadline: e.target.value,
                    }))
                  }
                  placeholder="Optional supporting line"
                  maxLength={240}
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  CTA Label
                </label>
                <input
                  value={form.ctaLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                  }
                  placeholder="Shop Now"
                  maxLength={40}
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  CTA Link
                </label>
                <input
                  value={form.ctaHref}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaHref: e.target.value }))
                  }
                  placeholder="/category/slug"
                  maxLength={300}
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] px-6 py-4 flex items-center justify-between sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--accent))]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isNew ? "Create Promotion" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
