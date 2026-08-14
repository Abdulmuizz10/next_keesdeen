"use client";

import { formatPrice } from "@/lib/format";

interface ProductVariant {
  sku: string;
  attributes: {
    size?: string;
    color?: string;
    colorHex?: string;
  };
  price?: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

interface Product {
  _id: string;
  slug: string;
  title: string;
  description: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  avgRating: number;
  reviewCount: number;
  variants: ProductVariant[];
  tags: string[];
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface VariantPricing {
  originalPrice: number;
  effectivePrice: number;
  discountAmount: number;
  discountPercentage: number;
  hasDiscount: boolean;
  freeItemEligible: boolean;
  promotionName: string | null;
}

interface ProductInfoProps {
  product: Product;
  categories: Category[];
  pricing: Record<string, VariantPricing>;
}

export function ProductInfo({ product, categories, pricing }: ProductInfoProps) {
  // Get price range from all active variants
  const activeVariants = product.variants.filter((v) => v.isActive);
  const prices = activeVariants.map((v) => pricing[v.sku]?.effectivePrice || product.basePrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const hasRange = minPrice !== maxPrice;

  // Check if any variant has a discount
  const hasAnyDiscount = Object.values(pricing).some((p) => p.hasDiscount);
  const maxOriginalPrice = Math.max(
    ...activeVariants.map((v) => pricing[v.sku]?.originalPrice || product.basePrice)
  );

  // Calculate total stock
  const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);

  // Get the best discount percentage
  const maxDiscountPercentage = Math.max(...Object.values(pricing).map((p) => p.discountPercentage));

  return (
    <div className="space-y-6">
      {/* Category */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <a
              key={cat._id}
              href={`/category/${cat.slug}`}
              className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
            >
              {cat.name}
            </a>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-neutral-600">
        {product.title}
      </h1>

      {/* Rating */}
      {product.reviewCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(product.avgRating) ? "text-secondary-400" : "text-neutral-200"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-neutral-500">{product.avgRating.toFixed(1)}</span>
          <span className="text-neutral-300">•</span>
          <a href="#reviews" className="text-neutral-400 hover:text-primary-500 transition-colors">
            {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
          </a>
        </div>
      )}

      {/* Price */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="font-sans text-2xl font-bold text-neutral-600">
            {hasRange
              ? `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
              : formatPrice(minPrice)}
          </span>
          {hasAnyDiscount && !hasRange && (
            <span className="font-sans text-lg text-neutral-300 line-through">
              {formatPrice(maxOriginalPrice)}
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {hasAnyDiscount && maxDiscountPercentage > 0 && (
          <div className="inline-flex items-center gap-2">
            <span className="bg-secondary-400 text-white text-sm font-semibold px-2 py-0.5 rounded">
              Save {maxDiscountPercentage}%
            </span>
            {Object.values(pricing).some((p) => p.promotionName) && (
              <span className="text-sm text-secondary-400">
                {Object.values(pricing).find((p) => p.promotionName)?.promotionName}
              </span>
            )}
          </div>
        )}

        {/* BOGO indicator */}
        {Object.values(pricing).some((p) => p.freeItemEligible) && (
          <div className="mt-2 bg-primary-50 border border-primary-200 text-primary-600 text-sm px-3 py-2 ">
            🎁 Buy 2+ and get special pricing!
          </div>
        )}
      </div>

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        {totalStock > 0 ? (
          <>
            <span className="w-2 h-2 bg-green-500 " />
            <span className="text-sm text-neutral-500">
              {totalStock > 10 ? "In Stock" : `Only ${totalStock} left`}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-red-500 " />
            <span className="text-sm text-neutral-500">Out of Stock</span>
          </>
        )}
      </div>
    </div>
  );
}
