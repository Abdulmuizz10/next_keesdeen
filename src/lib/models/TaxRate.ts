import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaxRate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  country: string;
  state?: string;
  postalCodePattern?: string; // Regex pattern for postal codes
  rate: number; // Percentage (e.g., 8.25 for 8.25%)
  isCompound: boolean; // If true, applied after other taxes
  priority: number; // Order of application
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaxRateSchema = new Schema<ITaxRate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    state: {
      type: String,
      uppercase: true,
      trim: true,
    },
    postalCodePattern: {
      type: String,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    isCompound: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TaxRateSchema.index({ country: 1, state: 1 });
TaxRateSchema.index({ isActive: 1, isDefault: 1 });

const TaxRate: Model<ITaxRate> =
  mongoose.models.TaxRate || mongoose.model<ITaxRate>("TaxRate", TaxRateSchema);

export default TaxRate;
