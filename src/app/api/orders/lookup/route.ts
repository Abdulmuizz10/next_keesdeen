import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import Order from "@/lib/models/Order";

const lookupSchema = z.object({
  orderNumber: z.string().trim().min(1),
  email: z.string().trim().email(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = lookupSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Enter a valid order number and email" },
      { status: 400 },
    );
  }

  const { orderNumber, email } = validation.data;

  await dbConnect();

  const order = await Order.findOne({
    orderNumber: orderNumber.toUpperCase(),
    email: email.toLowerCase(),
  }).lean();

  if (!order) {
    // Deliberately generic — don't reveal whether the order number
    // exists at all, only whether this exact pair matched.
    return NextResponse.json(
      { error: "We couldn't find a matching order" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    shippedAt: order.shippedAt || null,
    deliveredAt: order.deliveredAt || null,
    trackingNumber: order.trackingNumber || null,
    trackingUrl: order.trackingUrl || null,
    email: order.email,
    shippingAddress: order.shippingAddress,
    lines: order.lines.map((line) => ({
      title: line.title,
      variantTitle: line.variantTitle,
      image: line.image,
      quantity: line.quantity,
      price: line.price,
      totalPrice: line.totalPrice,
    })),
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    grandTotal: order.grandTotal,
    currency: order.currency,
    shippingMethod: order.shippingMethod || null,
  });
}
