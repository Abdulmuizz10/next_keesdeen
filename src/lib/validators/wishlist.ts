import { z } from "zod";

export const addToWishlistSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

export const removeFromWishlistSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
export type RemoveFromWishlistInput = z.infer<typeof removeFromWishlistSchema>;
