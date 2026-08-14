import "server-only";
import {
  squareClient,
  getSquareLocationId,
  toSquareMoney,
  fromSquareMoney,
  isSquareConfigured,
} from "./square";
import Order, { IOrder, IOrderLine } from "./models/Order";
import Refund, { generateRefundNumber, IRefundLine } from "./models/Refund";
import Product from "./models/Product";
import { sendRefundConfirmationEmail } from "./email";
import mongoose from "mongoose";

export type RefundReasonCode =
  | "customer_request"
  | "damaged"
  | "wrong_item"
  | "price_adjustment"
  | "other";

export interface RefundLineInput {
  productId: string;
  variantSku: string;
  quantity: number;
  amount: number; // Amount to refund for this line in cents
  reason?: string;
}

export interface ProcessRefundInput {
  orderId: string;
  lines: RefundLineInput[];
  shippingRefund?: number;
  reasonCode: RefundReasonCode;
  reason: string;
  restockItems: boolean;
  notes?: string;
  processedBy: {
    userId: string;
    email: string;
  };
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundNumber?: string;
  squareRefundId?: string;
  error?: string;
}

/**
 * Get the maximum refundable amount for an order.
 */
export async function getRefundableAmount(orderId: string): Promise<{
  total: number;
  remainingTax: number;
  byLine: Map<string, { quantity: number; amount: number }>;
}> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Get existing refunds for this order
  const existingRefunds = await Refund.find({
    orderId: order._id,
    status: { $in: ["approved", "processed"] },
  });

  // Calculate already refunded amounts per line
  const refundedByLine = new Map<
    string,
    { quantity: number; amount: number }
  >();
  let totalRefunded = 0;

  for (const refund of existingRefunds) {
    totalRefunded += refund.totalAmount;
    for (const line of refund.lines) {
      const key = `${line.productId}::${line.variantSku}`;
      const existing = refundedByLine.get(key) || { quantity: 0, amount: 0 };
      refundedByLine.set(key, {
        quantity: existing.quantity + line.quantity,
        amount: existing.amount + line.amount,
      });
    }
  }

  let remainingTax = order.taxTotal;
  for (const refund of existingRefunds) {
    remainingTax -= refund.taxRefund;
  }

  // Calculate remaining refundable amounts
  const byLine = new Map<string, { quantity: number; amount: number }>();

  for (const line of order.lines) {
    const key = `${line.productId}::${line.variantSku}`;
    const refunded = refundedByLine.get(key) || { quantity: 0, amount: 0 };
    byLine.set(key, {
      quantity: line.quantity - refunded.quantity,
      amount: line.totalPrice - refunded.amount,
    });
  }

  return {
    total: order.grandTotal - totalRefunded,
    remainingTax,
    byLine,
  };
}

/**
 * Process a refund for an order.
 */
export async function processRefund(
  input: ProcessRefundInput,
): Promise<RefundResult> {
  const {
    orderId,
    lines,
    shippingRefund = 0,
    reasonCode,
    reason,
    restockItems,
    notes,
    processedBy,
  } = input;

  // Fetch the order
  const order = await Order.findById(orderId);
  if (!order) {
    return { success: false, error: "Order not found" };
  }

  // Validate order status
  if (
    order.paymentStatus !== "paid" &&
    order.paymentStatus !== "partially_refunded"
  ) {
    return { success: false, error: "Order is not in a refundable state" };
  }

  if (!order.squarePaymentId) {
    return {
      success: false,
      error: "No Square payment ID found for this order",
    };
  }

  // Validate refund amounts
  const refundable = await getRefundableAmount(orderId);

  // Validate each line
  for (const line of lines) {
    const key = `${line.productId}::${line.variantSku}`;
    const available = refundable.byLine.get(key);

    if (!available) {
      return {
        success: false,
        error: `Line item not found: ${line.variantSku}`,
      };
    }

    if (line.quantity > available.quantity) {
      return {
        success: false,
        error: `Cannot refund ${line.quantity} of ${line.variantSku}. Only ${available.quantity} remaining.`,
      };
    }

    if (line.amount > available.amount) {
      return {
        success: false,
        error: `Refund amount exceeds remaining refundable amount for ${line.variantSku}`,
      };
    }
  }

  // Calculate totals
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);

  // Calculate proportional tax refund
  const originalTaxRate =
    order.taxTotal / (order.subtotal - order.discountTotal);
  const taxRefund = Math.round(subtotal * originalTaxRate);

  const totalRefundAmount = subtotal + shippingRefund + taxRefund;

  // Validate total doesn't exceed refundable
  if (totalRefundAmount > refundable.total) {
    return {
      success: false,
      error: `Total refund amount ($${(totalRefundAmount / 100).toFixed(2)}) exceeds remaining refundable amount ($${(refundable.total / 100).toFixed(2)})`,
    };
  }

  // Generate refund number
  const refundNumber = generateRefundNumber();

  // Process Square refund if configured
  let squareRefundId: string | undefined;

  if (isSquareConfigured()) {
    try {
      const { v4: uuidv4 } = await import("uuid");

      const refundResponse = await squareClient.refunds.refundPayment({
        idempotencyKey: uuidv4(),
        paymentId: order.squarePaymentId,
        amountMoney: toSquareMoney(totalRefundAmount),
        reason: `${reasonCode}: ${reason}`,
      });

      const refund = refundResponse.refund;
      if (refund?.status === "FAILED") {
        return {
          success: false,
          error: "Square refund failed. Please try again.",
        };
      }

      squareRefundId = refund?.id;
    } catch (error) {
      console.error("Square refund error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Square refund failed",
      };
    }
  }

  // Create refund document
  const refundLines: IRefundLine[] = lines.map((line) => {
    const orderLine = order.lines.find(
      (ol) =>
        ol.productId.toString() === line.productId &&
        ol.variantSku === line.variantSku,
    );
    return {
      productId: new mongoose.Types.ObjectId(line.productId),
      variantSku: line.variantSku,
      title: orderLine?.title || "",
      quantity: line.quantity,
      amount: line.amount,
      reason: line.reason,
    };
  });

  const refund = await Refund.create({
    refundNumber,
    orderId: order._id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    lines: refundLines,
    subtotal,
    taxRefund,
    shippingRefund,
    totalAmount: totalRefundAmount,
    status: squareRefundId ? "processed" : "approved",
    reason,
    notes,
    squareRefundId,
    processedBy: new mongoose.Types.ObjectId(processedBy.userId),
    processedAt: new Date(),
  });

  // Update order status
  const isFullRefund = refundable.total - totalRefundAmount <= 1;
  await Order.findByIdAndUpdate(order._id, {
    paymentStatus: isFullRefund ? "refunded" : "partially_refunded",
    status: isFullRefund ? "refunded" : order.status,
  });

  // Restock items if requested
  if (restockItems) {
    for (const line of lines) {
      await Product.updateOne(
        {
          _id: line.productId,
          "variants.sku": line.variantSku,
        },
        {
          $inc: {
            "variants.$.stock": line.quantity,
            totalSold: -line.quantity,
          },
        },
      );

      // Note: Cache revalidation is handled via ISR at the page level
      // The updated stock will be reflected on the next page request
    }
  }

  // Send refund confirmation email
  await sendRefundConfirmationEmail({
    refundNumber,
    orderNumber: order.orderNumber,
    customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    customerEmail: order.email,
    lines: refundLines.map((line) => ({
      title: line.title,
      quantity: line.quantity,
      amount: line.amount,
    })),
    subtotal,
    taxRefund,
    shippingRefund,
    totalAmount: totalRefundAmount,
    reason,
    currency: order.currency,
  });

  return {
    success: true,
    refundId: refund._id.toString(),
    refundNumber,
    squareRefundId,
  };
}

/**
 * Get refund history for an order.
 */
export async function getOrderRefunds(orderId: string) {
  const refunds = await Refund.find({ orderId }).sort({ createdAt: -1 }).lean();

  return refunds.map((refund) => ({
    id: refund._id.toString(),
    refundNumber: refund.refundNumber,
    status: refund.status,
    lines: refund.lines,
    subtotal: refund.subtotal,
    taxRefund: refund.taxRefund,
    shippingRefund: refund.shippingRefund,
    totalAmount: refund.totalAmount,
    reason: refund.reason,
    notes: refund.notes,
    processedAt: refund.processedAt?.toISOString(),
    createdAt: refund.createdAt.toISOString(),
  }));
}
