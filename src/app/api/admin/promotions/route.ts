import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Promotion from "@/lib/models/Promotion";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";
import Collection from "@/lib/models/Collection";
import cloudinary from "@/lib/cloudinary";

const MAX_BANNER_BYTES = 8 * 1024 * 1024; // 8MB

// ─────────────────────────────────────────────
// GET — List promotions
// ─────────────────────────────────────────────
export async function GET() {
  await requireRouteAccess("/admin/promotions");
  await dbConnect();

  const promotions = await Promotion.find().sort({ createdAt: -1 }).lean();

  // Resolve scope names for display
  const allCategoryIds = new Set<string>();
  const allCollectionIds = new Set<string>();
  const allProductIds = new Set<string>();

  for (const p of promotions) {
    if (p.scope === "category" && p.scopeIds) {
      p.scopeIds.forEach((id) => allCategoryIds.add(id.toString()));
    }

    if (p.scope === "collection" && p.scopeIds) {
      p.scopeIds.forEach((id) => allCollectionIds.add(id.toString()));
    }

    if (p.scope === "product" && p.scopeIds) {
      p.scopeIds.forEach((id) => allProductIds.add(id.toString()));
    }
  }

  const [categories, collections, products] = await Promise.all([
    allCategoryIds.size > 0
      ? Category.find({
          _id: { $in: Array.from(allCategoryIds) },
        })
          .select("name slug")
          .lean()
      : [],

    allCollectionIds.size > 0
      ? Collection.find({
          _id: { $in: Array.from(allCollectionIds) },
        })
          .select("name slug")
          .lean()
      : [],

    allProductIds.size > 0
      ? Product.find({
          _id: { $in: Array.from(allProductIds) },
        })
          .select("title slug")
          .lean()
      : [],
  ]);

  const nameMap = new Map<string, string>();

  for (const c of categories) {
    nameMap.set(c._id.toString(), c.name);
  }

  for (const c of collections) {
    nameMap.set(c._id.toString(), c.name);
  }

  for (const p of products) {
    nameMap.set(p._id.toString(), p.title);
  }

  return NextResponse.json(
    promotions.map((p) => ({
      ...p,
      _id: p._id.toString(),
      scopeIds: (p.scopeIds || []).map((id) => id.toString()),
      scopeNames: (p.scopeIds || []).map(
        (id) => nameMap.get(id.toString()) || "Unknown",
      ),
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
}

// ─────────────────────────────────────────────
// POST
//
// application/json
//   → Create promotion
//
// multipart/form-data
//   → Upload promotion banner to Cloudinary
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/promotions");

  if (permission === "read") {
    return NextResponse.json({ error: "Read-only" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";

  // ─────────────────────────────────────────────
  // Banner image upload
  // ─────────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BANNER_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 8MB" },
        { status: 400 },
      );
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      const result = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "promotions/banners",
            resource_type: "image",
            transformation: [
              {
                quality: "auto",
                fetch_format: "auto",
              },
            ],
          },
          (error, uploadResult) => {
            if (error || !uploadResult) {
              reject(error || new Error("Upload failed"));
              return;
            }

            resolve(
              uploadResult as {
                secure_url: string;
                public_id: string;
              },
            );
          },
        );

        stream.end(buffer);
      });

      return NextResponse.json({
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error("Cloudinary banner upload error:", error);

      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }

  // ─────────────────────────────────────────────
  // Normal JSON promotion creation
  // ─────────────────────────────────────────────
  await dbConnect();

  const body = await request.json();

  const promotion = await Promotion.create({
    ...body,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
  });

  await revalidateAffected(
    promotion.scope,
    promotion.scopeIds?.map((id: { toString: () => string }) =>
      id.toString(),
    ) || [],
  );

  return NextResponse.json({
    _id: promotion._id.toString(),
  });
}

// ─────────────────────────────────────────────
// PATCH — Update promotion
// ─────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/promotions");

  if (permission === "read") {
    return NextResponse.json({ error: "Read-only" }, { status: 403 });
  }

  await dbConnect();

  const { _id, ...updates } = await request.json();

  if (updates.startDate) {
    updates.startDate = new Date(updates.startDate);
  }

  if (updates.endDate) {
    updates.endDate = new Date(updates.endDate);
  }

  const promotion = await Promotion.findByIdAndUpdate(_id, updates, {
    new: true,
  });

  if (!promotion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await revalidateAffected(
    promotion.scope,
    promotion.scopeIds?.map((id: { toString: () => string }) =>
      id.toString(),
    ) || [],
  );

  return NextResponse.json({ success: true });
}

// ─────────────────────────────────────────────
// DELETE
//
// ?publicId=xxx
//   → Delete banner from Cloudinary
//
// ?id=xxx
//   → Delete promotion from database
// ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/promotions");

  if (permission !== "full") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);

  const publicId = searchParams.get("publicId");

  // ─────────────────────────────────────────────
  // Delete Cloudinary banner
  // ─────────────────────────────────────────────
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);

      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error("Cloudinary delete error:", error);

      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
  }

  // ─────────────────────────────────────────────
  // Delete promotion
  // ─────────────────────────────────────────────
  await dbConnect();

  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const promotion = await Promotion.findByIdAndDelete(id);

  if (promotion) {
    await revalidateAffected(
      promotion.scope,
      promotion.scopeIds?.map((sid: { toString: () => string }) =>
        sid.toString(),
      ) || [],
    );
  }

  return NextResponse.json({
    success: true,
  });
}

// ─────────────────────────────────────────────
// Revalidate all storefront pages affected
// by this promotion scope
// ─────────────────────────────────────────────
async function revalidateAffected(scope: string, scopeIds: string[]) {
  revalidatePath("/");

  if (scope === "all") {
    revalidatePath("/category");
    revalidatePath("/product");
    return;
  }

  if (scope === "category" && scopeIds.length > 0) {
    const cats = await Category.find({
      _id: { $in: scopeIds },
    })
      .select("slug")
      .lean();

    for (const cat of cats) {
      revalidatePath(`/category/${cat.slug}`);
    }

    const products = await Product.find({
      categoryIds: { $in: scopeIds },
      status: "published",
    })
      .select("slug")
      .lean();

    for (const p of products) {
      revalidatePath(`/product/${p.slug}`);
    }
  }

  if (scope === "collection" && scopeIds.length > 0) {
    const products = await Product.find({
      collectionIds: { $in: scopeIds },
      status: "published",
    })
      .select("slug")
      .lean();

    for (const p of products) {
      revalidatePath(`/product/${p.slug}`);
    }
  }

  if (scope === "product" && scopeIds.length > 0) {
    const products = await Product.find({
      _id: { $in: scopeIds },
    })
      .select("slug")
      .lean();

    for (const p of products) {
      revalidatePath(`/product/${p.slug}`);
    }
  }
}
