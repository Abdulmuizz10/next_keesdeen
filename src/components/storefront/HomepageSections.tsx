"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/format";
import { NewsletterSignup } from "./NewsletterSignup";
import { ArrowRight } from "lucide-react";
import { WishlistButton } from "@/components/storefront/WishlistButton";

/* ── Shared types ── */

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

// Banner-promotion data, fetched server-side (wherever `products` and
// `collections` below are also fetched) and passed down as a prop — same
// pattern as everything else in this file. See note at the bottom of this
// file for what the server-side fetch looks like.
interface BannerPromotionData {
  headline: string;
  subheadline: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaHref: string | null;
}

interface SectionData {
  type: string;
  title: string;
  subtitle: string;
  products?: ProductCard[];
  collections?: CollectionCard[];
  promotion?: BannerPromotionData | null;
}

const reveal = (idx: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: {
    delay: idx * 0.06,
    duration: 0.5,
    ease: [0.25, 0.1, 0.25, 1] as const,
  },
});

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-12 sm:mb-16">
      <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-neutral-600">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-sm font-sans text-neutral-400 max-w-md mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ProductCardComponent({
  product,
  idx,
}: {
  product: ProductCard;
  idx: number;
}) {
  return (
    <motion.div {...reveal(idx)}>
      <Link href={`/product/${product.slug}`} className="group block">
        <div className="relative aspect-3/4 bg-neutral-100 overflow-hidden mb-4">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
              No image
            </div>
          )}
          {product.hasDiscount && (
            <span className="absolute top-0 left-0 bg-secondary-400 text-white text-[10px] font-sans font-semibold uppercase tracking-[0.06em] px-3 py-1.5">
              {product.discountPercentage}% Off
            </span>
          )}

          <span className="absolute top-3 right-3">
            <WishlistButton
              productId={product._id}
              size="lg"
              className="w-full flex items-center justify-center py-3 border border-neutral-200 font-sans font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            />
          </span>
        </div>
        <h3 className="font-serif text-base sm:text-lg font-light text-neutral-600 group-hover:text-primary-500 transition-colors duration-300 line-clamp-1">
          {product.title}
        </h3>
        <p className="font-serif text-sm text-neutral-500 mt-1">
          {formatPrice(product.effectivePrice)}
          {product.hasDiscount && (
            <span className="ml-2 text-neutral-300 line-through text-xs">
              {formatPrice(product.basePrice)}
            </span>
          )}
        </p>
      </Link>
    </motion.div>
  );
}

/* ── Section Components ── */

export function FeaturedProductsSection({
  title,
  subtitle,
  products,
}: SectionData) {
  if (!products || products.length === 0) return null;
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        <SectionHeading title={title || "Bestsellers"} subtitle={subtitle} />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {products.slice(0, 6).map((p, idx) => (
            <ProductCardComponent key={p._id} product={p} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function NewArrivalsSection({ title, subtitle, products }: SectionData) {
  if (!products || products.length === 0) return null;
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        <SectionHeading title={title || "New Arrivals"} subtitle={subtitle} />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {products.slice(0, 6).map((p, idx) => (
            <ProductCardComponent key={p._id} product={p} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BestSellersSection({ title, subtitle, products }: SectionData) {
  if (!products || products.length === 0) return null;
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        <SectionHeading title={title || "Best Sellers"} subtitle={subtitle} />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {products.slice(0, 6).map((p, idx) => (
            <ProductCardComponent key={p._id} product={p} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CollectionGridSection({
  title,
  subtitle,
  collections,
}: SectionData) {
  if (!collections || collections.length === 0) return null;
  return (
    <section className="py-16 sm:py-24 lg:py-32">
      <SectionHeading
        title={title || "Shop by Collection"}
        subtitle={subtitle}
      />
      {/* <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {collections.map((col, idx) => (
          <motion.div key={col._id} {...reveal(idx)}>
            <Link
              href={`/collections/${col.slug}`}
              className="group relative block h-72 sm:h-80 lg:h-96 overflow-hidden"
            >
              {col.image ? (
                <Image
                  src={col.image}
                  alt={col.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.02]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-200" />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <h3 className="font-serif text-xl sm:text-2xl font-light text-white">
                  {col.name}
                </h3>
                {col.description && (
                  <p className="text-sm text-white/70 mt-2 font-sans line-clamp-2">
                    {col.description}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-0.5">
        {collections?.slice(0, 4).map((col, idx) => (
          <motion.div key={col._id} {...reveal(idx)}>
            <Link
              key={col._id}
              href={`/collections/${col.slug}`}
              className="relative aspect-3/4 overflow-hidden group cursor-pointer block"
            >
              {/* Background */}
              {col.image ? (
                <Image
                  src={col.image}
                  alt={col.name}
                  fill
                  className="h-full w-full object-cover transition-transform duration-1000 ease-out-expo group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-200" />
              )}

              {/* Dark overlay */}
              <div className="absolute inset-0 z-10 bg-linear-to-t from-black/50 via-black/20 to-transparent group-hover:from-black/60 transition-all duration-700" />

              {/* Label */}
              <div className="absolute bottom-7 left-7 z-20">
                <p className="font-serif! text-[1.8rem] text-white leading-[1.1]">
                  {col.name}
                </p>

                <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-white/60 mt-1">
                  {/* {cat.count} Pieces */}
                </p>

                <span className="inline-flex items-center gap-2.5 text-[10px] font-sans text-gray-50 uppercase tracking-[0.22em] border-b border-white/40 pb-1.5 group-hover:gap-4 transition-all duration-300">
                  Shop Now <ArrowRight size={13} strokeWidth={1.5} />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// Renders as a Cloudinary-backed hero when `promotion` is provided (fetched
// server-side alongside `products`/`collections` — see note below), and
// falls back to the original flat-color strip otherwise, so a page with no
// active banner promotion configured doesn't render an empty section.
export function BannerSection({ title, subtitle, promotion }: SectionData) {
  if (!promotion) {
    return (
      <section className="py-16 sm:py-20 bg-primary-400">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-white">
            {title || "Free Shipping"}
          </h2>
          {subtitle && (
            <p className="mt-3 text-primary-100 text-sm font-sans">
              {subtitle}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden">
      <Image
        src={promotion.imageUrl}
        alt={promotion.headline}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Gradient overlay — darkest at the bottom where the text sits,
          fading upward, so the headline/CTA stay legible over any photo. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.35)_45%,rgba(0,0,0,0.05)_80%)]"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 text-center">
        <h2 className="font-serif text-3xl sm:text-5xl font-light text-white">
          {promotion.headline}
        </h2>
        {promotion.subheadline && (
          <p className="mt-4 text-white/85 text-base sm:text-lg font-sans max-w-2xl mx-auto">
            {promotion.subheadline}
          </p>
        )}
        {promotion.ctaLabel && promotion.ctaHref && (
          <Link
            href={promotion.ctaHref}
            className="mt-8 inline-flex items-center gap-2 px-8 py-3 bg-white text-neutral-900 font-sans font-semibold uppercase tracking-wide text-sm hover:bg-white/90 transition-colors"
          >
            {promotion.ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

export function NewsletterSection({ title, subtitle }: SectionData) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-lg px-6 sm:px-8 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-light">
          {title || "Join Our List"}
        </h2>
        {subtitle && (
          <p className="mt-4 text-neutral-300 text-sm font-sans leading-relaxed">
            {subtitle}
          </p>
        )}
        <div className="mt-10">
          <NewsletterSignup source="homepage" variant="hero" />
        </div>
        <p className="mt-6 text-[10px] font-sans uppercase tracking-widest text-neutral-400">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}

/*
 * ── Wiring this up ──────────────────────────────────────────────────
 * Wherever the parent server component currently builds the `sections`
 * array (fetching `products` for FeaturedProductsSection, `collections`
 * for CollectionGridSection, etc.) needs one more query for the "banner"
 * section's `promotion` field:
 *
 *   import Promotion from "@/lib/models/Promotion";
 *
 *   const activeBanner = await Promotion.findOne({
 *     isActive: true,
 *     showBanner: true,
 *     startDate: { $lte: new Date() },
 *     endDate: { $gte: new Date() },
 *     "bannerImage.url": { $exists: true },
 *   })
 *     .sort({ priority: -1, createdAt: -1 })
 *     .select("name bannerHeadline bannerSubheadline bannerImage ctaLabel ctaHref")
 *     .lean();
 *
 *   const promotion = activeBanner?.bannerImage?.url
 *     ? {
 *         headline: activeBanner.bannerHeadline || activeBanner.name,
 *         subheadline: activeBanner.bannerSubheadline || null,
 *         imageUrl: activeBanner.bannerImage.url,
 *         ctaLabel: activeBanner.ctaLabel || null,
 *         ctaHref: activeBanner.ctaHref || null,
 *       }
 *     : null;
 *
 * Then attach it to whichever section object has `type: "banner"` before
 * passing the sections array down to this client component.
 */
