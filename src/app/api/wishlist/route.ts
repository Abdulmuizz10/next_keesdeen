import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import Wishlist from "@/lib/models/Wishlist";

/**
 * GET /api/wishlist
 * Returns the current user's wishlist product IDs.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ productIds: [] });

  await dbConnect();
  const wishlist = await Wishlist.findOne({ userId: session.user.id }).lean();
  return NextResponse.json({
    productIds: (wishlist?.productIds || []).map((id) => id.toString()),
  });
}

/**
 * POST /api/wishlist { productId, action: "add" | "remove" }
 * Toggle a product in the user's wishlist.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to save items" }, { status: 401 });
  }

  const { productId, action } = await request.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  await dbConnect();

  if (action === "remove") {
    await Wishlist.findOneAndUpdate(
      { userId: session.user.id },
      { $pull: { productIds: productId } }
    );
  } else {
    await Wishlist.findOneAndUpdate(
      { userId: session.user.id },
      { $addToSet: { productIds: productId } },
      { upsert: true }
    );
  }

  const wishlist = await Wishlist.findOne({ userId: session.user.id }).lean();
  return NextResponse.json({
    productIds: (wishlist?.productIds || []).map((id) => id.toString()),
  });
}
