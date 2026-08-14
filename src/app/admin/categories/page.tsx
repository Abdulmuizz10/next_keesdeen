import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Category from "@/lib/models/Category";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { permission } = await requireRouteAccess("/admin/categories");
  await dbConnect();

  const categories = await Category.find().sort({ sortOrder: 1 }).lean();

  const serialized = categories.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    image: c.image || "",
    parentId: c.parentId?.toString() || null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    seo: { metaTitle: c.seo?.metaTitle || "", metaDescription: c.seo?.metaDescription || "" },
  }));

  return <CategoriesClient initialCategories={serialized} permission={permission} />;
}
