import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Address from "@/lib/models/Address";
import { addressSchema } from "@/lib/validators/address";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const addresses = await Address.find({ userId: session.user.id })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  return NextResponse.json(
    addresses.map((a) => ({
      _id: a._id.toString(),
      label: a.label,
      fullName: a.fullName,
      line1: a.line1,
      line2: a.line2 || "",
      city: a.city,
      region: a.region,
      postalCode: a.postalCode,
      country: a.country,
      phone: a.phone || "",
      isDefault: a.isDefault,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validation = addressSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid address", details: validation.error.flatten() }, { status: 400 });
  }

  await dbConnect();

  // If this is being set as default, unset all others first
  if (validation.data.isDefault) {
    await Address.updateMany({ userId: session.user.id }, { isDefault: false });
  }

  const address = await Address.create({
    userId: session.user.id,
    ...validation.data,
  });

  return NextResponse.json({ _id: address._id.toString() });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await dbConnect();
  await Address.findOneAndDelete({ _id: id, userId: session.user.id });
  return NextResponse.json({ success: true });
}
