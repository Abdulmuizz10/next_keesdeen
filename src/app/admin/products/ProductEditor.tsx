"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  Search,
  Package,
  Upload,
} from "lucide-react";
import type { ProductData, ProductVariant } from "./ProductsClient";
import Image from "next/image";

interface CatCol {
  _id: string;
  name: string;
  slug: string;
}

interface ProductEditorProps {
  product: ProductData | null;
  categories: CatCol[];
  collections: CatCol[];
  onClose: () => void;
  onSave: () => void;
}

const defaultVariant: ProductVariant = {
  sku: "",
  attributes: { size: "", color: "", colorHex: "" },
  stock: 0,
  lowStockThreshold: 5,
  images: [],
  isActive: true,
};

export function ProductEditor({
  product,
  categories,
  collections,
  onClose,
  onSave,
}: ProductEditorProps) {
  const isNew = !product;

  const [form, setForm] = useState({
    title: product?.title || "",
    slug: product?.slug || "",
    description: product?.description || "",
    images: product?.images || ([] as string[]),
    basePrice: product?.basePrice ? (product.basePrice / 100).toFixed(2) : "",
    compareAtPrice: product?.compareAtPrice
      ? (product.compareAtPrice / 100).toFixed(2)
      : "",
    currency: product?.currency || "GBP",
    variants: product?.variants?.length
      ? product.variants
      : [{ ...defaultVariant }],
    categoryIds: product?.categoryIds || ([] as string[]),
    tags: product?.tags?.join(", ") || "",
    collectionIds: product?.collectionIds || ([] as string[]),
    status: product?.status || ("draft" as "draft" | "published" | "archived"),
    seo: {
      metaTitle: product?.seo?.metaTitle || "",
      metaDescription: product?.seo?.metaDescription || "",
    },
    isFeatured: product?.isFeatured || false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "general" | "variants" | "seo" | "bundle"
  >("general");

  // ---- Image upload state (Cloudinary, unsigned upload) ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const autoSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || `Failed to upload ${file.name}`);
    }
    return data.url as string;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploadingCount(fileArray.length);
    setError(null);

    const results = await Promise.allSettled(
      fileArray.map((file) => uploadToCloudinary(file)),
    );

    const uploadedUrls: string[] = [];
    let failedCount = 0;
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        uploadedUrls.push(result.value);
      } else {
        failedCount += 1;
      }
    });

    if (uploadedUrls.length > 0) {
      updateField("images", [...form.images, ...uploadedUrls]);
    }
    if (failedCount > 0) {
      setError(
        failedCount === fileArray.length
          ? "Image upload failed. Please try again."
          : `${failedCount} of ${fileArray.length} images failed to upload.`,
      );
    }

    setUploadingCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) =>
    updateField(
      "images",
      form.images.filter((_, i) => i !== idx),
    );

  const moveImage = (from: number, to: number) => {
    const imgs = [...form.images];
    const [item] = imgs.splice(from, 1);
    imgs.splice(to, 0, item);
    updateField("images", imgs);
  };

  const updateVariant = (idx: number, updates: Partial<ProductVariant>) =>
    updateField(
      "variants",
      form.variants.map((v, i) => (i === idx ? { ...v, ...updates } : v)),
    );

  const addVariant = () =>
    updateField("variants", [
      ...form.variants,
      { ...defaultVariant, sku: `SKU-${Date.now()}` },
    ]);

  const removeVariant = (idx: number) => {
    if (form.variants.length <= 1) return;
    updateField(
      "variants",
      form.variants.filter((_, i) => i !== idx),
    );
  };

  const toggleCategory = (id: string) =>
    updateField(
      "categoryIds",
      form.categoryIds.includes(id)
        ? form.categoryIds.filter((c) => c !== id)
        : [...form.categoryIds, id],
    );

  const toggleCollection = (id: string) =>
    updateField(
      "collectionIds",
      form.collectionIds.includes(id)
        ? form.collectionIds.filter((c) => c !== id)
        : [...form.collectionIds, id],
    );

  const handleSave = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug is required");
      return;
    }
    if (!form.basePrice || isNaN(Number(form.basePrice))) {
      setError("Valid base price required");
      return;
    }
    if (form.variants.some((v) => !v.sku.trim())) {
      setError("All variants must have a SKU");
      return;
    }
    if (form.images.length === 0) {
      setError("At least one image is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(product ? { _id: product._id } : {}),
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        images: form.images,
        basePrice: Math.round(Number(form.basePrice) * 100),
        compareAtPrice: form.compareAtPrice
          ? Math.round(Number(form.compareAtPrice) * 100)
          : undefined,
        currency: form.currency,
        variants: form.variants.map((v) => ({
          ...v,
          price: v.price ? v.price : undefined,
          attributes: {
            size: v.attributes.size || undefined,
            color: v.attributes.color || undefined,
            colorHex: v.attributes.colorHex || undefined,
          },
        })),
        categoryIds: form.categoryIds,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        collectionIds: form.collectionIds,
        status: form.status,
        seo: {
          metaTitle: form.seo.metaTitle || undefined,
          metaDescription: form.seo.metaDescription || undefined,
        },
        isFeatured: form.isFeatured,
      };

      const res = await fetch("/api/admin/products", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      // Revalidate storefront pages
      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/", `/product/${form.slug}`] }),
      });

      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ---- Bundle state (only for existing products) ----
  const [bundleItems, setBundleItems] = useState<
    { _id: string; title: string; image: string }[]
  >([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleActive, setBundleActive] = useState(true);
  const [bundleSearch, setBundleSearch] = useState("");
  const [bundleResults, setBundleResults] = useState<
    { _id: string; title: string; image: string }[]
  >([]);
  const [bundleLoading, setBundleLoading] = useState(false);

  // Load existing bundle for this product
  useEffect(() => {
    if (!product) return;
    let active = true;

    async function loadBundle() {
      try {
        const res = await fetch(`/api/admin/bundles?productId=${product!._id}`);
        const data = await res.json();
        if (!active) return;
        if (data && data.items) {
          setBundleItems(data.items);
          setBundleTitle(data.title || "");
          setBundleActive(data.isActive ?? true);
        }
      } catch {
        // ignore
      }
    }

    loadBundle();
    return () => {
      active = false;
    };
  }, [product]);

  // Search products for bundle
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (bundleSearch.length < 2) {
        setBundleResults([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/admin/promotions/scope-search?scope=product&q=${encodeURIComponent(bundleSearch)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setBundleResults(
          data
            .filter(
              (p: { _id: string }) =>
                p._id !== product?._id &&
                !bundleItems.some((b) => b._id === p._id),
            )
            .map((p: { _id: string; label: string }) => ({
              _id: p._id,
              title: p.label,
              image: "",
            })),
        );
      } catch {
        setBundleResults([]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bundleSearch, product, bundleItems]);

  const saveBundle = async () => {
    if (!product) return;
    setBundleLoading(true);
    try {
      await fetch("/api/admin/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product._id,
          itemProductIds: bundleItems.map((b) => b._id),
          title: bundleTitle || undefined,
          isActive: bundleActive,
        }),
      });
    } catch {
      /* ignore */
    }
    setBundleLoading(false);
  };

  const tabs = [
    { key: "general" as const, label: "General" },
    { key: "variants" as const, label: `Variants (${form.variants.length})` },
    { key: "seo" as const, label: "SEO" },
    ...(!isNew ? [{ key: "bundle" as const, label: "Bundle" }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-3xl bg-[hsl(var(--background))] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {isNew ? "New Product" : `Edit: ${product.title}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[hsl(var(--border))] px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 admin-sidebar">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ---- General Tab ---- */}
          {activeTab === "general" && (
            <div className="text-[hsl(var(--foreground))] space-y-3.5">
              {/* Title & Slug */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => {
                      updateField("title", e.target.value);
                      if (isNew) updateField("slug", autoSlug(e.target.value));
                    }}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Slug *
                  </label>
                  <input
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Images * (drag to reorder)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.images.map((img, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(idx))
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        moveImage(
                          Number(e.dataTransfer.getData("text/plain")),
                          idx,
                        );
                      }}
                      className="relative w-20 h-20 overflow-hidden border border-[hsl(var(--border))] group cursor-move"
                    >
                      <Image
                        src={img}
                        alt="Product image"
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <GripVertical size={14} className="text-white" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {idx === 0 && (
                        <span className="absolute top-0.5 left-0.5 bg-[hsl(var(--primary))] text-white text-[9px] px-1">
                          Main
                        </span>
                      )}
                    </div>
                  ))}
                  {uploadingCount > 0 &&
                    Array.from({ length: uploadingCount }).map((_, i) => (
                      <div
                        key={`uploading-${i}`}
                        className="w-20 h-20 border border-dashed border-[hsl(var(--border))] flex items-center justify-center"
                      >
                        <Loader2
                          size={16}
                          className="animate-spin text-[hsl(var(--muted-foreground))]"
                        />
                      </div>
                    ))}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCount > 0}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--accent))] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingCount > 0 ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploadingCount > 0 ? "Uploading…" : "Upload Images"}
                </button>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                  You can select multiple files at once. The first image is used
                  as the main product photo — drag to reorder.
                </p>
              </div>

              {/* Price */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.basePrice}
                    onChange={(e) => updateField("basePrice", e.target.value)}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Compare-at Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.compareAtPrice}
                    onChange={(e) =>
                      updateField("compareAtPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField(
                        "status",
                        e.target.value as "draft" | "published" | "archived",
                      )
                    }
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20 text-[hsl(var(--foreground))]"
                  >
                    <option value="draft" className="bg-[hsl(var(--muted))] ">
                      Draft
                    </option>
                    <option
                      value="published"
                      className="bg-[hsl(var(--muted))] "
                    >
                      Published
                    </option>
                    <option
                      value="archived"
                      className="bg-[hsl(var(--muted))] "
                    >
                      Archived
                    </option>
                  </select>
                </div>
              </div>

              {/* Categories & Collections */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Categories
                  </label>
                  <div className="space-y-1 max-h-40 overflow-y-auto border border-[hsl(var(--border))] p-2">
                    {categories.map((c) => (
                      <label
                        key={c._id}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-[hsl(var(--accent))] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.categoryIds.includes(c._id)}
                          onChange={() => toggleCategory(c._id)}
                          className=""
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Collections
                  </label>
                  <div className="space-y-1 max-h-40 overflow-y-auto border border-[hsl(var(--border))] p-2">
                    {collections.map((c) => (
                      <label
                        key={c._id}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-[hsl(var(--accent))] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.collectionIds.includes(c._id)}
                          onChange={() => toggleCollection(c._id)}
                          className=""
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags & Featured */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    value={form.tags}
                    onChange={(e) => updateField("tags", e.target.value)}
                    placeholder="leather, gift, men"
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) =>
                        updateField("isFeatured", e.target.checked)
                      }
                      className=""
                    />
                    <span className="text-sm font-medium">
                      Featured Product
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ---- Variants Tab ---- */}
          {activeTab === "variants" && (
            <>
              <div className="text-[hsl(var(--foreground))] space-y-4">
                {form.variants.map((variant, idx) => (
                  <div
                    key={idx}
                    className="border border-[hsl(var(--border))] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">
                        Variant {idx + 1}
                      </span>
                      {form.variants.length > 1 && (
                        <button
                          onClick={() => removeVariant(idx)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs mb-1">SKU *</label>
                        <input
                          value={variant.sku}
                          onChange={(e) =>
                            updateVariant(idx, { sku: e.target.value })
                          }
                          className="w-full px-2 py-1.5 border border-[hsl(var(--border))] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Stock</label>
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(idx, {
                              stock: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">
                          Low Stock Alert
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={variant.lowStockThreshold ?? 5}
                          onChange={(e) =>
                            updateVariant(idx, {
                              lowStockThreshold: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">
                          Price Override ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={
                            variant.price
                              ? (variant.price / 100).toFixed(2)
                              : ""
                          }
                          onChange={(e) =>
                            updateVariant(idx, {
                              price: e.target.value
                                ? Math.round(Number(e.target.value) * 100)
                                : undefined,
                            })
                          }
                          placeholder="Use base price"
                          className="w-full px-2 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1">Size</label>
                        <input
                          value={variant.attributes.size || ""}
                          onChange={(e) =>
                            updateVariant(idx, {
                              attributes: {
                                ...variant.attributes,
                                size: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Color</label>
                        <input
                          value={variant.attributes.color || ""}
                          onChange={(e) =>
                            updateVariant(idx, {
                              attributes: {
                                ...variant.attributes,
                                color: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Color Hex</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={variant.attributes.colorHex || "#888888"}
                            onChange={(e) =>
                              updateVariant(idx, {
                                attributes: {
                                  ...variant.attributes,
                                  colorHex: e.target.value,
                                },
                              })
                            }
                            className="w-8 h-8 border border-[hsl(var(--border))] p-0 cursor-pointer"
                          />
                          <input
                            value={variant.attributes.colorHex || ""}
                            onChange={(e) =>
                              updateVariant(idx, {
                                attributes: {
                                  ...variant.attributes,
                                  colorHex: e.target.value,
                                },
                              })
                            }
                            placeholder="#000000"
                            className="flex-1 px-2 py-1.5 border border-[hsl(var(--border))] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={variant.isActive}
                          onChange={(e) =>
                            updateVariant(idx, { isActive: e.target.checked })
                          }
                          className=""
                        />
                        Active
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addVariant}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
              >
                <Plus size={14} /> Add Variant
              </button>
            </>
          )}

          {/* ---- SEO Tab ---- */}
          {activeTab === "seo" && (
            <div className="text-[hsl(var(--foreground))] space-y-3.5">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Meta Title
                </label>
                <input
                  value={form.seo.metaTitle}
                  onChange={(e) =>
                    updateField("seo", {
                      ...form.seo,
                      metaTitle: e.target.value,
                    })
                  }
                  maxLength={70}
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {form.seo.metaTitle.length}/70
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Meta Description
                </label>
                <textarea
                  value={form.seo.metaDescription}
                  onChange={(e) =>
                    updateField("seo", {
                      ...form.seo,
                      metaDescription: e.target.value,
                    })
                  }
                  maxLength={160}
                  rows={3}
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {form.seo.metaDescription.length}/160
                </p>
              </div>
              {/* Preview */}
              <div className="p-4 bg-[hsl(var(--muted))]">
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wider font-semibold">
                  Search Preview
                </p>
                <p className="text-[#1a0dab] text-base">
                  {form.seo.metaTitle || form.title || "Page Title"}
                </p>
                <p className="text-[#006621] text-xs">
                  keesdeen.com/product/{form.slug || "…"}
                </p>
                <p className="text-sm text-[hsl(var(--foreground))] line-clamp-2">
                  {form.seo.metaDescription ||
                    form.description ||
                    "No description"}
                </p>
              </div>
            </div>
          )}

          {/* ---- Bundle Tab ---- */}
          {activeTab === "bundle" && !isNew && (
            <div className="text-[hsl(var(--foreground))] space-y-4">
              <p className="text-sm mb-4">
                <Package size={14} className="inline mr-1 -mt-0.5" />
                Pick products that are frequently bought with this one.
                They&apos;ll appear as a &ldquo;Frequently Bought
                Together&rdquo; block on the product page.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Bundle Title (optional)
                </label>
                <input
                  value={bundleTitle}
                  onChange={(e) => setBundleTitle(e.target.value)}
                  placeholder="Frequently Bought Together"
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bundleActive}
                  onChange={(e) => setBundleActive(e.target.checked)}
                  className=""
                />
                <span className="text-sm font-medium">
                  Active on storefront
                </span>
              </label>

              {/* Selected items */}
              {bundleItems.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Selected Products ({bundleItems.length})
                  </label>
                  {bundleItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-2 border border-[hsl(var(--border))]"
                    >
                      <span className="text-sm text-[hsl(var(--foreground))] truncate">
                        {item.title}
                      </span>
                      <button
                        onClick={() =>
                          setBundleItems((prev) =>
                            prev.filter((b) => b._id !== item._id),
                          )
                        }
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search to add */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Add Product
                </label>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                  />
                  <input
                    value={bundleSearch}
                    onChange={(e) => setBundleSearch(e.target.value)}
                    placeholder="Search products…"
                    className="w-full pl-8 pr-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                  />
                </div>
                {bundleResults.length > 0 && (
                  <div className="mt-1 border border-[hsl(var(--border))] max-h-40 overflow-y-auto">
                    {bundleResults.map((r) => (
                      <button
                        key={r._id}
                        onClick={() => {
                          setBundleItems((prev) => [...prev, r]);
                          setBundleSearch("");
                          setBundleResults([]);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[hsl(var(--accent))]"
                      >
                        <Plus size={12} /> {r.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={saveBundle}
                disabled={bundleLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {bundleLoading && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Save Bundle
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--border))] px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploadingCount > 0}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isNew ? "Create Product" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
