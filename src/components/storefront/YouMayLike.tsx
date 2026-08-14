"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/format";

interface RelatedProduct {
  _id: string;
  slug: string;
  title: string;
  image: string;
  effectivePrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
}

interface YouMayLikeProps {
  products: RelatedProduct[];
}

export function YouMayLike({ products }: YouMayLikeProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-neutral-200 pt-12">
      <h2 className="font-serif text-2xl font-semibold text-neutral-600 mb-8 text-center">
        You May Also Like
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product, idx) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
          >
            <Link href={`/product/${product.slug}`} className="group block">
              <div className="relative aspect-[3/4] bg-neutral-100  overflow-hidden mb-3">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-300">No image</div>
                )}
                {product.hasDiscount && (
                  <span className="absolute top-2 left-2 bg-secondary-400 text-white text-xs font-semibold px-2 py-0.5 rounded">
                    -{product.discountPercentage}%
                  </span>
                )}
              </div>
              <h3 className="font-serif text-base font-medium text-neutral-600 group-hover:text-primary-500 transition-colors line-clamp-1">
                {product.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-sans font-semibold text-neutral-500 text-sm">
                  {formatPrice(product.effectivePrice)}
                </span>
                {product.hasDiscount && (
                  <span className="text-xs text-neutral-300 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
