import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHeroSlide {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  italicWord?: string;
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  textColor?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface IHomepageSection {
  type:
    | "featured_products"
    | "collection_grid"
    | "banner"
    | "testimonials"
    | "newsletter"
    | "new_arrivals"
    | "best_sellers";
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}

export interface INavItem {
  label: string;
  href: string;
  children?: INavItem[];
  isActive: boolean;
}

export interface ISiteConfig extends Document {
  _id: mongoose.Types.ObjectId;
  siteKey: string; // Always "main" - enforces singleton
  siteName: string;
  siteDescription: string;
  logo?: string;
  favicon?: string;
  heroSlides: IHeroSlide[];
  homepageSections: IHomepageSection[];
  navigation: INavItem[];
  footerNavigation: INavItem[];
  socialLinks: {
    platform: string;
    url: string;
  }[];
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  currency: string;
  locale: string;
  timezone: string;
  seo: {
    defaultMetaTitle?: string;
    defaultMetaDescription?: string;
    ogImage?: string;
  };
  features: {
    reviewsEnabled: boolean;
    wishlistEnabled: boolean;
    guestCheckoutEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const HeroSlideSchema = new Schema<IHeroSlide>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    eyebrow: { type: String },
    italicWord: { type: String },
    image: { type: String, required: true },
    mobileImage: { type: String },
    ctaText: { type: String },
    ctaLink: { type: String },
    textColor: { type: String, default: "#ffffff" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const HomepageSectionSchema = new Schema<IHomepageSection>(
  {
    type: {
      type: String,
      enum: [
        "featured_products",
        "collection_grid",
        "banner",
        "testimonials",
        "newsletter",
        "new_arrivals",
        "best_sellers",
      ],
      required: true,
    },
    title: { type: String },
    subtitle: { type: String },
    data: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const NavItemSchema = new Schema<INavItem>(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
    children: [{ type: Schema.Types.Mixed }],
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const SiteConfigSchema = new Schema<ISiteConfig>(
  {
    siteKey: {
      type: String,
      required: true,
      unique: true,
      default: "main",
      immutable: true,
    },
    siteName: {
      type: String,
      required: true,
      default: "Keesdeen",
    },
    siteDescription: {
      type: String,
      default: "Premium leather goods, crafted with care.",
    },
    logo: { type: String },
    favicon: { type: String },
    heroSlides: [HeroSlideSchema],
    homepageSections: [HomepageSectionSchema],
    navigation: [NavItemSchema],
    footerNavigation: [NavItemSchema],
    socialLinks: [
      {
        platform: { type: String },
        url: { type: String },
      },
    ],
    contactEmail: { type: String },
    contactPhone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    currency: { type: String, default: "GBP" },
    locale: { type: String, default: "en-GB" },
    timezone: { type: String, default: "Europe/London" },
    seo: {
      defaultMetaTitle: { type: String },
      defaultMetaDescription: { type: String },
      ogImage: { type: String },
    },
    features: {
      reviewsEnabled: { type: Boolean, default: true },
      wishlistEnabled: { type: Boolean, default: true },
      guestCheckoutEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
);

// Ensure singleton - only "main" key allowed
// SiteConfigSchema.index({ siteKey: 1 }, { unique: true });

// Pre-save guard to ensure singleton
SiteConfigSchema.pre("save", function () {
  if (this.isNew && this.siteKey !== "main") {
    this.siteKey = "main";
  }
});

const SiteConfig: Model<ISiteConfig> =
  mongoose.models.SiteConfig ||
  mongoose.model<ISiteConfig>("SiteConfig", SiteConfigSchema);

export default SiteConfig;

/**
 * Helper to get or create the singleton config.
 * Always use this instead of direct queries.
 */
export async function getSiteConfig(): Promise<ISiteConfig> {
  const config = await SiteConfig.findOneAndUpdate(
    { siteKey: "main" },
    { $setOnInsert: { siteKey: "main", siteName: "Keesdeen" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return config;
}
