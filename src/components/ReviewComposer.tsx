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

  return <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-x-hidden bg-[#1F0E0A]/60 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saved) onClose(); }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="review-composer-title" className="max-h-[92dvh] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-3xl border border-[#E8D8C4] bg-[#FFFCF4] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#6B352A]">Verified purchase review</p><h2 id="review-composer-title" className="mt-1 text-lg font-black text-[#2B1611]">{review ? 'Edit your review' : 'Rate this product'}</h2><p className="mt-1 break-words text-xs text-[#6B4C44]">{productTitle}{orderNumber ? ` · Order #${orderNumber}` : ''}</p></div>
        <button type="button" aria-label="Close review form" onClick={onClose} disabled={busy || saved} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-[#6B4C44] hover:bg-[#FFF8D6] hover:text-[#2B1611] disabled:opacity-50 cursor-pointer"><X className="h-5 w-5" /></button>
      </div>
      {saved ? <div role="status" className="mt-5 rounded-2xl border border-[#E6CE73] bg-[#FFF8D6] p-6 text-center"><BadgeCheck className="mx-auto h-9 w-9 text-[#6B352A]" /><p className="mt-2 text-base font-black text-[#2B1611]">Thanks for your review!</p><p className="mt-1 text-xs text-[#6B352A]">Your verified-purchase feedback is saved.</p></div> : <>
        <fieldset className="mt-5">
          <legend className="text-xs font-bold text-[#4A2B23]">Your rating</legend>
          <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? '' : 's'}`} onClick={() => setRating(value)} className="grid min-h-11 min-w-11 place-items-center rounded p-1 focus:outline-none focus:ring-2 focus:ring-[#FF6115] cursor-pointer"><Star className={`h-8 w-8 ${value <= rating ? 'fill-[#FF6115] text-[#FF6115]' : 'text-[#E8D8C4]'}`} /></button>)}
          </div>
        </fieldset>
        <label className="mt-4 block text-xs font-bold text-[#4A2B23]">Your review <span className="font-normal text-[#8A6C63]">(optional, max 2,000 characters)</span>
          <textarea value={reviewText} maxLength={2000} onChange={(event) => setReviewText(event.target.value)} rows={5} placeholder="Share your experience with the product…" className="mt-2 w-full resize-y rounded-xl border border-[#E8D8C4] bg-white p-3 text-base sm:text-sm text-[#2B1611] outline-none focus:border-[#6B352A]" />
        </label>
        <div className="mt-1 text-right text-[10px] text-[#8A6C63]">{reviewText.length}/2,000</div>
        {error && <p role="alert" className="mt-3 rounded-lg border border-[#E9C2B5] bg-[#FDF2EE] p-3 text-xs font-medium text-[#9E2A2B]">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#E8D8C4] bg-white px-4 py-2.5 text-xs font-bold text-[#4A2B23] hover:bg-[#FFF8D6] cursor-pointer">Cancel</button><button type="submit" disabled={busy} className="banner-cta-shine group/cta min-h-11 rounded-xl bg-[#6B352A] px-5 py-2.5 text-xs font-bold text-[#FFFCF4] shadow-sm transition hover:bg-[#53271E] hover:shadow-md active:scale-[0.98] disabled:opacity-60 cursor-pointer">{busy ? 'Saving…' : review ? 'Save changes' : 'Submit review'}</button></div>
      </>}
    </form>
  </div>;
};
