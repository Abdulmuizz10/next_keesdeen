"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ThumbsUp, CheckCircle, Loader2 } from "lucide-react";
import Image from "next/image";

interface ReviewData {
  _id: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  authorName: string;
  authorImage: string | null;
  adminResponse: string | null;
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
  avgRating: number;
  reviewCount: number;
}

export function ProductReviews({ productId, avgRating, reviewCount }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reviews" | "write">("reviews");
  const [canReview, setCanReview] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => { setReviews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId]);

  // Rating breakdown
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }));

  return (
    <section id="reviews" className="mt-16 border-t border-neutral-200 pt-12">
      {/* Tab Headers */}
      <div className="flex gap-8 border-b border-neutral-100 mb-8">
        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 text-base font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "reviews"
              ? "border-primary-400 text-neutral-600"
              : "border-transparent text-neutral-400 hover:text-neutral-500"
          }`}
        >
          Reviews ({reviewCount})
        </button>
        <button
          onClick={() => setActiveTab("write")}
          className={`pb-3 text-base font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "write"
              ? "border-primary-400 text-neutral-600"
              : "border-transparent text-neutral-400 hover:text-neutral-500"
          }`}
        >
          Write a Review
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "reviews" ? (
          <motion.div
            key="reviews"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
            ) : (
              <div className="lg:grid lg:grid-cols-3 lg:gap-12">
                {/* Rating Summary */}
                <div className="mb-8 lg:mb-0">
                  <div className="text-center lg:text-left">
                    <p className="text-5xl font-bold text-neutral-600">{avgRating.toFixed(1)}</p>
                    <div className="flex justify-center lg:justify-start gap-0.5 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} className={i < Math.round(avgRating) ? "text-secondary-400 fill-secondary-400" : "text-neutral-200"} />
                      ))}
                    </div>
                    <p className="text-sm text-neutral-400 mt-1">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="mt-6 space-y-2">
                    {ratingCounts.map(({ rating, count }) => (
                      <div key={rating} className="flex items-center gap-2 text-sm">
                        <span className="w-3 text-neutral-500">{rating}</span>
                        <Star size={12} className="text-secondary-400 fill-secondary-400" />
                        <div className="flex-1 h-2 bg-neutral-100  overflow-hidden">
                          <div
                            className="h-full bg-secondary-400 "
                            style={{ width: reviewCount > 0 ? `${(count / reviewCount) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="w-6 text-right text-neutral-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review List */}
                <div className="lg:col-span-2 space-y-6">
                  {reviews.length === 0 ? (
                    <p className="text-neutral-400 text-center py-8">No reviews yet. Be the first to share your experience!</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review._id} className="border-b border-neutral-100 pb-6 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={14} className={i < review.rating ? "text-secondary-400 fill-secondary-400" : "text-neutral-200"} />
                                ))}
                              </div>
                              {review.isVerifiedPurchase && (
                                <span className="inline-flex items-center gap-1 text-xs text-primary-500">
                                  <CheckCircle size={12} /> Verified Purchase
                                </span>
                              )}
                            </div>
                            {review.title && <h4 className="font-medium text-neutral-600 mt-1">{review.title}</h4>}
                          </div>
                          <span className="text-xs text-neutral-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-neutral-500 text-sm leading-relaxed">{review.content}</p>
                        {review.images.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {review.images.map((img, i) => (
                              <div key={i} className="w-16 h-16  overflow-hidden bg-neutral-100 relative">
                                <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-neutral-400">By {review.authorName}</p>
                          <button className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600">
                            <ThumbsUp size={12} /> Helpful ({review.helpfulCount})
                          </button>
                        </div>
                        {review.adminResponse && (
                          <div className="mt-3 ml-4 pl-4 border-l-2 border-primary-200 bg-primary-50 rounded-r-lg p-3">
                            <p className="text-xs font-semibold text-primary-600 mb-1">Keesdeen Team</p>
                            <p className="text-sm text-neutral-600">{review.adminResponse}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="write" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WriteReviewForm productId={productId} session={session} canReview={canReview} setCanReview={setCanReview} onSubmitted={(r) => { setReviews((prev) => [r, ...prev]); setActiveTab("reviews"); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---- Write Review Form ---- */

function WriteReviewForm({
  productId,
  session,
  canReview,
  setCanReview,
  onSubmitted,
}: {
  productId: string;
  session: ReturnType<typeof useSession>["data"];
  canReview: boolean | null;
  setCanReview: (v: boolean) => void;
  onSubmitted: (r: ReviewData) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user can review (has purchased)
  useEffect(() => {
    if (!session?.user) { setCanReview(false); return; }
    // Try a preflight by checking for order existence
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((reviews) => {
        const hasReviewed = reviews.some((r: ReviewData) => r.authorName === session.user?.name);
        if (hasReviewed) { setCanReview(false); return; }
        // We'll let the POST validate purchase — optimistically show the form
        setCanReview(true);
      })
      .catch(() => setCanReview(true));
  }, [session, productId, setCanReview]);

  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500 mb-4">Sign in to write a review</p>
        <a href="/auth/login" className="inline-block px-6 py-2.5 bg-primary-400 text-white font-semibold  hover:bg-primary-500">
          Sign In
        </a>
      </div>
    );
  }

  if (canReview === false) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <p className="text-neutral-500 mb-2">Only verified purchasers can write reviews.</p>
        <p className="text-sm text-neutral-400">Purchase this product and your review option will appear here after your order is confirmed.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a rating"); return; }
    if (content.length < 10) { setError("Review must be at least 10 characters"); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, content }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      onSubmitted({
        _id: data._id,
        rating,
        title,
        content,
        images: [],
        isVerifiedPurchase: true,
        helpfulCount: 0,
        authorName: session.user?.name || "You",
        authorImage: null,
        adminResponse: null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200  text-sm text-red-600">{error}</div>}

      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-2">Rating *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1"
            >
              <Star
                size={28}
                className={`transition-colors ${
                  star <= (hoverRating || rating)
                    ? "text-secondary-400 fill-secondary-400"
                    : "text-neutral-200"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Title (optional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Sum up your experience"
          className="w-full px-4 py-3 border border-neutral-200  text-sm focus:outline-none focus:border-primary-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Review *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          minLength={10}
          maxLength={2000}
          placeholder="Share your thoughts about this product…"
          className="w-full px-4 py-3 border border-neutral-200  text-sm resize-none focus:outline-none focus:border-primary-400"
        />
        <p className="text-xs text-neutral-400 mt-1">{content.length}/2000</p>
      </div>

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full py-3 bg-primary-400 text-white font-semibold  hover:bg-primary-500 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Submit Review"}
      </button>
    </form>
  );
}
