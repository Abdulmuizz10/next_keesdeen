import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Order from "@/lib/models/Order";
import { sendShippingConfirmationEmail } from "@/lib/email";

/**
 * PATCH /api/admin/orders
 * Update order status, tracking info, etc.
 */
export async function PATCH(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/orders");
  if (permission === "read") return NextResponse.json({ error: "Read-only" }, { status: 403 });
  await dbConnect();

  const { _id, status, trackingNumber, trackingUrl, internalNotes } = await request.json();
  if (!_id) return NextResponse.json({ error: "Order _id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = {};
  if (status) updates.status = status;
  if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
  if (trackingUrl !== undefined) updates.trackingUrl = trackingUrl;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes;

  // Auto-set dates
  if (status === "shipped") updates.shippedAt = new Date();
  if (status === "delivered") updates.deliveredAt = new Date();
  if (status === "cancelled") updates.cancelledAt = new Date();

  const order = await Order.findByIdAndUpdate(_id, updates, { new: true });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Send shipping notification email when status changes to shipped
  if (status === "shipped") {
    await sendShippingConfirmationEmail({
      orderNumber: order.orderNumber,
      customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      customerEmail: order.email,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
    });
  }

  return NextResponse.json({ success: true });
}
