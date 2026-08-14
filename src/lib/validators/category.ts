import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  description: z.string().max(500, "Description too long").optional(),
  image: z.string().url().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  seo: z
    .object({
      metaTitle: z.string().max(70, "Meta title too long").optional(),
      metaDescription: z.string().max(160, "Meta description too long").optional(),
    })
    .optional(),
});

export const createCategorySchema = categorySchema;

export const updateCategorySchema = categorySchema.partial();

export type CategoryInput = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
