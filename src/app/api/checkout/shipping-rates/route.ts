import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getAvailableShippingRates } from "@/lib/shipping";
import { calculateTax } from "@/lib/tax";

/**
 * POST /api/checkout/shipping-rates
 * Given an address and subtotal, return available shipping rates and estimated tax.
 * Called from the checkout page when the user enters their address.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { country, state, postalCode, subtotal } = body;

    if (!country || !subtotal) {
      return NextResponse.json({ error: "country and subtotal required" }, { status: 400 });
    }

    await dbConnect();

    const [shippingResult, taxResult] = await Promise.all([
      getAvailableShippingRates({ country, state }, subtotal),
      calculateTax({ country, state, postalCode }, subtotal),
    ]);

    return NextResponse.json({
      shipping: shippingResult,
      tax: taxResult,
    });
  } catch (error) {
    console.error("Shipping rates error:", error);
    return NextResponse.json({ error: "Failed to calculate rates" }, { status: 500 });
  }
}
