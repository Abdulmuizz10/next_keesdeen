"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Package, ArrowRight } from "lucide-react";

// Reusable "tear line" — the dashed rule that separates sections like a
// perforated ticket stub. Kept local; too small to warrant its own file.
function TearLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-full ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, #E5E5E5 0px, #E5E5E5 6px, transparent 6px, transparent 12px)",
      }}
    />
  );
}

const NEXT_STEPS = [
  {
    index: "01",
    icon: Mail,
    title: "Confirmation email",
    copy: "Sent to your inbox with your full order summary.",
  },
  {
    index: "02",
    icon: Package,
    title: "Shipping updates",
    copy: "You'll get tracking details the moment your order ships.",
  },
];

export function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white border border-neutral-100"
    >
      {/* Stamp bar */}
      <div className="h-1 bg-primary-400" />

      <div className="p-6 sm:p-12">
        {/* Header: check + eyebrow + huge order number, ticket-style */}
        <div className="flex flex-col items-center text-center mb-10">
          <motion.svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            className="mb-6"
          >
            <motion.circle
              cx="28"
              cy="28"
              r="25"
              strokeWidth="1.5"
              className="stroke-primary-300"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
            <motion.path
              d="M17 29L24 36L39 20"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
              className="stroke-primary-500"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.7, ease: "easeInOut" }}
            />
          </motion.svg>

          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400 mb-4">
            Order Confirmed
          </p>

          {orderNumber ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-300 mb-1">
                Order №
              </p>
              <h1 className="font-serif text-5xl sm:text-6xl font-semibold text-neutral-600 tabular-nums leading-none mb-4">
                {orderNumber}
              </h1>
            </>
          ) : (
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-neutral-600 mb-4">
              Thank You
            </h1>
          )}

          <p className="text-sm text-neutral-400 max-w-sm">
            Your order is confirmed and already in motion.
          </p>
        </div>

        <TearLine className="mb-10" />

        {/* What happens next — hairline grid, numbered because it's a real sequence */}
        <div className="grid sm:grid-cols-2 gap-px bg-neutral-100 border border-neutral-100 mb-10">
          {NEXT_STEPS.map((step) => (
            <div key={step.index} className="bg-white p-6 flex gap-4">
              <span className="font-serif text-3xl text-primary-300 leading-none shrink-0">
                {step.index}
              </span>
              <div>
                <p className="font-medium text-neutral-600 text-sm mb-1">
                  {step.title}
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {step.copy}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center px-6 py-3.5 border border-neutral-200 font-medium text-sm text-neutral-600 hover:border-neutral-400 transition-colors"
          >
            View Order Details
          </Link>
          <Link
            href="/shop"
            className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-400 text-white font-semibold text-sm hover:bg-primary-500 transition-colors"
          >
            Continue Shopping
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>

        <TearLine className="my-8" />

        <p className="text-center text-xs text-neutral-400">
          Questions?{" "}
          <Link
            href="mailto:hello@keesdeen.com"
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            hello@keesdeen.com
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
