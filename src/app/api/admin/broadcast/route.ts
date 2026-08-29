import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Subscriber from "@/lib/models/Subscriber";
import {
  sendPromotionBroadcast,
  type PromotionEmailContent,
} from "@/lib/email";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://keesdeen.com";

export async function POST(req: NextRequest) {
  // Same gate as PATCH/bulk in /api/admin/subscribers: "read" is the only
  // permission level blocked here (sending isn't a "full"-only action like
  // delete is).
  const { permission } = await requireRouteAccess("/admin/subscribers");
  if (permission === "read") {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const headline =
    typeof body.headline === "string" ? body.headline.trim() : "";
  const bodyText =
    typeof body.bodyText === "string" ? body.bodyText.trim() : "";
  const ctaLabel =
    typeof body.ctaLabel === "string" ? body.ctaLabel.trim() : "";
  const ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl.trim() : "";
  const discountCode =
    typeof body.discountCode === "string" ? body.discountCode.trim() : "";
  const bannerImageUrl =
    typeof body.bannerImageUrl === "string" ? body.bannerImageUrl.trim() : "";

  if (!headline || !bodyText || !ctaLabel || !ctaUrl) {
    return NextResponse.json(
      {
        error:
          "Headline, body text, button label, and button link are all required.",
      },
      { status: 400 },
    );
  }

  try {
    // Basic sanity check — a malformed URL here would otherwise ship out to
    // every active subscriber before anyone notices.
    new URL(ctaUrl);
  } catch {
    return NextResponse.json(
      { error: "Button link must be a valid URL." },
      { status: 400 },
    );
  }

  await dbConnect();

  const activeSubscribers = await Subscriber.find({ status: "active" })
    .select("_id email")
    .lean();

  if (activeSubscribers.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  const content: PromotionEmailContent = {
    headline,
    bodyText,
    ctaLabel,
    ctaUrl,
    discountCode: discountCode || undefined,
    bannerImageUrl: bannerImageUrl || undefined,
  };

  const result = await sendPromotionBroadcast({
    recipients: activeSubscribers.map((s) => ({
      email: s.email as string,
      subscriberId: (s._id as { toString(): string }).toString(),
    })),
    content,
    unsubscribeUrlFor: (subscriberId) =>
      `${SITE_URL}/unsubscribe?id=${subscriberId}&token=${generateUnsubscribeToken(subscriberId)}`,
  });

  // sent/failed/skipped from sendPromotionBroadcast + total active
  // subscribers considered, so the UI can tell "all delivered" apart
  // from "some/all silently failed" instead of treating any 200 as success.
  return NextResponse.json({ ...result, total: activeSubscribers.length });
}
