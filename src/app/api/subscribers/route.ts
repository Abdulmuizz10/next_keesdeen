import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Subscriber from "@/lib/models/Subscriber";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  source: z.string().max(30).default("website"),
  // Honeypot field — if filled, it's a bot
  _hp: z.string().optional(),
});

/**
 * POST /api/subscribers
 * Public endpoint for newsletter signup.
 * Includes honeypot spam protection.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = subscribeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Honeypot check — bots fill hidden fields, humans don't
    if (data._hp) {
      // Silently accept but don't actually subscribe
      return NextResponse.json({ success: true });
    }

    await dbConnect();

    // Check for existing subscriber
    const existing = await Subscriber.findOne({
      email: data.email.toLowerCase(),
    });

    if (existing) {
      if (existing.status === "unsubscribed") {
        // Re-subscribe
        existing.status = "active";
        existing.subscribedAt = new Date();
        existing.unsubscribedAt = undefined;
        if (data.firstName) existing.firstName = data.firstName;
        if (data.lastName) existing.lastName = data.lastName;
        await existing.save();
        return NextResponse.json({ success: true, resubscribed: true });
      }
      // Already subscribed
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    // Create new subscriber
    await Subscriber.create({
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      source: data.source,
      status: "active",
      subscribedAt: new Date(),
      tags: ["new"],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscriber error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
