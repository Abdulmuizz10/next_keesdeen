import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Collection from "@/lib/models/Collection";
import Product from "@/lib/models/Product";
import { CollectionsClient } from "./CollectionsClient";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const { permission } = await requireRouteAccess("/admin/collections");
  await dbConnect();

  const [collections, products] = await Promise.all([
    Collection.find().sort({ sortOrder: 1 }).lean(),
    Product.find({ status: "published" }).select("_id title slug images collectionIds").lean(),
  ]);

  const serializedCollections = collections.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    image: c.image || "",
    heroImage: c.heroImage || "",
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    isFeatured: c.isFeatured,
    startDate: c.startDate?.toISOString() || null,
    endDate: c.endDate?.toISOString() || null,
    seo: { metaTitle: c.seo?.metaTitle || "", metaDescription: c.seo?.metaDescription || "" },
    productCount: products.filter((p) => p.collectionIds.some((id) => id.toString() === c._id.toString())).length,
  }));

  const serializedProducts = products.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    image: p.images[0] || "",
    collectionIds: p.collectionIds.map((id) => id.toString()),
  }));

  return <CollectionsClient initialCollections={serializedCollections} products={serializedProducts} permission={permission} />;
}
