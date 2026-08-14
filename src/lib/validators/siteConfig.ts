import { z } from "zod";

export const heroSlideSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  subtitle: z.string().max(200, "Subtitle too long").optional(),
  image: z.string().url("Invalid image URL"),
  mobileImage: z.string().url().optional(),
  ctaText: z.string().max(50, "CTA text too long").optional(),
  ctaLink: z.string().optional(),
  textColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .default("#ffffff"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const homepageSectionSchema = z.object({
  type: z.enum([
    "featured_products",
    "collection_grid",
    "banner",
    "testimonials",
    "newsletter",
  ]),
  title: z.string().max(100, "Title too long").optional(),
  subtitle: z.string().max(200, "Subtitle too long").optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export interface INavItemInput {
  label: string;
  href: string;
  children?: INavItemInput[];
  isActive: boolean;
}

export const navItemSchema: z.ZodType<INavItemInput> = z.lazy(() =>
  z.object({
    label: z.string().min(1, "Label is required").max(50, "Label too long"),
    href: z.string().min(1, "Href is required"),
    children: z.array(navItemSchema).optional(),
    isActive: z.boolean().default(true),
  }),
);

export const siteConfigSchema = z.object({
  siteName: z
    .string()
    .min(1, "Site name is required")
    .max(100, "Site name too long"),
  siteDescription: z.string().max(500, "Description too long").optional(),
  logo: z.string().url().optional(),
  favicon: z.string().url().optional(),
  heroSlides: z.array(heroSlideSchema),
  homepageSections: z.array(homepageSectionSchema),
  navigation: z.array(navItemSchema),
  footerNavigation: z.array(navItemSchema),
  socialLinks: z.array(
    z.object({
      platform: z.string().min(1),
      url: z.string().url(),
    }),
  ),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  currency: z.string().length(3).default("GBP"),
  locale: z.string().default("en-US"),
  timezone: z.string().default("America/New_York"),
  seo: z
    .object({
      defaultMetaTitle: z.string().max(70).optional(),
      defaultMetaDescription: z.string().max(160).optional(),
      ogImage: z.string().url().optional(),
    })
    .optional(),
  features: z
    .object({
      reviewsEnabled: z.boolean().default(true),
      wishlistEnabled: z.boolean().default(true),
      guestCheckoutEnabled: z.boolean().default(true),
    })
    .optional(),
});

export const updateSiteConfigSchema = siteConfigSchema.partial();

export type HeroSlideInput = z.infer<typeof heroSlideSchema>;
export type HomepageSectionInput = z.infer<typeof homepageSectionSchema>;
export type NavItemInput = INavItemInput;
export type SiteConfigInput = z.infer<typeof siteConfigSchema>;
export type UpdateSiteConfigInput = z.infer<typeof updateSiteConfigSchema>;
