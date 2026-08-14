import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";
import Collection from "@/lib/models/Collection";
import { ProductsClient } from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { permission } = await requireRouteAccess("/admin/products");
  await dbConnect();

  const [products, categories, collections] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).lean(),
    Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    Collection.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
  ]);

  const serialized = products.map((p) => ({
    _id: p._id.toString(),
    slug: p.slug,
    title: p.title,
    description: p.description,
    images: p.images,
    basePrice: p.basePrice,
    compareAtPrice: p.compareAtPrice,
    currency: p.currency,
    variants: p.variants.map((v) => ({
      sku: v.sku,
      attributes: {
        size: v.attributes.size,
        color: v.attributes.color,
        colorHex: v.attributes.colorHex,
      },
      price: v.price,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold ?? 5,
      images: v.images || [],
      isActive: v.isActive,
    })),
    categoryIds: p.categoryIds.map((id) => id.toString()),
    tags: p.tags,
    collectionIds: p.collectionIds.map((id) => id.toString()),
    status: p.status as "draft" | "published" | "archived",
    seo: p.seo || {},
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    totalSold: p.totalSold,
    salesCount30d: p.salesCount30d || 0,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt.toISOString(),
  }));

  const cats = categories.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
  }));
  const cols = collections.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
  }));

  return (
    <ProductsClient
      initialProducts={serialized}
      categories={cats}
      collections={cols}
      permission={permission}
    />
  );
}
