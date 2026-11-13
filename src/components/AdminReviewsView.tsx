import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Check, Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { deleteProductReview, listAdminProductReviews, setProductReviewPublished, type ProductReviewRecord } from '../lib/supabaseReviews';

interface AdminReviewsViewProps {
  notify: (message: string) => void;
  query: string;
}

export const AdminReviewsView: React.FC<AdminReviewsViewProps> = ({ notify, query }) => {
  const [reviews, setReviews] = useState<ProductReviewRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [publicationFilter, setPublicationFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [pendingDelete, setPendingDelete] = useState<ProductReviewRecord | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setReviews(await listAdminProductReviews());
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!query) return;
    setProductFilter('all');
    setRatingFilter('all');
    setPublicationFilter('all');
    setVerificationFilter('all');
  }, [query]);

  const products = useMemo(() => Array.from(new Map((reviews || []).map((review) => [review.product_id, review.product_name || review.product_id])).entries()), [reviews]);
  const filtered = useMemo(() => (reviews || []).filter((review) => {
    const search = `${review.id} ${review.author_name} ${review.product_name || ''} ${review.customer_id || ''} ${review.order_id || ''} ${review.review_text || ''}`.toLowerCase();
    return (!query || search.includes(query.toLowerCase()))
      && (productFilter === 'all' || review.product_id === productFilter)
      && (ratingFilter === 'all' || review.rating === Number(ratingFilter))
      && (publicationFilter === 'all' || (publicationFilter === 'published' ? review.is_published : !review.is_published))
      && (verificationFilter === 'all' || (verificationFilter === 'verified' ? review.is_verified_purchase : !review.is_verified_purchase));
  }), [reviews, query, productFilter, ratingFilter, publicationFilter, verificationFilter]);

  const published = (reviews || []).filter((review) => review.is_published);
  const average = published.length ? published.reduce((sum, review) => sum + review.rating, 0) / published.length : 0;

  const togglePublished = async (review: ProductReviewRecord) => {
    const { error } = await setProductReviewPublished(review.id, !review.is_published);
    if (error) notify(error.message || 'Review moderation failed');
    else { notify(review.is_published ? 'Review hidden from the storefront' : 'Review published'); await refresh(); }
  };
  const requestRemoveReview = (review: ProductReviewRecord) => setPendingDelete(review);
  const removeReview = async (review: ProductReviewRecord) => {
    const { error } = await deleteProductReview(review.id);
    if (error) notify(error.message || 'Review deletion failed');
    else { notify('Review deleted'); await refresh(); }
  };

  return <section className="max-w-full overflow-x-hidden">
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_12px_36px_-16px_rgba(15,23,42,0.06)] backdrop-blur-md sm:flex-row sm:items-center">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[.18em] text-[#D9232D] ring-1 ring-inset ring-red-100">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D9232D]" />
          Community
        </span>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-[28px]">Product reviews</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Reviews are purchase-verified by the database. Moderation never changes the purchase badge.</p>
      </div>
    </div>
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric label="Published reviews" value={published.length} loading={loading} /><Metric label="Hidden / awaiting review" value={(reviews || []).filter((review) => !review.is_published).length} loading={loading} /><Metric label="Published average" value={`${average.toFixed(1)} / 5`} loading={loading} /></div>
    <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.06)] backdrop-blur-md">
      <select aria-label="Filter by product" value={productFilter} onChange={(event) => setProductFilter(event.target.value)} className="min-h-11 max-w-full flex-1 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-base font-bold text-slate-700 outline-none focus:border-[#D9232D] focus:bg-white sm:flex-none sm:text-xs"><option value="all">All products</option>{products.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      <select aria-label="Filter by rating" value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} className="min-h-11 max-w-full rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-base font-bold text-slate-700 outline-none focus:border-[#D9232D] focus:bg-white sm:text-xs"><option value="all">All ratings</option>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select>
      <select aria-label="Filter by publication" value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value as typeof publicationFilter)} className="min-h-11 max-w-full rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-base font-bold text-slate-700 outline-none focus:border-[#D9232D] focus:bg-white sm:text-xs"><option value="all">Published and hidden</option><option value="published">Published</option><option value="hidden">Hidden</option></select>
      <select aria-label="Filter by verification" value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value as typeof verificationFilter)} className="min-h-11 max-w-full rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-base font-bold text-slate-700 outline-none focus:border-[#D9232D] focus:bg-white sm:text-xs"><option value="all">All purchases</option><option value="verified">Verified purchase</option><option value="unverified">Not verified</option></select>
    </div>
    {loading ? <div className="space-y-3"><p className="sr-only">Loading reviews…</p>{[0, 1, 2].map((row) => <div key={row} className="animate-pulse rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xs"><div className="flex items-center justify-between"><div className="h-4 w-36 rounded-full bg-slate-200/80" /><div className="h-4 w-24 rounded-full bg-slate-200/70" /></div><div className="mt-3 h-3 w-48 rounded-full bg-slate-100" /><div className="mt-4 h-12 w-full rounded-xl bg-slate-100" /></div>)}</div> : reviews === null ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Could not load admin reviews. Sign in with a user that has a matching <code>admin_users</code> record.</p> : filtered.length === 0 ? <p className="rounded-2xl border border-slate-200/80 bg-white/95 py-12 text-center text-sm text-slate-500">No reviews match these filters.</p> : <div className="space-y-3">{filtered.map((review) => <article key={review.id} className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_12px_36px_-16px_rgba(15,23,42,0.06)] backdrop-blur-md transition hover:border-red-100 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-slate-900">{review.author_name || 'Customer'}</span>{review.is_verified_purchase && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/80"><BadgeCheck className="h-3.5 w-3.5" />Verified purchase</span>}<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${review.is_published ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80' : 'bg-amber-50 text-amber-700 ring-amber-200/80'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{review.is_published ? 'Published' : 'Hidden'}</span></div><p className="mt-1.5 text-[11px] font-black text-[#D9232D]">{review.product_name || 'Product'}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">Customer ID: {review.customer_id || 'Legacy review'} · Order ID: {review.order_id || 'Legacy review'}</p></div><div className="flex shrink-0 items-center gap-1 text-amber-500">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= review.rating ? 'fill-current' : 'text-slate-200'}`} />)}<span className="ml-2 text-[11px] font-bold text-slate-400">{new Date(review.created_at).toLocaleDateString('en-IN')}</span></div></div>
      {review.review_text && <p className="mt-4 break-words rounded-xl bg-slate-50/80 p-3.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">“{review.review_text}”</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => void togglePublished(review)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 sm:text-[11px]">{review.is_published ? <><EyeOff className="h-3.5 w-3.5" />Hide</> : <><Eye className="h-3.5 w-3.5" />Publish</>}</button><button type="button" onClick={() => requestRemoveReview(review)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 sm:text-[11px]"><Trash2 className="h-3.5 w-3.5" />Delete</button><span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400"><Check className="h-3.5 w-3.5 text-emerald-600" />Verified flag is database-controlled</span></div>
    </article>)}</div>}
    <ConfirmDialog open={Boolean(pendingDelete)} title="Delete review?" message="This permanently removes the review from the database." confirmLabel="Delete review" onCancel={() => setPendingDelete(null)} onConfirm={() => { const review = pendingDelete; setPendingDelete(null); if (review) void removeReview(review); }} />
  </section>;
};

const Metric: React.FC<{ label: string; value: number | string; loading?: boolean }> = ({ label, value, loading }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.06)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-red-100">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D9232D]/80 via-rose-400/50 to-transparent opacity-80" />
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    {loading ? (
      <div className="mt-2 h-7 w-16 animate-pulse rounded-lg bg-slate-200/80" />
    ) : (
      <p className="mt-1 text-2xl font-black tracking-tight tabular-nums text-slate-900">{value}</p>
    )}
  </div>
);

