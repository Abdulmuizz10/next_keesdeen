import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { OrderConfirmationContent } from "./OrderConfirmationContent";

export default function OrderConfirmationPage() {
  return (
    <main className="min-h-screen py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
        <Suspense fallback={<OrderConfirmationSkeleton />}>
          <OrderConfirmationContent />
        </Suspense>
      </div>
    </main>
  );
}

function OrderConfirmationSkeleton() {
  return (
    <div className="bg-white shadow-sm border border-neutral-100 p-8">
      {/* Success Icon Skeleton */}
      <div className="text-center mb-8">
        <div className="relative w-20 h-20 mx-auto mb-6 overflow-hidden bg-neutral-100">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
        </div>

        {/* Heading */}
        <div className="relative h-9 w-72 max-w-full mx-auto mb-3 overflow-hidden bg-neutral-100">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
        </div>

        {/* Order Number */}
        <div className="relative h-5 w-44 mx-auto overflow-hidden bg-neutral-100">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="relative p-4 bg-neutral-50 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="relative shrink-0 w-5 h-5 bg-neutral-200 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
              </div>

              <div className="flex-1 space-y-2">
                {/* Title */}
                <div className="relative h-4 w-36 overflow-hidden bg-neutral-200">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="relative h-3 w-full overflow-hidden bg-neutral-100">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
                  </div>

                  <div className="relative h-3 w-4/5 overflow-hidden bg-neutral-100">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <div className="relative h-12 w-full sm:w-44 overflow-hidden bg-neutral-100">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
        </div>

        <div className="relative h-12 w-full sm:w-44 overflow-hidden bg-neutral-200">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
        </div>
      </div>

      {/* Support */}
      <div className="relative h-4 w-64 max-w-full mx-auto mt-8 overflow-hidden bg-neutral-100">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-linear-to-r from-transparent via-white/70 to-transparent" />
      </div>
    </div>
  );
}
