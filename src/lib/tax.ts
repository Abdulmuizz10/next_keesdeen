import "server-only";
import TaxRate from "./models/TaxRate";

export interface TaxResult {
  taxAmount: number; // In cents
  rate: number; // Percentage (e.g. 8.875)
  name: string;
  isCompound: boolean;
}

/**
 * Given a shipping address and subtotal, find the matching TaxRate
 * and return the tax amount.
 *
 * Matching priority:
 * 1. Country + State match (most specific)
 * 2. Country-only match (fallback)
 * 3. Default rate (isDefault: true)
 * 4. Zero tax
 */
export async function calculateTax(
  address: { country: string; state: string; postalCode?: string },
  subtotalAfterDiscount: number
): Promise<TaxResult> {
  const country = address.country.toUpperCase();
  const state = address.state.toUpperCase();

  // Try state-specific rate first
  let taxRate = await TaxRate.findOne({
    country,
    state,
    isActive: true,
  }).sort({ priority: -1 });

  // Fallback to country-level rate
  if (!taxRate) {
    taxRate = await TaxRate.findOne({
      country,
      $or: [
        { state: { $exists: false } },
        { state: null },
        { state: "" },
      ],
      isActive: true,
    }).sort({ priority: -1 });
  }

  // Fallback to default rate
  if (!taxRate) {
    taxRate = await TaxRate.findOne({
      isDefault: true,
      isActive: true,
    });
  }

  if (!taxRate || taxRate.rate === 0) {
    return { taxAmount: 0, rate: 0, name: "No Tax", isCompound: false };
  }

  // Check postal code pattern if provided
  if (taxRate.postalCodePattern && address.postalCode) {
    try {
      const regex = new RegExp(taxRate.postalCodePattern);
      if (!regex.test(address.postalCode)) {
        return { taxAmount: 0, rate: 0, name: "No Tax", isCompound: false };
      }
    } catch {
      // Invalid regex, ignore
    }
  }

  const taxAmount = Math.round((subtotalAfterDiscount * taxRate.rate) / 100);

  return {
    taxAmount,
    rate: taxRate.rate,
    name: taxRate.name,
    isCompound: taxRate.isCompound,
  };
}

/**
 * Get all active tax rates for admin display.
 */
export async function getAllTaxRates() {
  return TaxRate.find({ isActive: true }).sort({ country: 1, state: 1 }).lean();
}
