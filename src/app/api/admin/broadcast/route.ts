import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Subscriber from "@/lib/models/Subscriber";
import {
  sendPromotionBroadcast,
  type PromotionEmailContent,
} from "@/lib/email";

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
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0, total: 0 });
  }

  const content: PromotionEmailContent = {
    headline,
    bodyText,
    ctaLabel,
    ctaUrl,
    discountCode: discountCode || undefined,
    bannerImageUrl: bannerImageUrl || undefined,
  };

  // Optional double-click protection: if your admin form generates one id
  // (e.g. crypto.randomUUID()) when it first opens and sends it as
  // body.campaignId, a second submit with that same id will not re-send.
  // Without it, every request is treated as a brand new campaign.
  const campaignId =
    typeof body.campaignId === "string" && body.campaignId.trim()
      ? `manual-${body.campaignId.trim()}`
      : `manual-${randomUUID()}`;

  const result = await sendPromotionBroadcast({
    recipients: activeSubscribers.map((s) => ({
      email: s.email as string,
      subscriberId: (s._id as { toString(): string }).toString(),
    })),
    content,
    campaignId,
  });

  // Keeping the same response shape your admin UI already expects.
  // NOTE: "sent" now means "queued", not "delivered" -- this call returns
  // as soon as every chunk is accepted by the queue, not once Resend has
  // actually sent each email. Real delivery status lands in the
  // EmailEvent collection via the Resend webhook.
  return NextResponse.json({
    sent: result.queued,
    failed: result.failedToQueue,
    skipped: result.skipped,
    total: activeSubscribers.length,
  });
}
