"use client";

import { useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/format";

export function CartDrawer() {
  const {
    isCartDrawerOpen,
    setCartDrawerOpen,
    lines,
    lastAddedLineKey,
    updateLine,
    removeLine,
    clearLastAdded,
    hydrateCart,
  } = useCartStore();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Load the persisted cart (guest cookie or logged-in user) once on mount.
  // If CartDrawer isn't the globally-mounted piece in your layout, move this
  // effect to whichever component is (e.g. a root layout wrapper).
  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  useEffect(() => {
    if (lastAddedLineKey) {
      const timer = setTimeout(() => clearLastAdded(), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedLineKey, clearLastAdded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartDrawerOpen) setCartDrawerOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCartDrawerOpen, setCartDrawerOpen]);

  useEffect(() => {
    document.body.style.overflow = isCartDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartDrawerOpen]);

  const localSubtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

  const handleQuantityChange = useCallback(
    (productId: string, variantSku: string, newQty: number) => {
      updateLine(productId, variantSku, newQty);
    },
    [updateLine],
  );

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setCartDrawerOpen(false)}
          />

          {/* Drawer — slides from RIGHT */}
          <motion.div
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l sf-border z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b sf-border">
              <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Cart ({lines.reduce((s, l) => s + l.quantity, 0)})
              </h2>
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Close cart"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Cart Lines */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag
                    size={32}
                    strokeWidth={1}
                    className="text-neutral-300 mb-4"
                  />
                  <p className="font-serif text-lg text-neutral-500 mb-1">
                    Your cart is empty
                  </p>
                  <p className="text-xs text-neutral-400 font-sans mb-8">
                    Explore our collection
                  </p>
                  <Link
                    href="/category/bags"
                    onClick={() => setCartDrawerOpen(false)}
                    className="px-8 py-3 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 transition-colors"
                  >
                    Shop Now
                  </Link>
                </div>
              ) : (
                <div className="space-y-0">
                  {lines.map((line, idx) => {
                    const lineKey = `${line.productId}::${line.variantSku}`;
                    return (
                      <motion.div
                        key={lineKey}
                        layout
                        className={`flex gap-5 py-5 ${idx > 0 ? "border-t sf-border" : ""}`}
                      >
                        <Link
                          href={`/product/${line.slug}`}
                          onClick={() => setCartDrawerOpen(false)}
                          className="relative w-20 h-24 shrink-0 bg-neutral-100 overflow-hidden"
                        >
                          {line.image ? (
                            <Image
                              src={line.image}
                              alt={line.title}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs">
                              No image
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-sm text-neutral-600 leading-snug">
                            {line.title}
                          </h3>
                          {line.variantTitle && (
                            <p className="text-[10px] font-sans text-neutral-400 uppercase tracking-[0.06em] mt-0.5">
                              {line.variantTitle}
                            </p>
                          )}
                          <p className="font-serif text-sm text-neutral-600 mt-2">
                            {formatPrice(line.unitPrice)}
                          </p>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center border sf-border">
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    line.productId,
                                    line.variantSku,
                                    line.quantity - 1,
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-8 text-center text-xs font-sans font-medium text-neutral-600">
                                {line.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    line.productId,
                                    line.variantSku,
                                    line.quantity + 1,
                                  )
                                }
                                disabled={line.quantity >= line.stock}
                                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 disabled:text-neutral-300 transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <button
                              onClick={() =>
                                removeLine(line.productId, line.variantSku)
                              }
                              className="text-[10px] font-sans font-medium uppercase tracking-[0.08em] text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {lines.length > 0 && (
              <div className="border-t sf-border px-8 py-6 space-y-5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-neutral-500">
                    Subtotal
                  </span>
                  <span className="font-serif text-lg text-neutral-600">
                    {formatPrice(localSubtotal)}
                  </span>
                </div>
                <p className="text-[10px] font-sans text-neutral-400">
                  Shipping and taxes calculated at checkout.
                </p>
                <div className="space-y-3">
                  <Link
                    href="/checkout"
                    onClick={() => setCartDrawerOpen(false)}
                    className="block w-full text-center py-3.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 transition-colors"
                  >
                    Checkout
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setCartDrawerOpen(false)}
                    className="block w-full text-center py-3 border sf-border text-neutral-600 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-neutral-50 transition-colors"
                  >
                    View Cart
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
