"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  Tag,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const {
    lines,
    updateLine,
    removeLine,
    clearCart,
    totals,
    couponCode,
    couponValid,
    couponError,
    couponDiscount,
    freeShipping,
    setCouponCode,
  } = useCartStore();

  // Local draft for the input field — only sent to the server when the
  // user hits Apply/Enter, not on every keystroke.
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const handleApplyCoupon = async () => {
    const trimmed = couponInput.trim().toUpperCase();
    if (!trimmed) return;
    setApplyingCoupon(true);
    await setCouponCode(trimmed);
    setApplyingCoupon(false);
  };

  const handleRemoveCoupon = async () => {
    setCouponInput("");
    await setCouponCode(null);
  };

  if (lines.length === 0) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
          <div className="flex flex-col items-center justify-center text-center py-20">
            <ShoppingBag size={64} className="text-neutral-200 mb-6" />
            <h1 className="font-serif text-3xl font-semibold text-neutral-600 mb-3">
              Your Cart is Empty
            </h1>
            <p className="text-neutral-400 max-w-md mb-8">
              Looks like you haven&apos;t added any items yet. Explore our
              collection and find something you love.
            </p>
            <Link
              href="/category/bags"
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary-400 text-white font-sans font-semibold  hover:bg-primary-500 transition-colors"
            >
              <ArrowLeft size={18} />
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-neutral-100">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-neutral-600">
              Shopping Cart
            </h1>
            <span className="text-neutral-400 text-sm">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>
      </section>

      <div className="bg-white mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-4">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart Lines */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="popLayout">
              {lines.map((line) => {
                const lineKey = `${line.productId}::${line.variantSku}`;

                return (
                  <motion.div
                    key={lineKey}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-4 sm:gap-6 py-6 border-b border-neutral-100 last:border-b-0"
                  >
                    {/* Product Image */}
                    <Link
                      href={`/product/${line.productId}`}
                      className="relative w-24 h-28 sm:w-32 sm:h-36 shrink-0  overflow-hidden bg-neutral-100"
                    >
                      {line.image ? (
                        <Image
                          src={line.image}
                          alt={line.title}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs">
                          No image
                        </div>
                      )}
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            href={`/product/${line.productId}`}
                            className="font-serif text-lg font-medium text-neutral-600 hover:text-primary-500 transition-colors"
                          >
                            {line.title}
                          </Link>
                          {line.variantTitle && (
                            <p className="text-sm text-neutral-400 mt-0.5">
                              {line.variantTitle}
                            </p>
                          )}
                          <p className="text-xs text-neutral-300 mt-1">
                            SKU: {line.variantSku}
                          </p>
                        </div>

                        {/* Price (desktop) */}
                        <div className="hidden sm:block text-right shrink-0">
                          <span className="font-sans font-semibold text-neutral-600">
                            {formatPrice(line.unitPrice * line.quantity)}
                          </span>
                          {line.hasDiscount && line.quantity > 1 && (
                            <p className="text-xs text-neutral-400">
                              {formatPrice(line.unitPrice)} each
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-neutral-200 ">
                          <button
                            onClick={() =>
                              updateLine(
                                line.productId,
                                line.variantSku,
                                line.quantity - 1,
                              )
                            }
                            className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-10 text-center text-sm font-medium text-neutral-600">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateLine(
                                line.productId,
                                line.variantSku,
                                line.quantity + 1,
                              )
                            }
                            disabled={line.quantity >= line.stock}
                            className="w-9 h-9 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 disabled:text-neutral-300 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Price (mobile) */}
                          <span className="sm:hidden font-sans font-semibold text-neutral-600">
                            {formatPrice(line.unitPrice * line.quantity)}
                          </span>

                          {/* Unit price with discount */}
                          {line.hasDiscount && (
                            <div className="hidden sm:flex items-center gap-2 text-sm">
                              <span className="text-neutral-300 line-through">
                                {formatPrice(line.originalPrice)}
                              </span>
                              <span className="text-secondary-400 font-medium">
                                {formatPrice(line.unitPrice)}
                              </span>
                            </div>
                          )}

                          {/* Remove */}
                          <button
                            onClick={() =>
                              removeLine(line.productId, line.variantSku)
                            }
                            className="p-2 text-neutral-300 hover:text-red-500 transition-colors"
                            aria-label={`Remove ${line.title}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Continue Shopping + Clear Cart */}
            <div className="mt-8 flex items-center justify-between">
              <Link
                href="/category/bags"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-500 transition-colors"
              >
                <ArrowLeft size={16} />
                Continue Shopping
              </Link>
              <button
                onClick={clearCart}
                className="text-sm text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="mt-8 lg:mt-0">
            <div className="bg-white  border border-neutral-100 p-6 sticky top-20">
              <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">
                    Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                  <span className="font-sans font-medium text-neutral-600">
                    {formatPrice(totals.subtotal)}
                  </span>
                </div>

                {/* Coupon discount */}
                {couponValid && couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400 flex items-center gap-1">
                      <Tag size={14} />
                      Coupon ({couponCode})
                    </span>
                    <span className="font-sans font-medium text-secondary-400">
                      −{formatPrice(couponDiscount)}
                    </span>
                  </div>
                )}
                {couponValid && freeShipping && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400 flex items-center gap-1">
                      <Tag size={14} />
                      Coupon ({couponCode})
                    </span>
                    <span className="font-sans font-medium text-secondary-400">
                      Free shipping
                    </span>
                  </div>
                )}

                {/* Shipping */}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Shipping</span>
                  <span className="text-neutral-400">
                    Calculated at checkout
                  </span>
                </div>

                {/* Tax */}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Tax</span>
                  <span className="text-neutral-400">
                    Calculated at checkout
                  </span>
                </div>

                {/* Coupon Code */}
                <div className="pt-4 border-t border-neutral-100">
                  <label className="text-sm font-medium text-neutral-600 mb-2 block">
                    Coupon Code
                  </label>

                  {couponCode && couponValid ? (
                    <div className="flex items-center justify-between px-3 py-2 border border-primary-200 bg-primary-50 text-sm">
                      <span className="font-mono font-medium text-primary-600">
                        {couponCode}
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-neutral-400 hover:text-red-500 transition-colors"
                        aria-label="Remove coupon"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={couponInput}
                        onChange={(e) =>
                          setCouponInput(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-neutral-200  text-sm focus:outline-none focus:border-primary-400 uppercase"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon || !couponInput.trim()}
                        className="px-4 py-2 border border-neutral-200  text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-xs text-red-500 mt-2">{couponError}</p>
                  )}
                </div>

                {/* Total */}
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex justify-between">
                    <span className="font-sans font-semibold text-neutral-600">
                      Estimated Total
                    </span>
                    <span className="font-sans font-bold text-xl text-neutral-600">
                      {formatPrice(totals.grandTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Final total with shipping and tax at checkout
                  </p>
                </div>

                {/* Checkout Button */}
                <Link
                  href="/checkout"
                  className="block w-full text-center py-4 bg-primary-400 text-white  font-sans font-semibold text-lg hover:bg-primary-500 transition-colors"
                >
                  Proceed to Checkout
                </Link>

                {/* Free Shipping Indicator */}
                {totals.subtotal < 15000 && (
                  <div className="text-center">
                    <p className="text-xs text-neutral-400">
                      Add{" "}
                      <span className="font-medium text-primary-500">
                        {formatPrice(15000 - totals.subtotal)}
                      </span>{" "}
                      more for free shipping!
                    </p>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-neutral-100  overflow-hidden">
                      <motion.div
                        className="h-full bg-primary-400 "
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, (totals.subtotal / 15000) * 100)}%`,
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
                {totals.subtotal >= 15000 && (
                  <div className="text-center">
                    <p className="text-xs text-primary-500 font-medium">
                      ✓ You qualify for free shipping!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
