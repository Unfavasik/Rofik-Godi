import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { BadgeCheck, ChevronDown, ChevronRight, Star } from 'lucide-react';
import {
  filterAndSortReviews,
  getMyReviewContext,
  getProductRatingSummary,
  isVerifiedProductReview,
  listPublishedReviews,
  REVIEW_FILTER_OPTIONS,
  REVIEW_RATING_FILTER_OPTIONS,
  type ProductRatingSummary,
  type ProductReviewRecord,
  type ReviewEligibleOrder,
  type ReviewFilterMode,
  type ReviewRatingFilter,
} from '../lib/supabaseReviews';
import { getPathForCustomerOrder } from '../lib/appRoutes';
import { ReviewComposer } from './ReviewComposer';
import { ProductReviewsSkeleton } from './AccountPageSkeleton';
import { readSwrCache, writeSwrCache } from '../lib/swrCache';

interface ProductReviewsProps {
  productId: string;
  productTitle: string;
  isAuthenticated: boolean;
  customerId?: string;
  onRequestLogin: () => void;
  onOpenOrderHistory?: (orderNumber?: string) => void;
  initialReviews?: ProductReviewRecord[];
  initialOrders?: ReviewEligibleOrder[];
  initialSummary?: ProductRatingSummary | null;
  initialFilter?: ReviewFilterMode;
  initialRatingFilter?: ReviewRatingFilter;
}

const summaryCounts = (summary: ProductRatingSummary) => [
  summary.five_star_count,
  summary.four_star_count,
  summary.three_star_count,
  summary.two_star_count,
  summary.one_star_count,
];

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  productTitle,
  isAuthenticated,
  customerId,
  onRequestLogin,
  onOpenOrderHistory,
  initialReviews,
  initialOrders,
  initialSummary = null,
  initialFilter = 'most-recent',
  initialRatingFilter = 'all',
}) => {
  const ratingSelectId = useId();
  const hasInitialData = initialReviews !== undefined || initialOrders !== undefined;
  const publicCacheKey = `public:product-reviews:${productId}`;
  const userCacheKey = isAuthenticated && customerId ? `user:${customerId}:review-ctx:${productId}` : '';
  const initialCachedPublic = !hasInitialData
    ? readSwrCache<{ summary: ProductRatingSummary | null; reviews: ProductReviewRecord[] }>(publicCacheKey)
    : undefined;
  const initialCachedUser = !hasInitialData && userCacheKey
    ? readSwrCache<{ orders: ReviewEligibleOrder[]; reviews: ProductReviewRecord[] }>(userCacheKey)
    : undefined;
  const [summary, setSummary] = useState<ProductRatingSummary | null>(() => initialSummary ?? initialCachedPublic?.summary ?? null);
  const [reviews, setReviews] = useState<ProductReviewRecord[]>(() => initialReviews ?? initialCachedPublic?.reviews ?? []);
  const [orders, setOrders] = useState<ReviewEligibleOrder[]>(() => initialOrders ?? initialCachedUser?.orders ?? []);
  const [myReviews, setMyReviews] = useState<ProductReviewRecord[]>(() => initialCachedUser?.reviews ?? []);
  const [loading, setLoading] = useState(() => !hasInitialData && !initialCachedPublic);
  const [composer, setComposer] = useState<{ order: ReviewEligibleOrder; review?: ProductReviewRecord } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ReviewFilterMode>(initialFilter);
  const [ratingFilter, setRatingFilter] = useState<ReviewRatingFilter>(initialRatingFilter);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [nextSummary, nextReviews, context] = await Promise.all([
      getProductRatingSummary(productId),
      listPublishedReviews(productId, showAll ? 100 : 25),
      isAuthenticated ? getMyReviewContext(productId, customerId) : Promise.resolve({ orders: [], reviews: [] }),
    ]);
    setSummary(nextSummary);
    setReviews(nextReviews);
    setOrders(context.orders);
    setMyReviews(context.reviews);
    writeSwrCache(publicCacheKey, { summary: nextSummary, reviews: nextReviews });
    if (userCacheKey) {
      writeSwrCache(userCacheKey, context);
    }
    setLoading(false);
  }, [productId, isAuthenticated, customerId, showAll, publicCacheKey, userCacheKey]);

  useEffect(() => {
    if (hasInitialData) return;
    const cachedPublic = readSwrCache<{ summary: ProductRatingSummary | null; reviews: ProductReviewRecord[] }>(publicCacheKey);
    const cachedUser = userCacheKey
      ? readSwrCache<{ orders: ReviewEligibleOrder[]; reviews: ProductReviewRecord[] }>(userCacheKey)
      : undefined;
    if (cachedPublic) {
      setSummary(cachedPublic.summary);
      setReviews(cachedPublic.reviews);
      setLoading(false);
    }
    if (cachedUser) {
      setOrders(cachedUser.orders);
      setMyReviews(cachedUser.reviews);
    }
    void refresh(Boolean(cachedPublic));
  }, [hasInitialData, publicCacheKey, refresh, userCacheKey]);

  const counts = summary ? summaryCounts(summary) : [0, 0, 0, 0, 0];
  const countByOrder = new Map(myReviews.map((review) => [review.order_id, review]));
  const verifiedOwnOrderIds = useMemo(
    () =>
      new Set(
        orders
          .filter((order) => order.order_items?.some((item) => item.product_id === productId))
          .map((order) => order.id),
      ),
    [orders, productId],
  );

  const filteredReviews = useMemo(
    () => filterAndSortReviews(reviews, activeFilter, productId, verifiedOwnOrderIds, ratingFilter),
    [reviews, activeFilter, productId, verifiedOwnOrderIds, ratingFilter],
  );

  const navigateToOrderHistory = (
    event: React.MouseEvent<HTMLAnchorElement>,
    orderNumber?: string,
  ) => {
    if (onOpenOrderHistory) {
      event.preventDefault();
      onOpenOrderHistory(orderNumber);
    }
  };

  return (
    <section className="border-t border-slate-100 px-5 py-5" aria-labelledby="product-reviews-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="product-reviews-title" className="text-[17px] font-extrabold tracking-tight">
            Customer Reviews
          </h2>
          <p className="text-[11px] text-slate-500">Feedback from completed purchases</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-slate-700">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {summary?.average_rating.toFixed(1) || '0.0'} / 5
        </span>
      </div>

      <div className="grid grid-cols-[90px_1fr] gap-3 rounded-2xl bg-slate-50 p-4">
        <div className="text-center">
          <div className="text-[34px] font-black leading-none">{summary?.average_rating.toFixed(1) || '0.0'}</div>
          <div className="mt-1 flex justify-center">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={`h-3.5 w-3.5 ${value <= Math.round(summary?.average_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
              />
            ))}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">{summary?.review_count || 0} reviews</div>
        </div>
        <div className="space-y-1">
          {([5, 4, 3, 2, 1] as const).map((value, index) => {
            const count = counts[index] || 0;
            const percent = summary?.review_count ? Math.round((count * 100) / summary.review_count) : 0;
            const isActiveStar = ratingFilter === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActiveStar}
                onClick={() => setRatingFilter((current) => (current === value ? 'all' : value))}
                className={`flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                  isActiveStar
                    ? 'bg-rose-50 font-bold text-[#D9232D]'
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                }`}
              >
                <span className="w-7 text-left">{value} ★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className={`block h-full rounded-full ${isActiveStar ? 'bg-[#D9232D]' : 'bg-amber-400'}`}
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-7 text-right tabular-nums">{percent}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Review Filter & Sort Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
              className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
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
              className={`min-h-9 appearance-none rounded-xl border pl-7 pr-7 text-base sm:text-[11px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
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

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <ProductReviewsSkeleton count={3} />
        ) : filteredReviews.length ? (
          filteredReviews.map((review) => {
            const isVerifiedCustomer = isVerifiedProductReview(
              review,
              productId,
              verifiedOwnOrderIds,
            );
            const matchingOwnOrder =
              isAuthenticated &&
              (!customerId || !review.customer_id || review.customer_id === customerId)
                ? orders.find((order) => order.id === review.order_id)
                : undefined;
            const orderHistoryHref = matchingOwnOrder
              ? getPathForCustomerOrder(matchingOwnOrder.order_number.toLowerCase())
              : '/my-orders';

            return (
              <article
                key={review.id}
                className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_2px_10px_rgba(15,23,42,.025)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[12px] text-slate-900">{review.author_name || 'Customer'}</b>
                      {isVerifiedCustomer && (
                        <a
                          href={orderHistoryHref}
                          onClick={(event) =>
                            navigateToOrderHistory(event, matchingOwnOrder?.order_number)
                          }
                          aria-label={
                            matchingOwnOrder
                              ? `Verified Customer — View order #${matchingOwnOrder.order_number} in your order history`
                              : 'Verified Customer — View your order history'
                          }
                          title={
                            matchingOwnOrder
                              ? `View Order #${matchingOwnOrder.order_number} in order history`
                              : 'View your order history'
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <BadgeCheck className="h-3 w-3 shrink-0" />
                          <span>Verified Customer</span>
                          <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-75" />
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {new Date(review.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`h-3.5 w-3.5 ${value <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.review_text && (
                  <p className="mt-2.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                    {review.review_text}
                  </p>
                )}
              </article>
            );
          })
        ) : reviews.length > 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center">
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
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-500">
            No published reviews yet. Be the first verified customer to share your experience.
          </p>
        )}
        {!loading && summary && summary.review_count > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="w-full rounded-lg py-2 text-xs font-bold text-[#d9232d]"
          >
            {showAll ? 'Show latest reviews' : 'See all reviews'}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {!isAuthenticated ? (
          <button
            type="button"
            onClick={onRequestLogin}
            className="w-full rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-[#d9232d]"
          >
            Sign in to check review eligibility
          </button>
        ) : orders.length ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-700">Your completed purchases</p>
            {orders.slice(0, 3).map((order) => {
              const review = countByOrder.get(order.id);
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <a
                      href={getPathForCustomerOrder(order.order_number.toLowerCase())}
                      onClick={(event) => navigateToOrderHistory(event, order.order_number)}
                      className="text-[11px] font-bold text-slate-800 hover:text-[#d9232d] hover:underline"
                    >
                      Order #{order.order_number}
                    </a>
                    <p className="text-[10px] text-emerald-700">Verified purchase eligible</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComposer({ order, review })}
                    className="shrink-0 rounded-lg bg-[#d9232d] px-3 py-2 text-[10px] font-bold text-white"
                  >
                    {review ? 'Edit review' : 'Rate & Review'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-center text-[11px] text-slate-500">
            Purchase and complete this product’s order to share a review.
          </p>
        )}
      </div>

      {composer && (
        <ReviewComposer
          productId={productId}
          orderId={composer.order.id}
          orderNumber={composer.order.order_number}
          productTitle={productTitle}
          review={composer.review}
          onClose={() => setComposer(null)}
          onSaved={() => {
            setComposer(null);
            void refresh(true);
          }}
        />
      )}
    </section>
  );
};
