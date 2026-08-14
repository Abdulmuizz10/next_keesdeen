"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/format";
import { WishlistButton } from "@/components/storefront/WishlistButton";

interface ProductPricing {
  effectivePrice: number;
  originalPrice: number;
  discountPercentage: number;
  hasDiscount: boolean;
}
interface ProductVariant {
  sku: string;
  attributes: { size?: string; color?: string; colorHex?: string };
  stock: number;
  isActive: boolean;
}

interface Product {
  _id: string;
  slug: string;
  title: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  variants: ProductVariant[];
  avgRating: number;
  reviewCount: number;
  pricing: ProductPricing | null;
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const getProductColors = (variants: ProductVariant[]) => {
    const map = new Map<string, string>();
    variants.forEach((v) => {
      if (v.isActive && v.attributes.color && v.attributes.colorHex)
        map.set(v.attributes.color, v.attributes.colorHex);
    });
    return Array.from(map.entries()).slice(0, 4);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
      {products.map((product, index) => {
        const colors = getProductColors(product.variants);
        const pricing = product.pricing;

        return (
          <motion.article
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.05,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="group"
          >
            <Link href={`/product/${product.slug}`} className="block">
              <div className="relative aspect-3/4 overflow-hidden bg-neutral-100 mb-4">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
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
                {pricing?.hasDiscount && (
                  <div className="absolute top-0 left-0 bg-secondary-400 text-white text-[10px] font-sans font-semibold uppercase tracking-[0.06em] px-3 py-1.5">
                    {pricing.discountPercentage}% Off
                  </div>
                )}

                <span className="absolute top-3 right-3">
                  <WishlistButton
                    productId={product._id}
                    size="lg"
                    className="w-full flex items-center justify-center py-3 border border-neutral-200 font-sans font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                  />
                </span>
              </div>

              <div className="space-y-2">
                {colors.length > 0 && (
                  <div className="flex gap-1.5">
                    {colors.map(([name, hex]) => (
                      <span
                        key={name}
                        className="w-3 h-3 border sf-border"
                        style={{ backgroundColor: hex }}
                        title={name}
                      />
                    ))}
                  </div>
                )}
                <h3 className="font-serif text-base font-light text-neutral-600 group-hover:text-primary-500 transition-colors duration-300 line-clamp-2 leading-snug">
                  {product.title}
                </h3>
                <p className="font-serif text-sm text-neutral-500">
                  {pricing?.hasDiscount ? (
                    <>
                      <span className="text-primary-500">
                        {formatPrice(pricing.effectivePrice)}
                      </span>
                      <span className="ml-2 text-neutral-300 line-through text-xs">
                        {formatPrice(pricing.originalPrice)}
                      </span>
                    </>
                  ) : (
                    formatPrice(pricing?.effectivePrice || product.basePrice)
                  )}
                </p>
                {product.reviewCount > 0 && (
                  <div className="flex items-center gap-1 text-xs font-sans text-neutral-400">
                    <span className="text-secondary-400">★</span>
                    {product.avgRating.toFixed(1)}
                    <span className="text-neutral-300">
                      ({product.reviewCount})
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </motion.article>
        );
      })}
    </div>
  );
}
