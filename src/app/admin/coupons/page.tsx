import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Coupon from "@/lib/models/Coupon";
import { CouponsClient } from "./CouponsClient";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  await requireRouteAccess("/admin/coupons");
  await dbConnect();

  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

  const serialized = coupons.map((c) => ({
    _id: c._id.toString(), code: c.code, description: c.description || "",
    type: c.type as "percentage" | "fixed_amount" | "free_shipping",
    value: c.value, minPurchaseAmount: c.minPurchaseAmount ?? null,
    maxDiscountAmount: c.maxDiscountAmount ?? null, usageLimit: c.usageLimit ?? null,
    usageLimitPerUser: c.usageLimitPerUser ?? null, usageCount: c.usageCount,
    startDate: c.startDate.toISOString(), endDate: c.endDate.toISOString(),
    isActive: c.isActive, firstTimeOnly: c.firstTimeOnly, createdAt: c.createdAt.toISOString(),
  }));

  return <CouponsClient initialCoupons={serialized} />;
}
