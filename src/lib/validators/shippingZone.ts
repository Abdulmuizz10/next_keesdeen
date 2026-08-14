import { z } from "zod";

export const shippingRateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(200, "Description too long").optional(),
  price: z.number().int().min(0, "Price must be positive"), // In cents
  minOrderAmount: z.number().int().min(0).optional(),
  maxOrderAmount: z.number().int().min(0).optional(),
  minWeight: z.number().min(0).optional(),
  maxWeight: z.number().min(0).optional(),
  estimatedDaysMin: z.number().int().min(0),
  estimatedDaysMax: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export const shippingZoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  countries: z.array(z.string().length(2).transform((val) => val.toUpperCase())),
  states: z.array(z.string().transform((val) => val.toUpperCase())).optional(),
  postalCodePatterns: z.array(z.string()).optional(),
  rates: z.array(shippingRateSchema),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const createShippingZoneSchema = shippingZoneSchema;

export const updateShippingZoneSchema = shippingZoneSchema.partial();

export type ShippingRateInput = z.infer<typeof shippingRateSchema>;
export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;
export type CreateShippingZoneInput = z.infer<typeof createShippingZoneSchema>;
export type UpdateShippingZoneInput = z.infer<typeof updateShippingZoneSchema>;
