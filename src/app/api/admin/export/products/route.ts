import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";
import { buildWorkbook, workbookToBuffer } from "@/lib/export/excel";
import { buildPrintableDoc, docToBuffer } from "@/lib/export/docx";
import { formatPrice } from "@/lib/format";

function bufferToStream(buffer: Buffer) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
}

export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/products");
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  const search = (searchParams.get("search") || "").trim();
  const status = searchParams.get("status") || "";
  const category = searchParams.get("category") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (status) query.status = status;
  if (category) query.categoryIds = category;
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ title: regex }, { slug: regex }];
  }

  const products = await Product.find(query).sort({ title: 1 }).lean();

  const allCategoryIds = [...new Set(products.flatMap((p) => p.categoryIds.map((id) => id.toString())))];
  const categories = await Category.find({ _id: { $in: allCategoryIds } }).select("name").lean();
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

  const rows = products.flatMap((product) => {
    const categoryNames = product.categoryIds.map((id) => categoryMap.get(id.toString()) || "Unknown").join(", ");
    return product.variants.map((variant) => ({
      title: product.title,
      slug: product.slug,
      sku: variant.sku,
      size: variant.attributes.size || "",
      color: variant.attributes.color || "",
      price: formatPrice(variant.price || product.basePrice),
      stock: variant.stock,
      status: product.status,
      category: categoryNames,
    }));
  });

  const baseName = `products-${new Date().toISOString().slice(0, 10)}`;

  if (format === "docx") {
    const doc = await buildPrintableDoc("Products Export", [
      {
        heading: "Catalog",
        headers: ["Title", "Slug", "SKU", "Size", "Color", "Price", "Stock", "Status", "Category"],
        rows: rows.map((r) => [r.title, r.slug, r.sku, r.size, r.color, r.price, r.stock, r.status, r.category]),
      },
    ]);
    const buffer = await docToBuffer(doc);
    return new NextResponse(bufferToStream(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${baseName}.docx"`,
      },
    });
  }

  const workbook = await buildWorkbook(
    "Products",
    [
      { key: "title", label: "Title", width: 28 },
      { key: "slug", label: "Slug", width: 26 },
      { key: "sku", label: "SKU", width: 18 },
      { key: "size", label: "Size", width: 12 },
      { key: "color", label: "Color", width: 14 },
      { key: "price", label: "Price", width: 14 },
      { key: "stock", label: "Stock", width: 10 },
      { key: "status", label: "Status", width: 12 },
      { key: "category", label: "Category", width: 24 },
    ],
    rows
  );
  const buffer = await workbookToBuffer(workbook);

  return new NextResponse(bufferToStream(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
    },
  });
}
