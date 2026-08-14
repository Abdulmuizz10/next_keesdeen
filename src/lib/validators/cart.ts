import { z } from "zod";

export const cartLineSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantSku: z.string().min(1, "Variant SKU is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const addToCartSchema = cartLineSchema;

export const updateCartLineSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantSku: z.string().min(1, "Variant SKU is required"),
  quantity: z.number().int().min(0, "Quantity must be non-negative"), // 0 = remove
});

export const removeFromCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantSku: z.string().min(1, "Variant SKU is required"),
});

export const applyCouponToCartSchema = z.object({
  couponCode: z.string().min(1, "Coupon code is required"),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartLineInput = z.infer<typeof updateCartLineSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
export type ApplyCouponToCartInput = z.infer<typeof applyCouponToCartSchema>;
