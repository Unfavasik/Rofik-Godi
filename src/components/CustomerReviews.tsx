import React, { useEffect, useId, useMemo, useState } from 'react';
import { BadgeCheck, ChevronDown, ChevronRight, Star } from 'lucide-react';
import {
  filterAndSortReviews,
  isVerifiedProductReview,
  listPublishedReviews,
  REVIEW_FILTER_OPTIONS,
  REVIEW_RATING_FILTER_OPTIONS,
  type ProductReviewRecord,
  type ReviewFilterMode,
  type ReviewRatingFilter,
} from '../lib/supabaseReviews';
import { subscribePullToRefresh } from '../lib/pullToRefresh';

interface CustomerReviewsProps {
  onOpenOrderHistory?: () => void;
  initialReviews?: ProductReviewRecord[];
  initialFilter?: ReviewFilterMode;
  initialRatingFilter?: ReviewRatingFilter;
}

export const CustomerReviews: React.FC<CustomerReviewsProps> = ({
  onOpenOrderHistory,
  initialReviews,
  initialFilter = 'most-recent',
  initialRatingFilter = 'all',
}) => {
  const ratingSelectId = useId();
  const [reviews, setReviews] = useState<ProductReviewRecord[]>(initialReviews ?? []);
  const [activeFilter, setActiveFilter] = useState<ReviewFilterMode>(initialFilter);
  const [ratingFilter, setRatingFilter] = useState<ReviewRatingFilter>(initialRatingFilter);

  useEffect(() => {
    if (initialReviews !== undefined) return;
    let active = true;
    const refreshReviews = () =>
      listPublishedReviews(undefined, 24).then((rows) => {
        if (active) setReviews(rows);
      });
    void refreshReviews();
    const unsubscribePtr = subscribePullToRefresh(refreshReviews);
    return () => {
      active = false;
      unsubscribePtr();
    };
  }, [initialReviews]);

  const displayedReviews = useMemo(
    () => filterAndSortReviews(reviews, activeFilter, undefined, undefined, ratingFilter).slice(0, 6),
    [reviews, activeFilter, ratingFilter],
  );

  if (!reviews.length) return null;

  return (
    <section className="mb-5 px-3.5 sm:px-5" data-purpose="customer-reviews-section">
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[15px] sm:text-base font-black tracking-tight text-gray-900">Recent Rider Reviews</h3>
          <p className="text-[11px] font-medium text-gray-400">Reviews shared by our customers</p>
        </div>

        {/* Review Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter and sort customer reviews"
            className="flex min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
          >
            {REVIEW_FILTER_OPTIONS.map((option) => {
              const isSelected = activeFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActiveFilter(option.id)}
                  className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[11px] font-bold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
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

          <div className="flex shrink-0 items-center gap-1.5">
            <label
              htmlFor={ratingSelectId}
              className="text-[11px] font-bold text-slate-500 whitespace-nowrap"
            >
              Filter by Rating
            </label>
            <div className="relative">
              <Star
                aria-hidden="true"
                className={`pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 ${
                  ratingFilter === 'all'
                    ? 'text-slate-400'
                    : 'fill-amber-400 text-amber-400'
                }`}
              />
              <select
                id={ratingSelectId}
                aria-label="Filter by Rating"
                value={String(ratingFilter)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setRatingFilter(raw === 'all' ? 'all' : (Number(raw) as ReviewRatingFilter));
                }}
                className={`min-h-8 appearance-none rounded-xl border pl-6.5 pr-6.5 text-base sm:text-[11px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                  ratingFilter === 'all'
                    ? 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    : 'border-rose-200 bg-rose-50 text-[#D9232D] shadow-2xs'
                }`}
              >
                {REVIEW_RATING_FILTER_OPTIONS.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {displayedReviews.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {displayedReviews.map((review) => {
            const isVerified = isVerifiedProductReview(review, review.product_id);
            return (
              <article
                key={review.id}
                className="flex flex-col justify-between space-y-1.5 rounded-xl border border-gray-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-bold text-gray-900">
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
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
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
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-700">
                    “{review.review_text}”
                  </p>
                )}
                <div className="border-t border-gray-50 pt-1 text-[9.5px] text-gray-400">
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
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
          <p className="text-xs text-slate-500">
            {ratingFilter === 'all'
              ? 'No reviews match the selected filter yet.'
              : `No ${ratingFilter}-star reviews match the selected filter yet.`}
          </p>
          {ratingFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setRatingFilter('all')}
              className="mt-2 inline-flex min-h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-[#D9232D] transition hover:bg-rose-100"
            >
              Show all ratings
            </button>
          )}
        </div>
      )}
    </section>
  );
};
