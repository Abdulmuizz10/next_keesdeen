import { z } from "zod";

export const promotionTypeSchema = z.enum([
  "percentage",
  "fixed_amount",
  "buy_x_get_y",
  "free_shipping",
]);
export const promotionScopeSchema = z.enum([
  "all",
  "category",
  "collection",
  "product",
]);

export const promotionBannerImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
});

export const promotionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  code: z.string().max(20, "Code too long").optional(),
  type: promotionTypeSchema,
  value: z.number().min(0, "Value must be positive"),
  scope: promotionScopeSchema.default("all"),
  scopeIds: z.array(z.string()).optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(0).optional(),
  startDate: z.date(),
  endDate: z.date(),
  isActive: z.boolean().default(true),
  isStackable: z.boolean().default(false),
  priority: z.number().int().default(0),

  // Storefront banner — independent of discount mechanics above.
  showBanner: z.boolean().default(false),
  bannerImage: promotionBannerImageSchema.optional(),
  bannerHeadline: z.string().max(120, "Headline too long").optional(),
  bannerSubheadline: z.string().max(240, "Subheadline too long").optional(),
  ctaLabel: z.string().max(40, "CTA label too long").optional(),
  ctaHref: z.string().max(300, "CTA link too long").optional(),
});

export const createPromotionSchema = promotionSchema;

export const updatePromotionSchema = promotionSchema.partial();

export type PromotionType = z.infer<typeof promotionTypeSchema>;
export type PromotionScope = z.infer<typeof promotionScopeSchema>;
export type PromotionInput = z.infer<typeof promotionSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
