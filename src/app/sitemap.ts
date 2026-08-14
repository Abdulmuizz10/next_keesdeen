import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXTAUTH_URL || "https://keesdeen.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/cart`, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const dbConnect = (await import("@/lib/db")).default;
    const Product = (await import("@/lib/models/Product")).default;
    const Category = (await import("@/lib/models/Category")).default;
    const Collection = (await import("@/lib/models/Collection")).default;

    await dbConnect();

    // Published products
    const products = await Product.find({ status: "published" })
      .select("slug updatedAt")
      .lean();

    for (const p of products) {
      entries.push({
        url: `${BASE_URL}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    // Active categories
    const categories = await Category.find({ isActive: true })
      .select("slug updatedAt")
      .lean();

    for (const c of categories) {
      entries.push({
        url: `${BASE_URL}/category/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    // Active collections
    const collections = await Collection.find({ isActive: true })
      .select("slug updatedAt")
      .lean();

    for (const col of collections) {
      entries.push({
        url: `${BASE_URL}/collections/${col.slug}`,
        lastModified: col.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("Sitemap generation error:", error);
    // Return at least the static pages if DB is unavailable
  }

  return entries;
}
