import "server-only";
import crypto from "crypto";

// Reuses NEXTAUTH_SECRET if a dedicated one isn't set — either works, they
// just need to be stable and private. Set UNSUBSCRIBE_SECRET explicitly in
// production so rotating NextAuth's secret doesn't silently invalidate every
// unsubscribe link already sitting in inboxes.
const SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.UNSUBSCRIBE_SECRET ||
  "default-secret";

if (!SECRET) {
  console.warn(
    "[unsubscribe] Neither UNSUBSCRIBE_SECRET nor NEXTAUTH_SECRET is set — unsubscribe links will not verify correctly.",
  );
}

/**
 * Deterministic, stateless token for a subscriber id. Given the same id and
 * secret this always returns the same token, so it can be verified later
 * without a DB round trip or storing per-link tokens.
 */
export function generateUnsubscribeToken(subscriberId: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(subscriberId)
    .digest("hex")
    .slice(0, 32);
}

/** Constant-time comparison so this can't be timed to leak the valid token. */
export function verifyUnsubscribeToken(
  subscriberId: string,
  token: string,
): boolean {
  if (!token) return false;
  const expected = generateUnsubscribeToken(subscriberId);
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(token);
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}
