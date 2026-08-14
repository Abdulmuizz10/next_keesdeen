import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import TaxRate from "@/lib/models/TaxRate";
import ShippingZone from "@/lib/models/ShippingZone";
import { TaxShippingClient } from "./TaxShippingClient";

export const dynamic = "force-dynamic";

export default async function TaxShippingPage() {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();

  const [taxRates, shippingZones] = await Promise.all([
    TaxRate.find().sort({ country: 1, state: 1 }).lean(),
    ShippingZone.find().sort({ isDefault: -1, name: 1 }).lean(),
  ]);

  const serializedTaxRates = taxRates.map((r) => ({
    _id: r._id.toString(),
    name: r.name,
    country: r.country,
    state: r.state || "",
    postalCodePattern: r.postalCodePattern || "",
    rate: r.rate,
    isCompound: r.isCompound,
    priority: r.priority,
    isActive: r.isActive,
    isDefault: r.isDefault,
  }));

  const serializedZones = shippingZones.map((z) => ({
    _id: z._id.toString(),
    name: z.name,
    countries: z.countries,
    states: z.states || [],
    rates: z.rates.map((r) => ({
      name: r.name,
      description: r.description || "",
      price: r.price,
      minOrderAmount: r.minOrderAmount ?? null,
      maxOrderAmount: r.maxOrderAmount ?? null,
      minWeight: r.minWeight ?? null,
      maxWeight: r.maxWeight ?? null,
      estimatedDaysMin: r.estimatedDaysMin,
      estimatedDaysMax: r.estimatedDaysMax,
      isActive: r.isActive,
    })),
    isActive: z.isActive,
    isDefault: z.isDefault,
  }));

  return <TaxShippingClient initialTaxRates={serializedTaxRates} initialShippingZones={serializedZones} />;
}
