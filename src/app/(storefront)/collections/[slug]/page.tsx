import "server-only";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/db";
import Collection from "@/lib/models/Collection";
import Product from "@/lib/models/Product";
import { getBatchPricing } from "@/lib/pricing";
import { ProductGrid } from "@/components/storefront/ProductGrid";

export const revalidate = 60;

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  await dbConnect();
  const { slug } = await params;
  const collection = await Collection.findOne({ slug, isActive: true }).lean();
  if (!collection) return { title: "Collection Not Found" };
  return {
    title: collection.seo?.metaTitle || collection.name,
    description:
      collection.seo?.metaDescription ||
      collection.description ||
      `Shop the ${collection.name} collection at Keesdeen.`,
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  await dbConnect();
  const { slug } = await params;
  const collection = await Collection.findOne({ slug, isActive: true }).lean();
  if (!collection) notFound();

  const products = await Product.find({
    collectionIds: collection._id,
    status: "published",
  })
    .sort({ isFeatured: -1, totalSold: -1 })
    .lean();

  const pricingMap = await getBatchPricing(products as never[]);

  // Bento layout: cycle through sizes for visual variety
  // Pattern: large, standard, standard, large, standard, standard...
  const sizePattern = ["large", "standard", "standard"];

  const serializedProducts = products.map((product, idx) => {
    const pricing = pricingMap.get(product._id.toString());
    return {
      _id: product._id.toString(),
      slug: product.slug,
      title: product.title,
      images: product.images,
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice,
      variants: product.variants.map((v) => ({
        ...v,
        attributes: v.attributes,
      })),
      avgRating: product.avgRating,
      reviewCount: product.reviewCount,
      pricing: pricing
        ? {
            effectivePrice: pricing.effectivePrice,
            originalPrice: pricing.originalPrice,
            discountPercentage: pricing.discountPercentage,
            hasDiscount: pricing.discountAmount > 0,
          }
        : null,
      bentoSize: sizePattern[idx % sizePattern.length],
    };
  });

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative h-120 md:h-145 overflow-hidden">
        {collection.image ? (
          <Image
            src={collection.image}
            alt={collection.name}
            width={100}
            height={100}
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-200" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-primary-200/60 via-primary-100/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
          <div className="mx-auto max-w-[1400px]">
            <nav className="mb-4">
              <Link
                href="/collections"
                className="text-[10px] font-sans uppercase tracking-[0.12em] text-white/60 hover:text-white/80 transition-colors"
              >
                ← Collections
              </Link>
            </nav>
            <h1 className="font-serif text-3xl sm:text-5xl font-light text-white">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-3 text-sm font-sans text-white/70 max-w-lg leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bento product grid */}
      <section className="mx-auto max-w-[1400px] py-12 sm:py-16">
        {serializedProducts.length > 0 ? (
          <ProductGrid products={serializedProducts} />
        ) : (
          <div className="text-center py-20">
            <p className="font-serif text-neutral-400">
              No products in this collection yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

/* ── Bento Grid Component ── */

import { formatPrice } from "@/lib/format";

interface BentoProduct {
  _id: string;
  slug: string;
  title: string;
  images: string[];
  pricing: {
    effectivePrice: number;
    originalPrice: number;
    discountPercentage: number;
    hasDiscount: boolean;
  } | null;
  basePrice: number;
  bentoSize: string;
}

function BentoGrid({ products }: { products: BentoProduct[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 auto-rows-auto">
      {products.map((product) => {
        const isLarge = product.bentoSize === "large";
        const pricing = product.pricing;

        return (
          <Link
            key={product._id}
            href={`/product/${product.slug}`}
            className={`group block ${isLarge ? "col-span-2 lg:col-span-1 row-span-2" : ""}`}
          >
            <div
              className={`relative overflow-hidden bg-neutral-100 ${isLarge ? "aspect-3/4 sm:aspect-2/3" : "aspect-3/4"}`}
            >
              {product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.title}
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.02]"
                  sizes={
                    isLarge
                      ? "(max-width: 640px) 100vw, 50vw"
                      : "(max-width: 640px) 50vw, 33vw"
                  }
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                  No image
                </div>
              )}
              {pricing?.hasDiscount && (
                <span className="absolute top-0 left-0 bg-secondary-400 text-white text-[10px] font-sans font-semibold uppercase tracking-[0.06em] px-3 py-1.5">
                  {pricing.discountPercentage}% Off
                </span>
              )}
            </div>
            <div className="mt-3">
              <h3 className="font-serif text-base font-light text-neutral-600 group-hover:text-primary-500 transition-colors duration-300 line-clamp-1">
                {product.title}
              </h3>
              <p className="font-serif text-sm text-neutral-500 mt-1">
                {formatPrice(pricing?.effectivePrice || product.basePrice)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
