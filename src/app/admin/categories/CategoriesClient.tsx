"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/admin";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  X,
  Upload,
  Search,
  ChevronRight,
  Folder,
  GripVertical,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface CategoryData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
}

interface CategoriesClientProps {
  initialCategories: CategoryData[];
  permission: Permission;
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export function CategoriesClient({
  initialCategories,
  permission,
}: CategoriesClientProps) {
  const router = useRouter();

  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<CategoryData | "new" | null>(null);
  const [search, setSearch] = useState("");

  const canWrite = permission === "full" || permission === "write";

  /*
   * Keep server updates synchronized after router.refresh().
   * This follows the same pattern already used by the Collection screen.
   */
  const [prevInitialCategories, setPrevInitialCategories] =
    useState(initialCategories);

  if (initialCategories !== prevInitialCategories) {
    setPrevInitialCategories(initialCategories);
    setCategories(initialCategories);
  }

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Products in it will be unlinked.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete category");
      }

      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete category",
      );
    }
  };

  const toggleVisibility = async (category: CategoryData) => {
    const nextValue = !category.isActive;

    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: category._id,
          isActive: nextValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update visibility");
      }

      setCategories((prev) =>
        prev.map((c) =>
          c._id === category._id ? { ...c, isActive: nextValue } : c,
        ),
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to update visibility",
      );
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;

    return (
      categories.find((category) => category._id === parentId)?.name ||
      "Unknown"
    );
  };

  const filteredCategories = categories.filter((category) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    const parent = getParentName(category.parentId);

    return (
      category.name.toLowerCase().includes(query) ||
      category.slug.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query) ||
      parent?.toLowerCase().includes(query)
    );
  });

  const topLevelCategories = filteredCategories.filter(
    (category) => !category.parentId,
  );

  const childCategories = filteredCategories.filter(
    (category) => category.parentId,
  );

  const getChildren = (parentId: string) =>
    childCategories
      .filter((category) => category.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <PageHeader
        title="Categories"
        description={`${categories.length} ${
          categories.length === 1 ? "category" : "categories"
        }`}
        action={
          canWrite ? (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90"
            >
              <Plus size={16} />
              Add Category
            </button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full pl-9 pr-3 py-2.5 text-[hsl(var(--foreground))] bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>
      </div>

      {/* Category grid */}
      {filteredCategories.length === 0 ? (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-16 text-center">
          <Folder
            size={30}
            className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]"
          />

          <p className="text-sm font-medium">
            {search ? "No categories found" : "No categories yet"}
          </p>

          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {search
              ? "Try a different search term."
              : "Create your first category to get started."}
          </p>

          {!search && canWrite && (
            <button
              onClick={() => setEditing("new")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90"
            >
              <Plus size={14} />
              Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top-level categories */}
          {topLevelCategories.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                  Main Categories
                </h2>

                <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                  {topLevelCategories.length}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topLevelCategories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category) => (
                    <CategoryCard
                      key={category._id}
                      category={category}
                      parentName={null}
                      childCategories={getChildren(category._id)}
                      canWrite={canWrite}
                      onEdit={() => setEditing(category)}
                      onDelete={() => deleteCategory(category._id)}
                      onToggleVisibility={() => toggleVisibility(category)}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* Child categories */}
          {childCategories.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                  Subcategories
                </h2>

                <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                  {childCategories.length}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {childCategories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category) => (
                    <CategoryCard
                      key={category._id}
                      category={category}
                      parentName={getParentName(category.parentId)}
                      childCategories={[]}
                      canWrite={canWrite}
                      onEdit={() => setEditing(category)}
                      onDelete={() => deleteCategory(category._id)}
                      onToggleVisibility={() => toggleVisibility(category)}
                    />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Editor */}
      {editing !== null && (
        <CategoryEditor
          category={editing === "new" ? null : editing}
          allCategories={categories}
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

/* ------------------------------------------------------------------ */
/* Category card                                                      */
/* ------------------------------------------------------------------ */

function CategoryCard({
  category,
  parentName,
  childCategories,
  canWrite,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  category: CategoryData;
  parentName: string | null;
  childCategories: CategoryData[];
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden">
      {/* Image */}
      <div className="h-40 bg-[hsl(var(--muted))] relative">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            width={600}
            height={400}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
            <Folder size={28} strokeWidth={1.5} />
            <span className="text-xs mt-2">No image</span>
          </div>
        )}

        {!category.isActive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/70 text-white text-xs px-2 py-1">
              Hidden
            </span>
          </div>
        )}

        {/* Sort order */}
        <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] px-2 py-1">
          <GripVertical size={10} />
          {category.sortOrder}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-medium text-[hsl(var(--foreground))] truncate">
              {category.name}
            </h3>

            <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] mt-1 truncate">
              /{category.slug}
            </p>
          </div>

          {parentName && (
            <span className="shrink-0 text-[10px] px-2 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {parentName}
            </span>
          )}
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 line-clamp-2 min-h-8">
          {category.description || "No description"}
        </p>

        {/* Children */}
        {childCategories.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
            <div className="flex flex-wrap gap-1.5">
              {childCategories.slice(0, 4).map((child) => (
                <span
                  key={child._id}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                >
                  <ChevronRight size={9} />
                  {child.name}
                </span>
              ))}

              {childCategories.length > 4 && (
                <span className="text-[10px] px-2 py-1 text-[hsl(var(--muted-foreground))]">
                  +{childCategories.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {childCategories.length > 0
              ? `${childCategories.length} ${
                  childCategories.length === 1 ? "subcategory" : "subcategories"
                }`
              : parentName
                ? "Subcategory"
                : "Top level"}
          </span>

          {canWrite && (
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleVisibility}
                className="p-1.5 hover:bg-[hsl(var(--accent))]"
                title={category.isActive ? "Hide" : "Show"}
              >
                {category.isActive ? (
                  <Eye size={14} className="text-emerald-500" />
                ) : (
                  <EyeOff
                    size={14}
                    className="text-[hsl(var(--muted-foreground))]"
                  />
                )}
              </button>

              <button
                onClick={onEdit}
                className="p-1.5 hover:bg-[hsl(var(--accent))]"
                title="Edit"
              >
                <Edit size={14} />
              </button>

              <button
                onClick={onDelete}
                className="p-1.5 hover:bg-red-50 text-red-500"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cloudinary image upload                                             */
/* ------------------------------------------------------------------ */

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
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

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>

      {value ? (
        <div className="relative aspect-4/3 w-full border border-[hsl(var(--border))] overflow-hidden group">
          <Image
            src={value}
            alt=""
            width={600}
            height={450}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-white flex items-center gap-1.5 text-xs font-medium"
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
              className="text-white flex items-center gap-1.5 text-xs font-medium"
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
          className="w-full aspect-4/3 border border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Upload size={20} />
          )}

          <span className="text-xs font-medium">
            {uploading ? "Uploading…" : "Upload image"}
          </span>

          <span className="text-[10px]">PNG, JPG, WEBP</span>
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

/* ------------------------------------------------------------------ */
/* Category editor                                                    */
/* ------------------------------------------------------------------ */

function CategoryEditor({
  category,
  allCategories,
  onClose,
  onSave,
}: {
  category: CategoryData | null;
  allCategories: CategoryData[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !category;

  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    image: category?.image || "",
    parentId: category?.parentId || "",
    sortOrder: category?.sortOrder ?? 0,
    isActive: category?.isActive ?? true,
    seo: {
      metaTitle: category?.seo?.metaTitle || "",
      metaDescription: category?.seo?.metaDescription || "",
    },
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const availableParents = allCategories.filter((c) => c._id !== category?._id);

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Name and slug are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...(category ? { _id: category._id } : {}),
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        image: form.image.trim() || undefined,
        parentId: form.parentId || undefined,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        seo: {
          metaTitle: form.seo.metaTitle.trim() || undefined,
          metaDescription: form.seo.metaDescription.trim() || undefined,
        },
      };

      const res = await fetch("/api/admin/categories", {
        method: isNew ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Save failed");
      }

      await fetch("/api/revalidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths: ["/", `/category/${form.slug}`],
        }),
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[hsl(var(--background))] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto admin-sidebar">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[hsl(var(--background))] border-b border-[hsl(var(--border))] sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold">
              {isNew ? "New Category" : `Edit: ${category.name}`}
            </h2>

            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              {isNew
                ? "Create a new product category"
                : "Update category details and storefront settings"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--accent))]"
            aria-label="Close"
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

          {/* Basic information */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">
              Basic Information
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>

                <input
                  value={form.name}
                  onChange={(e) => {
                    const value = e.target.value;

                    setForm((f) => ({
                      ...f,
                      name: value,
                      ...(isNew ? { slug: autoSlug(value) } : {}),
                    }));
                  }}
                  placeholder="e.g. Men's Clothing"
                  className="w-full px-3 py-2.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>

                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value,
                    }))
                  }
                  placeholder="mens-clothing"
                  className="w-full px-3 py-2.5 border border-[hsl(var(--border))] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
              rows={3}
              placeholder="Describe this category…"
              className="w-full px-3 py-2.5 border border-[hsl(var(--border))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
            />
          </div>

          {/* Image */}
          <ImageUploadField
            label="Category Image"
            value={form.image}
            onChange={(url) =>
              setForm((f) => ({
                ...f,
                image: url,
              }))
            }
          />

          {/* Organization */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">
              Organization
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Parent Category
                </label>

                <select
                  value={form.parentId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      parentId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                >
                  <option value="">None — top level</option>

                  {availableParents.map((parent) => (
                    <option key={parent._id} value={parent._id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
              </div>

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
                      sortOrder: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>
            </div>
          </div>

          {/* Storefront */}
          <div className="border border-[hsl(var(--border))] p-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium">Visible on storefront</p>

                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Customers can see and browse this category.
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isActive: e.target.checked,
                  }))
                }
              />
            </label>
          </div>

          {/* SEO */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">
              Search Engine Optimization
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Meta Title</label>

                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {form.seo.metaTitle.length}/70
                  </span>
                </div>

                <input
                  value={form.seo.metaTitle}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      seo: {
                        ...f.seo,
                        metaTitle: e.target.value,
                      },
                    }))
                  }
                  maxLength={70}
                  placeholder="Category SEO title"
                  className="w-full px-3 py-2.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">
                    Meta Description
                  </label>

                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {form.seo.metaDescription.length}/160
                  </span>
                </div>

                <textarea
                  value={form.seo.metaDescription}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      seo: {
                        ...f.seo,
                        metaDescription: e.target.value,
                      },
                    }))
                  }
                  maxLength={160}
                  rows={3}
                  placeholder="Short description for search engines"
                  className="w-full px-3 py-2.5 border border-[hsl(var(--border))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
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

            {isNew ? "Create Category" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
