import {
  HeroSlider,
  type HeroSlideData,
} from "@/components/storefront/HeroSlider";
import {
  FeaturedProductsSection,
  CollectionGridSection,
  BannerSection,
  NewsletterSection,
  NewArrivalsSection,
  BestSellersSection,
} from "@/components/storefront/HomepageSections";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ProductCard {
  _id: string;
  slug: string;
  title: string;
  image: string;
  basePrice: number;
  effectivePrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  avgRating: number;
  reviewCount: number;
}

interface CollectionCard {
  _id: string;
  slug: string;
  name: string;
  image: string;
  description: string;
}

interface BannerPromotionData {
  headline: string;
  subheadline: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaHref: string | null;
}

interface ActiveSection {
  type: string;
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>;
}

interface HomeData {
  heroSlides: HeroSlideData[];
  activeSections: ActiveSection[];
  featuredProducts: ProductCard[];
  collectionCards: CollectionCard[];
  newArrivals: ProductCard[];
  bestSellers: ProductCard[];
  bannerPromotion: BannerPromotionData | null;
}

async function getHomeData(): Promise<HomeData> {
  const empty: HomeData = {
    heroSlides: [],
    activeSections: [],
    featuredProducts: [],
    collectionCards: [],
    newArrivals: [],
    bestSellers: [],
    bannerPromotion: null,
  };

  try {
    const dbConnect = (await import("@/lib/db")).default;
    const SiteConfig = (await import("@/lib/models/SiteConfig")).default;
    const Product = (await import("@/lib/models/Product")).default;
    const Collection = (await import("@/lib/models/Collection")).default;
    const { getBatchPricing } = await import("@/lib/pricing");
    const { getNewArrivals } = await import("@/lib/queries/newArrivals");
    const { getBestSellers } = await import("@/lib/queries/bestSellers");
    await dbConnect();

    let config = await SiteConfig.findOne({ siteKey: "main" }).lean();
    if (!config) {
      config = await SiteConfig.findOneAndUpdate(
        { siteKey: "main" },
        { $setOnInsert: { siteKey: "main", siteName: "Keesdeen" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    const heroSlides: HeroSlideData[] = (config!.heroSlides || [])
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        title: s.title,
        subtitle: s.subtitle || "",
        eyebrow: s.eyebrow || "",
        italicWord: s.italicWord || "",
        image: s.image,
        mobileImage: s.mobileImage || "",
        ctaText: s.ctaText || "",
        ctaLink: s.ctaLink || "",
        textColor: s.textColor || "#ffffff",
      }));

    const activeSections: ActiveSection[] = (config!.homepageSections || [])
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        type: s.type,
        title: s.title,
        subtitle: s.subtitle,
        data: s.data || {},
      }));

    // Helper: convert product docs to cards with batch pricing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function toCards(docs: any[]): Promise<ProductCard[]> {
      if (docs.length === 0) return [];
      const pricingMap = await getBatchPricing(docs as never[]);
      return docs.map(
        (p: {
          _id: { toString: () => string };
          slug: string;
          title: string;
          images: string[];
          basePrice: number;
          avgRating: number;
          reviewCount: number;
        }) => {
          const pricing = pricingMap.get(p._id.toString());
          return {
            _id: p._id.toString(),
            slug: p.slug,
            title: p.title,
            image: p.images[0] || "",
            basePrice: p.basePrice,
            effectivePrice: pricing?.effectivePrice || p.basePrice,
            hasDiscount: (pricing?.discountAmount || 0) > 0,
            discountPercentage: pricing?.discountPercentage || 0,
            avgRating: p.avgRating,
            reviewCount: p.reviewCount,
          };
        },
      );
    }

    let featuredProducts: ProductCard[] = [];
    let collectionCards: CollectionCard[] = [];
    let newArrivals: ProductCard[] = [];
    let bestSellers: ProductCard[] = [];
    let bannerPromotion: BannerPromotionData | null = null;

    if (activeSections.some((s) => s.type === "featured_products")) {
      const docs = await Product.find({ status: "published", isFeatured: true })
        .sort({ totalSold: -1 })
        .limit(8)
        .lean();
      featuredProducts = await toCards(docs);
    }

    if (activeSections.some((s) => s.type === "collection_grid")) {
      const cols = await Collection.find({ isActive: true, isFeatured: true })
        .sort({ sortOrder: 1 })
        .limit(6)
        .lean();
      collectionCards = cols.map((c) => ({
        _id: c._id.toString(),
        slug: c.slug,
        name: c.name,
        image: c.image || "",
        description: c.description || "",
      }));
    }

    const newArrivalsSection = activeSections.find(
      (s) => s.type === "new_arrivals",
    );
    if (newArrivalsSection) {
      const limit =
        (newArrivalsSection.data as Record<string, number>)?.limit || 8;
      const docs = await getNewArrivals(limit);
      newArrivals = await toCards(docs);
    }

    const bestSellersSection = activeSections.find(
      (s) => s.type === "best_sellers",
    );
    if (bestSellersSection) {
      const limit =
        (bestSellersSection.data as Record<string, number>)?.limit || 8;
      const docs = await getBestSellers(limit);
      bestSellers = await toCards(docs);
    }

    if (activeSections.some((s) => s.type === "banner")) {
      const Promotion = (await import("@/lib/models/Promotion")).default;
      const now = new Date();
      const activeBanner = await Promotion.findOne({
        isActive: true,
        showBanner: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        "bannerImage.url": { $exists: true },
      })
        .sort({ priority: -1, createdAt: -1 })
        .select(
          "name bannerHeadline bannerSubheadline bannerImage ctaLabel ctaHref",
        )
        .lean<{
          name: string;
          bannerHeadline?: string;
          bannerSubheadline?: string;
          bannerImage?: { url: string };
          ctaLabel?: string;
          ctaHref?: string;
        }>();

      if (activeBanner?.bannerImage?.url) {
        bannerPromotion = {
          headline: activeBanner.bannerHeadline || activeBanner.name,
          subheadline: activeBanner.bannerSubheadline || null,
          imageUrl: activeBanner.bannerImage.url,
          ctaLabel: activeBanner.ctaLabel || null,
          ctaHref: activeBanner.ctaHref || null,
        };
      }
    }

    return {
      heroSlides,
      activeSections,
      featuredProducts,
      collectionCards,
      newArrivals,
      bestSellers,
      bannerPromotion,
    };
  } catch {
    return empty;
  }
}

export default async function HomePage() {
  const {
    heroSlides,
    activeSections,
    featuredProducts,
    collectionCards,
    newArrivals,
    bestSellers,
    bannerPromotion,
  } = await getHomeData();

  return (
    <main className="min-h-screen">
      {heroSlides.length > 0 && <HeroSlider slides={heroSlides} />}

      {activeSections.map((section, idx) => {
        const sectionData = {
          type: section.type,
          title: section.title || "",
          subtitle: section.subtitle || "",
        };

        switch (section.type) {
          case "featured_products":
            return (
              <FeaturedProductsSection
                key={idx}
                {...sectionData}
                products={featuredProducts}
              />
            );
          case "collection_grid":
            return (
              <CollectionGridSection
                key={idx}
                {...sectionData}
                collections={collectionCards}
              />
            );
          case "banner":
            return (
              <BannerSection
                key={idx}
                {...sectionData}
                promotion={bannerPromotion}
              />
            );
          case "newsletter":
            return <NewsletterSection key={idx} {...sectionData} />;
          case "new_arrivals":
            return (
              <NewArrivalsSection
                key={idx}
                {...sectionData}
                products={newArrivals}
              />
            );
          case "best_sellers":
            return (
              <BestSellersSection
                key={idx}
                {...sectionData}
                products={bestSellers}
              />
            );
          default:
            return null;
        }
      })}

      {heroSlides.length === 0 && activeSections.length === 0 && (
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="text-center max-w-md">
            <h1 className="font-serif text-4xl font-semibold text-neutral-600 mb-4">
              Keesdeen
            </h1>
            <p className="text-neutral-400 mb-6">
              Premium leather goods, crafted with care.
            </p>
            <Link
              href="/category/bags"
              className="inline-block px-8 py-3 bg-primary-400 text-white font-sans font-semibold  hover:bg-primary-500 transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
