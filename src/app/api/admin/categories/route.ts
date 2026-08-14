import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Category from "@/lib/models/Category";
import { revalidatePath } from "next/cache";

export async function GET() {
  await requireRouteAccess("/admin/categories");
  await dbConnect();

  const categories = await Category.find().sort({ sortOrder: 1 }).lean();
  return NextResponse.json(
    categories.map((c) => ({
      ...c,
      _id: c._id.toString(),
      parentId: c.parentId?.toString() || null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/categories");
  if (permission === "read") return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const body = await request.json();
  const category = await Category.create(body);

  revalidatePath("/");
  revalidatePath(`/category/${category.slug}`);

  return NextResponse.json({ _id: category._id.toString(), slug: category.slug });
}

export async function PATCH(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/categories");
  if (permission === "read") return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const { _id, ...updates } = await request.json();
  const old = await Category.findById(_id).select("slug").lean();
  const category = await Category.findByIdAndUpdate(_id, updates, { new: true });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidatePath("/");
  if (old) revalidatePath(`/category/${old.slug}`);
  revalidatePath(`/category/${category.slug}`);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/categories");
  if (permission !== "full") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cat = await Category.findByIdAndDelete(id);
  if (cat) {
    revalidatePath("/");
    revalidatePath(`/category/${cat.slug}`);
  }

  return NextResponse.json({ success: true });
}
