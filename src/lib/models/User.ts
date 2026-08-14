import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "super_admin" | "staff" | "support" | "customer";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  passwordHash?: string;
  role: UserRole;
  emailVerified?: Date;
  image?: string;
  googleId?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: String,
      enum: ["super_admin", "staff", "support", "customer"],
      default: "customer",
    },
    emailVerified: {
      type: Date,
    },
    image: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    resetPasswordTokenHash: {
      type: String,
    },
    resetPasswordExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
