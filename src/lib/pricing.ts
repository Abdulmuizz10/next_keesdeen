import "server-only";
import mongoose from "mongoose";
import Promotion, { IPromotion } from "./models/Promotion";
import { IProduct, IProductVariant } from "./models/Product";

export interface PricingResult {
  originalPrice: number; // Base price in cents
  effectivePrice: number; // After discounts, in cents
  discountAmount: number; // Savings in cents
  discountPercentage: number; // 0-100
  promotionApplied: {
    id: string;
    name: string;
    type: string;
  } | null;
  freeItemEligible: boolean; // For BOGO promotions
  currency: string;
}

export interface PricingInput {
  product: IProduct;
  variant: IProductVariant;
  quantity?: number;
  currentDate?: Date;
}

/**
 * The SINGLE source of truth for effective pricing.
 * Every part of the app (product page, cart, checkout) calls this function.
 * None of them re-implement discount math.
 */
export async function getEffectivePrice(
  input: PricingInput,
): Promise<PricingResult> {
  const { product, variant, quantity = 1, currentDate = new Date() } = input;

  // Get the base price (variant override or product base price)
  const originalPrice = variant.price ?? product.basePrice;
  const currency = product.currency || "GBP";

  // Find all active promotions that could apply
  const activePromotions = await Promotion.find({
    isActive: true,
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate },
  }).sort({ priority: -1 }); // Higher priority first

  // Filter promotions by scope
  const applicablePromotions = activePromotions.filter((promo) => {
    return isPromotionApplicable(promo, product);
  });

  if (applicablePromotions.length === 0) {
    return {
      originalPrice,
      effectivePrice: originalPrice,
      discountAmount: 0,
      discountPercentage: 0,
      promotionApplied: null,
      freeItemEligible: false,
      currency,
    };
  }

  // Find the best discount (highest savings)
  let bestResult: PricingResult = {
    originalPrice,
    effectivePrice: originalPrice,
    discountAmount: 0,
    discountPercentage: 0,
    promotionApplied: null,
    freeItemEligible: false,
    currency,
  };

  for (const promo of applicablePromotions) {
    const result = calculatePromotionDiscount(
      promo,
      originalPrice,
      quantity,
      currency,
    );

    // Choose the promotion that gives the highest discount
    if (result.discountAmount > bestResult.discountAmount) {
      bestResult = result;
    }
  }

  return bestResult;
}

/**
 * Check if a promotion is applicable to a product based on scope.
 */
function isPromotionApplicable(promo: IPromotion, product: IProduct): boolean {
  switch (promo.scope) {
    case "all":
      return true;

    case "category":
      if (!promo.scopeIds || promo.scopeIds.length === 0) return false;
      return product.categoryIds.some((catId) =>
        promo.scopeIds!.some((scopeId) => scopeId.equals(catId)),
      );

    case "collection":
      if (!promo.scopeIds || promo.scopeIds.length === 0) return false;
      return product.collectionIds.some((colId) =>
        promo.scopeIds!.some((scopeId) => scopeId.equals(colId)),
      );

    case "product":
      if (!promo.scopeIds || promo.scopeIds.length === 0) return false;
      return promo.scopeIds.some((scopeId) =>
        scopeId.equals(product._id as mongoose.Types.ObjectId),
      );

    default:
      return false;
  }
}

/**
 * Calculate the discount for a specific promotion type.
 */
function calculatePromotionDiscount(
  promo: IPromotion,
  originalPrice: number,
  quantity: number,
  currency: string,
): PricingResult {
  let discountAmount = 0;
  let effectivePrice = originalPrice;
  let freeItemEligible = false;

  switch (promo.type) {
    case "percentage":
      // Value is 0-100 percentage
      discountAmount = Math.round((originalPrice * promo.value) / 100);
      // Apply max discount cap if set
      if (promo.maxDiscountAmount && discountAmount > promo.maxDiscountAmount) {
        discountAmount = promo.maxDiscountAmount;
      }
      effectivePrice = originalPrice - discountAmount;
      break;

    case "fixed_amount":
      // Value is the fixed discount in cents
      discountAmount = Math.min(promo.value, originalPrice); // Can't discount more than price
      effectivePrice = originalPrice - discountAmount;
      break;

    case "buy_x_get_y":
      // For BOGO: if buying 2+, one item is effectively free or discounted
      // The cart will interpret this flag to apply the actual discount
      if (quantity >= 2) {
        // Typically buy 1 get 1 free, so 50% off when buying 2
        freeItemEligible = true;
        discountAmount = Math.round(originalPrice / 2); // Per-item savings when buying pair
        effectivePrice = originalPrice; // Display original, cart handles the BOGO
      }
      break;

    case "free_shipping":
      // This doesn't affect product price, but we track it
      // Shipping discounts are applied at cart/checkout level
      break;
  }

  // Ensure price doesn't go negative
  effectivePrice = Math.max(0, effectivePrice);

  const discountPercentage =
    originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

  return {
    originalPrice,
    effectivePrice,
    discountAmount,
    discountPercentage,
    promotionApplied: {
      id: promo._id.toString(),
      name: promo.name,
      type: promo.type,
    },
    freeItemEligible,
    currency,
  };
}

/**
 * Batch pricing for multiple products (for category pages).
 * Gets pricing for the default/first variant of each product.
 */
export async function getBatchPricing(
  products: IProduct[],
  currentDate: Date = new Date(),
): Promise<Map<string, PricingResult>> {
  const results = new Map<string, PricingResult>();

  // Fetch all active promotions once
  const activePromotions = await Promotion.find({
    isActive: true,
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate },
  }).sort({ priority: -1 });

  for (const product of products) {
    const variant =
      product.variants.find((v) => v.isActive) || product.variants[0];
    if (!variant) continue;

    const originalPrice = variant.price ?? product.basePrice;
    const currency = product.currency || "GBP";

    // Filter applicable promotions
    const applicablePromotions = activePromotions.filter((promo) =>
      isPromotionApplicable(promo, product),
    );

    let bestResult: PricingResult = {
      originalPrice,
      effectivePrice: originalPrice,
      discountAmount: 0,
      discountPercentage: 0,
      promotionApplied: null,
      freeItemEligible: false,
      currency,
    };

    for (const promo of applicablePromotions) {
      const result = calculatePromotionDiscount(
        promo,
        originalPrice,
        1,
        currency,
      );
      if (result.discountAmount > bestResult.discountAmount) {
        bestResult = result;
      }
    }

    results.set(product._id.toString(), bestResult);
  }

  return results;
}

// Re-export formatPrice from client-safe utility
export { formatPrice } from "./format";

/**
 * Get the price range for a product across all variants.
 */
export async function getProductPriceRange(
  product: IProduct,
  currentDate: Date = new Date(),
): Promise<{ min: PricingResult; max: PricingResult }> {
  const activeVariants = product.variants.filter((v) => v.isActive);
  if (activeVariants.length === 0) {
    const defaultVariant = product.variants[0];
    const result = await getEffectivePrice({
      product,
      variant: defaultVariant,
      currentDate,
    });
    return { min: result, max: result };
  }

  let minResult: PricingResult | null = null;
  let maxResult: PricingResult | null = null;

  for (const variant of activeVariants) {
    const result = await getEffectivePrice({ product, variant, currentDate });

    if (!minResult || result.effectivePrice < minResult.effectivePrice) {
      minResult = result;
    }
    if (!maxResult || result.effectivePrice > maxResult.effectivePrice) {
      maxResult = result;
    }
  }

  return {
    min: minResult!,
    max: maxResult!,
  };
}
