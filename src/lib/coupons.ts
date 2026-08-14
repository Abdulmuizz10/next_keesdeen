// src/lib/coupons.ts
//
// Single source of truth for "is this coupon valid right now, for this
// cart, for this user" — used by /api/cart to preview the discount, and
// should also be used by your /api/checkout route to re-validate and apply
// it at order-creation time (never trust a discount amount the client sends).

import Coupon, { ICoupon } from "@/lib/models/Coupon";

export interface CouponLineInput {
  productId: string;
  categoryIds?: string[];
  quantity: number;
  unitPrice: number; // cents, post markdown-discount price
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: ICoupon;
  discountAmount: number; // cents, applied against subtotal
  freeShipping: boolean;
}

const invalid = (error: string): CouponValidationResult => ({
  valid: false,
  error,
  discountAmount: 0,
  freeShipping: false,
});

/**
 * Validates a coupon code against the current cart contents and computes
 * the discount it would apply. Does NOT mutate usage counts — that only
 * happens once an order is actually placed (see recordCouponUsage).
 *
 * `isFirstTimeCustomer` is optional because this module has no visibility
 * into your Order model. If a coupon has firstTimeOnly set and you want
 * that enforced, look up the customer's order history where you call this
 * (e.g. in /api/checkout) and pass the result in.
 */
export async function validateCoupon(
  code: string | null | undefined,
  subtotal: number,
  lines: CouponLineInput[],
  userId: string | null,
  isFirstTimeCustomer?: boolean,
): Promise<CouponValidationResult> {
  if (!code) return invalid("No coupon code provided");

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon) return invalid("Coupon not found");

  const now = new Date();
  if (!coupon.isActive) return invalid("This coupon is no longer active");
  if (now < coupon.startDate) return invalid("This coupon isn't active yet");
  if (now > coupon.endDate) return invalid("This coupon has expired");

  if (coupon.firstTimeOnly && isFirstTimeCustomer === false) {
    return invalid("This coupon is only valid for first-time customers");
  }

  if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
    return invalid(
      `Minimum purchase of $${(coupon.minPurchaseAmount / 100).toFixed(2)} required`,
    );
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return invalid("This coupon has reached its usage limit");
  }

  if (userId && coupon.usageLimitPerUser) {
    const used = coupon.userUsage?.get(userId) || 0;
    if (used >= coupon.usageLimitPerUser) {
      return invalid(
        "You've already used this coupon the maximum number of times",
      );
    }
  }

  // Product / category scoping
  const applicableProductIds = (coupon.applicableProductIds || []).map(String);
  const applicableCategoryIds = (coupon.applicableCategoryIds || []).map(
    String,
  );
  const excludeProductIds = (coupon.excludeProductIds || []).map(String);
  const excludeCategoryIds = (coupon.excludeCategoryIds || []).map(String);
  const hasScopeRestriction =
    applicableProductIds.length > 0 || applicableCategoryIds.length > 0;

  let eligibleSubtotal = 0;
  for (const line of lines) {
    const isExcluded =
      excludeProductIds.includes(line.productId) ||
      (line.categoryIds || []).some((c) => excludeCategoryIds.includes(c));
    if (isExcluded) continue;

    const isIncluded =
      !hasScopeRestriction ||
      applicableProductIds.includes(line.productId) ||
      (line.categoryIds || []).some((c) => applicableCategoryIds.includes(c));
    if (!isIncluded) continue;

    eligibleSubtotal += line.unitPrice * line.quantity;
  }

  const isScoped =
    hasScopeRestriction ||
    excludeProductIds.length > 0 ||
    excludeCategoryIds.length > 0;
  if (isScoped && eligibleSubtotal === 0) {
    return invalid("This coupon doesn't apply to the items in your cart");
  }

  const scopedSubtotal = isScoped ? eligibleSubtotal : subtotal;

  let discountAmount = 0;
  let freeShipping = false;

  switch (coupon.type) {
    case "percentage":
      discountAmount = Math.round((scopedSubtotal * coupon.value) / 100);
      break;
    case "fixed_amount":
      discountAmount = Math.min(coupon.value, scopedSubtotal);
      break;
    case "free_shipping":
      freeShipping = true;
      break;
  }

  if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
    discountAmount = coupon.maxDiscountAmount;
  }

  return { valid: true, coupon, discountAmount, freeShipping };
}

/**
 * Call this once, right after an order is successfully placed (inside
 * /api/checkout, after payment succeeds) — increments the coupon's global
 * usage count and this customer's per-user count. Never call this during
 * cart preview/validation, only on confirmed order creation.
 */
export async function recordCouponUsage(code: string, userId: string | null) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon) return;

  coupon.usageCount += 1;
  if (userId) {
    const current = coupon.userUsage?.get(userId) || 0;
    coupon.userUsage?.set(userId, current + 1);
    coupon.markModified("userUsage");
  }
  await coupon.save();
}
