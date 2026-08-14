import { z } from "zod";

export const subscriberStatusSchema = z.enum(["active", "unsubscribed", "bounced"]);

export const subscriberSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().max(50, "First name too long").optional(),
  lastName: z.string().max(50, "Last name too long").optional(),
  status: subscriberStatusSchema.default("active"),
  source: z.string().default("website"),
  tags: z.array(z.string().max(30, "Tag too long")).default([]),
});

export const createSubscriberSchema = subscriberSchema;

export const updateSubscriberSchema = subscriberSchema.partial();

export const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  source: z.string().default("website"),
});

export type SubscriberStatus = z.infer<typeof subscriberStatusSchema>;
export type SubscriberInput = z.infer<typeof subscriberSchema>;
export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;
export type UpdateSubscriberInput = z.infer<typeof updateSubscriberSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
