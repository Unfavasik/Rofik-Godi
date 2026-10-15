import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Copy, FileText, Percent, ShoppingBag, UserRound } from 'lucide-react';
import type { CustomerCouponOffer } from '../lib/supabaseCoupons';

interface CouponDetailsViewProps {
  offer: CustomerCouponOffer;
  onBack: () => void;
  onShopNow: () => void;
}

const numberText = (value: number) => new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
}).format(value);

const moneyText = (value: number) => `₹${numberText(value)}`;

const offerTitle = (offer: CustomerCouponOffer) => {
  const description = offer.description?.trim();
  if (description) return description.toUpperCase();
  return /WELCOME/i.test(offer.code) ? 'WELCOME OFFER' : 'SPECIAL OFFER';
};

const benefitText = (offer: CustomerCouponOffer) => offer.discount_type === 'PERCENTAGE'
  ? `${numberText(offer.discount_value)}% OFF`
  : `${moneyText(offer.discount_value)} OFF`;

const eligibilityText = (eligibility: CustomerCouponOffer['eligibility']) => {
  if (eligibility === 'FIRST_ORDER') return 'New customers only';
  if (eligibility === 'EXISTING_CUSTOMERS') return 'Returning customers only';
  if (eligibility === 'EVERYONE') return 'All customers';
  return 'See offer terms at checkout';
};

const scopeText = (offer: CustomerCouponOffer) => {
  if (offer.apply_to === 'ALL_PRODUCTS') return 'Valid on all products.';
  if (offer.apply_to === 'SELECTED_PRODUCTS' && offer.product_names.length) {
    return `Valid on: ${offer.product_names.join(', ')}.`;
  }
  if (offer.apply_to === 'SELECTED_CATEGORIES' && offer.category_keys.length) {
    const categories = offer.category_keys.map((key) => key.replace(/[_-]+/g, ' '));
    return `Valid for ${categories.join(', ')} categories.`;
  }
  return 'Valid on eligible products shown at checkout.';
};

const formatExpiry = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Check offer at checkout';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

export function CouponDetailsView({ offer, onBack, onShopNow }: CouponDetailsViewProps) {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    const updateVisibleHeight = () => {
      const visibleHeight = window.visualViewport?.height || window.innerHeight;
      if (visibleHeight > 0) setViewportHeight(visibleHeight);
    };
    updateVisibleHeight();
    window.addEventListener('resize', updateVisibleHeight);
    window.visualViewport?.addEventListener('resize', updateVisibleHeight);
    return () => {
      window.removeEventListener('resize', updateVisibleHeight);
      window.visualViewport?.removeEventListener('resize', updateVisibleHeight);
    };
  }, []);

  const copyCode = async () => {
    setCopyError(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  };

  const terms = [scopeText(offer), `Eligibility: ${eligibilityText(offer.eligibility)}.`, 'One coupon can be applied per order.'];
  if (offer.description?.trim()) terms.push(offer.description.trim());

  return (
    <main className="fixed inset-x-0 top-0 z-[90] flex min-h-0 flex-col overflow-hidden bg-white font-sans text-[#161824]" style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}>
      <header className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-5 sm:pb-3 sm:pt-4">
        <button type="button" onClick={onBack} aria-label="Back" className="-ml-1 rounded-full p-1 text-slate-900 transition hover:bg-slate-100 active:scale-95">
          <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
        </button>
        <h1 className="text-[20px] font-extrabold tracking-tight sm:text-[23px]">Coupon Details</h1>
      </header>

      <div className="mx-auto min-h-0 w-full max-w-xl flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-36 pt-1 sm:space-y-5 sm:px-5 sm:pb-5">
        <section aria-label={`${offer.code} coupon offer`} className="relative overflow-hidden rounded-[24px] border border-rose-100 bg-gradient-to-b from-[#FFF0F1] via-[#FFF1F2] to-[#FFE7E9] px-4 pb-3 pt-4 shadow-[0_10px_24px_rgba(225,29,72,0.10)] sm:rounded-[30px] sm:px-7 sm:pb-6 sm:pt-5">
          <span aria-hidden="true" className="absolute -left-3 top-[48%] h-7 w-7 -translate-y-1/2 rounded-full bg-white sm:-left-4 sm:h-9 sm:w-9" />
          <span aria-hidden="true" className="absolute -right-3 top-[48%] h-7 w-7 -translate-y-1/2 rounded-full bg-white sm:-right-4 sm:h-9 sm:w-9" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-[#E51E35] text-white shadow-md shadow-rose-300/50 sm:h-[72px] sm:w-[72px]">
              <Percent className="h-7 w-7 sm:h-9 sm:w-9" strokeWidth={3} />
            </div>
            <span className="mt-1 inline-flex items-center rounded-full bg-[#10B66A] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm sm:px-4 sm:py-2 sm:text-sm">Active</span>
          </div>

          <div className="px-1 pb-3 pt-1 text-center sm:pb-5 sm:pt-2">
            <p className="text-xs font-extrabold tracking-wide text-[#D8182E] sm:text-base">{offerTitle(offer)}</p>
            <p className="mt-1 text-[clamp(2rem,9vw,2.6rem)] font-black leading-[1.04] tracking-tight text-[#D8182E] sm:text-[54px]">{benefitText(offer)}</p>
            <p className="mt-1 text-sm font-medium text-slate-700 sm:text-[19px]">
              {offer.minimum_order_value > 0 ? `on orders of ${moneyText(offer.minimum_order_value)} or more` : 'on your next order'}
            </p>
            {offer.discount_type === 'PERCENTAGE' && offer.max_discount !== null && (
              <p className="mt-0.5 text-[11px] font-semibold text-rose-700 sm:mt-1 sm:text-xs">Save up to {moneyText(offer.max_discount)}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-rose-400/80 bg-white/90 p-2.5 shadow-[inset_0_1px_5px_rgba(225,29,53,0.04)] sm:gap-4 sm:rounded-[20px] sm:p-4">
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">Coupon Code</p>
              <p className="mt-0.5 break-all font-mono text-[clamp(1.1rem,5vw,1.55rem)] font-black leading-tight tracking-[0.05em] text-[#D8182E] sm:text-[1.9rem]">{offer.code}</p>
            </div>
            <button type="button" onClick={() => void copyCode()} aria-label={`Copy coupon code ${offer.code}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EF263E] to-[#D81731] text-white shadow-[0_4px_10px_rgba(216,24,46,0.2)] transition hover:brightness-95 active:scale-95 sm:h-[60px] sm:w-[60px] sm:rounded-[17px]">
              {copied ? <Check className="h-5 w-5 sm:h-7 sm:w-7" /> : <Copy className="h-5 w-5 sm:h-7 sm:w-7" />}
            </button>
          </div>
          <p aria-live="polite" className="mt-0.5 min-h-3.5 text-center text-[10px] font-semibold text-rose-700 sm:mt-1 sm:min-h-4 sm:text-[11px]">
            {copied ? 'Coupon code copied' : copyError ? 'Copy unavailable — select the code above' : ''}
          </p>
        </section>

        <section aria-label="Coupon terms" className="space-y-3 rounded-[22px] border border-slate-100 bg-[#FCFCFD] px-4 py-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:space-y-5 sm:rounded-[28px] sm:px-6 sm:py-6">
          <DetailRow icon={<ShoppingBag />} label="Minimum Order Value" value={offer.minimum_order_value > 0 ? moneyText(offer.minimum_order_value) : 'No minimum'} />
          <DetailRow icon={<Percent />} label="Maximum Discount" value={offer.max_discount === null ? 'No discount cap' : moneyText(offer.max_discount)} />
          <DetailRow icon={<CalendarDays />} label="Valid Till" value={formatExpiry(offer.expires_at)} />
          <DetailRow icon={<UserRound />} label="Applicable For" value={eligibilityText(offer.eligibility)} />
          <DetailRow icon={<FileText />} label="Terms & Conditions" value={terms.join(' ')} compact />
        </section>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/95 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-4 sm:pt-3 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onShopNow} className="mx-auto flex h-[52px] w-full max-w-md items-center justify-center gap-2.5 rounded-[17px] bg-gradient-to-r from-[#E51E35] to-[#D91632] px-5 text-base font-extrabold text-white shadow-[0_6px_15px_rgba(225,29,53,0.22)] transition hover:brightness-95 active:scale-[0.99] sm:h-[62px] sm:gap-3 sm:rounded-[20px] sm:px-6 sm:text-[19px]">
          Shop Now <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </footer>
    </main>
  );
}

function DetailRow({ icon, label, value, compact = false }: { icon: React.ReactNode; label: string; value: string; compact?: boolean }) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-slate-700 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-snug text-slate-600 sm:text-[15px]">{label}</p>
        <p className={`${compact ? 'mt-1.5 text-[13px] font-medium leading-relaxed text-slate-600' : 'mt-0.5 text-[16px] font-extrabold leading-snug text-slate-900 sm:text-[17px]'}`}>{value}</p>
      </div>
    </div>
  );
}
