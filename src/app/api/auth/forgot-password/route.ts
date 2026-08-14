import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_RESPONSE = { message: "If an account exists for this email, we've sent a reset link." };

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Rate-limit by email to prevent spam / enumeration
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rl = await checkRateLimit(`pwd-reset:${ip}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return the same response — never reveal whether the email exists
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Generate a cryptographically random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store only the hash + expiry — never the raw token
    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = expiresAt;
    await user.save();

    // Build the reset link with the RAW token (so only the email recipient can use it)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
