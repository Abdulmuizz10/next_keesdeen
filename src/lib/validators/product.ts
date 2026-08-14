import { z } from "zod";

export const productStatusSchema = z.enum(["draft", "published", "archived"]);

export const productVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  attributes: z.object({
    size: z.string().optional(),
    color: z.string().optional(),
    colorHex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
      .optional(),
  }),
  price: z.number().min(0, "Price must be positive").optional(),
  stock: z.number().int().min(0, "Stock must be non-negative"),
  images: z.array(z.string().url()).optional(),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200, "Slug too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(10000, "Description too long"),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  basePrice: z.number().min(0, "Price must be positive"),
  compareAtPrice: z
    .number()
    .min(0, "Compare at price must be positive")
    .optional(),
  currency: z
    .string()
    .length(3, "Currency must be 3 characters")
    .default("GBP"),
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required"),
  categoryIds: z.array(z.string()),
  tags: z.array(z.string().max(50, "Tag too long")),
  collectionIds: z.array(z.string()),
  status: productStatusSchema.default("draft"),
  seo: z.object({
    metaTitle: z.string().max(70, "Meta title too long").optional(),
    metaDescription: z
      .string()
      .max(160, "Meta description too long")
      .optional(),
  }),
  isFeatured: z.boolean().default(false),
});

export const createProductSchema = productSchema;

export const updateProductSchema = productSchema.partial();

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
