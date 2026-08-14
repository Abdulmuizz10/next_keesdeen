import "server-only";
import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";

/**
 * Square SDK client configuration.
 * Uses environment variables for access token, location ID, and environment.
 */

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || "sandbox";

if (!SQUARE_ACCESS_TOKEN) {
  console.warn(
    "SQUARE_ACCESS_TOKEN is not set. Square payments will not work.",
  );
}

if (!SQUARE_LOCATION_ID) {
  console.warn("SQUARE_LOCATION_ID is not set. Square payments will not work.");
}

/**
 * Initialize the Square client.
 */
export const squareClient = new SquareClient({
  token: SQUARE_ACCESS_TOKEN || "",
  environment:
    SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
});

/**
 * Get the Square location ID.
 */
export function getSquareLocationId(): string {
  if (!SQUARE_LOCATION_ID) {
    throw new Error("SQUARE_LOCATION_ID environment variable is not set");
  }
  return SQUARE_LOCATION_ID;
}

/**
 * Get the Square application ID for the Web Payments SDK.
 */
export function getSquareApplicationId(): string {
  return process.env.SQUARE_APPLICATION_ID || "";
}

/**
 * Check if Square is properly configured.
 */
export function isSquareConfigured(): boolean {
  return !!(SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID);
}

/**
 * Get the Square environment.
 */
export function getSquareEnvironment(): "sandbox" | "production" {
  return SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
}

/**
 * Verify Square webhook signature using the SDK helper.
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  signatureKey: string,
  notificationUrl: string,
): Promise<boolean> {
  try {
    return await WebhooksHelper.verifySignature({
      requestBody: body,
      signatureHeader: signature,
      signatureKey,
      notificationUrl,
    });
  } catch {
    return false;
  }
}

/**
 * Convert amount to Square Money format.
 * Square expects amounts in the smallest currency unit (cents for USD).
 */
export function toSquareMoney(
  amountCents: number,
  currency: "GBP" | "EUR" | "USD" | "CAD" = "GBP",
) {
  return {
    amount: BigInt(Math.round(amountCents)),
    currency,
  };
}

/**
 * Convert Square Money to cents.
 */
export function fromSquareMoney(
  money: { amount?: bigint | number } | undefined,
): number {
  if (!money || money.amount === undefined) return 0;
  return Number(money.amount);
}

// Re-export for convenience
export { SquareEnvironment, WebhooksHelper };
