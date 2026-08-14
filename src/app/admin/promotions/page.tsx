import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Promotion from "@/lib/models/Promotion";
import Category from "@/lib/models/Category";
import Collection from "@/lib/models/Collection";
import Product from "@/lib/models/Product";
import { PromotionsClient } from "./PromotionsClient";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const { permission } = await requireRouteAccess("/admin/promotions");
  await dbConnect();

  const promotions = await Promotion.find().sort({ createdAt: -1 }).lean();

  // Resolve scope entity names
  const catIds = new Set<string>();
  const colIds = new Set<string>();
  const prodIds = new Set<string>();
  for (const p of promotions) {
    if (p.scope === "category" && p.scopeIds)
      p.scopeIds.forEach((id) => catIds.add(id.toString()));
    if (p.scope === "collection" && p.scopeIds)
      p.scopeIds.forEach((id) => colIds.add(id.toString()));
    if (p.scope === "product" && p.scopeIds)
      p.scopeIds.forEach((id) => prodIds.add(id.toString()));
  }

  const [cats, cols, prods] = await Promise.all([
    catIds.size > 0
      ? Category.find({ _id: { $in: [...catIds] } })
          .select("name")
          .lean()
      : [],
    colIds.size > 0
      ? Collection.find({ _id: { $in: [...colIds] } })
          .select("name")
          .lean()
      : [],
    prodIds.size > 0
      ? Product.find({ _id: { $in: [...prodIds] } })
          .select("title")
          .lean()
      : [],
  ]);

  const nameMap = new Map<string, string>();
  for (const c of cats) nameMap.set(c._id.toString(), c.name);
  for (const c of cols) nameMap.set(c._id.toString(), c.name);
  for (const p of prods) nameMap.set(p._id.toString(), p.title);

  const serialized = promotions.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    code: p.code || null,
    type: p.type as
      | "percentage"
      | "fixed_amount"
      | "buy_x_get_y"
      | "free_shipping",
    value: p.value,
    scope: p.scope as "all" | "category" | "collection" | "product",
    scopeIds: (p.scopeIds || []).map((id) => id.toString()),
    scopeNames: (p.scopeIds || []).map(
      (id) => nameMap.get(id.toString()) || "Unknown",
    ),
    minPurchaseAmount: p.minPurchaseAmount ?? null,
    maxDiscountAmount: p.maxDiscountAmount ?? null,
    usageLimit: p.usageLimit ?? null,
    usageCount: p.usageCount,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    isActive: p.isActive,
    isStackable: p.isStackable,
    priority: p.priority,
    createdAt: p.createdAt.toISOString(),
    showBanner: p.showBanner,
    bannerImage: p.bannerImage ?? null,
    bannerHeadline: p.bannerHeadline ?? null,
    bannerSubheadline: p.bannerSubheadline ?? null,
    ctaLabel: p.ctaLabel ?? null,
    ctaHref: p.ctaHref ?? null,
  }));

  return (
    <PromotionsClient initialPromotions={serialized} permission={permission} />
  );
}
