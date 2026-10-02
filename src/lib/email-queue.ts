import "server-only";
import { Client } from "@upstash/qstash";
import { randomUUID } from "crypto";
import type { PromotionEmailContent } from "./email";
import { sendNow, type SingleEmail } from "./email-transport";

export type EmailJob =
  | { kind: "single"; key: string; context: string; email: SingleEmail }
  | {
      kind: "promotion_chunk";
      key: string;
      content: PromotionEmailContent;
      recipients: { email: string; subscriberId: string }[];
    };

const qstash = process.env.QSTASH_TOKEN
  ? new Client({ token: process.env.QSTASH_TOKEN })
  : null;

const WORKER_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/queue/email`;

/**
 * Hands a job to QStash, which will POST it to the worker route, with
 * retries on failure. Returns true once the job is accepted into the queue
 * -- NOT once the email is actually delivered. Real delivery status lands
 * later via the Resend webhook (see /api/webhooks/resend).
 */
export async function enqueue(job: EmailJob): Promise<boolean> {
  // Local dev fallback: with no QStash configured, send single emails
  // inline so local dev keeps working without extra setup. QStash cannot
  // reach localhost anyway.
  if (!qstash) {
    if (job.kind === "single") {
      try {
        await sendNow(job.email, job.key);
        return true;
      } catch (e) {
        console.error(`[email] inline send failed "${job.context}"`, e);
        return false;
      }
    }
    console.warn(
      "[email] QSTASH_TOKEN not set - promotion chunks require the queue",
    );
    return false;
  }

  try {
    await qstash.publishJSON({
      url: WORKER_URL,
      body: job,
      retries: 5,
      deduplicationId: job.key, // publishing the same key twice = one job
      // Keeps sends under Resend's default rate limit (2 req/s). If your
      // installed @upstash/qstash version rejects this field, delete the
      // line -- the worker still retries on 429/5xx without it.
      flowControl: { key: "resend", ratePerSecond: 2, parallelism: 2 },
    });
    return true;
  } catch (e) {
    console.error("[email] enqueue failed", e);
    return false;
  }
}

export const newJobKey = () => randomUUID();
