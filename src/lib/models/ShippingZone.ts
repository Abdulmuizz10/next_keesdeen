import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShippingRate {
  name: string;
  description?: string;
  price: number; // In cents
  minOrderAmount?: number;
  maxOrderAmount?: number;
  minWeight?: number; // In grams
  maxWeight?: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

export interface IShippingZone extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  countries: string[]; // ISO country codes
  states?: string[]; // State/province codes
  postalCodePatterns?: string[]; // Regex patterns
  rates: IShippingRate[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingRateSchema = new Schema<IShippingRate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      min: 0,
    },
    maxOrderAmount: {
      type: Number,
      min: 0,
    },
    minWeight: {
      type: Number,
      min: 0,
    },
    maxWeight: {
      type: Number,
      min: 0,
    },
    estimatedDaysMin: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDaysMax: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const ShippingZoneSchema = new Schema<IShippingZone>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    countries: [
      {
        type: String,
        uppercase: true,
        trim: true,
      },
    ],
    states: [
      {
        type: String,
        uppercase: true,
        trim: true,
      },
    ],
    postalCodePatterns: [{ type: String }],
    rates: [ShippingRateSchema],
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
ShippingZoneSchema.index({ countries: 1 });
ShippingZoneSchema.index({ isActive: 1, isDefault: 1 });

const ShippingZone: Model<IShippingZone> =
  mongoose.models.ShippingZone || mongoose.model<IShippingZone>("ShippingZone", ShippingZoneSchema);

export default ShippingZone;
