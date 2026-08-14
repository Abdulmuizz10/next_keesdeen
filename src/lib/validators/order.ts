import { z } from "zod";

export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const orderAddressSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  company: z.string().max(100, "Company name too long").optional(),
  address1: z.string().min(1, "Address is required").max(200, "Address too long"),
  address2: z.string().max(200, "Address too long").optional(),
  city: z.string().min(1, "City is required").max(100, "City name too long"),
  state: z.string().min(1, "State is required").max(100, "State name too long"),
  postalCode: z.string().min(1, "Postal code is required").max(20, "Postal code too long"),
  country: z.string().min(1, "Country is required").max(100, "Country name too long"),
  phone: z.string().max(20, "Phone number too long").optional(),
});

export const createOrderSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().max(20).optional(),
  shippingAddress: orderAddressSchema,
  billingAddress: orderAddressSchema,
  shippingMethod: z.string().min(1, "Shipping method is required"),
  couponCode: z.string().optional(),
  notes: z.string().max(500, "Notes too long").optional(),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  internalNotes: z.string().max(1000).optional(),
});

export const updateShippingSchema = z.object({
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional(),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type OrderAddressInput = z.infer<typeof orderAddressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateShippingInput = z.infer<typeof updateShippingSchema>;
