import mongoose, { Schema, Document, Model } from "mongoose";

export type RefundStatus = "pending" | "approved" | "processed" | "rejected";

export interface IRefundLine {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  title: string;
  quantity: number;
  amount: number; // Refund amount for this line in cents
  reason?: string;
}

export interface IRefund extends Document {
  _id: mongoose.Types.ObjectId;
  refundNumber: string;
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  userId?: mongoose.Types.ObjectId;
  lines: IRefundLine[];
  subtotal: number;
  taxRefund: number;
  shippingRefund: number;
  totalAmount: number; // Total refund amount in cents
  status: RefundStatus;
  reason: string;
  notes?: string;
  internalNotes?: string;
  squareRefundId?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefundLineSchema = new Schema<IRefundLine>(
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
    },
  },
  { _id: false }
);

const RefundSchema = new Schema<IRefund>(
  {
    refundNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lines: [RefundLineSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRefund: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingRefund: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "processed", "rejected"],
      default: "pending",
    },
    reason: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    internalNotes: {
      type: String,
    },
    squareRefundId: {
      type: String,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
RefundSchema.index({ refundNumber: 1 });
RefundSchema.index({ orderId: 1 });
RefundSchema.index({ orderNumber: 1 });
RefundSchema.index({ status: 1 });
RefundSchema.index({ createdAt: -1 });

const Refund: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>("Refund", RefundSchema);

export default Refund;

/**
 * Generate a unique refund number.
 */
export function generateRefundNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RF-${timestamp}-${random}`;
}
