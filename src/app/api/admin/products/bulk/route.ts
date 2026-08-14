import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Product from "@/lib/models/Product";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/products");
  if (permission === "read") {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }
  await dbConnect();

  const { action, ids, categoryId } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  switch (action) {
    case "publish":
      await Product.updateMany({ _id: { $in: ids } }, { status: "published" });
      break;
    case "unpublish":
      await Product.updateMany({ _id: { $in: ids } }, { status: "draft" });
      break;
    case "archive":
      await Product.updateMany({ _id: { $in: ids } }, { status: "archived" });
      break;
    case "assign_category":
      if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });
      await Product.updateMany({ _id: { $in: ids } }, { $addToSet: { categoryIds: categoryId } });
      break;
    case "delete":
      if (permission !== "full") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
      await Product.deleteMany({ _id: { $in: ids } });
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  revalidatePath("/");

  return NextResponse.json({ success: true, affected: ids.length });
}
