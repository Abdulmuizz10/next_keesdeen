import mongoose, { Schema, Document, Model } from "mongoose";

export type RefundStatus = "pending" | "approved" | "processed" | "rejected";

export interface IRefundLine {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  title: string;
  quantity: number;
  amount: number;
  reason?: string;
}

export interface IRefund extends Document {
  _id: mongoose.Types.ObjectId;

  refundNumber: string;

  /**
   * Client-generated idempotency key.
   *
   * One key represents exactly one refund operation.
   */
  idempotencyKey: string;

  /**
   * SHA-256 fingerprint of the refund request.
   *
   * Prevents somebody from reusing an existing idempotency key
   * with different refund details.
   */
  requestHash: string;

  orderId: mongoose.Types.ObjectId;
  orderNumber: string;

  userId?: mongoose.Types.ObjectId;

  lines: IRefundLine[];

  subtotal: number;
  taxRefund: number;
  shippingRefund: number;
  totalAmount: number;

  status: RefundStatus;

  reason: string;
  notes?: string;
  internalNotes?: string;

  squareRefundId?: string;

  /**
   * Prevent duplicate stock restoration.
   */
  restockedAt?: Date;

  /**
   * Prevent duplicate confirmation emails.
   */
  emailSentAt?: Date;

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
      trim: true,
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
  {
    _id: false,
  },
);

const RefundSchema = new Schema<IRefund>(
  {
    refundNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    requestHash: {
      type: String,
      required: true,
      index: true,
    },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    lines: {
      type: [RefundLineSchema],
      default: [],
    },

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
      index: true,
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
      sparse: true,
      unique: true,
    },

    restockedAt: {
      type: Date,
    },

    emailSentAt: {
      type: Date,
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
  },
);

RefundSchema.index({ createdAt: -1 });

const Refund: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>("Refund", RefundSchema);

export default Refund;

export function generateRefundNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();

  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `RF-${timestamp}-${random}`;
}
