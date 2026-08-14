"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/admin";
import {
  Star,
  CheckCircle,
  X,
  Flag,
  ThumbsUp,
  Loader2,
  MessageSquare,
  ExternalLink,
  Trash2,
  Search,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface ReviewData {
  _id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  userName: string;
  userEmail: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  isVerifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  helpfulCount: number;
  reportCount: number;
  adminResponse: string;
  createdAt: string;
}

interface ReviewsClientProps {
  initialReviews: ReviewData[];
  permission: Permission;
}

/* ------------------------------------------------------------------ */
/* Status metadata                                                    */
/* ------------------------------------------------------------------ */

const STATUS_META = {
  pending: {
    label: "Pending",
    className:
      "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-600 border-red-200",
  },
};

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export function ReviewsClient({
  initialReviews,
  permission,
}: ReviewsClientProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canWrite = permission === "full" || permission === "write";

  /* ---------------------------------------------------------------- */
  /* Sync server state                                                */
  /* ---------------------------------------------------------------- */

  const [prevInitialReviews, setPrevInitialReviews] = useState(initialReviews);

  if (initialReviews !== prevInitialReviews) {
    setPrevInitialReviews(initialReviews);
    setReviews(initialReviews);
  }

  /* ---------------------------------------------------------------- */
  /* Counts                                                            */
  /* ---------------------------------------------------------------- */

  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    flagged: reviews.filter((r) => r.reportCount > 0).length,
  };

  /* ---------------------------------------------------------------- */
  /* Filtering                                                         */
  /* ---------------------------------------------------------------- */

  const filteredReviews = useMemo(() => {
    const query = search.toLowerCase().trim();

    return reviews.filter((review) => {
      const matchesStatus = !statusFilter || review.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      return (
        review.productTitle.toLowerCase().includes(query) ||
        review.userName.toLowerCase().includes(query) ||
        review.userEmail.toLowerCase().includes(query) ||
        review.title.toLowerCase().includes(query) ||
        review.content.toLowerCase().includes(query)
      );
    });
  }, [reviews, statusFilter, search]);

  /* ---------------------------------------------------------------- */
  /* Update status                                                     */
  /* ---------------------------------------------------------------- */

  const updateStatus = async (id: string, status: ReviewData["status"]) => {
    setActionLoading(id);

    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: id,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update review");
      }

      setReviews((prev) =>
        prev.map((review) =>
          review._id === id ? { ...review, status } : review,
        ),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update review");
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Submit admin response                                             */
  /* ---------------------------------------------------------------- */

  const submitResponse = async (id: string) => {
    if (!responseText.trim()) return;

    setActionLoading(id);

    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: id,
          adminResponse: responseText.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save response");
      }

      setReviews((prev) =>
        prev.map((review) =>
          review._id === id
            ? {
                ...review,
                adminResponse: responseText.trim(),
              }
            : review,
        ),
      );

      setRespondingTo(null);
      setResponseText("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save response");
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Delete                                                            */
  /* ---------------------------------------------------------------- */

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;

    setActionLoading(id);

    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete review");
      }

      setReviews((prev) => prev.filter((review) => review._id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete review");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      {/* ------------------------------------------------------------ */}
      {/* Header                                                        */}
      {/* ------------------------------------------------------------ */}

      <PageHeader
        title="Reviews"
        description={`${reviews.length} ${
          reviews.length === 1 ? "review" : "reviews"
        } · ${counts.pending} pending moderation`}
      />

      {/* ------------------------------------------------------------ */}
      {/* Filters                                                       */}
      {/* ------------------------------------------------------------ */}

      <div className="mb-6 space-y-4">
        {/* Search */}

        <div className="relative max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews…"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
          />
        </div>

        {/* Status filters */}

        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            {
              key: "",
              label: "All",
              count: counts.all,
            },
            {
              key: "pending",
              label: "Pending",
              count: counts.pending,
            },
            {
              key: "approved",
              label: "Approved",
              count: counts.approved,
            },
            {
              key: "rejected",
              label: "Rejected",
              count: counts.rejected,
            },
          ].map(({ key, label, count }) => {
            const active = statusFilter === key;

            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border transition-colors whitespace-nowrap ${
                  active
                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]"
                    : "bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {label}

                <span
                  className={
                    active
                      ? "opacity-70"
                      : "text-[hsl(var(--muted-foreground))]"
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}

          {counts.flagged > 0 && (
            <div className="ml-auto shrink-0 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-red-500">
              <Flag size={12} />
              {counts.flagged} flagged
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Reviews                                                       */}
      {/* ------------------------------------------------------------ */}

      {filteredReviews.length === 0 ? (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-16 text-center">
          <MessageSquare
            size={30}
            className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]"
            strokeWidth={1.5}
          />

          <p className="text-sm font-medium">
            {search || statusFilter ? "No reviews found" : "No reviews yet"}
          </p>

          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {search || statusFilter
              ? "Try adjusting your filters or search term."
              : "Customer reviews will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              canWrite={canWrite}
              responding={respondingTo === review._id}
              responseText={responseText}
              actionLoading={actionLoading === review._id}
              onApprove={() => updateStatus(review._id, "approved")}
              onReject={() => updateStatus(review._id, "rejected")}
              onDelete={() => deleteReview(review._id)}
              onRespond={() => {
                setRespondingTo(review._id);
                setResponseText(review.adminResponse || "");
              }}
              onResponseChange={setResponseText}
              onSubmitResponse={() => submitResponse(review._id)}
              onCancelResponse={() => {
                setRespondingTo(null);
                setResponseText("");
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Review Card                                                        */
/* ------------------------------------------------------------------ */

function ReviewCard({
  review,
  canWrite,
  responding,
  responseText,
  actionLoading,
  onApprove,
  onReject,
  onDelete,
  onRespond,
  onResponseChange,
  onSubmitResponse,
  onCancelResponse,
}: {
  review: ReviewData;
  canWrite: boolean;
  responding: boolean;
  responseText: string;
  actionLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onRespond: () => void;
  onResponseChange: (value: string) => void;
  onSubmitResponse: () => void;
  onCancelResponse: () => void;
}) {
  const status = STATUS_META[review.status];

  return (
    <article className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
      {/* ---------------------------------------------------------- */}
      {/* Card Header                                                 */}
      {/* ---------------------------------------------------------- */}

      <div className="p-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            {/* Rating / status */}

            <div className="flex items-center gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((index) => (
                  <Star
                    key={index}
                    size={14}
                    className={
                      index < review.rating
                        ? "text-amber-500 fill-amber-500"
                        : "text-[hsl(var(--border))]"
                    }
                  />
                ))}
              </div>

              <span
                className={`inline-flex items-center px-2 py-1 border text-[10px] uppercase tracking-wider font-medium ${status.className}`}
              >
                {status.label}
              </span>

              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-600">
                  <CheckCircle size={12} />
                  Verified purchase
                </span>
              )}

              {review.reportCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-500">
                  <Flag size={12} />
                  {review.reportCount}{" "}
                  {review.reportCount === 1 ? "report" : "reports"}
                </span>
              )}
            </div>

            {/* Product / customer */}

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <a
                href={`/product/${review.productSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[hsl(var(--foreground))] hover:underline"
              >
                {review.productTitle}
                <ExternalLink size={11} />
              </a>

              <span className="text-[hsl(var(--border))]">/</span>

              <span className="text-[hsl(var(--muted-foreground))]">
                {review.userName}
              </span>

              <span className="text-[hsl(var(--border))]">/</span>

              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* Actions                                                 */}
          {/* ------------------------------------------------------ */}

          {canWrite && (
            <div className="flex items-center gap-1 shrink-0">
              {review.status !== "approved" && (
                <button
                  onClick={onApprove}
                  disabled={actionLoading}
                  className="p-1.5 hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
                  title="Approve"
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                </button>
              )}

              {review.status !== "rejected" && (
                <button
                  onClick={onReject}
                  disabled={actionLoading}
                  className="p-1.5 hover:bg-red-50 text-red-500 disabled:opacity-50"
                  title="Reject"
                >
                  <X size={14} />
                </button>
              )}

              <button
                onClick={onRespond}
                className="p-1.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
                title="Respond"
              >
                <MessageSquare size={14} />
              </button>

              <button
                onClick={onDelete}
                disabled={actionLoading}
                className="p-1.5 hover:bg-red-50 text-red-500 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------- */}
        {/* Review Content                                            */}
        {/* -------------------------------------------------------- */}

        <div className="mt-4">
          {review.title && (
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
              {review.title}
            </h3>
          )}

          <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed max-w-4xl">
            {review.content}
          </p>
        </div>

        {/* -------------------------------------------------------- */}
        {/* Review Images                                             */}
        {/* -------------------------------------------------------- */}

        {review.images.length > 0 && (
          <div className="flex gap-2 mt-4">
            {review.images.slice(0, 5).map((image, index) => (
              <a
                key={`${image}-${index}`}
                href={image}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-16 h-16 border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--muted))]"
              >
                <Image
                  src={image}
                  alt=""
                  width={1000}
                  height={100}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* Stats                                                     */}
        {/* -------------------------------------------------------- */}

        <div className="flex items-center gap-5 mt-4 pt-3 border-t border-[hsl(var(--border))]">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            <ThumbsUp size={12} />
            {review.helpfulCount} helpful
          </span>

          {review.reportCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-red-500">
              <Flag size={12} />
              {review.reportCount} reports
            </span>
          )}

          <span className="ml-auto text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
            {review.userEmail}
          </span>
        </div>

        {/* -------------------------------------------------------- */}
        {/* Existing admin response                                   */}
        {/* -------------------------------------------------------- */}

        {review.adminResponse && !responding && (
          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
            <div className="border-l-2 border-[hsl(var(--primary))] pl-3">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[hsl(var(--primary))] mb-1">
                Admin Response
              </p>

              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">
                {review.adminResponse}
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* Response editor                                           */}
        {/* -------------------------------------------------------- */}

        {responding && (
          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-[hsl(var(--muted-foreground))] mb-2">
              {review.adminResponse ? "Edit Response" : "Write Response"}
            </div>

            <textarea
              value={responseText}
              onChange={(e) => onResponseChange(e.target.value)}
              placeholder="Write a response to this review…"
              rows={3}
              autoFocus
              className="w-full px-3 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
            />

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={onCancelResponse}
                className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-medium bg-white hover:bg-[hsl(var(--muted-foreground))]"
              >
                Cancel
              </button>

              <button
                onClick={onSubmitResponse}
                disabled={!responseText.trim() || actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Save Response
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
