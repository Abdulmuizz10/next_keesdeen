import { z } from "zod";

export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const createReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  title: z.string().max(100, "Title too long").optional(),
  content: z.string().min(10, "Review must be at least 10 characters").max(2000, "Review too long"),
  images: z.array(z.string().url()).max(5, "Maximum 5 images allowed").optional(),
});

export const updateReviewStatusSchema = z.object({
  status: reviewStatusSchema,
  adminResponse: z.string().max(500).optional(),
});

export const reportReviewSchema = z.object({
  reviewId: z.string().min(1, "Review ID is required"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
});

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
