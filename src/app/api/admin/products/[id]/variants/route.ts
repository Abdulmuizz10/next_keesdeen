import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Product from "@/lib/models/Product";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireRouteAccess("/admin/products");
  await dbConnect();

  const { id } = await params;
  const product = await Product.findById(id)
    .select("title slug images basePrice variants")
    .lean();

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    _id: product._id.toString(),
    title: product.title,
    variants: product.variants.map((v) => ({
      sku: v.sku,
      size: v.attributes?.size || "",
      color: v.attributes?.color || "",
      colorHex: v.attributes?.colorHex || "",
      price: v.price ?? product.basePrice,
      stock: v.stock,
      image: v.images?.[0] || product.images[0] || "",
      isActive: v.isActive,
    })),
  });
}
