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

    const modernItems = (bundle.items || []).map((it) => ({
      productId: it.productId.toString(),
      sku: it.sku,
    }));

    const productIds = modernItems.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items = modernItems
      .map((it) => {
        const p = productMap.get(it.productId);
        if (!p) return null;
        const variant = p.variants.find((v) => v.sku === it.sku);
        if (!variant) return null;
        return {
          productId: p._id.toString(),
          title: p.title,
          slug: p.slug,
          image: variant.images?.[0] || p.images[0] || "",
          sku: variant.sku,
          size: variant.attributes?.size || "",
          color: variant.attributes?.color || "",
          colorHex: variant.attributes?.colorHex || "",
          price: variant.price ?? p.basePrice,
          stock: variant.stock,
        };
      })
      .filter((x) => x !== null);

    return NextResponse.json({
      _id: bundle._id.toString(),
      productId: bundle.productId.toString(),
      items,
      title: bundle.title || "",
      isActive: bundle.isActive,
    });
  }

  const bundles = await Bundle.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(
    bundles.map((b) => ({
      _id: b._id.toString(),
      productId: b.productId.toString(),
      itemCount: b.items?.length || 0,
      title: b.title || "",
      isActive: b.isActive,
    })),
  );
}

export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission === "read")
    return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const body = (await request.json()) as {
    productId: string;
    items: { productId: string; sku: string }[];
    title?: string;
    isActive?: boolean;
  };

  if (!body.productId || !Array.isArray(body.items)) {
    return NextResponse.json(
      { error: "productId and items are required" },
      { status: 400 },
    );
  }

  // Validate every sku actually belongs to the product it claims to
  const productIds = [...new Set(body.items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select("variants")
    .lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  for (const item of body.items) {
    if (!item.sku) {
      return NextResponse.json(
        { error: "Each bundle item needs a variant selected" },
        { status: 400 },
      );
    }
    const p = productMap.get(item.productId);
    const validSku = p?.variants.some((v) => v.sku === item.sku);
    if (!validSku) {
      return NextResponse.json(
        {
          error: `Invalid variant "${item.sku}" for product ${item.productId}`,
        },
        { status: 400 },
      );
    }
  }

  const bundle = await Bundle.findOneAndUpdate(
    { productId: body.productId },
    {
      productId: body.productId,
      items: body.items,
      title: body.title || undefined,
      isActive: body.isActive ?? true,
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({ _id: bundle._id.toString() });
}

export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission !== "full")
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  await dbConnect();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await Bundle.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
