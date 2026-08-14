/**
 * Format price in cents to display string.
 * This is a pure utility — safe for both server and client use.
 */
export function formatPrice(cents: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
