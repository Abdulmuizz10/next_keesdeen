import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Bundle from "@/lib/models/Bundle";
import Product from "@/lib/models/Product";

export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/products");
  await dbConnect();

  const productId = new URL(request.url).searchParams.get("productId");

  if (productId) {
    const bundle = await Bundle.findOne({ productId }).lean();
    if (!bundle) return NextResponse.json(null);

    const items = await Product.find({ _id: { $in: bundle.itemProductIds } })
      .select("title slug images basePrice")
      .lean();

    return NextResponse.json({
      _id: bundle._id.toString(),
      productId: bundle.productId.toString(),
      itemProductIds: bundle.itemProductIds.map((id) => id.toString()),
      items: items.map((p) => ({
        _id: p._id.toString(),
        title: p.title,
        slug: p.slug,
        image: p.images[0] || "",
        basePrice: p.basePrice,
      })),
      title: bundle.title || "",
      isActive: bundle.isActive,
    });
  }

  const bundles = await Bundle.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(
    bundles.map((b) => ({
      _id: b._id.toString(),
      productId: b.productId.toString(),
      itemProductIds: b.itemProductIds.map((id) => id.toString()),
      title: b.title || "",
      isActive: b.isActive,
    }))
  );
}

export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission === "read") return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const body = await request.json();
  const bundle = await Bundle.findOneAndUpdate(
    { productId: body.productId },
    {
      productId: body.productId,
      itemProductIds: body.itemProductIds,
      title: body.title || undefined,
      isActive: body.isActive ?? true,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ _id: bundle._id.toString() });
}

export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission !== "full") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await dbConnect();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await Bundle.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
