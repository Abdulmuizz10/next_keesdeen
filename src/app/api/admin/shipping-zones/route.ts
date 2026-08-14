import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import ShippingZone from "@/lib/models/ShippingZone";

export async function GET() {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const zones = await ShippingZone.find().sort({ isDefault: -1, name: 1 }).lean();
  return NextResponse.json(zones.map((z) => ({ ...z, _id: z._id.toString() })));
}

export async function POST(request: NextRequest) {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const body = await request.json();
  const zone = await ShippingZone.create(body);
  return NextResponse.json({ _id: zone._id.toString() });
}

export async function PATCH(request: NextRequest) {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const { _id, ...updates } = await request.json();
  await ShippingZone.findByIdAndUpdate(_id, updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  await requireRouteAccess("/admin/tax-shipping");
  await dbConnect();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await ShippingZone.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
