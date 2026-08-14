import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";
import Collection from "@/lib/models/Collection";

/**
 * GET /api/admin/promotions/scope-search?scope=category&q=leather
 * Search for entities matching a promotion scope.
 */
export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/promotions");
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "product";
  const q = searchParams.get("q") || "";

  const regex = new RegExp(q, "i");
  let results: { _id: string; label: string }[] = [];

  switch (scope) {
    case "category": {
      const cats = await Category.find(q ? { name: regex } : {}).select("name").limit(20).lean();
      results = cats.map((c) => ({ _id: c._id.toString(), label: c.name }));
      break;
    }
    case "collection": {
      const cols = await Collection.find(q ? { name: regex } : {}).select("name").limit(20).lean();
      results = cols.map((c) => ({ _id: c._id.toString(), label: c.name }));
      break;
    }
    case "product": {
      const prods = await Product.find(q ? { title: regex } : {}).select("title").limit(20).lean();
      results = prods.map((p) => ({ _id: p._id.toString(), label: p.title }));
      break;
    }
  }

  return NextResponse.json(results);
}
