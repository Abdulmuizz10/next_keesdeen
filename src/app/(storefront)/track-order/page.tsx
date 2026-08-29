"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Package } from "lucide-react";
import { formatPrice } from "@/lib/format";
import Link from "next/link";

interface LookupResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    city: string;
    state: string;
    country: string;
  };
  lines: {
    title: string;
    variantTitle: string;
    image: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  shippingMethod: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  processing: "Preparing your order",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function TrackOrderContent() {
  const searchParams = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(
    searchParams.get("order") || "",
  );
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!orderNumber.trim() || !email.trim()) {
      setError("Enter both your order number and email.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We couldn't find that order");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
        {!result ? (
          <div className="bg-white border border-neutral-100 p-8 sm:p-14">
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-neutral-600 mb-2 text-center">
              Track your order
            </h1>
            <p className="text-sm text-neutral-400 text-center mb-10">
              Enter your order number and the email used at checkout.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Order number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="KD-XXXXXX-XXXX"
                  className="w-full px-4 py-3 border border-neutral-200 focus:outline-none focus:border-primary-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-neutral-200 focus:outline-none focus:border-primary-400"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-400 text-white font-semibold text-sm hover:bg-primary-500 disabled:bg-primary-200 transition-colors cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Find my order
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <OrderResult result={result} onReset={() => setResult(null)} />
        )}
      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <TrackOrderContent />
    </Suspense>
  );
}

export default function OrderResult({
  result,
  onReset,
}: {
  result: LookupResult;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white border border-neutral-100"
    >
      <div className="p-8 sm:p-14">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
              Order {result.orderNumber}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-neutral-600">
              {STATUS_LABELS[result.status] || result.status}
            </h1>
          </div>
          <button
            onClick={onReset}
            className="text-xs text-neutral-400 hover:text-primary-500 underline underline-offset-2"
          >
            Track another order
          </button>
        </div>

        {result.trackingNumber && (
          <div className="p-4 bg-neutral-50 mb-8 flex items-start gap-3">
            <Package size={18} className="text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-600">
                Tracking number: {result.trackingNumber}
              </p>
              {result.trackingUrl && (
                <Link
                  href={result.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                >
                  Track shipment
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {result.lines.map((line, index) => (
            <div key={index} className="flex gap-4">
              <div className="relative w-16 h-20 bg-neutral-100 overflow-hidden shrink-0">
                {line.image && (
                  <Image
                    src={line.image}
                    alt={line.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-600 truncate">
                  {line.title}
                </p>
                <p className="text-xs text-neutral-400">{line.variantTitle}</p>
                <p className="text-xs text-neutral-400">Qty {line.quantity}</p>
              </div>
              <p className="text-sm font-medium text-neutral-600">
                {formatPrice(line.totalPrice)}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-4 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Subtotal</span>
            <span className="text-neutral-600">
              {formatPrice(result.subtotal)}
            </span>
          </div>
          {result.discountTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Discount</span>
              <span className="text-neutral-600">
                −{formatPrice(result.discountTotal)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Shipping</span>
            <span className="text-neutral-600">
              {formatPrice(result.shippingTotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Tax</span>
            <span className="text-neutral-600">
              {formatPrice(result.taxTotal)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-neutral-100">
            <span className="text-neutral-600">Total</span>
            <span className="text-neutral-600">
              {formatPrice(result.grandTotal)}
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          Shipping to {result.shippingAddress.firstName}{" "}
          {result.shippingAddress.lastName}, {result.shippingAddress.city},{" "}
          {result.shippingAddress.state}, {result.shippingAddress.country}
        </p>
      </div>
    </motion.div>
  );
}
