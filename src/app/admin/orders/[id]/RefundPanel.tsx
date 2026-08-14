"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { Loader2, AlertCircle, CheckCircle, RotateCcw } from "lucide-react";

interface OrderLine {
  productId: string;
  variantSku: string;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  lines: OrderLine[];
  grandTotal: number;
  shippingTotal: number;
}

interface RefundableInfo {
  total: number;
  byLine: Record<string, { quantity: number; amount: number }>;
}

interface Refund {
  id: string;
  refundNumber: string;
  status: string;
  totalAmount: number;
  reason: string;
  createdAt: string;
}

interface RefundPanelProps {
  order: Order;
  refundable: RefundableInfo;
  refunds: Refund[];
  canRefund: boolean;
}

type RefundType = "full" | "partial";
type ReasonCode =
  | "customer_request"
  | "damaged"
  | "wrong_item"
  | "price_adjustment"
  | "other";

const ACCENT = "#04BB6E";
const DANGER = "#B3261E";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 block">
      {children}
    </label>
  );
}

export function RefundPanel({
  order,
  refundable,
  refunds,
  canRefund,
}: RefundPanelProps) {
  const [refundType, setRefundType] = useState<RefundType>("full");
  const [selectedLines, setSelectedLines] = useState<
    Record<string, { quantity: number; amount: number }>
  >({});
  const [shippingRefund, setShippingRefund] = useState(0);
  const [reasonCode, setReasonCode] = useState<ReasonCode>("customer_request");
  const [reason, setReason] = useState("");
  const [restockItems, setRestockItems] = useState(true);
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalSelected =
    Object.values(selectedLines).reduce((sum, line) => sum + line.amount, 0) +
    shippingRefund;
  const canSubmit =
    refundType === "full" || (totalSelected > 0 && reason.trim().length > 0);

  const handleLineToggle = (
    productId: string,
    variantSku: string,
    maxQty: number,
    maxAmount: number,
  ) => {
    const key = `${productId}::${variantSku}`;
    setSelectedLines((prev) => {
      if (prev[key]) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: { quantity: maxQty, amount: maxAmount } };
    });
  };

  const handleLineQuantityChange = (
    productId: string,
    variantSku: string,
    quantity: number,
    pricePerUnit: number,
  ) => {
    const key = `${productId}::${variantSku}`;
    if (quantity <= 0) {
      const { [key]: _, ...rest } = selectedLines;
      setSelectedLines(rest);
    } else {
      setSelectedLines((prev) => ({
        ...prev,
        [key]: { quantity, amount: quantity * pricePerUnit },
      }));
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      let linesToRefund: {
        productId: string;
        variantSku: string;
        quantity: number;
        amount: number;
      }[];

      if (refundType === "full") {
        linesToRefund = order.lines
          .map((line) => {
            const key = `${line.productId}::${line.variantSku}`;
            const remaining = refundable.byLine[key];
            if (remaining && remaining.quantity > 0) {
              return {
                productId: line.productId,
                variantSku: line.variantSku,
                quantity: remaining.quantity,
                amount: remaining.amount,
              };
            }
            return null;
          })
          .filter((line): line is NonNullable<typeof line> => line !== null);
      } else {
        linesToRefund = Object.entries(selectedLines).map(([key, value]) => {
          const [productId, variantSku] = key.split("::");
          return {
            productId,
            variantSku,
            quantity: value.quantity,
            amount: value.amount,
          };
        });
      }

      const response = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          lines: linesToRefund,
          shippingRefund:
            refundType === "full" ? order.shippingTotal : shippingRefund,
          reasonCode,
          reason: refundType === "full" ? `Full refund: ${reasonCode}` : reason,
          restockItems,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Refund failed");
      }

      setSuccess(`Refund ${result.refundNumber} processed successfully!`);
      setSelectedLines({});
      setShippingRefund(0);
      setReason("");
      setNotes("");

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!canRefund) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
          <RotateCcw
            size={15}
            className="text-[hsl(var(--muted-foreground))]"
          />
          Refunds
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          You don&apos;t have permission to process refunds. Contact a manager
          if needed.
        </p>
      </Card>
    );
  }

  if (refundable.total <= 0) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
          <RotateCcw
            size={15}
            className="text-[hsl(var(--muted-foreground))]"
          />
          Refunds
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          This order has been fully refunded.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-5 flex items-center gap-2">
        <RotateCcw size={15} className="text-[hsl(var(--muted-foreground))]" />
        Process Refund
      </h2>

      {/* Messages */}
      {error && (
        <div
          className="mb-4 pl-3 py-2.5 border-l-[3px] bg-[hsl(var(--muted))] flex items-center gap-2 text-sm text-[hsl(var(--foreground))]"
          style={{ borderColor: DANGER }}
        >
          <AlertCircle size={16} style={{ color: DANGER }} />
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-4 pl-3 py-2.5 border-l-[3px] bg-[hsl(var(--muted))] flex items-center gap-2 text-sm text-[hsl(var(--foreground))]"
          style={{ borderColor: ACCENT }}
        >
          <CheckCircle size={16} style={{ color: ACCENT }} />
          {success}
        </div>
      )}

      {/* Refund Type Toggle */}
      <div className="mb-5">
        <Label>Refund Type</Label>
        <div className="flex border border-[hsl(var(--border))]">
          <button
            onClick={() => setRefundType("full")}
            className={`flex-1 py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
              refundType === "full"
                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
            }`}
          >
            Full Refund
          </button>
          <button
            onClick={() => setRefundType("partial")}
            className={`flex-1 py-2 px-4 text-xs font-semibold uppercase tracking-wider border-l border-[hsl(var(--border))] transition-colors ${
              refundType === "partial"
                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
            }`}
          >
            Partial Refund
          </button>
        </div>
      </div>

      {/* Full Refund Info */}
      {refundType === "full" && (
        <div className="mb-5 px-3 py-3 border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
          <p className="text-sm text-[hsl(var(--foreground))]">
            Refund all remaining items:{" "}
            <strong className="font-semibold">
              {formatPrice(refundable.total)}
            </strong>
          </p>
        </div>
      )}

      {/* Partial Refund - Line Selection */}
      {refundType === "partial" && (
        <div className="mb-5">
          <Label>Select Items</Label>
          <div className="space-y-2">
            {order.lines.map((line) => {
              const key = `${line.productId}::${line.variantSku}`;
              const remaining = refundable.byLine[key];
              if (!remaining || remaining.quantity <= 0) return null;

              const isSelected = !!selectedLines[key];
              const selectedQty = selectedLines[key]?.quantity || 0;

              return (
                <div
                  key={key}
                  className={`p-3 border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-[hsl(var(--foreground))] bg-[hsl(var(--muted))]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground))]"
                  }`}
                  onClick={() =>
                    handleLineToggle(
                      line.productId,
                      line.variantSku,
                      remaining.quantity,
                      remaining.amount,
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 accent-[#04BB6E]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {line.title}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {line.variantTitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {formatPrice(remaining.amount)} ({remaining.quantity}{" "}
                        available)
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="mt-3 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="text-xs text-[hsl(var(--muted-foreground))]">
                        Qty:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={remaining.quantity}
                        value={selectedQty}
                        onChange={(e) =>
                          handleLineQuantityChange(
                            line.productId,
                            line.variantSku,
                            parseInt(e.target.value) || 0,
                            line.price,
                          )
                        }
                        className="w-16 px-2 py-1 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))]"
                      />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        = {formatPrice(selectedQty * line.price)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Shipping Refund */}
          {order.shippingTotal > 0 && (
            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingRefund > 0}
                  onChange={(e) =>
                    setShippingRefund(
                      e.target.checked ? order.shippingTotal : 0,
                    )
                  }
                  className="w-4 h-4 accent-[#04BB6E]"
                />
                <span className="text-sm text-[hsl(var(--foreground))]">
                  Include shipping refund ({formatPrice(order.shippingTotal)})
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Reason Code */}
      <div className="mb-5">
        <Label>Reason</Label>
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
        >
          <option value="customer_request">Customer Request</option>
          <option value="damaged">Damaged Item</option>
          <option value="wrong_item">Wrong Item Shipped</option>
          <option value="price_adjustment">Price Adjustment</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Reason Text (for partial refunds) */}
      {refundType === "partial" && (
        <div className="mb-5">
          <Label>Description</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the reason for this refund..."
            rows={2}
            className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] resize-none focus:outline-none focus:border-[hsl(var(--foreground))]"
          />
        </div>
      )}

      {/* Restock Option */}
      <div className="mb-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={restockItems}
            onChange={(e) => setRestockItems(e.target.checked)}
            className="w-4 h-4 accent-[#04BB6E]"
          />
          <span className="text-sm text-[hsl(var(--foreground))]">
            Restock refunded items
          </span>
        </label>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <Label>Internal Notes (optional)</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for your team..."
          rows={2}
          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] resize-none focus:outline-none focus:border-[hsl(var(--foreground))]"
        />
      </div>

      {/* Total */}
      <div className="mb-5 px-3 py-3 border border-[hsl(var(--border))] bg-[hsl(var(--muted))] flex justify-between items-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Refund Amount
        </span>
        <span className="text-lg font-bold text-[hsl(var(--foreground))]">
          {formatPrice(
            refundType === "full" ? refundable.total : totalSelected,
          )}
        </span>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isProcessing || !canSubmit}
        className="w-full py-3 text-white text-sm font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isProcessing || !canSubmit ? "#9C9C9C" : DANGER,
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processing...
          </>
        ) : (
          "Process Refund"
        )}
      </button>
    </Card>
  );
}
