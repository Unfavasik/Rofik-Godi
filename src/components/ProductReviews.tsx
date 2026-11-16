import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ChevronRight, Star } from 'lucide-react';
import {
  filterAndSortReviews,
  getMyReviewContext,
  getProductRatingSummary,
  isVerifiedProductReview,
  listPublishedReviews,
  REVIEW_FILTER_OPTIONS,
  type ProductRatingSummary,
  type ProductReviewRecord,
  type ReviewEligibleOrder,
  type ReviewFilterMode,
} from '../lib/supabaseReviews';
import { getPathForCustomerOrder } from '../lib/appRoutes';
import { ReviewComposer } from './ReviewComposer';

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
}) => {
  const hasInitialData = initialReviews !== undefined || initialOrders !== undefined;
  const [summary, setSummary] = useState<ProductRatingSummary | null>(initialSummary);
  const [reviews, setReviews] = useState<ProductReviewRecord[]>(initialReviews ?? []);
  const [orders, setOrders] = useState<ReviewEligibleOrder[]>(initialOrders ?? []);
  const [myReviews, setMyReviews] = useState<ProductReviewRecord[]>([]);
  const [loading, setLoading] = useState(!hasInitialData);
  const [composer, setComposer] = useState<{ order: ReviewEligibleOrder; review?: ProductReviewRecord } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ReviewFilterMode>(initialFilter);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextSummary, nextReviews, context] = await Promise.all([
      getProductRatingSummary(productId),
      listPublishedReviews(productId, showAll ? 100 : 25),
      isAuthenticated ? getMyReviewContext(productId, customerId) : Promise.resolve({ orders: [], reviews: [] }),
    ]);
    setSummary(nextSummary);
    setReviews(nextReviews);
    setOrders(context.orders);
    setMyReviews(context.reviews);
    setLoading(false);
  }, [productId, isAuthenticated, customerId, showAll]);

  useEffect(() => {
    if (!hasInitialData) {
      void refresh();
    }
  }, [hasInitialData, refresh]);

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
    () => filterAndSortReviews(reviews, activeFilter, productId, verifiedOwnOrderIds),
    [reviews, activeFilter, productId, verifiedOwnOrderIds],
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
    <section className="border-t border-[#F4EAE0] px-5 py-5" aria-labelledby="product-reviews-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="product-reviews-title" className="text-[17px] font-extrabold tracking-tight text-[#2B1611]">
            Customer Reviews
          </h2>
          <p className="text-[11px] text-[#6B4C44]">Feedback from completed purchases</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#E6CE73] bg-[#FFF8D6] px-2.5 py-1 text-[11px] font-bold text-[#6B352A]">
          <Star className="h-3.5 w-3.5 fill-[#FF6115] text-[#FF6115]" />
          {summary?.average_rating.toFixed(1) || '0.0'} / 5
        </span>
      </div>

      <div className="grid grid-cols-[90px_1fr] gap-3 rounded-2xl border border-[#E8D8C4] bg-[#FFFCF4] p-4">
        <div className="text-center">
          <div className="text-[34px] font-black leading-none text-[#2B1611]">{summary?.average_rating.toFixed(1) || '0.0'}</div>
          <div className="mt-1 flex justify-center">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={`h-3.5 w-3.5 ${value <= Math.round(summary?.average_rating || 0) ? 'fill-[#FF6115] text-[#FF6115]' : 'text-[#E8D8C4]'}`}
              />
            ))}
          </div>
          <div className="mt-1 text-[10px] text-[#8A6C63]">{summary?.review_count || 0} reviews</div>
        </div>
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((value, index) => {
            const count = counts[index] || 0;
            const percent = summary?.review_count ? Math.round((count * 100) / summary.review_count) : 0;
            return (
              <div key={value} className="flex items-center gap-1.5 text-[10px] text-[#6B4C44]">
                <span className="w-7">{value} ★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F4EAE0]">
                  <span className="block h-full rounded-full bg-[#FF6115]" style={{ width: `${percent}%` }} />
                </span>
                <span className="w-7 text-right">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Filter & Sort Bar */}
      <div
        role="group"
        aria-label="Filter and sort customer reviews"
        className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
      >
        {REVIEW_FILTER_OPTIONS.map((option) => {
          const isSelected = activeFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setActiveFilter(option.id)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl border px-3 text-[11px] font-bold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] ${
                isSelected
                  ? 'border-[#6B352A] bg-[#FFF1A6] text-[#6B352A] shadow-2xs'
                  : 'border-[#E8D8C4] bg-white text-[#4A2B23] hover:border-[#6B352A]/40 hover:bg-[#FFF8D6]/60 hover:text-[#2B1611]'
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

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <p className="py-5 text-center text-xs text-[#6B4C44]">Loading reviews…</p>
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
                className="rounded-2xl border border-[#F4EAE0] bg-white p-3.5 shadow-[0_2px_10px_rgba(107,53,42,.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[12px] text-[#2B1611]">{review.author_name || 'Customer'}</b>
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
                          className="inline-flex items-center gap-1 rounded-full border border-[#E6CE73] bg-[#FFF8D6] px-2 py-0.5 text-[10px] font-bold text-[#6B352A] transition hover:bg-[#FFF1A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A]"
                        >
                          <BadgeCheck className="h-3 w-3 shrink-0" />
                          <span>Verified Customer</span>
                          <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-75" />
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-[#8A6C63]">
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
                        className={`h-3.5 w-3.5 ${value <= review.rating ? 'fill-[#FF6115] text-[#FF6115]' : 'text-[#E8D8C4]'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.review_text && (
                  <p className="mt-2.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[#4A2B23]">
                    {review.review_text}
                  </p>
                )}
              </article>
            );
          })
        ) : reviews.length > 0 ? (
          <p className="rounded-xl border border-dashed border-[#E8D8C4] px-3 py-5 text-center text-xs text-[#6B4C44]">
            No reviews match the selected filter yet.
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-[#E8D8C4] px-3 py-5 text-center text-xs text-[#6B4C44]">
            No published reviews yet. Be the first verified customer to share your experience.
          </p>
        )}
        {!loading && summary && summary.review_count > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="w-full rounded-lg py-2 text-xs font-bold text-[#6B352A] hover:bg-[#FFF8D6]"
          >
            {showAll ? 'Show latest reviews' : 'See all reviews'}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-[#F4EAE0] pt-4">
        {!isAuthenticated ? (
          <button
            type="button"
            onClick={onRequestLogin}
            className="w-full rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-4 py-3 text-xs font-bold text-[#6B352A] hover:bg-[#FFF1A6]"
          >
            Sign in to check review eligibility
          </button>
        ) : orders.length ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[#4A2B23]">Your completed purchases</p>
            {orders.slice(0, 3).map((order) => {
              const review = countByOrder.get(order.id);
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] p-3"
                >
                  <div>
                    <a
                      href={getPathForCustomerOrder(order.order_number.toLowerCase())}
                      onClick={(event) => navigateToOrderHistory(event, order.order_number)}
                      className="text-[11px] font-bold text-[#2B1611] hover:text-[#6B352A] hover:underline"
                    >
                      Order #{order.order_number}
                    </a>
                    <p className="text-[10px] font-semibold text-[#6B352A]">Verified purchase eligible</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComposer({ order, review })}
                    className="shrink-0 rounded-lg bg-[#6B352A] px-3 py-2 text-[10px] font-bold text-[#FFFCF4] hover:bg-[#53271E]"
                  >
                    {review ? 'Edit review' : 'Rate & Review'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-[#FFF8D6]/60 px-3 py-3 text-center text-[11px] text-[#6B4C44]">
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
            void refresh();
          }}
        />
      )}
    </section>
  );
};
