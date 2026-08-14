import { z } from "zod";

/**
 * Address validator.
 * country and region store ISO codes (e.g. "US", "NY") so
 * /lib/tax.ts and /lib/shipping.ts match reliably.
 */
export const addressSchema = z.object({
  label: z.string().min(1).max(30).default("Home"),
  fullName: z.string().min(1, "Name is required").max(100),
  line1: z.string().min(1, "Address is required").max(200),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).default(""),
  region: z
    .string()
    .min(1, "State/region is required")
    .max(100),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z
    .string()
    .length(2, "Country must be a 2-letter ISO code")
    .transform((v) => v.toUpperCase()),
  phone: z.string().max(20).optional(),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
