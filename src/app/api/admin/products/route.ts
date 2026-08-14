import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Product from "@/lib/models/Product";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/products");
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const category = searchParams.get("category") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (search) query.$text = { $search: search };
  if (status) query.status = status;
  if (category) query.categoryIds = category;

  const products = await Product.find(query).sort({ createdAt: -1 }).limit(200).lean();

  return NextResponse.json(
    products.map((p) => ({
      ...p,
      _id: p._id.toString(),
      categoryIds: p.categoryIds.map((id) => id.toString()),
      collectionIds: p.collectionIds.map((id) => id.toString()),
    }))
  );
}

export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission === "read") {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }
  await dbConnect();

  const body = await request.json();
  const product = await Product.create(body);

  revalidatePath("/");
  if (product.status === "published") {
    revalidatePath(`/product/${product.slug}`);
    for (const catId of product.categoryIds) {
      const Category = (await import("@/lib/models/Category")).default;
      const cat = await Category.findById(catId).select("slug").lean();
      if (cat) revalidatePath(`/category/${cat.slug}`);
    }
  }

  return NextResponse.json({ _id: product._id.toString(), slug: product.slug });
}

export async function PATCH(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission === "read") {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }
  await dbConnect();

  const body = await request.json();
  const { _id, ...updates } = body;

  const product = await Product.findByIdAndUpdate(_id, updates, { new: true });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidatePath("/");
  revalidatePath(`/product/${product.slug}`);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission !== "full") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const product = await Product.findByIdAndDelete(id);
  if (product) {
    revalidatePath("/");
    revalidatePath(`/product/${product.slug}`);
  }

  return NextResponse.json({ success: true });
}
