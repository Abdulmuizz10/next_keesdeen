import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import SiteConfig from "@/lib/models/SiteConfig";

/**
 * GET /api/admin/site-config
 * Fetch the singleton SiteConfig document.
 */
export async function GET() {
  await requireRouteAccess("/admin/settings");
  await dbConnect();

  let config = await SiteConfig.findOne({ siteKey: "main" }).lean();

  if (!config) {
    // Create default if not exists
    config = await SiteConfig.findOneAndUpdate(
      { siteKey: "main" },
      { $setOnInsert: { siteKey: "main", siteName: "Keesdeen" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return NextResponse.json({
    ...config,
    _id: config!._id.toString(),
  });
}

/**
 * PUT /api/admin/site-config
 * Update the singleton SiteConfig document and revalidate the homepage.
 */
export async function PUT(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/settings");
  if (permission === "read") {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }
  await dbConnect();

  const body = await request.json();

  // Remove _id and siteKey from updates (immutable)
  const { _id, siteKey, ...updates } = body;

  const config = await SiteConfig.findOneAndUpdate(
    { siteKey: "main" },
    { $set: updates },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Revalidate homepage and all storefront pages that read config
  revalidatePath("/");
  revalidatePath("/category");
  revalidatePath("/product");

  return NextResponse.json({
    success: true,
    _id: config._id.toString(),
  });
}
