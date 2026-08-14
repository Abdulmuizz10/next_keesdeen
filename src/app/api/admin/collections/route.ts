import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Collection from "@/lib/models/Collection";
import { revalidatePath } from "next/cache";

export async function GET() {
  await requireRouteAccess("/admin/collections");
  await dbConnect();

  const collections = await Collection.find().sort({ sortOrder: 1 }).lean();
  return NextResponse.json(
    collections.map((c) => ({
      ...c,
      _id: c._id.toString(),
    }))
  );
}

export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/collections");
  if (permission === "read") return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const body = await request.json();
  const collection = await Collection.create(body);

  revalidatePath("/");

  return NextResponse.json({ _id: collection._id.toString(), slug: collection.slug });
}

export async function PATCH(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/collections");
  if (permission === "read") return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const { _id, ...updates } = await request.json();
  const collection = await Collection.findByIdAndUpdate(_id, updates, { new: true });
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidatePath("/");

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/collections");
  if (permission !== "full") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await Collection.findByIdAndDelete(id);
  revalidatePath("/");

  return NextResponse.json({ success: true });
}
