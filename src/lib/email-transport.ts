import "server-only";
import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_EMAIL = process.env.FROM_EMAIL || "hello@keesdeen.com";

export interface SingleEmail {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Sends ONE email immediately via Resend. Throws on failure so the caller
 * (the queue worker) can decide whether to retry.
 *
 * idempotencyKey: Resend will de-duplicate a send that reuses the same key
 * within a short window, which protects against QStash occasionally
 * delivering the same job twice (at-least-once delivery).
 */
export async function sendNow(email: SingleEmail, idempotencyKey: string) {
  if (!resend) throw new Error("RESEND_API_KEY not set");

  const { data, error } = await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: email.to,
      subject: email.subject,
      html: email.html,
      replyTo: email.replyTo,
    },
    { idempotencyKey },
  );

  if (error) {
    throw Object.assign(new Error(error.message), { resendError: error });
  }
  return data?.id;
}
