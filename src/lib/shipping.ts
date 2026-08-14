import "server-only";
import ShippingZone from "./models/ShippingZone";

export interface ShippingRateResult {
  name: string;
  description: string;
  price: number; // In cents
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isFree: boolean;
}

export interface ShippingResult {
  zoneName: string;
  rates: ShippingRateResult[];
}

/**
 * Given a shipping address and cart subtotal, find the matching
 * ShippingZone and return available rates.
 *
 * Matching priority:
 * 1. Country + state match
 * 2. Country-only match
 * 3. Default zone
 */
export async function getAvailableShippingRates(
  address: { country: string; state?: string },
  subtotal: number,
  _weight?: number
): Promise<ShippingResult> {
  const country = address.country.toUpperCase();

  // Try country-specific zone
  let zone = await ShippingZone.findOne({
    countries: country,
    isActive: true,
  });

  // Fallback to default zone
  if (!zone) {
    zone = await ShippingZone.findOne({
      isDefault: true,
      isActive: true,
    });
  }

  if (!zone) {
    return {
      zoneName: "Standard",
      rates: [
        {
          name: "Standard Shipping",
          description: "Estimated 5-10 business days",
          price: 995,
          estimatedDaysMin: 5,
          estimatedDaysMax: 10,
          isFree: false,
        },
      ],
    };
  }

  // Filter rates by order amount constraints
  const availableRates: ShippingRateResult[] = zone.rates
    .filter((r) => {
      if (!r.isActive) return false;
      if (r.minOrderAmount !== undefined && r.minOrderAmount !== null && subtotal < r.minOrderAmount) return false;
      if (r.maxOrderAmount !== undefined && r.maxOrderAmount !== null && subtotal > r.maxOrderAmount) return false;
      return true;
    })
    .map((r) => ({
      name: r.name,
      description: r.description || `${r.estimatedDaysMin}-${r.estimatedDaysMax} business days`,
      price: r.price,
      estimatedDaysMin: r.estimatedDaysMin,
      estimatedDaysMax: r.estimatedDaysMax,
      isFree: r.price === 0,
    }))
    .sort((a, b) => a.price - b.price);

  return {
    zoneName: zone.name,
    rates: availableRates,
  };
}

/**
 * Look up a specific shipping rate by name within a zone.
 */
export async function getShippingRate(
  address: { country: string; state?: string },
  subtotal: number,
  rateName: string
): Promise<ShippingRateResult | null> {
  const result = await getAvailableShippingRates(address, subtotal);
  return result.rates.find((r) => r.name === rateName) || null;
}
