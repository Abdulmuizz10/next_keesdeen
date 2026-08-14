import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import TaxRate from "@/lib/models/TaxRate";

export async function GET() {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const rates = await TaxRate.find().sort({ country: 1, state: 1, priority: -1 }).lean();
  return NextResponse.json(rates.map((r) => ({ ...r, _id: r._id.toString() })));
}

export async function POST(request: NextRequest) {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const body = await request.json();
  const rate = await TaxRate.create(body);
  return NextResponse.json({ _id: rate._id.toString() });
}

export async function PATCH(request: NextRequest) {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const { _id, ...updates } = await request.json();
  await TaxRate.findByIdAndUpdate(_id, updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await TaxRate.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
