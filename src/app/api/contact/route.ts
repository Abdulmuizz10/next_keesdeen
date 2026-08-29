import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  sendContactAutoReplyEmail,
  sendContactNotificationEmail,
} from "@/lib/email";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(150),
  message: z.string().min(1, "Message is required").max(5000),
  _hp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = contactSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid form data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Honeypot check — silently accept without sending anything
    if (data._hp) {
      return NextResponse.json({ success: true });
    }

    await Promise.all([
      sendContactAutoReplyEmail({
        name: data.name,
        email: data.email,
        subject: data.subject,
      }),
      sendContactNotificationEmail({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
