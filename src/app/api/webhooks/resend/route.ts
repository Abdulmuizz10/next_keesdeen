import { NextResponse } from "next/server";
import { Webhook } from "svix";
import dbConnect from "@/lib/db";
import { EmailEvent } from "@/lib/models/EmailEvent";
import Subscriber from "@/lib/models/Subscriber";
import { suppress } from "@/lib/email-suppression";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json({ error: "not configured" }, { status: 500 });

  // Signature verification needs the RAW body -- never call req.json() first.
  const raw = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";

  type ResendWebhookEvent = {
    type: string;
    created_at: string;
    data: any;
  };

  let event: ResendWebhookEvent;
  try {
    event = new Webhook(secret).verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as unknown as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  await dbConnect();
  const recipient: string = (event.data?.to?.[0] ?? "").toLowerCase();

  // 1) Act first. These writes are idempotent upserts, so a redelivered
  //    event (Resend/Svix retries) is harmless to repeat.
  if (recipient) {
    switch (event.type) {
      case "email.bounced": {
        const bounceType = String(event.data?.bounce?.type ?? "").toLowerCase();
        // Transient bounces (full mailbox, temporary server issue) shouldn't
        // permanently block someone -- only hard/permanent bounces do.
        if (bounceType !== "transient") {
          await suppress(recipient, "bounced");
          await Subscriber.updateMany(
            { email: recipient, status: "active" },
            { $set: { status: "bounced" } },
          );
        }
        break;
      }
      case "email.complained":
        await suppress(recipient, "complained");
        await Subscriber.updateMany(
          { email: recipient, status: { $ne: "unsubscribed" } },
          { $set: { status: "unsubscribed", unsubscribedAt: new Date() } },
        );
        break;
      // email.delivered / email.delivery_delayed / email.failed: logged below only
    }
  }

  // 2) Then log. Duplicate svixId (Mongo error 11000) just means it's
  //    already been processed.
  try {
    await EmailEvent.create({
      svixId,
      resendId: event.data?.email_id ?? "",
      type: event.type,
      recipient,
      payload: event.data,
    });
  } catch (e: any) {
    if (e?.code !== 11000) throw e; // a real error -> 500 -> Resend retries
  }

  return NextResponse.json({ ok: true });
}
