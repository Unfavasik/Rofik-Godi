import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ChevronRight, Star } from 'lucide-react';
import {
  getMyReviewContext,
  getProductRatingSummary,
  isVerifiedProductReview,
  listPublishedReviews,
  type ProductRatingSummary,
  type ProductReviewRecord,
  type ReviewEligibleOrder,
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
}) => {
  const hasInitialData = initialReviews !== undefined || initialOrders !== undefined;
  const [summary, setSummary] = useState<ProductRatingSummary | null>(initialSummary);
  const [reviews, setReviews] = useState<ProductReviewRecord[]>(initialReviews ?? []);
  const [orders, setOrders] = useState<ReviewEligibleOrder[]>(initialOrders ?? []);
  const [myReviews, setMyReviews] = useState<ProductReviewRecord[]>([]);
  const [loading, setLoading] = useState(!hasInitialData);
  const [composer, setComposer] = useState<{ order: ReviewEligibleOrder; review?: ProductReviewRecord } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextSummary, nextReviews, context] = await Promise.all([
      getProductRatingSummary(productId),
      listPublishedReviews(productId, showAll ? 100 : 5),
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
          {[5, 4, 3, 2, 1].map((value, index) => {
            const count = counts[index] || 0;
            const percent = summary?.review_count ? Math.round((count * 100) / summary.review_count) : 0;
            return (
              <div key={value} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-7">{value} ★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <span className="block h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                </span>
                <span className="w-7 text-right">{percent}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {loading ? (
          <p className="py-5 text-center text-xs text-slate-500">Loading reviews…</p>
        ) : reviews.length ? (
          reviews.map((review) => {
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
            void refresh();
          }}
        />
      )}
    </section>
  );
};
