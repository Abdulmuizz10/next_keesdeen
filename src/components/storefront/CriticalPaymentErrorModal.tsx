"use client";

import { useState } from "react";
import { AlertCircle, X, Copy, Check } from "lucide-react";

interface CriticalPaymentErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId?: string;
  idempotencyKey?: string;
}

export function CriticalPaymentErrorModal({
  isOpen,
  onClose,
  paymentId,
  idempotencyKey,
}: CriticalPaymentErrorModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyBoth = () => {
    navigator.clipboard.writeText(
      `Payment ID: ${paymentId || "N/A"}\nIdempotency Key: ${idempotencyKey || "N/A"}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md mx-4 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-4 p-6 border-b border-neutral-200">
          <div className="shrink-0 w-12 h-12 bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-xl font-semibold text-neutral-600">
              We hit a snag finishing your order
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-500 leading-relaxed">
            Your payment went through, but we ran into a problem confirming your
            order on our end. Don&apos;t worry — you have not been
            double-charged. Please contact us with the reference below and
            we&apos;ll sort this out right away.
          </p>

          {(paymentId || idempotencyKey) && (
            <div className="space-y-3">
              {paymentId && (
                <div className="p-4 bg-neutral-50 border border-neutral-200">
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                    Payment Reference ID
                  </p>
                  <code className="block text-sm text-neutral-600 font-mono bg-white px-3 py-2 border border-neutral-200 break-all">
                    {paymentId}
                  </code>
                </div>
              )}

              {idempotencyKey && (
                <div className="p-4 bg-primary-50 border border-primary-200">
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-primary-600 mb-2">
                    Order Reference
                  </p>
                  <code className="block text-sm text-primary-700 font-mono bg-white px-3 py-2 border border-primary-200 break-all">
                    {idempotencyKey}
                  </code>
                </div>
              )}

              <button
                onClick={copyBoth}
                className="w-full py-2 px-4 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-sm text-neutral-600 font-medium transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <Check size={16} className="text-primary-500" />
                ) : (
                  <Copy size={16} />
                )}
                {copied ? "Copied" : "Copy reference IDs"}
              </button>
            </div>
          )}

          <div className="p-4 bg-neutral-50 border border-neutral-200">
            <p className="text-sm text-neutral-600">
              <strong>Need help?</strong> Email{" "}
              <a
                href="mailto:support@keesdeen.com"
                className="underline text-primary-500 hover:text-primary-600"
              >
                support@keesdeen.com
              </a>{" "}
              with the reference IDs above for the fastest resolution.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-neutral-600 text-white text-sm font-semibold uppercase tracking-widest hover:bg-neutral-700 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
