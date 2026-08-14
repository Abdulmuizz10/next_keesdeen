// src/app/api/admin/coupons/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Coupon from "@/lib/models/Coupon";

export const runtime = "nodejs";

// TODO: add your existing admin-auth guard here (same one used by
// /api/admin/products, /api/admin/upload, etc.) before allowing any of
// these operations.

export async function GET() {
  try {
    await dbConnect();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(coupons);
  } catch (err) {
    console.error("GET /api/admin/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to load coupons" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (!body.type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }
    if (new Date(body.startDate) >= new Date(body.endDate)) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    const coupon = await Coupon.create({
      code: body.code.trim().toUpperCase(),
      description: body.description,
      type: body.type,
      value: body.value ?? 0,
      minPurchaseAmount: body.minPurchaseAmount,
      maxDiscountAmount: body.maxDiscountAmount,
      usageLimit: body.usageLimit,
      usageLimitPerUser: body.usageLimitPerUser,
      startDate: body.startDate,
      endDate: body.endDate,
      isActive: body.isActive ?? true,
      firstTimeOnly: body.firstTimeOnly ?? false,
      applicableProductIds: body.applicableProductIds,
      applicableCategoryIds: body.applicableCategoryIds,
      excludeProductIds: body.excludeProductIds,
      excludeCategoryIds: body.excludeCategoryIds,
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 },
      );
    }
    console.error("POST /api/admin/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updates } = body;

    if (!_id) {
      return NextResponse.json({ error: "_id is required" }, { status: 400 });
    }
    if (updates.code) updates.code = updates.code.trim().toUpperCase();
    if (
      updates.startDate &&
      updates.endDate &&
      new Date(updates.startDate) >= new Date(updates.endDate)
    ) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    const coupon = await Coupon.findByIdAndUpdate(_id, updates, {
      new: true,
      runValidators: true,
    });
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    return NextResponse.json(coupon);
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 },
      );
    }
    console.error("PATCH /api/admin/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "id query param is required" },
        { status: 400 },
      );
    }
    await Coupon.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 },
    );
  }
}
