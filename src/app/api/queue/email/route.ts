import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";
import type { EmailJob } from "@/lib/email-queue";
import { renderPromotionEmail } from "@/lib/email";
import { sendNow, resend, FROM_EMAIL } from "@/lib/email-transport";
import {
  isSuppressed,
  filterSendableSubscribers,
} from "@/lib/email-suppression";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://keesdeen.com";
const buildUnsubscribeUrl = (subscriberId: string) =>
  `${SITE_URL}/unsubscribe?id=${subscriberId}&token=${generateUnsubscribeToken(subscriberId)}`;

// Permanent failure: tells QStash NOT to retry.
const noRetry = (msg: string) =>
  NextResponse.json(
    { error: msg },
    { status: 400, headers: { "Upstash-NonRetryable-Error": "true" } },
  );

async function handler(req: Request) {
  const job = (await req.json()) as EmailJob;

  try {
    if (job.kind === "single") {
      if (await isSuppressed(job.email.to)) {
        console.warn(
          `[email] suppressed, skipping "${job.context}" -> ${job.email.to}`,
        );
        return NextResponse.json({ skipped: true });
      }
      const id = await sendNow(job.email, job.key);
      console.log(`[email] sent "${job.context}" to ${job.email.to}`, id);
      return NextResponse.json({ id });
    }

    if (job.kind === "promotion_chunk") {
      if (!resend) return noRetry("RESEND_API_KEY not set");

      const recipients = await filterSendableSubscribers(job.recipients);
      if (recipients.length === 0) return NextResponse.json({ sent: 0 });

      const { error } = await resend.batch.send(
        recipients.map((r) => ({
          from: FROM_EMAIL,
          to: r.email,
          subject: job.content.headline,
          html: renderPromotionEmail(
            job.content,
            buildUnsubscribeUrl(r.subscriberId),
          ),
        })),
        { idempotencyKey: job.key },
      );
      if (error)
        throw Object.assign(new Error(error.message), { resendError: error });

      return NextResponse.json({ sent: recipients.length });
    }

    return noRetry("unknown job kind");
  } catch (err: any) {
    const name: string = err?.resendError?.name ?? "";
    // Validation-style errors will never succeed on retry
    if (
      name.startsWith("validation") ||
      name === "invalid_idempotent_request"
    ) {
      console.error("[email] permanent failure", err);
      return noRetry(err.message);
    }
    console.error("[email] transient failure, will retry", err);
    return NextResponse.json({ error: "retry" }, { status: 500 }); // 429s land here too
  }
}

// Rejects any request not signed by QStash
export const POST = verifySignatureAppRouter(handler);
