import "server-only";
import dbConnect from "@/lib/db";
import { EmailSuppression } from "@/lib/models/EmailSuppression";
import Subscriber from "@/lib/models/Subscriber";

/**
 * Hard suppression list: addresses that permanently bounced or complained.
 * Checked before EVERY send -- transactional and promotional alike -- since
 * a dead or complaining address should never be mailed again, regardless of
 * why the send was triggered.
 */
export async function isSuppressed(email: string): Promise<boolean> {
  await dbConnect();
  return !!(await EmailSuppression.exists({ email: email.toLowerCase() }));
}

export async function suppress(
  email: string,
  reason: "bounced" | "complained",
) {
  await dbConnect();
  await EmailSuppression.updateOne(
    { email: email.toLowerCase() },
    { $set: { reason }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}

/**
 * Used by the promotion worker right before sending a chunk. Drops anyone
 * who is hard-suppressed OR no longer an active subscriber (e.g. they
 * unsubscribed, or were marked bounced, after the campaign was queued but
 * before this chunk actually sent).
 */
export async function filterSendableSubscribers<
  T extends { email: string; subscriberId: string },
>(list: T[]): Promise<T[]> {
  if (list.length === 0) return list;
  await dbConnect();

  const [suppressedRows, activeRows] = await Promise.all([
    EmailSuppression.find(
      { email: { $in: list.map((r) => r.email.toLowerCase()) } },
      { email: 1, _id: 0 },
    ).lean(),
    Subscriber.find(
      { _id: { $in: list.map((r) => r.subscriberId) }, status: "active" },
      { _id: 1 },
    ).lean(),
  ]);

  const blocked = new Set(suppressedRows.map((r: any) => r.email));
  const active = new Set(activeRows.map((r: any) => String(r._id)));

  return list.filter(
    (r) =>
      !blocked.has(r.email.toLowerCase()) && active.has(String(r.subscriberId)),
  );
}
