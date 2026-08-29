import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import mongoose from "mongoose";

import dbConnect from "@/lib/db";

import { requireActionPermission } from "@/lib/auth-helpers";

import {
  processRefund,
  getRefundableAmount,
  RefundReasonCode,
} from "@/lib/refunds";

const createRefundSchema = z.object({
  orderId: z
    .string()
    .min(1, "Order ID is required")
    .refine((value) => mongoose.isValidObjectId(value), {
      message: "Invalid order ID",
    }),

  /**
   * One UUID must represent exactly one refund attempt.
   *
   * The client must reuse this value when retrying.
   */
  idempotencyKey: z.string().uuid("A valid idempotency key is required"),

  lines: z
    .array(
      z.object({
        productId: z
          .string()
          .refine((value) => mongoose.isValidObjectId(value), {
            message: "Invalid product ID",
          }),

        variantSku: z.string().trim().min(1, "Variant SKU is required"),

        quantity: z.number().int().min(1, "Quantity must be at least 1"),

        amount: z.number().int().min(0, "Amount cannot be negative"),

        reason: z.string().trim().max(1000).optional(),
      }),
    )
    .min(1, "At least one line item is required"),

  shippingRefund: z
    .number()
    .int()
    .min(0, "Shipping refund cannot be negative")
    .default(0),

  reasonCode: z.enum([
    "customer_request",
    "damaged",
    "wrong_item",
    "price_adjustment",
    "other",
  ]),

  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(1000, "Reason is too long"),

  restockItems: z.boolean(),

  notes: z.string().trim().max(2000, "Notes are too long").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireActionPermission("/admin/refunds", "write");

    const body = await request.json();

    const validation = createRefundSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",

          details: validation.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const data = validation.data;

    await dbConnect();

    const result = await processRefund({
      orderId: data.orderId,

      idempotencyKey: data.idempotencyKey,

      lines: data.lines,

      shippingRefund: data.shippingRefund,

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
      return NextResponse.json(
        {
          success: false,

          error: result.error ?? "Refund failed",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      success: true,

      refundId: result.refundId,

      refundNumber: result.refundNumber,

      squareRefundId: result.squareRefundId,

      subtotal: result.subtotal,

      taxRefund: result.taxRefund,

      shippingRefund: result.shippingRefund,

      totalAmount: result.totalAmount,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("Refund API error:", error);

    return NextResponse.json(
      {
        error: "An error occurred while processing the refund",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireActionPermission("/admin/refunds", "read");

    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        {
          error: "orderId query parameter is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json(
        {
          error: "Invalid order ID",
        },
        {
          status: 400,
        },
      );
    }

    await dbConnect();

    const refundable = await getRefundableAmount(orderId);

    const byLine: Record<
      string,
      {
        quantity: number;
        amount: number;
      }
    > = {};

    refundable.byLine.forEach((value, key) => {
      byLine[key] = value;
    });

    return NextResponse.json({
      success: true,

      total: refundable.total,

      remainingTax: refundable.remainingTax,

      remainingShipping: refundable.remainingShipping,

      byLine,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("Get refundable amount error:", error);

    return NextResponse.json(
      {
        error: "An error occurred",
      },
      {
        status: 500,
      },
    );
  }
}
