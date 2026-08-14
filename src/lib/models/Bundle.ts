import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBundle extends Document {
  _id: mongoose.Types.ObjectId;
  /** The "anchor" product this bundle appears on */
  productId: mongoose.Types.ObjectId;
  /** The products shown as "Frequently Bought Together" (excludes the anchor) */
  itemProductIds: mongoose.Types.ObjectId[];
  title?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BundleSchema = new Schema<IBundle>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    itemProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    title: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One bundle per anchor product
BundleSchema.index({ productId: 1 }, { unique: true });

const Bundle: Model<IBundle> =
  mongoose.models.Bundle || mongoose.model<IBundle>("Bundle", BundleSchema);

export default Bundle;
