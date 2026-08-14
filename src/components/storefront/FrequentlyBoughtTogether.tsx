"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCartStore, CartLine } from "@/store/cartStore";

interface BundleProduct {
  _id: string;
  slug: string;
  title: string;
  image: string;
  effectivePrice: number;
  originalPrice: number;
  variantSku: string;
  stock: number;
}

interface FrequentlyBoughtTogetherProps {
  anchorProduct: BundleProduct;
  bundleItems: BundleProduct[];
  bundleTitle?: string;
}

export function FrequentlyBoughtTogether({
  anchorProduct,
  bundleItems,
  bundleTitle,
}: FrequentlyBoughtTogetherProps) {
  const addLine = useCartStore((s) => s.addLine);

  if (bundleItems.length === 0) return null;

  const allProducts = [anchorProduct, ...bundleItems];
  const bundleTotal = allProducts.reduce((sum, p) => sum + p.effectivePrice, 0);

  const addAllToCart = () => {
    for (const product of allProducts) {
      const line: CartLine = {
        productId: product._id,
        variantSku: product.variantSku,
        title: product.title,
        image: product.image,
        variantTitle: "Default",
        quantity: 1,
        unitPrice: product.effectivePrice,
        originalPrice: product.originalPrice,
        discountAmount: product.originalPrice - product.effectivePrice,
        hasDiscount: product.effectivePrice < product.originalPrice,
        stock: product.stock,
      };
      addLine(line);
    }
  };

  return (
    <section className="mt-16 border-t border-neutral-200 pt-12">
      <h2 className="font-serif text-2xl font-semibold text-neutral-600 mb-8">
        {bundleTitle || "Frequently Bought Together"}
      </h2>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Product cards with + signs */}
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {allProducts.map((product, idx) => (
            <div key={product._id} className="flex items-center gap-4">
              {idx > 0 && (
                <div className="w-8 h-8  bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Plus size={16} className="text-neutral-400" />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="w-28 sm:w-32"
              >
                <Link href={`/product/${product.slug}`} className="group block">
                  <div className="relative aspect-square bg-neutral-100  overflow-hidden mb-2">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="128px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs">
                        No image
                      </div>
                    )}
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 bg-primary-400 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold">
                        This item
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-neutral-600 group-hover:text-primary-500 transition-colors line-clamp-2">
                    {product.title}
                  </p>
                  <p className="text-xs font-semibold text-neutral-500 mt-0.5">
                    {formatPrice(product.effectivePrice)}
                  </p>
                </Link>
              </motion.div>
            </div>
          ))}
        </div>

        {/* Add all to cart CTA */}
        <div className="bg-neutral-50  p-6 lg:w-64 flex-shrink-0 w-full lg:sticky lg:top-24">
          <p className="text-sm text-neutral-500 mb-1">
            Bundle total ({allProducts.length} items)
          </p>
          <p className="text-2xl font-bold text-neutral-600 mb-4">
            {formatPrice(bundleTotal)}
          </p>
          <button
            onClick={addAllToCart}
            className="w-full py-3 bg-primary-400 text-white font-semibold  hover:bg-primary-500 transition-colors text-sm"
          >
            Add All to Cart
          </button>
        </div>
      </div>
    </section>
  );
}
