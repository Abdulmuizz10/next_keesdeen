import { Schema, models, model, type Model } from "mongoose";

const EmailEventSchema = new Schema({
  svixId: { type: String, required: true, unique: true }, // webhook delivery idempotency
  resendId: { type: String, index: true },
  type: { type: String, required: true }, // e.g. "email.delivered", "email.bounced"
  recipient: { type: String, index: true },
  payload: Schema.Types.Mixed,
  // TTL: Mongo auto-deletes events after 90 days so this collection doesn't grow forever.
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
});

export const EmailEvent: Model<any> =
  models.EmailEvent || model("EmailEvent", EmailEventSchema);
