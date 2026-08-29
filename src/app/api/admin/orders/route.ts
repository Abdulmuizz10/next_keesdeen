// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Order from "@/lib/models/Order";
import { sendDeliveredEmail, sendShippingConfirmationEmail } from "@/lib/email";

const patchOrderSchema = z.object({
  _id: z.string().refine((v) => mongoose.isValidObjectId(v), {
    message: "Invalid order ID",
  }),
  status: z
    .enum([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ])
    .optional(),
  trackingNumber: z.string().trim().optional(),
  trackingUrl: z.string().trim().url().optional().or(z.literal("")),
  internalNotes: z.string().trim().max(5000).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { permission } = await requireRouteAccess("/admin/orders");
    if (permission === "read") {
      return NextResponse.json({ error: "Read-only" }, { status: 403 });
    }

    const body = await request.json();
    const validation = patchOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.flatten() },
        { status: 400 },
      );
    }
    const { _id, status, trackingNumber, trackingUrl, internalNotes } =
      validation.data;

    await dbConnect();

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
    if (trackingUrl !== undefined) updates.trackingUrl = trackingUrl;
    if (internalNotes !== undefined) updates.internalNotes = internalNotes;

    if (status === "shipped") updates.shippedAt = new Date();
    if (status === "delivered") updates.deliveredAt = new Date();
    if (status === "cancelled") updates.cancelledAt = new Date();

    // Only send an email the first time we transition into that state.
    const previous = await Order.findById(_id).select("status");
    if (!previous) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const isNewShipped = status === "shipped" && previous.status !== "shipped";
    const isNewDelivered =
      status === "delivered" && previous.status !== "delivered";

    const order = await Order.findByIdAndUpdate(_id, updates, {
      new: true,
      runValidators: true,
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Email failures should never undo/mask a successful status update.
    if (isNewShipped) {
      try {
        await sendShippingConfirmationEmail({
          orderNumber: order.orderNumber,
          customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
          customerEmail: order.email,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
        });
      } catch (err) {
        console.error("Shipping confirmation email failed:", err);
      }
    } else if (isNewDelivered) {
      try {
        await sendDeliveredEmail({
          orderNumber: order.orderNumber,
          customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
          customerEmail: order.email,
        });
      } catch (err) {
        console.error("Delivered email failed:", err);
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Order PATCH error:", error);
    return NextResponse.json(
      { error: "An error occurred while updating the order" },
      { status: 500 },
    );
  }
}
