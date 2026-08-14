import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { requireActionPermission } from "@/lib/auth-helpers";
import { processRefund, getRefundableAmount, RefundReasonCode } from "@/lib/refunds";

const createRefundSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  lines: z.array(
    z.object({
      productId: z.string(),
      variantSku: z.string(),
      quantity: z.number().int().min(1),
      amount: z.number().int().min(0),
      reason: z.string().optional(),
    })
  ).min(1, "At least one line item is required"),
  shippingRefund: z.number().int().min(0).optional(),
  reasonCode: z.enum(["customer_request", "damaged", "wrong_item", "price_adjustment", "other"]),
  reason: z.string().min(1, "Reason is required"),
  restockItems: z.boolean(),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/refunds
 * Create a new refund for an order.
 * Requires: super_admin or staff role
 */
export async function POST(request: NextRequest) {
  try {
    // Check permissions (super_admin and staff have "full" access, support has "request" only)
    const user = await requireActionPermission("/admin/refunds", "write");

    const body = await request.json();
    const validation = createRefundSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    await dbConnect();

    // Process the refund
    const result = await processRefund({
      orderId: data.orderId,
      lines: data.lines,
      shippingRefund: data.shippingRefund || 0,
      reasonCode: data.reasonCode as RefundReasonCode,
      reason: data.reason,
      restockItems: data.restockItems,
      notes: data.notes,
      processedBy: {
        userId: user.id,
        email: user.email,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      refundNumber: result.refundNumber,
      squareRefundId: result.squareRefundId,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the refund" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/refunds?orderId=xxx
 * Get refund information for an order.
 */
export async function GET(request: NextRequest) {
  try {
    await requireActionPermission("/admin/refunds", "read");

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId query parameter is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const refundable = await getRefundableAmount(orderId);

    // Convert Map to object for JSON serialization
    const byLine: Record<string, { quantity: number; amount: number }> = {};
    refundable.byLine.forEach((value, key) => {
      byLine[key] = value;
    });

    return NextResponse.json({
      total: refundable.total,
      byLine,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Get refundable amount error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
