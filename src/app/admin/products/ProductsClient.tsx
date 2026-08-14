"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { formatPrice } from "@/lib/format";
import {
  Plus,
  Search,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Archive,
  Tag,
  Loader2,
  CheckSquare,
  Square,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import { ProductEditor } from "./ProductEditor";
import Image from "next/image";

export interface ProductVariant {
  sku: string;
  attributes: { size?: string; color?: string; colorHex?: string };
  price?: number;
  stock: number;
  lowStockThreshold?: number;
  images: string[];
  isActive: boolean;
}

export interface ProductData {
  _id: string;
  slug: string;
  title: string;
  description: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  variants: ProductVariant[];
  categoryIds: string[];
  tags: string[];
  collectionIds: string[];
  status: "draft" | "published" | "archived";
  seo: { metaTitle?: string; metaDescription?: string };
  avgRating: number;
  reviewCount: number;
  totalSold: number;
  salesCount30d: number;
  isFeatured: boolean;
  createdAt: string;
}

interface CatCol {
  _id: string;
  name: string;
  slug: string;
}

interface ProductsClientProps {
  initialProducts: ProductData[];
  categories: CatCol[];
  collections: CatCol[];
  permission: Permission;
}

export function ProductsClient({
  initialProducts,
  categories,
  collections,
  permission,
}: ProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);

  // useState(initialProducts) only seeds state on first mount. When
  // router.refresh() re-invokes the server component and hands down a new
  // initialProducts array (e.g. after saving/bulk-editing a product), this
  // component is still mounted, so React won't re-run useState's initializer
  // on its own — the table would keep showing stale local state until a
  // hard reload remounts the component.
  //
  // Rather than syncing in a useEffect (which commits the stale render
  // first, then re-renders a beat later — and which React 19 now warns
  // against), this follows React's documented "adjust state during render"
  // pattern: compare against the previous prop value here and call
  // setState mid-render. React detects the update immediately, discards
  // the in-progress render, and re-renders synchronously with the
  // corrected value, so the user never sees a stale frame.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevInitialProducts, setPrevInitialProducts] =
    useState(initialProducts);
  if (initialProducts !== prevInitialProducts) {
    setPrevInitialProducts(initialProducts);
    setProducts(initialProducts);
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<
    ProductData | "new" | null
  >(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkCatOpen, setBulkCatOpen] = useState(false);
  const canWrite = permission === "full" || permission === "write";

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (
        search &&
        !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !p.slug.includes(search.toLowerCase())
      )
        return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (categoryFilter && !p.categoryIds.includes(categoryFilter))
        return false;
      return true;
    });
  }, [products, search, statusFilter, categoryFilter]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((p) => p._id)),
    );
  const totalStock = (v: ProductVariant[]) =>
    v.reduce((s, x) => s + x.stock, 0);

  const bulkAction = async (action: string, categoryId?: string) => {
    setBulkLoading(true);
    setBulkMenuOpen(false);
    setBulkCatOpen(false);
    try {
      await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selected), categoryId }),
      });
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p._id !== id));
  };

  const exportUrl = (format: "xlsx" | "docx") => {
    const params = new URLSearchParams({ format });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    return `/api/admin/export/products?${params.toString()}`;
  };

  const handleEditorSave = () => {
    setEditingProduct(null);
    router.refresh();
  };

  const statusColors: Record<string, string> = {
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
    archived: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${filtered.length} visible of ${products.length} products`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={exportUrl("xlsx")}
              className="inline-flex items-center gap-2 px-3 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-medium text-sm hover:bg-[hsl(var(--accent))]"
            >
              <FileSpreadsheet size={15} /> Excel
            </a>
            <a
              href={exportUrl("docx")}
              className="inline-flex items-center gap-2 px-3 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-medium text-sm hover:bg-[hsl(var(--accent))]"
            >
              <FileText size={15} /> Word
            </a>
            {canWrite && (
              <button
                onClick={() => setEditingProduct("new")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Plus size={16} />
                Add Product
              </button>
            )}
          </div>
        }
      />

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--foreground))]"
          />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20 focus:border-[hsl(var(--ring))]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Bulk Actions */}
        {selected.size > 0 && canWrite && (
          <div className="relative ml-auto">
            <button
              onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] font-medium bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ChevronDown size={14} />
              )}
              {selected.size} selected
            </button>
            {bulkMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setBulkMenuOpen(false);
                    setBulkCatOpen(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-48 text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] shadow-lg z-50 py-1">
                  <button
                    onClick={() => bulkAction("publish")}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                  >
                    <Eye size={14} /> Publish
                  </button>
                  <button
                    onClick={() => bulkAction("unpublish")}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                  >
                    <EyeOff size={14} /> Unpublish
                  </button>
                  <button
                    onClick={() => bulkAction("archive")}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                  >
                    <Archive size={14} /> Archive
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setBulkCatOpen(!bulkCatOpen)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                    >
                      <Tag size={14} /> Assign Category{" "}
                      <ChevronDown size={12} className="ml-auto" />
                    </button>
                    {bulkCatOpen && (
                      <div className="absolute right-full top-0 ml-1 w-44 border border-[hsl(var(--border))] shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                        {categories.map((c) => (
                          <button
                            key={c._id}
                            onClick={() => bulkAction("assign_category", c._id)}
                            className="block w-full px-4 py-2 text-sm text-left bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))]"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[hsl(var(--border))] my-1" />
                  <button
                    onClick={() => bulkAction("delete")}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                {canWrite && (
                  <th className="w-10 px-4 py-3">
                    <button
                      onClick={toggleAll}
                      className="text-[hsl(var(--muted-foreground))]"
                    >
                      {selected.size === filtered.length &&
                      filtered.length > 0 ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Product
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Price
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Stock
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Sold
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  30d Sales
                </th>
                {canWrite && <th className="w-12 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    {canWrite && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelect(p._id)}
                          className="text-[hsl(var(--muted-foreground))]"
                        >
                          {selected.has(p._id) ? (
                            <CheckSquare
                              size={16}
                              className="text-[hsl(var(--primary))]"
                            />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="flex items-center gap-3 text-left group"
                      >
                        <div className="w-10 h-10 bg-[hsl(var(--muted))] overflow-hidden shrink-0 flex items-center justify-center">
                          {p.images[0] ? (
                            <Image
                              src={p.images[0]}
                              alt=""
                              width={100}
                              height={100}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon
                              size={16}
                              className="text-[hsl(var(--muted-foreground))]"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] truncate">
                            {p.title}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {p.variants.length} variant
                            {p.variants.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium border ${statusColors[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[hsl(var(--foreground))]">
                      {formatPrice(p.basePrice)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          totalStock(p.variants) === 0
                            ? "text-red-500 font-medium"
                            : "text-[hsl(var(--foreground))]"
                        }
                      >
                        {totalStock(p.variants)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--foreground))]">
                      {p.totalSold}
                    </td>
                    <td className="px-4 py-3 text-right text-[hsl(var(--foreground))]">
                      {p.salesCount30d || "—"}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="relative group/menu">
                          <button className="p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]">
                            <MoreHorizontal size={16} />
                          </button>
                          <div className="hidden group-hover/menu:block absolute right-0 w-36 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shadow-lg z-30 py-1">
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))]"
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button
                              onClick={() => deleteProduct(p._id)}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Overlay */}
      {editingProduct !== null && (
        <ProductEditor
          product={editingProduct === "new" ? null : editingProduct}
          categories={categories}
          collections={collections}
          onClose={() => setEditingProduct(null)}
          onSave={handleEditorSave}
        />
      )}
    </>
  );
}
