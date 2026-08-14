import { z } from "zod";

export const userRoleSchema = z.enum(["super_admin", "staff", "support", "customer"]);

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  passwordHash: z.string().optional(),
  role: userRoleSchema.default("customer"),
  emailVerified: z.date().optional(),
  image: z.string().url().optional(),
});

export const createUserSchema = userSchema.extend({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .optional(),
});

export const updateUserSchema = userSchema.partial();

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
