import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ChevronRight, Star } from 'lucide-react';
import {
  filterAndSortReviews,
  isVerifiedProductReview,
  listPublishedReviews,
  REVIEW_FILTER_OPTIONS,
  type ProductReviewRecord,
  type ReviewFilterMode,
} from '../lib/supabaseReviews';

interface CustomerReviewsProps {
  onOpenOrderHistory?: () => void;
  initialReviews?: ProductReviewRecord[];
  initialFilter?: ReviewFilterMode;
}

export const CustomerReviews: React.FC<CustomerReviewsProps> = ({
  onOpenOrderHistory,
  initialReviews,
  initialFilter = 'most-recent',
}) => {
  const [reviews, setReviews] = useState<ProductReviewRecord[]>(initialReviews ?? []);
  const [activeFilter, setActiveFilter] = useState<ReviewFilterMode>(initialFilter);

  useEffect(() => {
    if (initialReviews !== undefined) return;
    void listPublishedReviews(undefined, 12).then(setReviews);
  }, [initialReviews]);

  const displayedReviews = useMemo(
    () => filterAndSortReviews(reviews, activeFilter).slice(0, 6),
    [reviews, activeFilter],
  );

  if (!reviews.length) return null;

  return (
    <section className="mb-8 px-5" data-purpose="customer-reviews-section">
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[17px] font-black tracking-tight text-gray-900">Recent Rider Reviews</h3>
          <p className="text-[11.5px] font-medium text-gray-400">Reviews shared by our customers</p>
        </div>

        {/* Review Filter & Sort Controls */}
        <div
          role="group"
          aria-label="Filter and sort customer reviews"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
        >
          {REVIEW_FILTER_OPTIONS.map((option) => {
            const isSelected = activeFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveFilter(option.id)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-[11px] font-bold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                  isSelected
                    ? 'border-rose-200 bg-rose-50 text-[#D9232D] shadow-2xs'
                    : 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {option.id === 'verified-only' && <BadgeCheck className="h-3.5 w-3.5 shrink-0" />}
                {option.id === 'highest-rating' && (
                  <Star className="h-3 w-3 shrink-0 fill-current" />
                )}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {displayedReviews.length ? (
        <div className="space-y-3">
          {displayedReviews.map((review) => {
            const isVerified = isVerifiedProductReview(review, review.product_id);
            return (
              <article
                key={review.id}
                className="space-y-2 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12.5px] font-bold text-gray-900">
                        {review.author_name || 'Customer'}
                      </span>
                      {isVerified && (
                        <a
                          href="/my-orders"
                          onClick={(event) => {
                            if (onOpenOrderHistory) {
                              event.preventDefault();
                              onOpenOrderHistory();
                            }
                          }}
                          aria-label="Verified Customer — View your order history"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                        >
                          <BadgeCheck className="h-2.5 w-2.5 shrink-0" />
                          <span>Verified Customer</span>
                          <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-75" />
                        </a>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {review.product_name || 'Rofik Godi Centre product'}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`h-3 w-3 ${value <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.review_text && (
                  <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-gray-700">
                    “{review.review_text}”
                  </p>
                )}
                <div className="border-t border-gray-50 pt-1 text-[10px] text-gray-400">
                  {new Date(review.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
          No reviews match the selected filter yet.
        </p>
      )}
    </section>
  );
};
