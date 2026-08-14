import { z } from "zod";

export const couponTypeSchema = z.enum(["percentage", "fixed_amount", "free_shipping"]);

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code too long")
    .transform((val) => val.toUpperCase()),
  description: z.string().max(200, "Description too long").optional(),
  type: couponTypeSchema,
  value: z.number().min(0, "Value must be positive"),
  minPurchaseAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(0).optional(),
  usageLimitPerUser: z.number().int().min(0).optional(),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean().default(true),
  applicableProductIds: z.array(z.string()).optional(),
  applicableCategoryIds: z.array(z.string()).optional(),
  excludeProductIds: z.array(z.string()).optional(),
  excludeCategoryIds: z.array(z.string()).optional(),
  firstTimeOnly: z.boolean().default(false),
});

export const createCouponSchema = couponSchema;

export const updateCouponSchema = couponSchema.partial();

export const applyCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
});

export type CouponType = z.infer<typeof couponTypeSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
