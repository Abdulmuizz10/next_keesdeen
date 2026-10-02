import { Schema, models, model, type Model } from "mongoose";

const EmailSuppressionSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  reason: { type: String, required: true }, // "bounced" | "complained"
  createdAt: { type: Date, default: Date.now },
});

export const EmailSuppression: Model<any> =
  models.EmailSuppression || model("EmailSuppression", EmailSuppressionSchema);
