"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Star,
  X,
  Search,
  Check,
  Upload,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import Image from "next/image";

interface CollectionData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  heroImage: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  startDate: string | null;
  endDate: string | null;
  seo: { metaTitle: string; metaDescription: string };
  productCount: number;
}

interface ProductRef {
  _id: string;
  title: string;
  slug: string;
  image: string;
  collectionIds: string[];
}

interface CollectionsClientProps {
  initialCollections: CollectionData[];
  products: ProductRef[];
  permission: Permission;
}

export function CollectionsClient({
  initialCollections,
  products,
  permission,
}: CollectionsClientProps) {
  const router = useRouter();
  const [collections, setCollections] = useState(initialCollections);
  const [editing, setEditing] = useState<CollectionData | "new" | null>(null);
  const canWrite = permission === "full" || permission === "write";

  const [prevInitialCollections, setPrevInitialCollections] =
    useState(initialCollections);
  if (initialCollections !== prevInitialCollections) {
    setPrevInitialCollections(initialCollections);
    setCollections(initialCollections);
  }

  const deleteCollection = async (id: string) => {
    if (!confirm("Delete this collection?")) return;
    await fetch(`/api/admin/collections?id=${id}`, { method: "DELETE" });
    setCollections((prev) => prev.filter((c) => c._id !== id));
  };

  const toggleVisibility = async (col: CollectionData) => {
    await fetch("/api/admin/collections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: col._id, isActive: !col.isActive }),
    });
    setCollections((prev) =>
      prev.map((c) =>
        c._id === col._id ? { ...c, isActive: !c.isActive } : c,
      ),
    );
  };

  return (
    <>
      <PageHeader
        title="Collections"
        description={`${collections.length} collections`}
        action={
          canWrite ? (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90"
            >
              <Plus size={16} /> Add Collection
            </button>
          ) : undefined
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.length === 0 ? (
          <p className="col-span-full text-center text-[hsl(var(--muted-foreground))] py-12">
            No collections yet
          </p>
        ) : (
          collections.map((col) => (
            <div
              key={col._id}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden"
            >
              {/* Cover Image */}
              <div className="h-32 bg-[hsl(var(--muted))] relative">
                {col.image && (
                  <Image
                    src={col.image}
                    alt="cover image"
                    width={100}
                    height={100}
                    priority
                    className="w-full h-full object-cover"
                  />
                )}
                {col.isFeatured && (
                  <span className="absolute top-2 right-2 bg-amber-400 text-white p-1">
                    <Star size={12} />
                  </span>
                )}
                {!col.isActive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-black/70 text-white text-xs px-2 py-1">
                      Hidden
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-[hsl(var(--foreground))]">
                  {col.name}
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                  {col.description || "No description"}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {col.productCount} products
                  </span>
                  {canWrite && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleVisibility(col)}
                        className="p-1.5 hover:bg-[hsl(var(--accent))]"
                        title={col.isActive ? "Hide" : "Show"}
                      >
                        {col.isActive ? (
                          <Eye size={14} className="text-emerald-500" />
                        ) : (
                          <EyeOff
                            size={14}
                            className="text-[hsl(var(--muted-foreground))]"
                          />
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(col)}
                        className="p-1.5 hover:bg-[hsl(var(--accent))]"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteCollection(col._id)}
                        className="p-1.5 hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {editing !== null && (
        <CollectionEditor
          collection={editing === "new" ? null : editing}
          allProducts={products}
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

/* ---- Reusable single-image Cloudinary upload field ---- */

function ImageUploadField({
  label,
  value,
  onChange,
  aspect = "aspect-[16/9]",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      onChange(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>

      {value ? (
        <div
          className={`relative w-full ${aspect} border border-[hsl(var(--border))] overflow-hidden group`}
        >
          <Image
            src={value}
            alt=""
            width={100}
            height={100}
            priority
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-white flex items-center gap-1 text-xs font-medium"
              title="Replace image"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-white flex items-center gap-1 text-xs font-medium"
              title="Remove image"
            >
              <X size={14} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`w-full ${aspect} border border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          <span className="text-xs font-medium">
            {uploading ? "Uploading…" : "Upload image"}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

/* ---- Collection Editor Modal ---- */

function CollectionEditor({
  collection,
  allProducts,
  onClose,
  onSave,
}: {
  collection: CollectionData | null;
  allProducts: ProductRef[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !collection;
  const [form, setForm] = useState({
    name: collection?.name || "",
    slug: collection?.slug || "",
    description: collection?.description || "",
    image: collection?.image || "",
    heroImage: collection?.heroImage || "",
    sortOrder: collection?.sortOrder ?? 0,
    isActive: collection?.isActive ?? true,
    isFeatured: collection?.isFeatured ?? false,
    seo: {
      metaTitle: collection?.seo?.metaTitle || "",
      metaDescription: collection?.seo?.metaDescription || "",
    },
  });
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(
      collection
        ? allProducts
            .filter((p) => p.collectionIds.includes(collection._id))
            .map((p) => p._id)
        : [],
    ),
  );
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const filteredProducts = allProducts.filter((p) =>
    p.title.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Name and slug are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(collection ? { _id: collection._id } : {}),
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        image: form.image.trim() || undefined,
        heroImage: form.heroImage.trim() || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        seo: {
          metaTitle: form.seo.metaTitle || undefined,
          metaDescription: form.seo.metaDescription || undefined,
        },
      };
      const res = await fetch("/api/admin/collections", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }

      const result = await res.json();
      const collectionId = collection?._id || result._id;

      // Update product<->collection mapping via API calls
      for (const product of allProducts) {
        const isInCollection = selectedProducts.has(product._id);
        const wasInCollection = product.collectionIds.includes(collectionId);

        if (isInCollection && !wasInCollection) {
          await fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              _id: product._id,
              collectionIds: [...product.collectionIds, collectionId],
            }),
          });
        } else if (!isInCollection && wasInCollection) {
          await fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              _id: product._id,
              collectionIds: product.collectionIds.filter(
                (id) => id !== collectionId,
              ),
            }),
          });
        }
      }

      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/"] }),
      });
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 text-[hsl(var(--foreground))] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--background))] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto admin-sidebar">
        <div className="flex items-center justify-between px-6 py-4 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] sticky top-0 z-10">
          <h2 className="text-lg font-semibold">
            {isNew ? "New Collection" : `Edit: ${collection.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--accent))]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (isNew)
                    setForm((f) => ({ ...f, slug: autoSlug(e.target.value) }));
                }}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
            />
          </div>

          {/* Cover + Hero image uploads (Cloudinary, same flow as ProductEditor) */}
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadField
              label="Cover Image"
              value={form.image}
              onChange={(url) => setForm((f) => ({ ...f, image: url }))}
              aspect="aspect-[4/3]"
            />
            <ImageUploadField
              label="Hero Image"
              value={form.heroImage}
              onChange={(url) => setForm((f) => ({ ...f, heroImage: url }))}
              aspect="aspect-[4/3]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">
                Sort Order
              </label>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
            <div className="flex gap-6 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className=""
                />
                <span className="text-sm font-medium">Visible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isFeatured: e.target.checked }))
                  }
                  className=""
                />
                <span className="text-sm font-medium">Featured</span>
              </label>
            </div>
          </div>

          {/* Product Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Products in Collection ({selectedProducts.size})
            </label>
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
              />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-8 pr-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
              />
            </div>
            <div className="border border-[hsl(var(--border))] max-h-48 overflow-y-auto admin-sidebar">
              {filteredProducts.map((p) => (
                <button
                  key={p._id}
                  onClick={() => toggleProduct(p._id)}
                  className={`flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[hsl(var(--accent))] text-sm ${
                    selectedProducts.has(p._id) ? "bg-[hsl(var(--accent))]" : ""
                  }`}
                >
                  <div
                    className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                      selectedProducts.has(p._id)
                        ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white"
                        : "border-[hsl(var(--border))]"
                    }`}
                  >
                    {selectedProducts.has(p._id) && <Check size={10} />}
                  </div>
                  {p.image && (
                    <Image
                      src={p.image}
                      alt="collection image"
                      width={100}
                      height={100}
                      priority
                      className="w-6 h-6 object-cover"
                    />
                  )}
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
