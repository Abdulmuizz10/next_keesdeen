import mongoose, { Schema, Document, Model } from "mongoose";

export type CouponType = "percentage" | "fixed_amount" | "free_shipping";

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  description?: string;
  type: CouponType;
  value: number; // Percentage (0-100) or fixed amount in cents
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount: number;
  userUsage: Map<string, number>; // userId -> count
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  applicableProductIds?: mongoose.Types.ObjectId[];
  applicableCategoryIds?: mongoose.Types.ObjectId[];
  excludeProductIds?: mongoose.Types.ObjectId[];
  excludeCategoryIds?: mongoose.Types.ObjectId[];
  firstTimeOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed_amount", "free_shipping"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
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
    usageLimitPerUser: {
      type: Number,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    userUsage: {
      type: Map,
      of: Number,
      default: new Map(),
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
    applicableProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    excludeProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    excludeCategoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    firstTimeOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CouponSchema.index({ code: 1 });
CouponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
