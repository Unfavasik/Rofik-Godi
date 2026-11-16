import React, { useState } from 'react';
import { BadgeCheck, Star, X } from 'lucide-react';
import { createProductReview, updateProductReview, type ProductReviewRecord } from '../lib/supabaseReviews';

interface ReviewComposerProps {
  productId: string;
  orderId: string;
  productTitle: string;
  orderNumber?: string;
  review?: ProductReviewRecord;
  onClose: () => void;
  onSaved: () => void;
}

export const ReviewComposer: React.FC<ReviewComposerProps> = ({ productId, orderId, productTitle, orderNumber, review, onClose, onSaved }) => {
  const [rating, setRating] = useState(review?.rating || 5);
  const [reviewText, setReviewText] = useState(review?.review_text || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    const result = review
      ? await updateProductReview({ reviewId: review.id, rating, reviewText })
      : await createProductReview({ productId, orderId, rating, reviewText });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || 'Could not save the review. Please try again.');
      return;
    }
    setSaved(true);
    window.setTimeout(onSaved, 900);
  };

  return <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saved) onClose(); }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="review-composer-title" className="max-h-[92dvh] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#d9232d]">Verified purchase review</p><h2 id="review-composer-title" className="mt-1 text-lg font-black">{review ? 'Edit your review' : 'Rate this product'}</h2><p className="mt-1 break-words text-xs text-slate-500">{productTitle}{orderNumber ? ` · Order #${orderNumber}` : ''}</p></div>
        <button type="button" aria-label="Close review form" onClick={onClose} disabled={busy || saved} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
      </div>
      {saved ? <div role="status" className="mt-5 rounded-2xl bg-emerald-50 p-6 text-center"><BadgeCheck className="mx-auto h-9 w-9 text-emerald-600" /><p className="mt-2 text-base font-black text-emerald-800">Thanks for your review!</p><p className="mt-1 text-xs text-emerald-700">Your verified-purchase feedback is saved.</p></div> : <>
        <fieldset className="mt-5">
          <legend className="text-xs font-bold text-slate-700">Your rating</legend>
          <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? '' : 's'}`} onClick={() => setRating(value)} className="grid min-h-11 min-w-11 place-items-center rounded p-1 focus:outline-none focus:ring-2 focus:ring-amber-400"><Star className={`h-8 w-8 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} /></button>)}
          </div>
        </fieldset>
        <label className="mt-4 block text-xs font-bold text-slate-700">Your review <span className="font-normal text-slate-400">(optional, max 2,000 characters)</span>
          <textarea value={reviewText} maxLength={2000} onChange={(event) => setReviewText(event.target.value)} rows={5} placeholder="Share your experience with the product…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-base sm:text-sm outline-none focus:border-[#d9232d]" />
        </label>
        <div className="mt-1 text-right text-[10px] text-slate-400">{reviewText.length}/2,000</div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={busy} className="banner-cta-shine group/cta min-h-11 rounded-xl bg-[#d9232d] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-[#b91c25] hover:shadow-md active:scale-[0.98] disabled:opacity-60">{busy ? 'Saving…' : review ? 'Save changes' : 'Submit review'}</button></div>
      </>}
    </form>
  </div>;
};
