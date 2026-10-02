import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBundleItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
}

export interface IBundle extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  items: IBundleItem[];
  title?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BundleItemSchema = new Schema<IBundleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
  },
  { _id: false },
);

const BundleSchema = new Schema<IBundle>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    items: [BundleItemSchema],
    title: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

BundleSchema.index({ productId: 1 }, { unique: true });

const Bundle: Model<IBundle> =
  mongoose.models.Bundle || mongoose.model<IBundle>("Bundle", BundleSchema);

export default Bundle;
