import mongoose, { Schema, Document, Model } from "mongoose";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface IOrderLine {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  title: string;
  variantTitle: string;
  image: string;
  quantity: number;
  price: number; // Unit price in cents at time of purchase
  totalPrice: number; // quantity * price
  discountAmount: number; // Discount applied to this line
}

export interface IOrderAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  idempotencyKey?: string;
  processedSquareEventIds?: string[];
  userId?: mongoose.Types.ObjectId;
  email: string;
  phone?: string;
  lines: IOrderLine[];
  shippingAddress: IOrderAddress;
  billingAddress: IOrderAddress;
  subtotal: number; // Sum of line totals before discounts, in cents
  discountTotal: number; // Total discount amount in cents
  shippingTotal: number; // Shipping cost in cents
  taxTotal: number; // Tax amount in cents
  grandTotal: number; // Final total in cents
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  squareOrderId?: string;
  squarePaymentId?: string;
  couponCode?: string;
  promotionIds?: mongoose.Types.ObjectId[];
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  internalNotes?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderLineSchema = new Schema<IOrderLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantSku: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    variantTitle: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const OrderAddressSchema = new Schema<IOrderAddress>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    company: { type: String },
    address1: { type: String, required: true },
    address2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    processedSquareEventIds: [{ type: String }],
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
    },
    lines: [OrderLineSchema],
    shippingAddress: {
      type: OrderAddressSchema,
      required: true,
    },
    billingAddress: {
      type: OrderAddressSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "GBP",
      uppercase: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
    },
    squareOrderId: {
      type: String,
    },
    squarePaymentId: {
      type: String,
    },
    couponCode: {
      type: String,
      uppercase: true,
    },
    promotionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Promotion",
      },
    ],
    shippingMethod: {
      type: String,
    },
    trackingNumber: {
      type: String,
    },
    trackingUrl: {
      type: String,
    },
    notes: {
      type: String,
    },
    internalNotes: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
    shippedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ email: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ squareOrderId: 1 }, { sparse: true });
OrderSchema.index({ squarePaymentId: 1 }, { sparse: true });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;

/**
 * Generate a unique order number.
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KD-${timestamp}-${random}`;
}
