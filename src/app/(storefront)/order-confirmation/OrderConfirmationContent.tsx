"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function OrderConfirmationContent({ isGuest }: { isGuest: boolean }) {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white border border-neutral-100"
    >
      <div className="p-8 sm:p-14">
        <div className="flex flex-col items-center text-center">
          <motion.svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            className="mb-8"
          >
            <motion.circle
              cx="24"
              cy="24"
              r="21"
              strokeWidth="1.5"
              className="stroke-primary-300"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
            <motion.path
              d="M15 25L21 31L33 17"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
              className="stroke-primary-500"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.6, ease: "easeInOut" }}
            />
          </motion.svg>

          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-neutral-600 mb-2">
            Your order is confirmed
          </h1>

          {orderNumber && (
            <p className="text-sm text-neutral-400 mb-8">Order {orderNumber}</p>
          )}

          <p className="text-sm text-neutral-400 max-w-sm leading-relaxed mb-10">
            We&apos;ve emailed you the details. You&apos;ll get another email as
            soon as it ships.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href={
                isGuest
                  ? `/track-order${orderNumber ? `?order=${encodeURIComponent(orderNumber)}` : ""}`
                  : "/account/orders"
              }
              className="inline-flex items-center justify-center px-6 py-3.5 border border-neutral-200 font-medium text-sm text-neutral-600 hover:border-neutral-400 transition-colors"
            >
              {isGuest ? "Track order" : "View order"}
            </Link>
            <Link
              href="/shop"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-400 text-white font-semibold text-sm hover:bg-primary-500 transition-colors"
            >
              Continue shopping
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>

        <div className="h-px bg-neutral-100 my-10" />

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
