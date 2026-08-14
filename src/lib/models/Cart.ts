import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICartLine {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  quantity: number;
  addedAt: Date;
}

export interface ICart extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  sessionId?: string; // For guest carts
  lines: ICartLine[];
  couponCode?: string;
  checkoutIdempotencyKey?: string;
  checkoutEmail?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartLineSchema = new Schema<ICartLine>(
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    sessionId: {
      type: String,
    },
    lines: [CartLineSchema],
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    checkoutIdempotencyKey: {
      type: String,
      index: true,
    },
    checkoutEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
CartSchema.index({ userId: 1 });
CartSchema.index({ sessionId: 1 });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const Cart: Model<ICart> =
  mongoose.models.Cart || mongoose.model<ICart>("Cart", CartSchema);

export default Cart;
