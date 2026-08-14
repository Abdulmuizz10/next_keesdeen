import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Import ALL models
import User from "./models/User";
import Category from "./models/Category";
import Collection from "./models/Collection";
import Product from "./models/Product";
import SiteConfig from "./models/SiteConfig";
import Promotion from "./models/Promotion";
import Coupon from "./models/Coupon";
import TaxRate from "./models/TaxRate";
import ShippingZone from "./models/ShippingZone";
import Subscriber from "./models/Subscriber";
import Order, { generateOrderNumber } from "./models/Order";
import Review from "./models/Review";
import Wishlist from "./models/Wishlist";
import Bundle from "./models/Bundle";
import AuditLog from "./models/AuditLog";
import Cart from "./models/Cart";
import Refund from "./models/Refund";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI)
  throw new Error("Please define MONGODB_URI environment variable");

const img = (id: number) => `https://picsum.photos/seed/keesdeen${id}/800/1000`;

async function seed() {
  console.log("🌱 Starting full seed…");
  await mongoose.connect(MONGODB_URI as string);
  console.log("📦 Connected to MongoDB");

  // ── Clear everything ──
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Collection.deleteMany({}),
    Product.deleteMany({}),
    SiteConfig.deleteMany({}),
    Promotion.deleteMany({}),
    Coupon.deleteMany({}),
    TaxRate.deleteMany({}),
    ShippingZone.deleteMany({}),
    Subscriber.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Wishlist.deleteMany({}),
    Bundle.deleteMany({}),
    AuditLog.deleteMany({}),
    Cart.deleteMany({}),
    Refund.deleteMany({}),
  ]);
  console.log("🗑️  Cleared all collections");

  // ══════════════════════════════════════════════════════════════════
  // USERS (Phase 4)
  // ══════════════════════════════════════════════════════════════════
  const pw = async (p: string) => bcrypt.hash(p, 12);

  const adminUser = await User.create({
    email: "admin@keesdeen.com",
    name: "Kees Admin",
    passwordHash: await pw("admin123"),
    role: "super_admin",
    emailVerified: new Date(),
  });
  await User.create({
    email: "staff@keesdeen.com",
    name: "Staff Member",
    passwordHash: await pw("staff123"),
    role: "staff",
    emailVerified: new Date(),
  });
  await User.create({
    email: "support@keesdeen.com",
    name: "Support Agent",
    passwordHash: await pw("support123"),
    role: "support",
    emailVerified: new Date(),
  });
  const customerUser = await User.create({
    email: "customer@example.com",
    name: "Demo Customer",
    passwordHash: await pw("customer123"),
    role: "customer",
    emailVerified: new Date(),
  });
  const customer2 = await User.create({
    email: "maria@example.com",
    name: "Maria Lopez",
    passwordHash: await pw("customer123"),
    role: "customer",
    emailVerified: new Date(),
  });
  console.log("👤 Created 5 users (admin, staff, support, 2 customers)");

  // ══════════════════════════════════════════════════════════════════
  // CATEGORIES (Phase 1)
  // ══════════════════════════════════════════════════════════════════
  const [activeWearsCat, fitnessAccessoriesCat] = await Category.insertMany([
    {
      name: "Active Wears",
      slug: "active-wears",
      description: "Performance-driven apparel engineered for movement",
      sortOrder: 1,
      isActive: true,
      seo: {
        metaTitle: "Active Wears | Keesdeen",
        metaDescription:
          "Shop performance activewear built for training and everyday movement.",
      },
    },
    {
      name: "Fitness Accessories",
      slug: "fitness-accessories",
      description: "Essential gear to elevate every workout",
      sortOrder: 2,
      isActive: true,
      seo: {
        metaTitle: "Fitness Accessories | Keesdeen",
        metaDescription:
          "Explore our range of fitness accessories designed for performance.",
      },
    },
  ]);
  console.log("📂 Created 2 categories");

  // ══════════════════════════════════════════════════════════════════
  // COLLECTIONS (Phase 1)
  // ══════════════════════════════════════════════════════════════════
  const [springCol, heritageCol, minimalistCol, essentialsCol] =
    await Collection.insertMany([
      {
        name: "Spring Essentials",
        slug: "spring-essentials",
        description: "Fresh styles for the new season",
        sortOrder: 1,
        isActive: true,
        isFeatured: true,
        image: img(101),
      },
      {
        name: "Heritage Collection",
        slug: "heritage-collection",
        description: "Timeless pieces inspired by classic craftsmanship",
        sortOrder: 2,
        isActive: true,
        isFeatured: true,
        image: img(102),
      },
      {
        name: "Minimalist Edit",
        slug: "minimalist-edit",
        description: "Clean lines, understated elegance",
        sortOrder: 3,
        isActive: true,
        isFeatured: true,
        image: img(103),
      },
      {
        name: "Essentials Edit",
        slug: "essentials-edit",
        description: "Everyday staples built to earn their keep",
        sortOrder: 4,
        isActive: true,
        isFeatured: false,
        image: img(104),
      },
    ]);
  console.log("🎨 Created 4 collections");

  // ══════════════════════════════════════════════════════════════════
  // PRODUCTS (Phase 1 + Phase 19.1 salesCount fields)
  // Sizes standardized to XS / S / M / L / XL / XXL
  // ══════════════════════════════════════════════════════════════════
  const [
    ariaBra,
    vantageJacket,
    pulseJoggers,
    elementHoodie,
    milanoLeggings,
    lumenTank,
    coreBandSet,
    hydraBottle,
    motionMat,
    fluxDuffel,
    gripGlovesDraft,
  ] = await Product.insertMany([
    {
      slug: "aria-seamless-sports-bra",
      title: "Aria Seamless Sports Bra",
      description:
        "A second-skin sports bra engineered from four-way stretch fabric with medium support and moisture-wicking performance. Flatlock seams eliminate chafing during high-intensity training.",
      images: [img(1), img(2), img(3)],
      basePrice: 4500,
      compareAtPrice: 5500,
      currency: "GBP",
      variants: [
        {
          sku: "ABR-BLK-XS",
          attributes: { size: "XS", color: "Black", colorHex: "#1A1A1A" },
          stock: 25,
          lowStockThreshold: 5,
          isActive: true,
        },
        {
          sku: "ABR-BLK-S",
          attributes: { size: "S", color: "Black", colorHex: "#1A1A1A" },
          stock: 30,
          lowStockThreshold: 5,
          isActive: true,
        },
        {
          sku: "ABR-BLK-M",
          attributes: { size: "M", color: "Black", colorHex: "#1A1A1A" },
          stock: 28,
          isActive: true,
        },
        {
          sku: "ABR-CHR-M",
          attributes: { size: "M", color: "Charcoal", colorHex: "#4A4A4A" },
          stock: 20,
          isActive: true,
        },
        {
          sku: "ABR-BLS-L",
          attributes: { size: "L", color: "Blush", colorHex: "#E8C4C4" },
          stock: 15,
          isActive: true,
        },
      ],
      categoryIds: [activeWearsCat._id],
      collectionIds: [minimalistCol._id],
      tags: ["sports bra", "activewear", "training", "women"],
      status: "published",
      seo: { metaTitle: "Aria Seamless Sports Bra | Keesdeen" },
      avgRating: 4.8,
      reviewCount: 3,
      totalSold: 512,
      salesCount30d: 48,
      salesCount90d: 140,
      isFeatured: true,
    },

    {
      slug: "vantage-zip-track-jacket",
      title: "Vantage Zip Track Jacket",
      description:
        "A streamlined track jacket in brushed technical fabric with a full-length zip, stand collar, and tapered fit built for warm-up and off-duty wear alike.",
      images: [img(4), img(5)],
      basePrice: 9500,
      currency: "GBP",
      variants: [
        {
          sku: "VTJ-BLK-M",
          attributes: { size: "M", color: "Black", colorHex: "#1A1A1A" },
          stock: 18,
          lowStockThreshold: 4,
          isActive: true,
        },
        {
          sku: "VTJ-BLK-L",
          attributes: { size: "L", color: "Black", colorHex: "#1A1A1A" },
          stock: 16,
          isActive: true,
        },
        {
          sku: "VTJ-NVY-L",
          attributes: { size: "L", color: "Navy", colorHex: "#1E3A5F" },
          stock: 12,
          isActive: true,
        },
        {
          sku: "VTJ-OLV-XL",
          attributes: { size: "XL", color: "Olive", colorHex: "#556B2F" },
          stock: 10,
          isActive: true,
        },
      ],
      categoryIds: [activeWearsCat._id],
      collectionIds: [heritageCol._id],
      tags: ["track jacket", "outerwear", "training", "unisex"],
      status: "published",
      avgRating: 4.7,
      reviewCount: 2,
      totalSold: 189,
      salesCount30d: 14,
      salesCount90d: 40,
      isFeatured: true,
    },

    {
      slug: "pulse-performance-joggers",
      title: "Pulse Performance Joggers",
      description:
        "Tapered joggers cut from a brushed-back fabric blend with a supportive drawcord waist and zippered side pockets, made for training days and rest days both.",
      images: [img(6), img(7)],
      basePrice: 6800,
      currency: "GBP",
      variants: [
        {
          sku: "PPJ-BLK-S",
          attributes: { size: "S", color: "Black", colorHex: "#1A1A1A" },
          stock: 22,
          isActive: true,
        },
        {
          sku: "PPJ-BLK-M",
          attributes: { size: "M", color: "Black", colorHex: "#1A1A1A" },
          stock: 26,
          isActive: true,
        },
        {
          sku: "PPJ-GRY-M",
          attributes: { size: "M", color: "Grey", colorHex: "#808080" },
          stock: 18,
          isActive: true,
        },
        {
          sku: "PPJ-OLV-L",
          attributes: { size: "L", color: "Olive", colorHex: "#556B2F" },
          stock: 14,
          isActive: true,
        },
      ],
      categoryIds: [activeWearsCat._id],
      collectionIds: [springCol._id],
      tags: ["joggers", "training", "unisex"],
      status: "published",
      avgRating: 4.6,
      reviewCount: 1,
      totalSold: 234,
      salesCount30d: 19,
      salesCount90d: 55,
      isFeatured: false,
    },

    {
      slug: "element-cropped-hoodie",
      title: "Element Cropped Hoodie",
      description:
        "A cropped hoodie in heavyweight cotton-blend fleece with a relaxed shoulder and ribbed hem, designed to layer over any training kit.",
      images: [img(9), img(10)],
      basePrice: 7200,
      compareAtPrice: 8500,
      currency: "GBP",
      variants: [
        {
          sku: "ECH-BLK-XS",
          attributes: { size: "XS", color: "Black", colorHex: "#1A1A1A" },
          stock: 15,
          isActive: true,
        },
        {
          sku: "ECH-BLK-S",
          attributes: { size: "S", color: "Black", colorHex: "#1A1A1A" },
          stock: 20,
          isActive: true,
        },
        {
          sku: "ECH-BRG-M",
          attributes: { size: "M", color: "Burgundy", colorHex: "#722F37" },
          stock: 12,
          isActive: true,
        },
        {
          sku: "ECH-CRM-L",
          attributes: { size: "L", color: "Cream", colorHex: "#F0E6D6" },
          stock: 9,
          isActive: true,
        },
      ],
      categoryIds: [activeWearsCat._id],
      collectionIds: [springCol._id, minimalistCol._id],
      tags: ["hoodie", "cropped", "women"],
      status: "published",
      avgRating: 4.9,
      reviewCount: 4,
      totalSold: 301,
      salesCount30d: 26,
      salesCount90d: 72,
      isFeatured: true,
    },

    {
      slug: "milano-ribbed-leggings",
      title: "Milano Ribbed Leggings",
      description:
        "High-rise ribbed leggings with buttery-soft compression fabric and a hidden waistband pocket. Squat-proof and built to move with you.",
      images: [img(13), img(14)],
      basePrice: 5800,
      currency: "GBP",
      variants: [
        {
          sku: "MRL-BLK-XS",
          attributes: { size: "XS", color: "Black", colorHex: "#1A1A1A" },
          stock: 30,
          isActive: true,
        },
        {
          sku: "MRL-BLK-S",
          attributes: { size: "S", color: "Black", colorHex: "#1A1A1A" },
          stock: 35,
          isActive: true,
        },
        {
          sku: "MRL-BLK-M",
          attributes: { size: "M", color: "Black", colorHex: "#1A1A1A" },
          stock: 32,
          isActive: true,
        },
        {
          sku: "MRL-CHR-M",
          attributes: { size: "M", color: "Charcoal", colorHex: "#4A4A4A" },
          stock: 24,
          isActive: true,
        },
        {
          sku: "MRL-OLV-L",
          attributes: { size: "L", color: "Olive", colorHex: "#556B2F" },
          stock: 18,
          isActive: true,
        },
      ],
      categoryIds: [activeWearsCat._id],
      collectionIds: [heritageCol._id, minimalistCol._id],
      tags: ["leggings", "training", "women"],
      status: "published",
      avgRating: 4.8,
      reviewCount: 5,
      totalSold: 645,
      salesCount30d: 58,
      salesCount90d: 165,
      isFeatured: true,
    },

    {
      slug: "lumen-racerback-tank",
      title: "Lumen Racerback Tank",
      description:
        "A lightweight racerback tank in a silky performance jersey with a dropped armhole and curved hem, breathable enough for the hardest session.",
      images: [img(17)],
      basePrice: 3800,
      currency: "GBP",
      variants: [
        {
          sku: "LRT-BLK-XS",
          attributes: { size: "XS", color: "Black", colorHex: "#1A1A1A" },
          stock: 28,
          isActive: true,
        },
        {
          sku: "LRT-WHT-S",
          attributes: { size: "S", color: "White", colorHex: "#FFFFFF" },
          stock: 25,
          isActive: true,
        },
        {
          sku: "LRT-SAG-M",
          attributes: { size: "M", color: "Sage", colorHex: "#9CAF88" },
          stock: 20,
          isActive: true,
        },
      ],
      categoryIds: [activeWearsCat._id],
      collectionIds: [springCol._id],
      tags: ["tank", "training", "women"],
      status: "published",
      avgRating: 4.5,
      reviewCount: 1,
      totalSold: 178,
      salesCount30d: 15,
      salesCount90d: 44,
      isFeatured: false,
    },

    {
      slug: "core-resistance-band-set",
      title: "Core Resistance Band Set",
      description:
        "A set of five fabric resistance bands spanning light to extra-heavy tension, complete with a mesh carry bag and printed exercise guide.",
      images: [img(20), img(21)],
      basePrice: 2900,
      currency: "GBP",
      variants: [
        {
          sku: "CRB-CHR-OS",
          attributes: { color: "Charcoal", colorHex: "#4A4A4A" },
          stock: 60,
          lowStockThreshold: 10,
          isActive: true,
        },
        {
          sku: "CRB-BLK-OS",
          attributes: { color: "Black", colorHex: "#1A1A1A" },
          stock: 55,
          isActive: true,
        },
      ],
      categoryIds: [fitnessAccessoriesCat._id],
      tags: ["resistance bands", "home gym", "training"],
      status: "published",
      avgRating: 4.7,
      reviewCount: 2,
      totalSold: 890,
      salesCount30d: 72,
      salesCount90d: 205,
      isFeatured: false,
    },

    {
      slug: "hydra-steel-water-bottle",
      title: "Hydra Steel Water Bottle",
      description:
        "A double-walled stainless steel bottle that keeps drinks cold for 24 hours, finished with a matte powder coat and leak-proof flip lid.",
      images: [img(25)],
      basePrice: 3200,
      currency: "GBP",
      variants: [
        {
          sku: "HSB-BLK-750",
          attributes: { size: "750ml", color: "Black", colorHex: "#1A1A1A" },
          stock: 70,
          isActive: true,
        },
        {
          sku: "HSB-SLT-750",
          attributes: { size: "750ml", color: "Slate", colorHex: "#6B7280" },
          stock: 55,
          isActive: true,
        },
        {
          sku: "HSB-BLK-1L",
          attributes: { size: "1L", color: "Black", colorHex: "#1A1A1A" },
          stock: 40,
          isActive: true,
        },
      ],
      categoryIds: [fitnessAccessoriesCat._id],
      tags: ["water bottle", "hydration", "gym"],
      status: "published",
      avgRating: 4.9,
      reviewCount: 2,
      totalSold: 1120,
      salesCount30d: 95,
      salesCount90d: 260,
      isFeatured: true,
    },

    {
      slug: "motion-yoga-mat",
      title: "Motion Yoga Mat",
      description:
        "A 6mm non-slip yoga mat made from natural tree rubber with a moisture-resistant top layer, rolled with a canvas carry strap.",
      images: [img(26), img(27)],
      basePrice: 5200,
      currency: "GBP",
      variants: [
        {
          sku: "MYM-CHR-6",
          attributes: { size: "6mm", color: "Charcoal", colorHex: "#4A4A4A" },
          stock: 34,
          isActive: true,
        },
        {
          sku: "MYM-SAG-6",
          attributes: { size: "6mm", color: "Sage", colorHex: "#9CAF88" },
          stock: 28,
          isActive: true,
        },
        {
          sku: "MYM-BLK-4",
          attributes: { size: "4mm", color: "Black", colorHex: "#1A1A1A" },
          stock: 20,
          isActive: true,
        },
      ],
      categoryIds: [fitnessAccessoriesCat._id],
      tags: ["yoga mat", "home gym", "recovery"],
      status: "published",
      avgRating: 4.8,
      reviewCount: 3,
      totalSold: 402,
      salesCount30d: 30,
      salesCount90d: 88,
      isFeatured: true,
    },

    {
      slug: "flux-gym-duffel",
      title: "Flux Gym Duffel",
      description:
        "A water-resistant gym duffel with a ventilated shoe compartment, wet-kit pocket, and a padded strap built for the daily commute to the gym.",
      images: [img(32), img(33)],
      basePrice: 6500,
      currency: "GBP",
      variants: [
        {
          sku: "FGD-BLK-OS",
          attributes: { color: "Black", colorHex: "#1A1A1A" },
          stock: 26,
          isActive: true,
        },
        {
          sku: "FGD-OLV-OS",
          attributes: { color: "Olive", colorHex: "#556B2F" },
          stock: 18,
          isActive: true,
        },
      ],
      categoryIds: [fitnessAccessoriesCat._id],
      collectionIds: [heritageCol._id],
      tags: ["gym bag", "duffel", "training"],
      status: "published",
      avgRating: 4.7,
      reviewCount: 3,
      totalSold: 267,
      salesCount30d: 20,
      salesCount90d: 58,
      isFeatured: false,
    },

    // Draft product
    {
      slug: "grip-training-gloves-draft",
      title: "Grip Training Gloves",
      description:
        "Ventilated training gloves with a silicone palm grip and wrist wrap support. Coming soon.",
      images: [img(34)],
      basePrice: 3400,
      currency: "GBP",
      variants: [
        {
          sku: "GTG-BLK-M",
          attributes: { size: "M", color: "Black", colorHex: "#1A1A1A" },
          stock: 0,
          isActive: true,
        },
      ],
      categoryIds: [fitnessAccessoriesCat._id],
      tags: ["gloves", "training", "grip"],
      status: "draft",
      avgRating: 0,
      reviewCount: 0,
      totalSold: 0,
      isFeatured: false,
    },
  ]);
  console.log("📦 Created 11 products (10 published, 1 draft)");

  // ══════════════════════════════════════════════════════════════════
  // SITE CONFIG (Phase 9)
  // ══════════════════════════════════════════════════════════════════
  await SiteConfig.create({
    siteKey: "main",
    siteName: "Keesdeen",
    siteDescription: "Performance activewear and fitness gear, built to move.",
    heroSlides: [
      {
        title: "Built for Motion",
        subtitle: "Performance activewear that moves with you",
        eyebrow: "New Season",
        italicWord: "Motion",
        image: img(100),
        ctaText: "Shop Collection",
        ctaLink: "/collections/heritage-collection",
        isActive: true,
        sortOrder: 0,
      },
      {
        title: "Spring Essentials",
        subtitle: "Fresh styles for the new season",
        eyebrow: "Just Arrived",
        image: img(101),
        ctaText: "Explore Now",
        ctaLink: "/collections/spring-essentials",
        isActive: true,
        sortOrder: 1,
      },
    ],
    homepageSections: [
      {
        type: "featured_products",
        title: "Bestsellers",
        isActive: true,
        sortOrder: 0,
      },
      {
        type: "new_arrivals",
        title: "New Arrivals",
        data: { limit: 8 },
        isActive: true,
        sortOrder: 1,
      },
      {
        type: "collection_grid",
        title: "Shop by Collection",
        isActive: true,
        sortOrder: 2,
      },
      {
        type: "best_sellers",
        title: "Best Sellers",
        subtitle: "Most popular this month",
        data: { limit: 8 },
        isActive: true,
        sortOrder: 3,
      },
      {
        type: "banner",
        title: "Free Shipping",
        subtitle: "On orders over $150",
        isActive: true,
        sortOrder: 4,
      },
      {
        type: "newsletter",
        title: "Join Our List",
        subtitle: "Get 10% off your first order",
        isActive: true,
        sortOrder: 5,
      },
    ],
    navigation: [
      { label: "Shop All", href: "/category/active-wears", isActive: true },
      { label: "Active Wears", href: "/category/active-wears", isActive: true },
      {
        label: "Fitness Accessories",
        href: "/category/fitness-accessories",
        isActive: true,
      },
    ],
    footerNavigation: [
      { label: "About Us", href: "/about", isActive: true },
      { label: "Contact", href: "/contact", isActive: true },
      {
        label: "Shipping & Returns",
        href: "/shipping-returns",
        isActive: true,
      },
      { label: "Privacy Policy", href: "/privacy", isActive: true },
    ],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/keesdeen" },
      { platform: "facebook", url: "https://facebook.com/keesdeen" },
    ],
    contactEmail: "hello@keesdeen.com",
    features: {
      reviewsEnabled: true,
      wishlistEnabled: true,
      guestCheckoutEnabled: true,
    },
  });
  console.log("⚙️  Created SiteConfig with hero + 6 homepage sections");

  // ══════════════════════════════════════════════════════════════════
  // PROMOTIONS — active, upcoming, expired (Phase 10)
  // ══════════════════════════════════════════════════════════════════
  const now = new Date();
  const in30d = new Date(Date.now() + 30 * 86400000);
  const ago30d = new Date(Date.now() - 30 * 86400000);
  const ago60d = new Date(Date.now() - 60 * 86400000);
  const in7d = new Date(Date.now() + 7 * 86400000);

  await Promotion.insertMany([
    {
      name: "Spring Sale",
      type: "percentage",
      value: 15,
      scope: "collection",
      scopeIds: [springCol._id],
      startDate: now,
      endDate: in30d,
      isActive: true,
      isStackable: false,
      priority: 1,
    },
    {
      name: "Free Shipping Over $150",
      type: "free_shipping",
      value: 0,
      scope: "all",
      minPurchaseAmount: 15000,
      startDate: now,
      endDate: new Date("2026-12-31"),
      isActive: true,
      isStackable: true,
      priority: 0,
    },
    {
      name: "Fitness Accessories 10% Off",
      type: "percentage",
      value: 10,
      scope: "category",
      scopeIds: [fitnessAccessoriesCat._id],
      minPurchaseAmount: 5000,
      startDate: now,
      endDate: in30d,
      isActive: true,
      isStackable: false,
      priority: 2,
    },
    // Expired
    {
      name: "Winter Clearance",
      type: "percentage",
      value: 25,
      scope: "all",
      startDate: ago60d,
      endDate: ago30d,
      isActive: false,
      isStackable: false,
      priority: 3,
    },
    // Upcoming
    {
      name: "Summer Preview",
      type: "percentage",
      value: 20,
      scope: "collection",
      scopeIds: [heritageCol._id],
      startDate: in7d,
      endDate: in30d,
      isActive: true,
      isStackable: false,
      priority: 1,
    },
  ]);
  console.log("🏷️  Created 5 promotions (3 active, 1 expired, 1 upcoming)");

  // ══════════════════════════════════════════════════════════════════
  // COUPONS (Phase 10)
  // ══════════════════════════════════════════════════════════════════
  await Coupon.insertMany([
    {
      code: "WELCOME10",
      description: "10% off your first order",
      type: "percentage",
      value: 10,
      maxDiscountAmount: 5000,
      usageLimit: 1000,
      usageLimitPerUser: 1,
      startDate: now,
      endDate: new Date("2026-12-31"),
      isActive: true,
      firstTimeOnly: true,
    },
    {
      code: "TRAIN20",
      description: "20% off full-price items",
      type: "percentage",
      value: 20,
      minPurchaseAmount: 10000,
      maxDiscountAmount: 10000,
      usageLimit: 500,
      startDate: now,
      endDate: in30d,
      isActive: true,
    },
    {
      code: "SHIPFREE",
      description: "Free shipping on any order",
      type: "free_shipping",
      value: 0,
      usageLimit: 200,
      startDate: now,
      endDate: in30d,
      isActive: true,
    },
    {
      code: "SAVE25",
      description: "$25 off orders over $200",
      type: "fixed_amount",
      value: 2500,
      minPurchaseAmount: 20000,
      usageLimit: 300,
      startDate: now,
      endDate: in30d,
      isActive: true,
    },
  ]);
  console.log("🎟️  Created 4 coupons");

  // ══════════════════════════════════════════════════════════════════
  // TAX RATES (Phase 12)
  // ══════════════════════════════════════════════════════════════════
  await TaxRate.insertMany([
    {
      name: "New York State Tax",
      country: "US",
      state: "NY",
      rate: 8.875,
      isActive: true,
      isDefault: false,
      priority: 1,
    },
    {
      name: "California State Tax",
      country: "US",
      state: "CA",
      rate: 7.25,
      isActive: true,
      isDefault: false,
      priority: 1,
    },
    {
      name: "Texas State Tax",
      country: "US",
      state: "TX",
      rate: 6.25,
      isActive: true,
      isDefault: false,
      priority: 1,
    },
    {
      name: "Default US Tax",
      country: "US",
      rate: 0,
      isActive: true,
      isDefault: true,
      priority: 0,
    },
  ]);
  console.log("💰 Created 4 tax rates");

  // ══════════════════════════════════════════════════════════════════
  // SHIPPING ZONES (Phase 12)
  // ══════════════════════════════════════════════════════════════════
  await ShippingZone.insertMany([
    {
      name: "United States",
      countries: ["US"],
      rates: [
        {
          name: "Standard Shipping",
          description: "5-7 business days",
          price: 895,
          estimatedDaysMin: 5,
          estimatedDaysMax: 7,
          isActive: true,
        },
        {
          name: "Express Shipping",
          description: "2-3 business days",
          price: 1595,
          estimatedDaysMin: 2,
          estimatedDaysMax: 3,
          isActive: true,
        },
        {
          name: "Free Standard Shipping",
          description: "Free on orders over $150",
          price: 0,
          minOrderAmount: 15000,
          estimatedDaysMin: 5,
          estimatedDaysMax: 7,
          isActive: true,
        },
      ],
      isActive: true,
      isDefault: true,
    },
    {
      name: "Canada",
      countries: ["CA"],
      rates: [
        {
          name: "Standard International",
          description: "7-14 business days",
          price: 1995,
          estimatedDaysMin: 7,
          estimatedDaysMax: 14,
          isActive: true,
        },
      ],
      isActive: true,
      isDefault: false,
    },
  ]);
  console.log("🚚 Created 2 shipping zones");

  // ══════════════════════════════════════════════════════════════════
  // SUBSCRIBERS (Phase 13)
  // ══════════════════════════════════════════════════════════════════
  await Subscriber.insertMany([
    {
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      source: "footer",
      tags: ["vip"],
      subscribedAt: ago30d,
    },
    {
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      source: "popup",
      tags: ["new"],
      subscribedAt: now,
    },
    {
      email: "mike.johnson@example.com",
      firstName: "Mike",
      source: "checkout",
      tags: [],
    },
    {
      email: "sarah.williams@example.com",
      firstName: "Sarah",
      lastName: "Williams",
      source: "footer",
      tags: ["vip", "repeat-customer"],
    },
    { email: "david.brown@example.com", source: "popup", tags: ["new"] },
    {
      email: "customer@example.com",
      firstName: "Demo",
      lastName: "Customer",
      source: "footer",
      tags: ["customer"],
    },
    {
      email: "maria@example.com",
      firstName: "Maria",
      lastName: "Lopez",
      source: "homepage",
      tags: ["new"],
    },
  ]);
  console.log("📧 Created 7 subscribers");

  // ══════════════════════════════════════════════════════════════════
  // ORDERS (Phase 5 — needed for verified-purchase reviews)
  // ══════════════════════════════════════════════════════════════════
  const addr = {
    firstName: "Demo",
    lastName: "Customer",
    address1: "123 Main St",
    city: "Brooklyn",
    state: "NY",
    postalCode: "11201",
    country: "US",
  };

  const order1 = await Order.create({
    orderNumber: generateOrderNumber(),
    userId: customerUser._id,
    email: "customer@example.com",
    lines: [
      {
        productId: milanoLeggings._id,
        variantSku: "MRL-BLK-M",
        title: "Milano Ribbed Leggings",
        variantTitle: "Black / M",
        image: img(13),
        quantity: 1,
        price: 5800,
        totalPrice: 5800,
        discountAmount: 0,
      },
      {
        productId: vantageJacket._id,
        variantSku: "VTJ-BLK-M",
        title: "Vantage Zip Track Jacket",
        variantTitle: "Black / M",
        image: img(4),
        quantity: 1,
        price: 9500,
        totalPrice: 9500,
        discountAmount: 0,
      },
    ],
    shippingAddress: addr,
    billingAddress: addr,
    subtotal: 15300,
    discountTotal: 0,
    shippingTotal: 0,
    taxTotal: 1358,
    grandTotal: 16658,
    currency: "GBP",
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "square",
    shippingMethod: "Free Standard Shipping",
    shippedAt: ago30d,
    deliveredAt: new Date(Date.now() - 25 * 86400000),
  });

  const order2 = await Order.create({
    orderNumber: generateOrderNumber(),
    userId: customer2._id,
    email: "maria@example.com",
    lines: [
      {
        productId: coreBandSet._id,
        variantSku: "CRB-CHR-OS",
        title: "Core Resistance Band Set",
        variantTitle: "Charcoal",
        image: img(20),
        quantity: 2,
        price: 2900,
        totalPrice: 5800,
        discountAmount: 0,
      },
      {
        productId: hydraBottle._id,
        variantSku: "HSB-BLK-750",
        title: "Hydra Steel Water Bottle",
        variantTitle: "Black / 750ml",
        image: img(25),
        quantity: 1,
        price: 3200,
        totalPrice: 3200,
        discountAmount: 0,
      },
    ],
    shippingAddress: { ...addr, firstName: "Maria", lastName: "Lopez" },
    billingAddress: { ...addr, firstName: "Maria", lastName: "Lopez" },
    subtotal: 9000,
    discountTotal: 0,
    shippingTotal: 895,
    taxTotal: 799,
    grandTotal: 10694,
    currency: "GBP",
    status: "shipped",
    paymentStatus: "paid",
    paymentMethod: "square",
    shippingMethod: "Standard Shipping",
    trackingNumber: "1Z999AA10123456784",
    trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    shippedAt: new Date(Date.now() - 3 * 86400000),
  });

  await Order.create({
    orderNumber: generateOrderNumber(),
    userId: customerUser._id,
    email: "customer@example.com",
    lines: [
      {
        productId: elementHoodie._id,
        variantSku: "ECH-BLK-S",
        title: "Element Cropped Hoodie",
        variantTitle: "Black / S",
        image: img(9),
        quantity: 1,
        price: 7200,
        totalPrice: 7200,
        discountAmount: 0,
      },
    ],
    shippingAddress: addr,
    billingAddress: addr,
    subtotal: 7200,
    discountTotal: 0,
    shippingTotal: 895,
    taxTotal: 639,
    grandTotal: 8734,
    currency: "GBP",
    status: "processing",
    paymentStatus: "paid",
    paymentMethod: "square",
    shippingMethod: "Standard Shipping",
  });
  console.log("🛒 Created 3 orders (delivered, shipped, processing)");

  // ══════════════════════════════════════════════════════════════════
  // REVIEWS — tied to real orders (Phase 14)
  // ══════════════════════════════════════════════════════════════════
  await Review.insertMany([
    {
      productId: milanoLeggings._id,
      userId: customerUser._id,
      orderId: order1._id,
      rating: 5,
      title: "Second-skin fit",
      content:
        "These leggings are unreal — squat proof, no see-through, and the waistband pocket actually fits my phone. Wearing them on repeat.",
      isVerifiedPurchase: true,
      status: "approved",
      helpfulCount: 12,
    },
    {
      productId: vantageJacket._id,
      userId: customerUser._id,
      orderId: order1._id,
      rating: 5,
      title: "Perfect layering piece",
      content:
        "Great weight for warm-ups and just walking around town after. The fit is tapered without feeling restrictive at the shoulders.",
      isVerifiedPurchase: true,
      status: "approved",
      helpfulCount: 8,
    },
    {
      productId: coreBandSet._id,
      userId: customer2._id,
      orderId: order2._id,
      rating: 4,
      title: "Great for home workouts",
      content:
        "Good range of resistance and the bag keeps them from tangling. Wish the light band was a touch lighter but overall solid set.",
      isVerifiedPurchase: true,
      status: "approved",
      helpfulCount: 5,
    },
    {
      productId: hydraBottle._id,
      userId: customer2._id,
      orderId: order2._id,
      rating: 5,
      title: "Keeps ice for two days",
      content:
        "Genuinely didn't expect this to hold cold as long as it does. The flip lid is sturdy and it doesn't sweat on my desk at all.",
      isVerifiedPurchase: true,
      status: "approved",
      helpfulCount: 3,
    },
    // Pending review
    {
      productId: milanoLeggings._id,
      userId: customer2._id,
      rating: 3,
      title: "Good but sizing runs small",
      content:
        "Nice fabric and squat-proof as advertised, but I'd size up from my usual. Ordered a medium and it fit more like a small.",
      isVerifiedPurchase: false,
      status: "pending",
      helpfulCount: 0,
    },
  ]);
  console.log("⭐ Created 5 reviews (4 approved verified, 1 pending)");

  // ══════════════════════════════════════════════════════════════════
  // WISHLISTS (Phase 14)
  // ══════════════════════════════════════════════════════════════════
  await Wishlist.insertMany([
    {
      userId: customerUser._id,
      productIds: [lumenTank._id, motionMat._id, fluxDuffel._id],
    },
    { userId: customer2._id, productIds: [ariaBra._id, elementHoodie._id] },
  ]);
  console.log("❤️  Created 2 wishlists");

  // ══════════════════════════════════════════════════════════════════
  // BUNDLES — Frequently Bought Together (Phase 20)
  // ══════════════════════════════════════════════════════════════════
  await Bundle.insertMany([
    {
      productId: ariaBra._id,
      itemProductIds: [milanoLeggings._id, hydraBottle._id],
      title: "Complete Your Look",
      isActive: true,
    },
    {
      productId: coreBandSet._id,
      itemProductIds: [hydraBottle._id, motionMat._id],
      isActive: true,
    },
  ]);
  console.log("📦 Created 2 bundles");

  // ══════════════════════════════════════════════════════════════════
  // AUDIT LOG entries (Phase 21)
  // ══════════════════════════════════════════════════════════════════
  await AuditLog.insertMany([
    {
      userId: adminUser._id,
      userEmail: "admin@keesdeen.com",
      userRole: "super_admin",
      action: "create",
      resourceType: "Product",
      description: "Created product 'Aria Seamless Sports Bra'",
      resourceIdentifier: "aria-seamless-sports-bra",
    },
    {
      userId: adminUser._id,
      userEmail: "admin@keesdeen.com",
      userRole: "super_admin",
      action: "update",
      resourceType: "SiteConfig",
      description: "Updated hero slides and homepage sections",
      changes: [
        { field: "heroSlides", oldValue: "1 slide", newValue: "2 slides" },
      ],
    },
    {
      userId: adminUser._id,
      userEmail: "admin@keesdeen.com",
      userRole: "super_admin",
      action: "create",
      resourceType: "Promotion",
      description: "Created promotion 'Spring Sale' (15% off)",
    },
    {
      userId: adminUser._id,
      userEmail: "admin@keesdeen.com",
      userRole: "super_admin",
      action: "order_status_change",
      resourceType: "Order",
      description: `Marked order ${order1.orderNumber} as delivered`,
      resourceIdentifier: order1.orderNumber,
    },
    {
      userId: adminUser._id,
      userEmail: "admin@keesdeen.com",
      userRole: "super_admin",
      action: "settings_change",
      resourceType: "TaxRate",
      description: "Updated NY tax rate to 8.875%",
    },
  ]);
  console.log("📋 Created 5 audit log entries");

  // ══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════
  console.log(`
✅ Full seed completed successfully!

  Users:         5 (admin, staff, support, 2 customers)
  Categories:    2 (Active Wears, Fitness Accessories)
  Collections:   4
  Products:      11 (10 published, 1 draft)
  SiteConfig:    1 (2 hero slides, 6 homepage sections)
  Promotions:    5 (3 active, 1 expired, 1 upcoming)
  Coupons:       4
  Tax Rates:     4
  Shipping:      2 zones
  Subscribers:   7
  Orders:        3 (delivered, shipped, processing)
  Reviews:       5 (4 approved, 1 pending)
  Wishlists:     2
  Bundles:       2
  Audit Logs:    5

  Login credentials:
    admin@keesdeen.com    / admin123    (super_admin)
    staff@keesdeen.com    / staff123    (staff)
    support@keesdeen.com  / support123  (support)
    customer@example.com  / customer123 (customer)
    maria@example.com     / customer123 (customer)
  `);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
