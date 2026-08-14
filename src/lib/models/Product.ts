import mongoose, { Schema, Document, Model } from "mongoose";

export type ProductStatus = "draft" | "published" | "archived";

export interface IProductVariant {
  sku: string;
  attributes: {
    size?: string;
    color?: string;
    colorHex?: string;
  };
  price?: number; // Override price, if different from basePrice
  stock: number;
  images?: string[];
  isActive: boolean;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  images: string[];
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  variants: IProductVariant[];
  categoryIds: mongoose.Types.ObjectId[];
  tags: string[];
  collectionIds: mongoose.Types.ObjectId[];
  status: ProductStatus;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
  };
  avgRating: number;
  reviewCount: number;
  totalSold: number;
  salesCount30d: number;
  salesCount90d: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductVariant {
  sku: string;
  attributes: { size?: string; color?: string; colorHex?: string };
  price?: number;
  stock: number;
  lowStockThreshold?: number; // add this
  images?: string[];
  isActive: boolean;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    sku: {
      type: String,
      required: true,
    },
    attributes: {
      size: { type: String },
      color: { type: String },
      colorHex: { type: String },
    },
    price: {
      type: Number,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    images: [{ type: String }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const ProductSchema = new Schema<IProduct>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [{ type: String }],
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "GBP",
      uppercase: true,
    },
    variants: [ProductVariantSchema],
    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    tags: [{ type: String, lowercase: true, trim: true }],
    collectionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Collection",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    salesCount30d: {
      type: Number,
      default: 0,
      min: 0,
    },
    salesCount90d: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries
ProductSchema.index({ slug: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ collectionIds: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ basePrice: 1 });
ProductSchema.index({ avgRating: -1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ isFeatured: 1, status: 1 });
ProductSchema.index({ salesCount30d: -1, status: 1 });
ProductSchema.index({ "variants.sku": 1 });

// Text index for search
ProductSchema.index(
  { title: "text", description: "text", tags: "text" },
  { weights: { title: 10, tags: 5, description: 1 } },
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
