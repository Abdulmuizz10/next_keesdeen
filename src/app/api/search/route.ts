import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";

/**
 * GET /api/search?q=leather+wallet&limit=8
 * Rate-limited product search with optional category matches.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  // Rate limiting by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const rl = await checkRateLimit(`search:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.reset),
        },
      }
    );
  }

  await dbConnect();

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  // Search products: try $text first, fall back to regex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let products: any[];
  try {
    products = await Product.find(
      { $text: { $search: q }, status: "published" },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .select("slug title images basePrice avgRating reviewCount variants")
      .lean();
  } catch {
    // $text index might not exist yet — fallback to regex
    products = [];
  }

  // Fallback to regex if $text returned nothing
  if (products.length === 0) {
    products = await Product.find({
      status: "published",
      $or: [{ title: regex }, { tags: regex }, { description: regex }],
    })
      .sort({ totalSold: -1 })
      .limit(limit)
      .select("slug title images basePrice avgRating reviewCount variants")
      .lean();
  }

  // Search categories
  const categories = await Category.find({
    isActive: true,
    $or: [{ name: regex }, { description: regex }],
  })
    .limit(4)
    .select("slug name image")
    .lean();

  return NextResponse.json({
    products: products.map((p) => {
      const totalStock = p.variants.reduce(
        (sum: number, v: { stock: number }) => sum + v.stock,
        0
      );
      return {
        _id: p._id.toString(),
        slug: p.slug,
        title: p.title,
        image: p.images[0] || "",
        basePrice: p.basePrice,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
        inStock: totalStock > 0,
      };
    }),
    categories: categories.map((c) => ({
      _id: c._id.toString(),
      slug: c.slug,
      name: c.name,
      image: c.image || "",
    })),
  });
}
