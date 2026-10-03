import React, { useEffect, useState } from 'react';
import { BadgeCheck, Star } from 'lucide-react';
import { listPublishedReviews, type ProductReviewRecord } from '../lib/supabaseReviews';

export const CustomerReviews: React.FC = () => {
  const [reviews, setReviews] = useState<ProductReviewRecord[]>([]);
  useEffect(() => { void listPublishedReviews(undefined, 3).then(setReviews); }, []);
  if (!reviews.length) return null;

  return <section className="mb-8 px-5" data-purpose="customer-reviews-section">
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div><h3 className="text-[17px] font-black tracking-tight text-gray-900">Recent Rider Reviews</h3><p className="text-[11.5px] font-medium text-gray-400">Reviews shared by our customers</p></div>
    </div>
    <div className="space-y-3">{reviews.map((review) => <article key={review.id} className="space-y-2 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-1.5"><span className="text-[12.5px] font-bold text-gray-900">{review.author_name || 'Customer'}</span>{review.is_verified_purchase && <span className="inline-flex items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-600"><BadgeCheck className="h-2.5 w-2.5" />Verified Purchase</span>}</div><p className="mt-0.5 text-[10px] text-gray-400">{review.product_name || 'Rofik Godi Centre product'}</p></div><div className="flex shrink-0">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-3 w-3 ${value <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />)}</div></div>
      {review.review_text && <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-gray-700">“{review.review_text}”</p>}
      <div className="border-t border-gray-50 pt-1 text-[10px] text-gray-400">{new Date(review.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </article>)}</div>
  </section>;
};
