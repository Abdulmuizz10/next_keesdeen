import "server-only";

import crypto from "crypto";
import mongoose from "mongoose";

import { squareClient, toSquareMoney, isSquareConfigured } from "./square";

import Order from "./models/Order";
import Refund, { generateRefundNumber, IRefundLine } from "./models/Refund";

import Product from "./models/Product";

import { sendRefundConfirmationEmail } from "./email";

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
  amount: number;
  reason?: string;
}

export interface ProcessRefundInput {
  orderId: string;

  /**
   * Must be generated once for one refund operation
   * and reused for retries.
   */
  idempotencyKey: string;

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

  subtotal?: number;

  taxRefund?: number;

  shippingRefund?: number;

  totalAmount?: number;

  error?: string;
}

/**
 * Build a deterministic representation of the refund request.
 *
 * This lets us detect:
 *
 * same idempotency key + same request = retry
 *
 * same idempotency key + different request = reject
 */
function createRefundRequestHash(input: ProcessRefundInput): string {
  const normalized = {
    orderId: input.orderId,

    lines: [...input.lines]
      .map((line) => ({
        productId: line.productId,
        variantSku: line.variantSku,
        quantity: line.quantity,
        amount: line.amount,
        reason: line.reason ?? "",
      }))
      .sort((a, b) => {
        const aKey = `${a.productId}:${a.variantSku}`;
        const bKey = `${b.productId}:${b.variantSku}`;

        return aKey.localeCompare(bKey);
      }),

    shippingRefund: input.shippingRefund ?? 0,

    reasonCode: input.reasonCode,

    reason: input.reason.trim(),

    restockItems: input.restockItems,

    notes: input.notes?.trim() ?? "",
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

/**
 * Get the maximum amount that can still be refunded.
 *
 * IMPORTANT:
 * Pending refunds are included here because they represent
 * already-reserved refund money.
 */
export async function getRefundableAmount(orderId: string): Promise<{
  total: number;
  remainingTax: number;
  remainingShipping: number;
  byLine: Map<
    string,
    {
      quantity: number;
      amount: number;
    }
  >;
}> {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  /**
   * Every non-rejected refund consumes refundable balance.
   *
   * Pending refunds are intentionally included.
   */
  const existingRefunds = await Refund.find({
    orderId: order._id,
    status: {
      $in: ["pending", "approved", "processed"],
    },
  });

  const refundedByLine = new Map<
    string,
    {
      quantity: number;
      amount: number;
    }
  >();

  let totalRefunded = 0;

  for (const refund of existingRefunds) {
    totalRefunded += refund.totalAmount;

    for (const line of refund.lines) {
      const key = `${line.productId}::${line.variantSku}`;

      const refunded = refundedByLine.get(key) ?? {
        quantity: 0,
        amount: 0,
      };

      refundedByLine.set(key, {
        quantity: refunded.quantity + line.quantity,
        amount: refunded.amount + line.amount,
      });
    }
  }

  let remainingTax = order.taxTotal;

  for (const refund of existingRefunds) {
    remainingTax -= refund.taxRefund;
  }

  let remainingShipping = order.shippingTotal;

  for (const refund of existingRefunds) {
    remainingShipping -= refund.shippingRefund;
  }

  remainingTax = Math.max(0, remainingTax);

  remainingShipping = Math.max(0, remainingShipping);

  const byLine = new Map<
    string,
    {
      quantity: number;
      amount: number;
    }
  >();

  for (const line of order.lines) {
    const key = `${line.productId.toString()}::${line.variantSku}`;

    const refunded = refundedByLine.get(key) ?? {
      quantity: 0,
      amount: 0,
    };

    byLine.set(key, {
      quantity: Math.max(0, line.quantity - refunded.quantity),

      amount: Math.max(0, line.totalPrice - refunded.amount),
    });
  }

  return {
    total: Math.max(0, order.grandTotal - totalRefunded),

    remainingTax,

    remainingShipping,

    byLine,
  };
}

/**
 * Process a refund safely.
 *
 * Architecture:
 *
 * 1. Validate the refund.
 * 2. Reserve the refund in MongoDB transaction.
 * 3. Commit the reservation.
 * 4. Call Square using the SAME idempotency key.
 * 5. Finalize MongoDB.
 * 6. Restock exactly once.
 * 7. Email exactly once.
 */
export async function processRefund(
  input: ProcessRefundInput,
): Promise<RefundResult> {
  const {
    orderId,
    idempotencyKey,
    lines,
    shippingRefund = 0,
    reasonCode,
    reason,
    restockItems,
    notes,
    processedBy,
  } = input;

  const requestHash = createRefundRequestHash(input);

  /**
   * STEP 1
   *
   * Check whether this exact idempotency key has already
   * been used.
   */
  const existingRefund = await Refund.findOne({
    idempotencyKey,
  });

  if (existingRefund) {
    /**
     * Same key but different payload is an error.
     */
    if (existingRefund.requestHash !== requestHash) {
      return {
        success: false,
        error:
          "This idempotency key has already been used for a different refund request.",
      };
    }

    /**
     * Already completely processed.
     *
     * Return the existing result instead of creating
     * another refund.
     */
    if (
      existingRefund.status === "processed" ||
      existingRefund.status === "approved"
    ) {
      return {
        success: true,

        refundId: existingRefund._id.toString(),

        refundNumber: existingRefund.refundNumber,

        squareRefundId: existingRefund.squareRefundId,

        subtotal: existingRefund.subtotal,

        taxRefund: existingRefund.taxRefund,

        shippingRefund: existingRefund.shippingRefund,

        totalAmount: existingRefund.totalAmount,
      };
    }

    /**
     * If the previous request created a pending reservation
     * but crashed before Square was called, we continue
     * processing that exact refund below.
     */
  }

  /**
   * STEP 2
   *
   * Create the refund reservation inside a transaction.
   *
   * The Order document is updated as part of the transaction.
   * This makes concurrent refund attempts against the same
   * order conflict rather than both using the same stale
   * refundable balance.
   */
  let refundId!: mongoose.Types.ObjectId;
  let refundNumber: string;

  let subtotal: number;
  let taxRefund: number;
  let totalRefundAmount!: number;

  let refundLines: IRefundLine[];

  let orderNumber: string;
  let customerName: string;
  let customerEmail: string;
  let currency: string;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      /**
       * Re-check idempotency inside the transaction.
       *
       * This handles two simultaneous requests with the
       * same key.
       */
      const transactionExistingRefund = await Refund.findOne({
        idempotencyKey,
      }).session(session);

      if (transactionExistingRefund) {
        if (transactionExistingRefund.requestHash !== requestHash) {
          throw new Error("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST");
        }

        refundId = transactionExistingRefund._id;

        refundNumber = transactionExistingRefund.refundNumber;

        subtotal = transactionExistingRefund.subtotal;

        taxRefund = transactionExistingRefund.taxRefund;

        totalRefundAmount = transactionExistingRefund.totalAmount;

        refundLines = transactionExistingRefund.lines;

        const existingOrder = await Order.findById(
          transactionExistingRefund.orderId,
        ).session(session);

        if (!existingOrder) {
          throw new Error("Order not found");
        }

        orderNumber = existingOrder.orderNumber;

        customerName = `${existingOrder.shippingAddress.firstName} ${existingOrder.shippingAddress.lastName}`;

        customerEmail = existingOrder.email;

        currency = existingOrder.currency;

        return;
      }

      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw new Error("Order not found");
      }

      if (
        order.paymentStatus !== "paid" &&
        order.paymentStatus !== "partially_refunded"
      ) {
        throw new Error("Order is not in a refundable state");
      }

      if (!order.squarePaymentId) {
        throw new Error("No Square payment ID found for this order");
      }

      /**
       * Calculate current refundable balance while inside
       * the transaction.
       */
      const existingRefunds = await Refund.find({
        orderId: order._id,

        status: {
          $in: ["pending", "approved", "processed"],
        },
      }).session(session);

      const refundedByLine = new Map<
        string,
        {
          quantity: number;
          amount: number;
        }
      >();

      let totalRefunded = 0;

      let refundedTax = 0;

      let refundedShipping = 0;

      for (const refund of existingRefunds) {
        totalRefunded += refund.totalAmount;

        refundedTax += refund.taxRefund;

        refundedShipping += refund.shippingRefund;

        for (const line of refund.lines) {
          const key = `${line.productId.toString()}::${line.variantSku}`;

          const current = refundedByLine.get(key) ?? {
            quantity: 0,
            amount: 0,
          };

          refundedByLine.set(key, {
            quantity: current.quantity + line.quantity,

            amount: current.amount + line.amount,
          });
        }
      }

      /**
       * Validate requested lines against the reservation
       * state.
       */
      for (const line of lines) {
        const key = `${line.productId}::${line.variantSku}`;

        const orderLine = order.lines.find(
          (item) =>
            item.productId.toString() === line.productId &&
            item.variantSku === line.variantSku,
        );

        if (!orderLine) {
          throw new Error(`Line item not found: ${line.variantSku}`);
        }

        const refunded = refundedByLine.get(key) ?? {
          quantity: 0,
          amount: 0,
        };

        const remainingQuantity = orderLine.quantity - refunded.quantity;

        const remainingAmount = orderLine.totalPrice - refunded.amount;

        if (line.quantity > remainingQuantity) {
          throw new Error(
            `Cannot refund ${line.quantity} of ${line.variantSku}. Only ${remainingQuantity} remaining.`,
          );
        }

        if (line.amount > remainingAmount) {
          throw new Error(
            `Refund amount exceeds remaining refundable amount for ${line.variantSku}.`,
          );
        }
      }

      subtotal = lines.reduce((sum, line) => sum + line.amount, 0);

      const taxableSubtotal = Math.max(0, order.subtotal - order.discountTotal);

      const originalTaxRate =
        taxableSubtotal > 0 ? order.taxTotal / taxableSubtotal : 0;

      taxRefund = Math.min(
        Math.round(subtotal * originalTaxRate),
        Math.max(0, order.taxTotal - refundedTax),
      );

      const remainingShipping = Math.max(
        0,
        order.shippingTotal - refundedShipping,
      );

      if (shippingRefund > remainingShipping) {
        throw new Error(
          "Shipping refund exceeds the remaining refundable shipping amount.",
        );
      }

      totalRefundAmount = subtotal + taxRefund + shippingRefund;

      const remainingOrderRefundable = Math.max(
        0,
        order.grandTotal - totalRefunded,
      );

      if (totalRefundAmount > remainingOrderRefundable) {
        throw new Error(
          `Total refund amount exceeds the remaining refundable amount.`,
        );
      }

      refundNumber = generateRefundNumber();

      refundLines = lines.map((line) => {
        const orderLine = order.lines.find(
          (ol) =>
            ol.productId.toString() === line.productId &&
            ol.variantSku === line.variantSku,
        );

        return {
          productId: new mongoose.Types.ObjectId(line.productId),

          variantSku: line.variantSku,

          title: orderLine?.title ?? "",

          quantity: line.quantity,

          amount: line.amount,

          reason: line.reason,
        };
      });

      const created = await Refund.create(
        [
          {
            refundNumber,

            idempotencyKey,

            requestHash,

            orderId: order._id,

            orderNumber: order.orderNumber,

            userId: order.userId,

            lines: refundLines,

            subtotal,

            taxRefund,

            shippingRefund,

            totalAmount: totalRefundAmount,

            status: "pending",

            reason,

            notes,

            processedBy: new mongoose.Types.ObjectId(processedBy.userId),
          },
        ],
        { session },
      );

      refundId = created[0]._id;

      /**
       * IMPORTANT:
       *
       * Touch the Order document inside the transaction.
       *
       * This creates a write conflict when two transactions
       * try to reserve refunds against the same order
       * concurrently.
       */
      order.refundVersion = (order.refundVersion ?? 0) + 1;

      await order.save({ session });

      orderNumber = order.orderNumber;

      customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;

      customerEmail = order.email;

      currency = order.currency;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST"
    ) {
      return {
        success: false,

        error:
          "This idempotency key has already been used for a different refund request.",
      };
    }

    /**
     * Duplicate key can occur if two simultaneous requests
     * use the same idempotency key.
     *
     * Retrieve the winning refund and return it.
     */
    if (
      error instanceof Error &&
      (error.message.includes("E11000") ||
        error.message.includes("duplicate key"))
    ) {
      const winner = await Refund.findOne({
        idempotencyKey,
      });

      if (winner) {
        if (winner.requestHash !== requestHash) {
          return {
            success: false,

            error:
              "This idempotency key has already been used for a different refund request.",
          };
        }

        return processRefund(input);
      }
    }

    console.error("Refund reservation transaction failed:", error);

    return {
      success: false,

      error:
        error instanceof Error ? error.message : "Unable to reserve refund.",
    };
  } finally {
    await session.endSession();
  }

  /**
   * STEP 3
   *
   * Process Square using the SAME idempotency key.
   *
   * This is critical.
   */
  let squareRefundId: string | undefined;

  if (isSquareConfigured()) {
    try {
      const refundResponse = await squareClient.refunds.refundPayment({
        idempotencyKey,

        paymentId:
          (await Order.findById(orderId).select("squarePaymentId"))
            ?.squarePaymentId ?? "",

        amountMoney: toSquareMoney(totalRefundAmount),

        reason: `${reasonCode}: ${reason}`,
      });

      const squareRefund = refundResponse.refund;

      if (!squareRefund) {
        throw new Error("Square did not return a refund.");
      }

      if (squareRefund.status === "FAILED") {
        throw new Error("Square refund failed.");
      }

      squareRefundId = squareRefund.id;

      /**
       * Finalize the refund.
       */
      await Refund.findByIdAndUpdate(refundId!, {
        $set: {
          squareRefundId,

          status: "processed",

          processedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Square refund error:", error);

      /**
       * Mark reservation rejected so its money becomes
       * refundable again.
       */
      await Refund.findByIdAndUpdate(refundId!, {
        $set: {
          status: "rejected",
        },
      });

      return {
        success: false,

        error: error instanceof Error ? error.message : "Square refund failed.",
      };
    }
  } else {
    /**
     * Development/non-Square mode.
     */
    await Refund.findByIdAndUpdate(refundId!, {
      $set: {
        status: "approved",

        processedAt: new Date(),
      },
    });
  }

  /**
   * STEP 4
   *
   * Update order payment status.
   */
  const refundableAfterRefund = await getRefundableAmount(orderId);

  const isFullRefund = refundableAfterRefund.total <= 1;

  await Order.findByIdAndUpdate(orderId, {
    $set: {
      paymentStatus: isFullRefund ? "refunded" : "partially_refunded",

      ...(isFullRefund
        ? {
            status: "refunded",
          }
        : {}),
    },
  });

  /**
   * STEP 5
   *
   * Restock exactly once.
   */
  if (restockItems) {
    const restockClaim = await Refund.findOneAndUpdate(
      {
        _id: refundId,

        restockedAt: {
          $exists: false,
        },
      },
      {
        $set: {
          restockedAt: new Date(),
        },
      },
      {
        new: true,
      },
    );

    /**
     * Only the request that successfully claimed
     * restocking is allowed to modify inventory.
     */
    if (restockClaim) {
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
      }
    }
  }

  /**
   * STEP 6
   *
   * Send email exactly once.
   */
  const emailClaim = await Refund.findOneAndUpdate(
    {
      _id: refundId,

      emailSentAt: {
        $exists: false,
      },
    },
    {
      $set: {
        emailSentAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  if (emailClaim) {
    try {
      await sendRefundConfirmationEmail({
        refundNumber: refundNumber!,

        orderNumber: orderNumber!,

        customerName: customerName!,

        customerEmail: customerEmail!,

        lines: refundLines!.map((line) => ({
          title: line.title,

          quantity: line.quantity,

          amount: line.amount,
        })),

        subtotal: subtotal!,

        taxRefund: taxRefund!,

        shippingRefund,

        totalAmount: totalRefundAmount!,

        reason,

        currency: currency!,
      });
    } catch (error) {
      /**
       * The refund itself remains successful even if the
       * confirmation email fails.
       *
       * IMPORTANT:
       * In a production system, this should eventually be
       * moved to a retryable email/outbox mechanism.
       */
      console.error("Refund confirmation email failed:", error);
    }
  }

  return {
    success: true,

    refundId: refundId!.toString(),

    refundNumber: refundNumber!,

    squareRefundId,

    subtotal: subtotal!,

    taxRefund: taxRefund!,

    shippingRefund,

    totalAmount: totalRefundAmount!,
  };
}

/**
 * Get refund history for an order.
 */
export async function getOrderRefunds(orderId: string) {
  const refunds = await Refund.find({
    orderId,
  })
    .sort({ createdAt: -1 })
    .lean();

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
