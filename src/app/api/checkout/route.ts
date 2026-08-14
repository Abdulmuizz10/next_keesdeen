import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  squareClient,
  getSquareLocationId,
  toSquareMoney,
  isSquareConfigured,
} from "@/lib/square";
import { getEffectivePrice } from "@/lib/pricing";
import { calculateTax } from "@/lib/tax";
import { getShippingRate } from "@/lib/shipping";
import { sendOrderConfirmationEmail } from "@/lib/email";
import Product from "@/lib/models/Product";
import Order, { generateOrderNumber } from "@/lib/models/Order";
import Cart from "@/lib/models/Cart";
import Coupon from "@/lib/models/Coupon";
import { orderAddressSchema } from "@/lib/validators/order";
import { z } from "zod";

const checkoutSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
  shippingAddress: orderAddressSchema,
  billingAddress: orderAddressSchema,
  shippingMethod: z.string(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  sourceId: z.string().min(1, "Payment source is required"), // Square card nonce
  cartLines: z.array(
    z.object({
      productId: z.string(),
      variantSku: z.string(),
      quantity: z.number().int().min(1),
    }),
  ),
});

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const session = await auth();
    const userId = session?.user?.id;

    // Parse and validate request body
    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid checkout data", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    await dbConnect();

    // ========================================
    // IDEMPOTENCY GUARD
    // If an order already exists for this checkout attempt,
    // return it immediately and do NOT call Square again.
    // ========================================
    const existingOrder = await Order.findOne({
      idempotencyKey: data.idempotencyKey,
    }).lean();
    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderNumber: existingOrder.orderNumber,
        orderId: existingOrder._id.toString(),
        paymentId: existingOrder.squarePaymentId || null,
        reused: true,
      });
    }

    // Persist idempotency key + email on cart for recovery/traceability
    if (userId) {
      await Cart.findOneAndUpdate(
        { userId },
        {
          $set: {
            checkoutIdempotencyKey: data.idempotencyKey,
            checkoutEmail: data.email.toLowerCase(),
          },
        },
        { upsert: true },
      );
    }

    // ========================================
    // SERVER-SIDE CART TOTAL COMPUTATION
    // Never trust client-submitted totals!
    // ========================================

    const orderLines: {
      productId: string;
      variantSku: string;
      title: string;
      variantTitle: string;
      image: string;
      quantity: number;
      price: number;
      totalPrice: number;
      discountAmount: number;
    }[] = [];

    let subtotal = 0;
    let totalDiscount = 0;

    for (const cartLine of data.cartLines) {
      const product = await Product.findById(cartLine.productId);

      if (!product || product.status !== "published") {
        return NextResponse.json(
          { error: `Product not found: ${cartLine.productId}` },
          { status: 400 },
        );
      }

      const variant = product.variants.find(
        (v) => v.sku === cartLine.variantSku && v.isActive,
      );

      if (!variant) {
        return NextResponse.json(
          { error: `Variant not found: ${cartLine.variantSku}` },
          { status: 400 },
        );
      }

      // Check stock
      if (variant.stock < cartLine.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${product.title}. Available: ${variant.stock}`,
          },
          { status: 400 },
        );
      }

      // Get effective price from pricing engine
      const pricing = await getEffectivePrice({
        product: product as never,
        variant: variant as never,
        quantity: cartLine.quantity,
      });

      // Build variant title
      const variantParts: string[] = [];
      if (variant.attributes.color) variantParts.push(variant.attributes.color);
      if (variant.attributes.size) variantParts.push(variant.attributes.size);
      const variantTitle = variantParts.join(" / ") || "Default";

      const lineTotal = pricing.effectivePrice * cartLine.quantity;
      const lineDiscount = pricing.discountAmount * cartLine.quantity;

      orderLines.push({
        productId: product._id.toString(),
        variantSku: variant.sku,
        title: product.title,
        variantTitle,
        image: product.images[0] || "",
        quantity: cartLine.quantity,
        price: pricing.effectivePrice,
        totalPrice: lineTotal,
        discountAmount: lineDiscount,
      });

      subtotal += lineTotal;
      totalDiscount += lineDiscount;
    }

    // ========================================
    // APPLY COUPON (if provided)
    // ========================================

    let couponDiscount = 0;
    if (data.couponCode) {
      const coupon = await Coupon.findOne({
        code: data.couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (coupon) {
        // Check usage limits
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          return NextResponse.json(
            { error: "This coupon has reached its usage limit" },
            { status: 400 },
          );
        }

        // Check minimum purchase
        if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
          return NextResponse.json(
            {
              error: `Minimum purchase of $${(coupon.minPurchaseAmount / 100).toFixed(2)} required for this coupon`,
            },
            { status: 400 },
          );
        }

        // Calculate coupon discount
        if (coupon.type === "percentage") {
          couponDiscount = Math.round((subtotal * coupon.value) / 100);
          if (coupon.maxDiscountAmount) {
            couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
          }
        } else if (coupon.type === "fixed_amount") {
          couponDiscount = Math.min(coupon.value, subtotal);
        }
        // free_shipping handled in shipping calculation

        totalDiscount += couponDiscount;
      }
    }

    // ========================================
    // CALCULATE SHIPPING  (via /lib/shipping.ts)
    // ========================================

    let shippingTotal = 0;
    const shippingRate = await getShippingRate(
      {
        country: data.shippingAddress.country,
        state: data.shippingAddress.state,
      },
      subtotal,
      data.shippingMethod,
    );
    if (shippingRate) {
      shippingTotal = shippingRate.price;
    }

    // Free shipping coupon overrides
    if (data.couponCode) {
      const fsCoupon = await Coupon.findOne({
        code: data.couponCode.toUpperCase(),
        type: "free_shipping",
        isActive: true,
      });
      if (fsCoupon) {
        shippingTotal = 0;
      }
    }

    // ========================================
    // CALCULATE TAX  (via /lib/tax.ts)
    // ========================================

    const taxResult = await calculateTax(
      {
        country: data.shippingAddress.country,
        state: data.shippingAddress.state,
        postalCode: data.shippingAddress.postalCode,
      },
      subtotal - totalDiscount,
    );
    const taxTotal = taxResult.taxAmount;
    const taxRate = taxResult.rate;

    // ========================================
    // CALCULATE GRAND TOTAL
    // ========================================

    const grandTotal = subtotal - totalDiscount + shippingTotal + taxTotal;

    // ========================================
    // PROCESS SQUARE PAYMENT
    // ========================================

    if (!isSquareConfigured()) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 },
      );
    }

    const orderNumber = generateOrderNumber();
    const idempotencyKey = data.idempotencyKey;
    const locationId = getSquareLocationId();

    try {
      // Create Square Order first
      const squareOrderResponse = await squareClient.orders.create({
        idempotencyKey,
        order: {
          locationId,
          referenceId: orderNumber,
          lineItems: orderLines.map((line) => ({
            name: line.title,
            quantity: String(line.quantity),
            basePriceMoney: toSquareMoney(line.price),
            variationName: line.variantTitle,
          })),
          taxes:
            taxTotal > 0
              ? [
                  {
                    uid: "tax-1",
                    name: "Sales Tax",
                    type: "ADDITIVE",
                    percentage: taxRate.toString() || "0",
                    scope: "ORDER",
                  },
                ]
              : undefined,
          discounts:
            totalDiscount > 0
              ? [
                  {
                    uid: "discount-1",
                    name: data.couponCode
                      ? `Coupon: ${data.couponCode}`
                      : "Promotion",
                    type: "FIXED_AMOUNT",
                    amountMoney: toSquareMoney(totalDiscount),
                    scope: "ORDER",
                  },
                ]
              : undefined,
          serviceCharges:
            shippingTotal > 0
              ? [
                  {
                    name: data.shippingMethod,
                    amountMoney: toSquareMoney(shippingTotal),
                    calculationPhase: "TOTAL_PHASE",
                  },
                ]
              : undefined,
        },
      });

      const squareOrderId = squareOrderResponse.order?.id;

      if (!squareOrderId) {
        throw new Error("Failed to create Square order");
      }

      // Create Payment with the card nonce
      const paymentResponse = await squareClient.payments.create({
        idempotencyKey,
        sourceId: data.sourceId, // Card nonce from Web Payments SDK
        amountMoney: toSquareMoney(grandTotal),
        orderId: squareOrderId,
        locationId,
        referenceId: orderNumber,
        buyerEmailAddress: data.email,
        billingAddress: {
          firstName: data.billingAddress.firstName,
          lastName: data.billingAddress.lastName,
          addressLine1: data.billingAddress.address1,
          addressLine2: data.billingAddress.address2 || undefined,
          locality: data.billingAddress.city,
          administrativeDistrictLevel1: data.billingAddress.state,
          postalCode: data.billingAddress.postalCode,
          country: data.billingAddress.country as "US" | "CA",
        },
        shippingAddress: {
          firstName: data.shippingAddress.firstName,
          lastName: data.shippingAddress.lastName,
          addressLine1: data.shippingAddress.address1,
          addressLine2: data.shippingAddress.address2 || undefined,
          locality: data.shippingAddress.city,
          administrativeDistrictLevel1: data.shippingAddress.state,
          postalCode: data.shippingAddress.postalCode,
          country: data.shippingAddress.country as "US" | "CA",
        },
      });

      const payment = paymentResponse.payment;

      if (!payment || payment.status === "FAILED") {
        const errorDetail = paymentResponse.payment?.cardDetails?.errors?.[0];
        throw new Error(errorDetail?.detail || "Payment failed");
      }

      // ========================================
      // CREATE ORDER IN DATABASE
      // ========================================

      const order = await Order.create({
        orderNumber,
        idempotencyKey,
        processedSquareEventIds: [],
        userId: userId || undefined,
        email: data.email,
        phone: data.phone,
        lines: orderLines.map((line) => ({
          productId: line.productId,
          variantSku: line.variantSku,
          title: line.title,
          variantTitle: line.variantTitle,
          image: line.image,
          quantity: line.quantity,
          price: line.price,
          totalPrice: line.totalPrice,
          discountAmount: line.discountAmount,
        })),
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        subtotal,
        discountTotal: totalDiscount,
        shippingTotal,
        taxTotal,
        grandTotal,
        currency: "GBP",
        status: "confirmed",
        paymentStatus: payment.status === "COMPLETED" ? "paid" : "pending",
        paymentMethod: "square",
        squareOrderId,
        squarePaymentId: payment.id,
        couponCode: data.couponCode,
        shippingMethod: data.shippingMethod,
        notes: data.notes,
      });

      // Increment coupon usage exactly once, inside the idempotent create branch
      if (data.couponCode) {
        const usedCoupon = await Coupon.findOne({
          code: data.couponCode.toUpperCase(),
        }).select("_id");
        if (usedCoupon) {
          await Coupon.findByIdAndUpdate(usedCoupon._id, {
            $inc: { usageCount: 1 },
          });
        }
      }

      // ========================================
      // DECREMENT STOCK
      // ========================================

      for (const line of orderLines) {
        await Product.updateOne(
          {
            _id: line.productId,
            "variants.sku": line.variantSku,
          },
          {
            $inc: {
              "variants.$.stock": -line.quantity,
              totalSold: line.quantity,
            },
          },
        );
      }

      // ========================================
      // CLEAR CART
      // ========================================

      if (userId) {
        await Cart.findOneAndDelete({ userId });
      }

      // ========================================
      // SEND CONFIRMATION EMAIL
      // ========================================

      await sendOrderConfirmationEmail({
        orderNumber,
        customerName: `${data.shippingAddress.firstName} ${data.shippingAddress.lastName}`,
        customerEmail: data.email,
        lines: orderLines.map((line) => ({
          title: line.title,
          variantTitle: line.variantTitle,
          quantity: line.quantity,
          price: line.price,
        })),
        subtotal,
        discountTotal: totalDiscount,
        shippingTotal,
        taxTotal,
        grandTotal,
        shippingAddress: data.shippingAddress,
        currency: "GBP",
      });

      return NextResponse.json({
        success: true,
        orderNumber,
        orderId: order._id.toString(),
        paymentId: payment.id,
      });
    } catch (squareError) {
      console.error("Square payment error:", squareError);

      // Extract error message
      let errorMessage = "Payment processing failed";
      if (squareError instanceof Error) {
        errorMessage = squareError.message;
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "An error occurred during checkout" },
      { status: 500 },
    );
  }
}
