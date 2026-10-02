"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Package,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: number; // epoch ms, used for sorting
  dateLabel: string; // pre-formatted on the server (no hydration drift)
  grandTotal: number;
  totalRefunded: number;
  netPaid: number;
  itemCount: number;
  hasTracking: boolean;
  previews: { name: string; image: string | null }[];
};

type SortKey = "newest" | "oldest" | "total-high" | "total-low" | "status";
type FilterKey = "all" | "active" | "delivered" | "cancelled" | "refunded";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-high", label: "Total: high to low" },
  { value: "total-low", label: "Total: low to high" },
  { value: "status", label: "In progress first" },
];

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "In progress" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const STATUS_META: Record<string, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-amber-400" },
  confirmed: { label: "Confirmed", dot: "bg-blue-500" },
  processing: { label: "Processing", dot: "bg-indigo-500" },
  shipped: { label: "Shipped", dot: "bg-sky-500" },
  delivered: { label: "Delivered", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", dot: "bg-red-500" },
  refunded: { label: "Refunded", dot: "bg-orange-500" },
};

const ACTIVE_STATUSES = ["pending", "confirmed", "processing", "shipped"];

const STEPS = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_RANK: Record<string, number> = {
  shipped: 0,
  processing: 1,
  confirmed: 2,
  pending: 3,
  delivered: 4,
  refunded: 5,
  cancelled: 6,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isRefunded = (o: OrderSummary) =>
  o.status === "refunded" ||
  o.paymentStatus === "refunded" ||
  o.paymentStatus === "partially_refunded" ||
  o.totalRefunded > 0;

function matchesFilter(o: OrderSummary, f: FilterKey) {
  switch (f) {
    case "active":
      return ACTIVE_STATUSES.includes(o.status);
    case "delivered":
      return o.status === "delivered";
    case "cancelled":
      return o.status === "cancelled";
    case "refunded":
      return isRefunded(o);
    default:
      return true;
  }
}

function sortOrders(list: OrderSummary[], sort: SortKey) {
  const arr = [...list];
  switch (sort) {
    case "oldest":
      return arr.sort((a, b) => a.createdAt - b.createdAt);
    case "total-high":
      return arr.sort((a, b) => b.netPaid - a.netPaid);
    case "total-low":
      return arr.sort((a, b) => a.netPaid - b.netPaid);
    case "status":
      return arr.sort(
        (a, b) =>
          (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
          b.createdAt - a.createdAt,
      );
    default:
      return arr.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/* ------------------------------------------------------------------ */
/* Sort menu                                                           */
/* ------------------------------------------------------------------ */

function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = SORTS.find((s) => s.value === value) ?? SORTS[0];

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-3 border border-neutral-300 bg-white px-4 text-sm text-neutral-900 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:w-auto"
      >
        <span>
          <span className="text-neutral-500">Sort by </span>
          <span className="font-medium">{current.label}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort orders"
          className="absolute right-0 z-20 mt-1 w-full min-w-60 border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {SORTS.map((s) => {
            const selected = s.value === value;
            return (
              <li key={s.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(s.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${
                    selected
                      ? "font-medium text-neutral-900"
                      : "text-neutral-600"
                  }`}
                >
                  {s.label}
                  {selected && <Check size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order card                                                          */
/* ------------------------------------------------------------------ */

function OrderCard({ order }: { order: OrderSummary }) {
  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    dot: "bg-neutral-400",
  };
  const hasRefund = order.totalRefunded > 0;
  const extra = order.itemCount - order.previews.length;
  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const partial = order.paymentStatus === "partially_refunded";

  return (
    <article className="group relative border border-neutral-100 bg-white transition-colors hover:border-primary-100">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-8 sm:p-6">
        {/* Product thumbnails */}
        <div className="flex shrink-0 gap-2">
          {order.previews.map((p, i) => (
            <div
              key={i}
              className="relative aspect-3/4 w-16 overflow-hidden bg-neutral-100 sm:w-20"
            >
              {p.image ? (
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Package size={18} className="text-neutral-300" />
                </div>
              )}
            </div>
          ))}
          {extra > 0 && (
            <div className="grid aspect-3/4 w-16 place-items-center bg-neutral-50 text-sm text-neutral-500 sm:w-20">
              +{extra}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/account/orders/${order.id}`}
                className="block truncate font-serif text-lg text-neutral-900 after:absolute after:inset-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                Order {order.orderNumber}
              </Link>
              <p className="mt-0.5 text-sm text-neutral-500">
                Placed {order.dateLabel}, {order.itemCount}{" "}
                {order.itemCount === 1 ? "item" : "items"}
              </p>
            </div>

            <div className="shrink-0 text-right">
              {hasRefund && (
                <p className="text-xs text-neutral-400 line-through">
                  {formatPrice(order.grandTotal)}
                </p>
              )}
              <p className="font-serif text-lg text-neutral-900">
                {formatPrice(hasRefund ? order.netPaid : order.grandTotal)}
              </p>
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 text-sm text-neutral-900">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </p>

            {stepIndex >= 0 ? (
              <div className="mt-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <span
                      key={s.key}
                      className={`h-[3px] flex-1 ${
                        i <= stepIndex
                          ? order.status === "delivered"
                            ? "bg-emerald-500"
                            : "bg-neutral-900"
                          : "bg-neutral-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-2 hidden grid-cols-5 gap-1.5 text-xs sm:grid">
                  {STEPS.map((s, i) => (
                    <span
                      key={s.key}
                      className={
                        i === stepIndex
                          ? "font-medium text-neutral-900"
                          : "text-neutral-400"
                      }
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">
                {order.status === "cancelled"
                  ? "This order was cancelled."
                  : "This order was refunded."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 border-t border-neutral-100 px-5 py-3 text-sm sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-neutral-500">
          {hasRefund && (
            <span className="flex items-center gap-1.5 text-orange-700">
              <RotateCcw size={13} />
              {formatPrice(order.totalRefunded)}{" "}
              {partial ? "partially refunded" : "refunded"}
            </span>
          )}
          {order.hasTracking && (
            <span className="flex items-center gap-1.5">
              <Truck size={13} />
              Tracking available
            </span>
          )}
          {!hasRefund && !order.hasTracking && (
            <span className="text-neutral-400">
              {order.status === "delivered" ? "Order complete" : " "}
            </span>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1 font-medium text-neutral-900">
          View order
          <ChevronRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Page view                                                           */
/* ------------------------------------------------------------------ */

export default function OrdersView({ orders }: { orders: OrderSummary[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = {} as Record<FilterKey, number>;
    for (const f of FILTERS) {
      c[f.value] = orders.filter((o) => matchesFilter(o, f.value)).length;
    }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = orders.filter(
      (o) =>
        matchesFilter(o, filter) &&
        (q === "" || o.orderNumber.toLowerCase().includes(q)),
    );
    return sortOrders(filtered, sort);
  }, [orders, filter, sort, query]);

  const filtersActive = filter !== "all" || query.trim() !== "";
  const clearFilters = () => {
    setFilter("all");
    setQuery("");
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[1400px] px-4 py-14 mt-20 sm:mt-10">
          {/* Header */}
          <header className="mb-10">
            <h1 className="font-serif text-4xl text-neutral-900">My orders</h1>
            {orders.length > 0 && (
              <p className="mt-2 text-neutral-500">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
                {counts.active > 0 && `, ${counts.active} in progress`}
              </p>
            )}
          </header>

          {orders.length === 0 ? (
            <div className="border border-neutral-200 bg-white px-6 py-24 text-center">
              <ShoppingBag
                size={40}
                strokeWidth={1.25}
                className="mx-auto mb-5 text-neutral-300"
              />
              <h2 className="font-serif text-2xl text-neutral-900">
                No orders yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-neutral-500">
                Once you place an order, you can track it and manage returns
                from here.
              </p>
              <Link
                href="/category/bags"
                className="mt-8 inline-block bg-neutral-900 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-400"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="mb-6 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="relative block sm:w-72">
                    <span className="sr-only">Search by order number</span>
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by order number"
                      className="h-11 w-full border border-neutral-300 bg-white pl-11 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-900"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>

                  <SortMenu value={sort} onChange={setSort} />
                </div>

                {/* Filter tabs */}
                <div
                  role="group"
                  aria-label="Filter orders"
                  className="-mx-4 flex gap-4 sm:gap-7 overflow-x-auto border-b border-neutral-200 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {FILTERS.map((f) => {
                    const selected = filter === f.value;
                    const disabled = f.value !== "all" && counts[f.value] === 0;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => setFilter(f.value)}
                        className={`-mb-px shrink-0 border-b-2 pb-3 text-xs sm:text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected
                            ? "border-neutral-900 font-medium text-neutral-900"
                            : "border-transparent text-neutral-500 hover:text-neutral-900"
                        }`}
                      >
                        {f.label}
                        <span className="ml-1.5 text-neutral-400">
                          {counts[f.value]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="mb-4 text-sm text-neutral-500" aria-live="polite">
                Showing {visible.length} of {orders.length}{" "}
                {orders.length === 1 ? "order" : "orders"}
              </p>

              {/* List */}
              {visible.length === 0 ? (
                <div className="border border-neutral-200 bg-white px-6 py-16 text-center">
                  <h2 className="font-serif text-xl text-neutral-900">
                    No orders match
                  </h2>
                  <p className="mt-2 text-neutral-500">
                    Try a different order number or filter.
                  </p>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-6 border border-neutral-900 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <ul className="space-y-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visible.map((order) => (
                      <motion.li
                        key={order.id}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <OrderCard order={order} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </>
          )}
        </div>
      </main>
    </MotionConfig>
  );
}
