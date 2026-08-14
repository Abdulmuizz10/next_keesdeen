import mongoose, { Schema, Document, Model } from "mongoose";

export type SubscriberStatus = "active" | "unsubscribed" | "bounced";

export interface ISubscriber extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  status: SubscriberStatus;
  source: string; // Where they subscribed (footer, popup, checkout, etc.)
  tags: string[];
  subscribedAt: Date;
  unsubscribedAt?: Date;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "unsubscribed", "bounced"],
      default: "active",
    },
    source: {
      type: String,
      required: true,
      default: "website",
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriberSchema.index({ email: 1 });
SubscriberSchema.index({ status: 1 });
SubscriberSchema.index({ tags: 1 });
SubscriberSchema.index({ subscribedAt: -1 });

const Subscriber: Model<ISubscriber> =
  mongoose.models.Subscriber || mongoose.model<ISubscriber>("Subscriber", SubscriberSchema);

export default Subscriber;
