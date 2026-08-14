import { z } from "zod";

export const taxRateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  country: z.string().length(2, "Country must be 2-letter ISO code").transform((val) => val.toUpperCase()),
  state: z.string().max(10).transform((val) => val.toUpperCase()).optional(),
  postalCodePattern: z.string().optional(),
  rate: z.number().min(0, "Rate must be positive").max(100, "Rate cannot exceed 100%"),
  isCompound: z.boolean().default(false),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const createTaxRateSchema = taxRateSchema;

export const updateTaxRateSchema = taxRateSchema.partial();

export type TaxRateInput = z.infer<typeof taxRateSchema>;
export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;
