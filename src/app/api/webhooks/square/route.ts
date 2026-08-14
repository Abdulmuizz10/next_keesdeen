import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { verifyWebhookSignature, fromSquareMoney } from "@/lib/square";
import Order from "@/lib/models/Order";
import Refund from "@/lib/models/Refund";

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
const WEBHOOK_NOTIFICATION_URL = process.env.SQUARE_WEBHOOK_URL || "";

interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: {
      payment?: {
        id: string;
        status: string;
        order_id?: string;
        amount_money?: {
          amount: number;
          currency: string;
        };
        reference_id?: string;
      };
      refund?: {
        id: string;
        status: string;
        payment_id: string;
        order_id?: string;
        amount_money?: {
          amount: number;
          currency: string;
        };
        reason?: string;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";

    // Verify webhook signature
    if (SQUARE_WEBHOOK_SIGNATURE_KEY && WEBHOOK_NOTIFICATION_URL) {
      const isValid = await verifyWebhookSignature(
        body,
        signature,
        SQUARE_WEBHOOK_SIGNATURE_KEY,
        WEBHOOK_NOTIFICATION_URL
      );

      if (!isValid) {
        console.error("Invalid Square webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event: SquareWebhookEvent = JSON.parse(body);
    console.log("Square webhook event:", event.type, event.event_id);

    await dbConnect();

    switch (event.type) {
      case "payment.completed":
      case "payment.updated":
        await handlePaymentUpdate(event);
        break;

      case "refund.created":
      case "refund.updated":
        await handleRefundUpdate(event);
        break;

      default:
        console.log("Unhandled webhook event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Square webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle payment.updated and payment.completed events.
 */
async function handlePaymentUpdate(event: SquareWebhookEvent) {
  const payment = event.data.object.payment;
  if (!payment) return;

  const { id: paymentId, status, order_id: squareOrderId, reference_id: orderNumber } = payment;

  const order = await Order.findOne({
    $or: [
      { squarePaymentId: paymentId },
      { squareOrderId: squareOrderId },
      { orderNumber: orderNumber },
    ],
  });

  if (!order) {
    console.warn("Order not found for payment:", paymentId);
    return;
  }

  // Webhook idempotency: skip already-processed Square event IDs
  if (order.processedSquareEventIds?.includes(event.event_id)) {
    console.log(`Skipping duplicate Square payment event ${event.event_id}`);
    return;
  }

  let targetPaymentStatus: "pending" | "paid" | "failed" | "refunded" | "partially_refunded" = order.paymentStatus;
  let targetOrderStatus = order.status;

  switch (status) {
    case "COMPLETED":
      targetPaymentStatus = "paid";
      if (order.status === "pending") targetOrderStatus = "confirmed";
      break;
    case "APPROVED":
      targetPaymentStatus = "pending";
      break;
    case "FAILED":
    case "CANCELED":
      targetPaymentStatus = "failed";
      if (order.status === "pending") targetOrderStatus = "cancelled";
      break;
    default:
      targetPaymentStatus = order.paymentStatus;
  }

  // Idempotent no-op: if already in target state, only record event ID once
  if (
    order.paymentStatus === targetPaymentStatus &&
    order.status === targetOrderStatus &&
    order.squarePaymentId === paymentId &&
    (!squareOrderId || order.squareOrderId === squareOrderId)
  ) {
    await Order.findByIdAndUpdate(order._id, {
      $addToSet: { processedSquareEventIds: event.event_id },
    });
    return;
  }

  await Order.findByIdAndUpdate(order._id, {
    paymentStatus: targetPaymentStatus,
    status: targetOrderStatus,
    squarePaymentId: paymentId,
    squareOrderId: squareOrderId || order.squareOrderId,
    $addToSet: { processedSquareEventIds: event.event_id },
  });

  console.log(`Updated order ${order.orderNumber} payment status to ${targetPaymentStatus}`);
}

/**
 * Handle refund.created and refund.updated events.
 */
async function handleRefundUpdate(event: SquareWebhookEvent) {
  const refundData = event.data.object.refund;
  if (!refundData) return;

  const { id: squareRefundId, status, payment_id: paymentId, amount_money } = refundData;

  const order = await Order.findOne({ squarePaymentId: paymentId });

  if (!order) {
    console.warn("Order not found for refund:", squareRefundId);
    return;
  }

  // Webhook idempotency guard
  if (order.processedSquareEventIds?.includes(event.event_id)) {
    console.log(`Skipping duplicate Square refund event ${event.event_id}`);
    return;
  }

  const refund = await Refund.findOne({ squareRefundId });

  let refundStatus: "pending" | "approved" | "processed" | "rejected";
  switch (status) {
    case "COMPLETED":
      refundStatus = "processed";
      break;
    case "PENDING":
      refundStatus = "approved";
      break;
    case "FAILED":
    case "REJECTED":
      refundStatus = "rejected";
      break;
    default:
      refundStatus = "pending";
  }

  // Skip mutation if already at target state; only mark event as processed
  if (refund && refund.status === refundStatus) {
    await Order.findByIdAndUpdate(order._id, {
      $addToSet: { processedSquareEventIds: event.event_id },
    });
    return;
  }

  if (refund) {
    await Refund.findByIdAndUpdate(refund._id, {
      status: refundStatus,
      processedAt: refundStatus === "processed" ? new Date() : undefined,
    });
  }

  if (status === "COMPLETED" && amount_money) {
    const refundAmount = fromSquareMoney(amount_money);

    if (refundAmount >= order.grandTotal) {
      if (order.paymentStatus !== "refunded" || order.status !== "refunded") {
        await Order.findByIdAndUpdate(order._id, {
          paymentStatus: "refunded",
          status: "refunded",
          $addToSet: { processedSquareEventIds: event.event_id },
        });
      } else {
        await Order.findByIdAndUpdate(order._id, {
          $addToSet: { processedSquareEventIds: event.event_id },
        });
      }
    } else {
      if (order.paymentStatus !== "partially_refunded") {
        await Order.findByIdAndUpdate(order._id, {
          paymentStatus: "partially_refunded",
          $addToSet: { processedSquareEventIds: event.event_id },
        });
      } else {
        await Order.findByIdAndUpdate(order._id, {
          $addToSet: { processedSquareEventIds: event.event_id },
        });
      }
    }

    console.log(`Updated order ${order.orderNumber} for refund ${squareRefundId}`);
    return;
  }

  await Order.findByIdAndUpdate(order._id, {
    $addToSet: { processedSquareEventIds: event.event_id },
  });
}

// Allow preflight requests for webhooks
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
