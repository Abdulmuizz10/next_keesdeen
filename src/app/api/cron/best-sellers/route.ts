import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { recomputeBestSellers } from "@/lib/cron/recomputeBestSellers";

function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

/**
 * GET /api/cron/best-sellers
 * Daily cron job to recompute salesCount30d and salesCount90d.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const result = await recomputeBestSellers();
  return NextResponse.json({ success: true, ...result });
}
