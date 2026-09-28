import React from 'react';
import { REVIEWS } from '../data/products';
import { Star, CheckCircle, Quote, ThumbsUp } from 'lucide-react';

export const CustomerReviews: React.FC = () => {
  return (
    <section className="px-5 mb-8" data-purpose="customer-reviews-section">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <h3 className="text-[17px] font-black text-gray-900 tracking-tight">Rider Reviews</h3>
          <p className="text-[11.5px] text-gray-400 font-medium">Tested on Indian roads & monsoons</p>
        </div>
        <div className="flex items-center gap-1 text-[12px] font-bold text-gray-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>4.9 / 5.0 (480+ Reviews)</span>
        </div>
      </div>

      <div className="space-y-3">
        {REVIEWS.map((rev) => (
          <article
            key={rev.id}
            className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-gray-900">{rev.userName}</span>
                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {rev.userCity} · {rev.vehicle}
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11.5px] text-gray-700 leading-relaxed italic">
              "{rev.comment}"
            </p>

            <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-gray-50">
              <span>{rev.date}</span>
              <span className="flex items-center gap-1 text-gray-500">
                <ThumbsUp className="w-2.5 h-2.5" />
                Helpful review
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
