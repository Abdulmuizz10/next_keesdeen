import { z } from "zod";

export const collectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  description: z.string().max(1000, "Description too long").optional(),
  image: z.string().url().optional(),
  heroImage: z.string().url().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  seo: z
    .object({
      metaTitle: z.string().max(70, "Meta title too long").optional(),
      metaDescription: z.string().max(160, "Meta description too long").optional(),
    })
    .optional(),
});

export const createCollectionSchema = collectionSchema;

export const updateCollectionSchema = collectionSchema.partial();

export type CollectionInput = z.infer<typeof collectionSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
