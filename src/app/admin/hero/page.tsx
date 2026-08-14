import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import SiteConfig from "@/lib/models/SiteConfig";
import Collection from "@/lib/models/Collection";
import { HeroBuilder } from "./HeroBuilder";

export const dynamic = "force-dynamic";

export default async function HeroPage() {
  const { permission } = await requireRouteAccess("/admin/settings");
  await dbConnect();

  let config = await SiteConfig.findOne({ siteKey: "main" }).lean();

  if (!config) {
    config = await SiteConfig.findOneAndUpdate(
      { siteKey: "main" },
      { $setOnInsert: { siteKey: "main", siteName: "Keesdeen" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const collections = await Collection.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

  const heroSlides = (config!.heroSlides || []).map((s, i) => ({
    title: s.title || "",
    subtitle: s.subtitle || "",
    eyebrow: s.eyebrow || "",
    italicWord: s.italicWord || "",
    image: s.image || "",
    mobileImage: s.mobileImage || "",
    ctaText: s.ctaText || "",
    ctaLink: s.ctaLink || "",
    textColor: s.textColor || "#ffffff",
    isActive: s.isActive ?? true,
    sortOrder: s.sortOrder ?? i,
  }));

  const homepageSections = (config!.homepageSections || []).map((s, i) => ({
    type: s.type,
    title: s.title || "",
    subtitle: s.subtitle || "",
    data: s.data || {},
    isActive: s.isActive ?? true,
    sortOrder: s.sortOrder ?? i,
  }));

  const serializedCollections = collections.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
  }));

  return (
    <HeroBuilder
      initialHeroSlides={heroSlides}
      initialHomepageSections={homepageSections}
      collections={serializedCollections}
      permission={permission}
    />
  );
}
