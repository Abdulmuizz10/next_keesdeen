"use client";

import { create } from "zustand";

/**
 * Cart UI + sync store.
 * Golden rule: price, stock, tax, shipping, and coupon/promotion effects
 * are ALWAYS resolved server-side, via /api/cart. This store keeps a local
 * mirror for instant UI feedback, but every mutation round-trips to the
 * server and the response is the new source of truth.
 */

export interface CartLine {
  productId: string;
  slug: string;
  variantSku: string;
  title: string;
  image: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number; // Display price in cents (from pricing engine)
  originalPrice: number; // Before discounts
  discountAmount: number;
  hasDiscount: boolean;
  stock: number;
}

interface CartTotals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
}

const emptyTotals: CartTotals = {
  subtotal: 0,
  discountTotal: 0,
  shippingTotal: 0,
  taxTotal: 0,
  grandTotal: 0,
};

interface CouponInfo {
  valid: boolean;
  error: string | null;
  discountAmount: number;
  freeShipping: boolean;
}

interface CartApiResponse {
  lines: CartLine[];
  totals: CartTotals;
  couponCode: string | null;
  coupon: CouponInfo | null;
  removedCount?: number;
}

interface CartState {
  // UI state
  isCartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;

  // Cart data
  lines: CartLine[];
  lastAddedLineKey: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  // Server-resolved data
  totals: CartTotals;
  couponCode: string | null;
  couponValid: boolean;
  couponError: string | null;
  couponDiscount: number;
  freeShipping: boolean;

  // Actions
  hydrateCart: () => Promise<void>;
  addLine: (line: CartLine) => Promise<void>;
  updateLine: (
    productId: string,
    variantSku: string,
    quantity: number,
  ) => Promise<void>;
  removeLine: (productId: string, variantSku: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setCouponCode: (code: string | null) => Promise<void>;
  clearLastAdded: () => void;
  getLineKey: (productId: string, variantSku: string) => string;
}

async function postCartAction(
  body: Record<string, unknown>,
): Promise<CartApiResponse | null> {
  try {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("Cart action failed:", body.action, await res.text());
      return null;
    }
    return (await res.json()) as CartApiResponse;
  } catch (err) {
    console.error("Cart action network error:", body.action, err);
    return null;
  }
}

function applyResponse(data: CartApiResponse) {
  return {
    lines: data.lines,
    totals: data.totals,
    couponCode: data.couponCode,
    couponValid: data.coupon?.valid ?? false,
    couponError: data.coupon?.error ?? null,
    couponDiscount: data.coupon?.discountAmount ?? 0,
    freeShipping: data.coupon?.freeShipping ?? false,
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  isCartDrawerOpen: false,
  lastAddedLineKey: null,
  isLoading: false,
  isHydrated: false,
  lines: [],
  totals: emptyTotals,
  couponCode: null,
  couponValid: false,
  couponError: null,
  couponDiscount: 0,
  freeShipping: false,

  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),

  getLineKey: (productId, variantSku) => `${productId}::${variantSku}`,

  hydrateCart: async () => {
    if (get().isHydrated) return;
    set({ isLoading: true });
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = (await res.json()) as CartApiResponse;
        set(applyResponse(data));
      }
    } catch (err) {
      console.error("Failed to hydrate cart:", err);
    } finally {
      set({ isLoading: false, isHydrated: true });
    }
  },

  addLine: async (line) => {
    const state = get();
    const lineKey = state.getLineKey(line.productId, line.variantSku);

    const existingIndex = state.lines.findIndex(
      (l) => state.getLineKey(l.productId, l.variantSku) === lineKey,
    );
    const optimisticLines =
      existingIndex >= 0
        ? state.lines.map((l, i) =>
            i === existingIndex
              ? { ...l, quantity: l.quantity + line.quantity }
              : l,
          )
        : [line, ...state.lines];

    set({
      lines: optimisticLines,
      lastAddedLineKey: lineKey,
      isCartDrawerOpen: true,
    });

    const data = await postCartAction({
      action: "add",
      productId: line.productId,
      variantSku: line.variantSku,
      quantity: line.quantity,
    });
    if (data) set(applyResponse(data));
  },

  updateLine: async (productId, variantSku, quantity) => {
    const state = get();
    const lineKey = state.getLineKey(productId, variantSku);

    set({
      lines:
        quantity <= 0
          ? state.lines.filter(
              (l) => state.getLineKey(l.productId, l.variantSku) !== lineKey,
            )
          : state.lines.map((l) =>
              state.getLineKey(l.productId, l.variantSku) === lineKey
                ? { ...l, quantity }
                : l,
            ),
    });

    const data = await postCartAction({
      action: "update",
      productId,
      variantSku,
      quantity,
    });
    if (data) set(applyResponse(data));
  },

  removeLine: async (productId, variantSku) => {
    const state = get();
    const lineKey = state.getLineKey(productId, variantSku);

    set({
      lines: state.lines.filter(
        (l) => state.getLineKey(l.productId, l.variantSku) !== lineKey,
      ),
    });

    const data = await postCartAction({
      action: "remove",
      productId,
      variantSku,
    });
    if (data) set(applyResponse(data));
  },

  clearCart: async () => {
    set({
      lines: [],
      totals: emptyTotals,
      couponCode: null,
      couponValid: false,
      couponError: null,
      couponDiscount: 0,
      freeShipping: false,
    });
    await postCartAction({ action: "clear" });
  },

  // Applies (or clears, if code is null) a coupon. Call this only when the
  // user commits — e.g. clicking "Apply" or pressing Enter — not on every
  // keystroke. Keep the text field's live value in local component state.
  setCouponCode: async (code) => {
    set({ couponCode: code });
    const data = await postCartAction({
      action: "setCoupon",
      couponCode: code,
    });
    if (data) set(applyResponse(data));
  },

  clearLastAdded: () => set({ lastAddedLineKey: null }),
}));
