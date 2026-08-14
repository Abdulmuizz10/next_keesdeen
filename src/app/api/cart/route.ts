// src/app/api/cart/route.ts
//
// GET  -> fetch the current cart (guest cookie or logged-in user), resolved
//         against live product data, with any applied coupon re-validated
//         fresh (a coupon that was valid yesterday, or before you removed
//         an item, might not be valid now).
// POST -> mutate the cart. Body shape: { action: "add" | "update" | "remove" | "clear" | "setCoupon", ...payload }
//         Every response — mutation or not — returns the same resolved
//         shape, coupon included, so the client never computes discounts
//         itself.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import dbConnect from "@/lib/db";
import Cart, { ICartLine } from "@/lib/models/Cart";
import Product from "@/lib/models/Product";
import { auth } from "@/lib/auth";
import { validateCoupon, CouponValidationResult } from "@/lib/coupons";

export const runtime = "nodejs";

const CART_COOKIE = "cart_sid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — matches Cart.expiresAt

interface ResolvedCartLine {
  productId: string;
  slug: string;
  variantSku: string;
  title: string;
  image: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountAmount: number;
  hasDiscount: boolean;
  stock: number;
  categoryIds: string[]; // used internally for coupon scoping
}

function buildVariantTitle(attrs: { size?: string; color?: string } = {}) {
  return [attrs.size, attrs.color].filter(Boolean).join(" / ");
}

async function resolveLines(
  rawLines: ICartLine[],
): Promise<{ lines: ResolvedCartLine[]; removedCount: number }> {
  if (rawLines.length === 0) return { lines: [], removedCount: 0 };

  const productIds = [...new Set(rawLines.map((l) => String(l.productId)))];
  const products = await Product.find({ _id: { $in: productIds } }).lean<
    any[]
  >();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const resolved: ResolvedCartLine[] = [];
  let removedCount = 0;

  for (const line of rawLines) {
    const product = productMap.get(String(line.productId));
    if (!product || product.status !== "published") {
      removedCount++;
      continue;
    }

    const variant = (product.variants || []).find(
      (v: any) => v.sku === line.variantSku,
    );
    if (!variant || variant.isActive === false) {
      removedCount++;
      continue;
    }

    const quantity = Math.min(line.quantity, Math.max(variant.stock, 0));
    if (quantity <= 0) {
      removedCount++;
      continue;
    }

    const unitPrice = variant.price ?? product.basePrice;
    const originalPrice =
      product.compareAtPrice && product.compareAtPrice > unitPrice
        ? product.compareAtPrice
        : unitPrice;

    resolved.push({
      productId: String(line.productId),
      slug: product.slug,
      variantSku: line.variantSku,
      title: product.title,
      image: variant.images?.[0] || product.images?.[0] || "",
      variantTitle: buildVariantTitle(variant.attributes),
      quantity,
      unitPrice,
      originalPrice,
      discountAmount: Math.max(originalPrice - unitPrice, 0),
      hasDiscount: originalPrice > unitPrice,
      stock: variant.stock,
      categoryIds: (product.categoryIds || []).map(String),
    });
  }

  return { lines: resolved, removedCount };
}

function computeTotals(
  lines: ResolvedCartLine[],
  couponResult: CouponValidationResult | null,
) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const itemDiscountTotal = lines.reduce(
    (s, l) => s + l.discountAmount * l.quantity,
    0,
  );
  const couponDiscount = couponResult?.valid ? couponResult.discountAmount : 0;

  return {
    subtotal,
    discountTotal: itemDiscountTotal + couponDiscount,
    shippingTotal: 0, // resolved at checkout
    taxTotal: 0, // resolved at checkout
    grandTotal: Math.max(subtotal - couponDiscount, 0),
  };
}

async function getCartIdentity(req: NextRequest) {
  const session = await auth();

  const userId = session?.user?.id ?? null;

  const existingSid = req.cookies.get(CART_COOKIE)?.value;

  if (userId) {
    return {
      userId,
      sessionId: existingSid,
      newSid: null as string | null,
    };
  }

  const sessionId = existingSid || randomUUID();

  return {
    userId: null,
    sessionId,
    newSid: existingSid ? null : sessionId,
  };
}

async function findOrCreateCart(
  userId: string | null,
  sessionId: string | undefined,
) {
  if (userId) {
    let cart = await Cart.findOne({ userId });

    if (sessionId) {
      const guestCart = await Cart.findOne({
        sessionId,
        userId: { $exists: false },
      });
      if (guestCart) {
        if (!cart) {
          guestCart.userId = userId as any;
          guestCart.sessionId = undefined;
          await guestCart.save();
          cart = guestCart;
        } else {
          for (const line of guestCart.lines) {
            const existing = cart.lines.find(
              (l) =>
                String(l.productId) === String(line.productId) &&
                l.variantSku === line.variantSku,
            );
            if (existing) existing.quantity += line.quantity;
            else cart.lines.push(line);
          }
          await cart.save();
          await guestCart.deleteOne();
        }
      }
    }

    if (!cart) cart = await Cart.create({ userId, lines: [] });
    return cart;
  }

  let cart = await Cart.findOne({ sessionId });
  if (!cart) cart = await Cart.create({ sessionId, lines: [] });
  return cart;
}

function withCartCookie(res: NextResponse, newSid: string | null) {
  if (newSid) {
    res.cookies.set(CART_COOKIE, newSid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return res;
}

/**
 * Resolves lines, re-validates any applied coupon against the current cart
 * state, and prunes lines that no longer resolve. This is the single place
 * that builds what gets sent back to the client — used by GET and every
 * POST action, so the response shape never drifts between them.
 */
async function buildCartResponse(cart: any, userId: string | null) {
  const { lines, removedCount } = await resolveLines(cart.lines);

  if (removedCount > 0) {
    cart.lines = cart.lines.filter((rl: ICartLine) =>
      lines.some(
        (l) =>
          l.productId === String(rl.productId) &&
          l.variantSku === rl.variantSku,
      ),
    );
    await cart.save();
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  let couponResult: CouponValidationResult | null = null;
  if (cart.couponCode) {
    couponResult = await validateCoupon(
      cart.couponCode,
      subtotal,
      lines.map((l) => ({
        productId: l.productId,
        categoryIds: l.categoryIds,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
      userId,
    );
  }

  return {
    lines: lines.map(({ categoryIds, ...rest }) => rest), // internal-only field, don't leak it
    totals: computeTotals(lines, couponResult),
    couponCode: cart.couponCode ?? null,
    coupon: couponResult
      ? {
          valid: couponResult.valid,
          error: couponResult.error ?? null,
          discountAmount: couponResult.discountAmount,
          freeShipping: couponResult.freeShipping,
        }
      : null,
    removedCount,
  };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { userId, sessionId, newSid } = await getCartIdentity(req);

    const cartDoc = userId
      ? await Cart.findOne({ userId })
      : sessionId
        ? await Cart.findOne({ sessionId })
        : null;

    if (!cartDoc) {
      const res = NextResponse.json({
        lines: [],
        totals: computeTotals([], null),
        couponCode: null,
        coupon: null,
        removedCount: 0,
      });
      return withCartCookie(res, newSid);
    }

    const payload = await buildCartResponse(cartDoc, userId);
    return withCartCookie(NextResponse.json(payload), newSid);
  } catch (err) {
    console.error("GET /api/cart error:", err);
    return NextResponse.json({ error: "Failed to load cart" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { userId, sessionId, newSid } = await getCartIdentity(req);
    const body = await req.json();
    const { action } = body;

    const cart = await findOrCreateCart(userId, sessionId);

    switch (action) {
      case "add": {
        const { productId, variantSku, quantity } = body;
        if (!productId || !variantSku || !quantity || quantity < 1) {
          return NextResponse.json(
            {
              error:
                "productId, variantSku, and a positive quantity are required",
            },
            { status: 400 },
          );
        }
        const existing = cart.lines.find(
          (l) =>
            String(l.productId) === String(productId) &&
            l.variantSku === variantSku,
        );
        if (existing) existing.quantity += quantity;
        else
          cart.lines.push({
            productId,
            variantSku,
            quantity,
            addedAt: new Date(),
          } as ICartLine);
        break;
      }

      case "update": {
        const { productId, variantSku, quantity } = body;
        if (!productId || !variantSku || typeof quantity !== "number") {
          return NextResponse.json(
            { error: "productId, variantSku, and quantity are required" },
            { status: 400 },
          );
        }
        if (quantity <= 0) {
          cart.lines = cart.lines.filter(
            (l) =>
              !(
                String(l.productId) === String(productId) &&
                l.variantSku === variantSku
              ),
          ) as any;
        } else {
          const existing = cart.lines.find(
            (l) =>
              String(l.productId) === String(productId) &&
              l.variantSku === variantSku,
          );
          if (existing) existing.quantity = quantity;
        }
        break;
      }

      case "remove": {
        const { productId, variantSku } = body;
        cart.lines = cart.lines.filter(
          (l) =>
            !(
              String(l.productId) === String(productId) &&
              l.variantSku === variantSku
            ),
        ) as any;
        break;
      }

      case "clear": {
        cart.lines = [] as any;
        cart.couponCode = undefined;
        break;
      }

      case "setCoupon": {
        const raw = body.couponCode;
        cart.couponCode = raw ? String(raw).toUpperCase().trim() : undefined;
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    cart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await cart.save();

    const payload = await buildCartResponse(cart, userId);
    return withCartCookie(NextResponse.json(payload), newSid);
  } catch (err) {
    console.error("POST /api/cart error:", err);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 },
    );
  }
}
