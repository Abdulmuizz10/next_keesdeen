import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  try {
    const { token, email, newPassword } = await request.json();

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.resetPasswordTokenHash || !user.resetPasswordExpiresAt) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    // Check expiry
    if (user.resetPasswordExpiresAt < new Date()) {
      // Clear the expired token
      user.resetPasswordTokenHash = undefined;
      user.resetPasswordExpiresAt = undefined;
      await user.save();
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the incoming token and compare against the stored hash
    const incomingHash = crypto.createHash("sha256").update(token).digest("hex");
    if (incomingHash !== user.resetPasswordTokenHash) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    // Token is valid — hash the new password and save
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // Clear the token so it's single-use
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
