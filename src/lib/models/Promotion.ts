import mongoose, { Schema, Document, Model } from "mongoose";

export type PromotionType =
  | "percentage"
  | "fixed_amount"
  | "buy_x_get_y"
  | "free_shipping";
export type PromotionScope = "all" | "category" | "collection" | "product";

export interface IPromotionBannerImage {
  url: string;
  publicId: string; // Cloudinary public_id — needed to delete the asset later
}

export interface IPromotion extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code?: string; // If set, acts like a public coupon code
  type: PromotionType;
  value: number; // Percentage (0-100) or fixed amount in cents
  scope: PromotionScope;
  scopeIds?: mongoose.Types.ObjectId[]; // Category/Collection/Product IDs
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isStackable: boolean;
  priority: number; // Higher priority promotions are applied first

  // ── Storefront banner ──────────────────────────────────────────────
  // These are independent of the discount mechanics above. A promotion
  // can exist purely for internal accounting (no banner) or double as
  // the homepage hero (showBanner: true + a bannerImage set).
  showBanner: boolean;
  bannerImage?: IPromotionBannerImage;
  bannerHeadline?: string; // falls back to `name` on the storefront if unset
  bannerSubheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed_amount", "buy_x_get_y", "free_shipping"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    scope: {
      type: String,
      enum: ["all", "category", "collection", "product"],
      default: "all",
    },
    scopeIds: [
      {
        type: Schema.Types.ObjectId,
      },
    ],
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isStackable: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },

    // ── Storefront banner ──────────────────────────────────────────
    showBanner: {
      type: Boolean,
      default: false,
    },
    bannerImage: {
      type: new Schema<IPromotionBannerImage>(
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
        { _id: false },
      ),
    },
    bannerHeadline: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    bannerSubheadline: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    ctaLabel: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    ctaHref: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
PromotionSchema.index({ code: 1 }, { sparse: true });
PromotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ scope: 1, scopeIds: 1 });
// Fast lookup for the storefront banner query (active + flagged + priority sort)
PromotionSchema.index({ showBanner: 1, isActive: 1, priority: -1 });

const Promotion: Model<IPromotion> =
  mongoose.models.Promotion ||
  mongoose.model<IPromotion>("Promotion", PromotionSchema);

export default Promotion;
