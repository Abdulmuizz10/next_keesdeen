import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICollection extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  heroImage?: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  startDate?: Date;
  endDate?: Date;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    heroImage: {
      type: String,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CollectionSchema.index({ slug: 1 });
CollectionSchema.index({ isActive: 1, isFeatured: 1 });
CollectionSchema.index({ startDate: 1, endDate: 1 });

const Collection: Model<ICollection> =
  mongoose.models.Collection || mongoose.model<ICollection>("Collection", CollectionSchema);

export default Collection;
