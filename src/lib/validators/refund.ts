import { z } from "zod";

export const refundStatusSchema = z.enum(["pending", "approved", "processed", "rejected"]);

export const refundLineSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantSku: z.string().min(1, "Variant SKU is required"),
  title: z.string().min(1, "Title is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  amount: z.number().int().min(0, "Amount must be non-negative"),
  reason: z.string().max(500).optional(),
});

export const createRefundSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  lines: z.array(refundLineSchema).min(1, "At least one line is required"),
  shippingRefund: z.number().int().min(0).default(0),
  reason: z.string().min(1, "Reason is required").max(1000, "Reason too long"),
  notes: z.string().max(1000).optional(),
});

export const updateRefundStatusSchema = z.object({
  status: refundStatusSchema,
  internalNotes: z.string().max(1000).optional(),
});

export type RefundStatus = z.infer<typeof refundStatusSchema>;
export type RefundLineInput = z.infer<typeof refundLineSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type UpdateRefundStatusInput = z.infer<typeof updateRefundStatusSchema>;
