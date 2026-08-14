"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useCartStore, CartLine } from "@/store/cartStore";
import { WishlistButton } from "./WishlistButton";
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { Ruler } from "lucide-react";

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

interface VariantPricing {
  originalPrice: number;
  effectivePrice: number;
  discountAmount: number;
  discountPercentage: number;
  hasDiscount: boolean;
  freeItemEligible: boolean;
  promotionName: string | null;
}

interface VariantSelectorProps {
  product: Product;
  pricing: Record<string, VariantPricing>;
}

export function VariantSelector({ product, pricing }: VariantSelectorProps) {
  const addLine = useCartStore((s) => s.addLine);
  const activeVariants = product.variants.filter((v) => v.isActive);

  // Extract unique colors and sizes
  const colors = useMemo(() => {
    const colorMap = new Map<
      string,
      { hex: string; variants: ProductVariant[] }
    >();
    activeVariants.forEach((v) => {
      if (v.attributes.color) {
        const existing = colorMap.get(v.attributes.color);
        if (existing) {
          existing.variants.push(v);
        } else {
          colorMap.set(v.attributes.color, {
            hex: v.attributes.colorHex || "#888888",
            variants: [v],
          });
        }
      }
    });
    return colorMap;
  }, [activeVariants]);

  const sizes = useMemo(() => {
    const sizeSet = new Set<string>();
    activeVariants.forEach((v) => {
      if (v.attributes.size) {
        sizeSet.add(v.attributes.size);
      }
    });
    return Array.from(sizeSet);
  }, [activeVariants]);

  // State for selected options
  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.size > 0 ? Array.from(colors.keys())[0] : null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    sizes.length > 0 ? sizes[0] : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Find the selected variant
  const selectedVariant = useMemo(() => {
    return activeVariants.find((v) => {
      const colorMatch = !selectedColor || v.attributes.color === selectedColor;
      const sizeMatch = !selectedSize || v.attributes.size === selectedSize;
      return colorMatch && sizeMatch;
    });
  }, [activeVariants, selectedColor, selectedSize]);

  // Get pricing for selected variant
  const selectedPricing = selectedVariant ? pricing[selectedVariant.sku] : null;

  // Check if size is available for selected color
  const isSizeAvailable = (size: string) => {
    return activeVariants.some(
      (v) =>
        v.attributes.size === size &&
        (!selectedColor || v.attributes.color === selectedColor) &&
        v.stock > 0,
    );
  };

  // Check if color is available for selected size
  const isColorAvailable = (color: string) => {
    return activeVariants.some(
      (v) =>
        v.attributes.color === color &&
        (!selectedSize || v.attributes.size === selectedSize) &&
        v.stock > 0,
    );
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);

    // If the currently selected size doesn't exist for this color,
    // snap to the first available size that does — otherwise the
    // swatch looks selectable but add-to-cart silently has nothing
    // to add.
    const currentSizeStillValid = activeVariants.some(
      (v) =>
        v.attributes.color === color &&
        v.attributes.size === selectedSize &&
        v.stock > 0,
    );

    if (!currentSizeStillValid) {
      const fallbackSize =
        activeVariants.find((v) => v.attributes.color === color && v.stock > 0)
          ?.attributes.size ?? null;
      setSelectedSize(fallbackSize);
    }
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);

    // Same correction, the other direction: if the selected color
    // doesn't exist at this size, snap to a color that does.
    const currentColorStillValid = activeVariants.some(
      (v) =>
        v.attributes.size === size &&
        v.attributes.color === selectedColor &&
        v.stock > 0,
    );

    if (!currentColorStillValid) {
      const fallbackColor =
        activeVariants.find((v) => v.attributes.size === size && v.stock > 0)
          ?.attributes.color ?? null;
      setSelectedColor(fallbackColor);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.stock < quantity) return;

    setIsAdding(true);

    // Build variant title string
    const variantParts: string[] = [];
    if (selectedVariant.attributes.color)
      variantParts.push(selectedVariant.attributes.color);
    if (selectedVariant.attributes.size)
      variantParts.push(selectedVariant.attributes.size);
    const variantTitle = variantParts.join(" / ");

    const line: CartLine = {
      productId: product._id,
      slug: product.slug,
      variantSku: selectedVariant.sku,
      title: product.title,
      image: product.images[0] || "",
      variantTitle,
      quantity,
      unitPrice: selectedPricing?.effectivePrice || product.basePrice,
      originalPrice: selectedPricing?.originalPrice || product.basePrice,
      discountAmount: selectedPricing?.discountAmount || 0,
      hasDiscount: selectedPricing?.hasDiscount || false,
      stock: selectedVariant.stock,
    };

    // Add to store and open drawer
    addLine(line);

    // Brief delay for visual feedback
    setTimeout(() => setIsAdding(false), 500);
  };

  const isOutOfStock = !selectedVariant || selectedVariant.stock === 0;
  const maxQuantity = selectedVariant ? Math.min(selectedVariant.stock, 10) : 0;

  return (
    <div className="mt-8 space-y-6">
      {/* Color Selector */}
      {colors.size > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sans font-medium text-neutral-600">Color</h3>
            {selectedColor && (
              <span className="text-sm text-neutral-400">{selectedColor}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from(colors.entries()).map(([colorName, { hex }]) => {
              const available = isColorAvailable(colorName);
              const isSelected = selectedColor === colorName;

              return (
                <button
                  key={colorName}
                  onClick={() => handleColorSelect(colorName)}
                  className={`relative w-10 h-10  transition-all ${
                    isSelected
                      ? "ring-2 ring-primary-400 ring-offset-2"
                      : available
                        ? "hover:ring-2 hover:ring-neutral-300 hover:ring-offset-1"
                        : "opacity-30"
                  }`}
                  style={{ backgroundColor: hex }}
                  title={colorName}
                  aria-label={`Select color: ${colorName}`}
                >
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <svg
                        className={`w-5 h-5 ${isLightColor(hex) ? "text-neutral-600" : "text-white"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.span>
                  )}
                  {!available && !isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-full h-0.5 bg-neutral-400 rotate-45 rounded" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size Selector */}
      {sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sans font-medium text-neutral-600">Size</h3>
            <span className="text-sm text-primary-500 hover:text-primary-600 cursor-pointer">
              Size Guide
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = isSizeAvailable(size);
              const isSelected = selectedSize === size;

              return (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className={`min-w-12 px-4 py-2.5  text-sm font-medium border transition-all ${
                    isSelected
                      ? "bg-primary-400 text-white border-primary-400"
                      : available
                        ? "bg-white text-neutral-600 border-neutral-200 hover:border-primary-300"
                        : "bg-neutral-50 text-neutral-300 border-neutral-100 line-through"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Variant Price */}
      {selectedPricing && (
        <div className="pt-4 border-t border-neutral-100">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-neutral-600">
              {formatPrice(selectedPricing.effectivePrice)}
            </span>
            {selectedPricing.hasDiscount && (
              <>
                <span className="text-neutral-300 line-through">
                  {formatPrice(selectedPricing.originalPrice)}
                </span>
                <span className="text-sm font-medium text-secondary-400">
                  Save {selectedPricing.discountPercentage}%
                </span>
              </>
            )}
          </div>
          {selectedPricing.promotionName && (
            <p className="text-sm text-secondary-400 mt-1">
              {selectedPricing.promotionName}
            </p>
          )}
        </div>
      )}

      {/* Quantity Selector */}
      <div>
        <h3 className="font-sans font-medium text-neutral-600 mb-3">
          Quantity
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-neutral-200 ">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 disabled:text-neutral-300 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="w-12 text-center font-medium text-neutral-600">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 disabled:text-neutral-300 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
          {selectedVariant &&
            selectedVariant.stock <= 5 &&
            selectedVariant.stock > 0 && (
              <span className="text-sm text-secondary-400">
                Only {selectedVariant.stock} left!
              </span>
            )}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className={`col-span-5 w-full py-4 font-sans font-semibold text-lg transition-colors ${
            isOutOfStock
              ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              : isAdding
                ? "bg-primary-300 text-white"
                : "bg-primary-400 text-white hover:bg-primary-500"
          }`}
        >
          {isOutOfStock
            ? "Out of Stock"
            : isAdding
              ? "✓ Added!"
              : "Add to Cart"}
        </motion.button>

        <div className="col-span-1 flex gap-2">
          <WishlistButton
            productId={product._id}
            size="lg"
            className="w-full flex items-center justify-center py-3 border border-neutral-200 font-sans font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          />

          {/* <WishlistButton
            productId={product._id}
            size="lg"
            className="w-full flex items-center justify-center py-3 border border-neutral-200 font-sans font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          /> */}

          <Link href={"/size-guide"}>
            <div className="w-full h-full flex items-center justify-center py-3 px-3 border border-neutral-200 font-sans font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
              <Ruler />
            </div>
          </Link>
        </div>
      </div>
      {/* Shipping Info */}
      <div className="pt-6 border-t border-neutral-100 space-y-3">
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <svg
            className="w-5 h-5 text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          <span>Free shipping on orders over $150</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <svg
            className="w-5 h-5 text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>30-day returns & exchanges</span>
        </div>
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 128;
}
