import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  FileText,
  Percent,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import type { CustomerCouponOffer } from '../lib/supabaseCoupons';

interface CouponDetailsViewProps {
  offer: CustomerCouponOffer;
  onBack: () => void;
  onShopNow: () => void;
}

const numberText = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value);

const moneyText = (value: number) => `₹${numberText(value)}`;

const offerTitle = (offer: CustomerCouponOffer) => {
  const description = offer.description?.trim();
  if (description) return description.toUpperCase();
  return /WELCOME/i.test(offer.code) ? 'WELCOME OFFER' : 'SPECIAL OFFER';
};

const benefitText = (offer: CustomerCouponOffer) =>
  offer.discount_type === 'PERCENTAGE'
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

  const terms = [
    scopeText(offer),
    `Eligibility: ${eligibilityText(offer.eligibility)}.`,
    'One coupon can be applied per order.',
  ];
  if (offer.description?.trim()) terms.push(offer.description.trim());

  return (
    <main
      className="fixed inset-x-0 top-0 z-[90] flex min-h-0 flex-col overflow-hidden bg-[#F8FAFC] font-sans text-slate-900"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      <header className="shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[52px] w-full max-w-2xl items-center gap-2.5 px-3 pt-[max(0.4rem,env(safe-area-inset-top))] pb-1.5 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.3} />
          </button>
          <h1 className="truncate text-[18px] sm:text-[19px] font-extrabold tracking-tight text-slate-900">
            Coupon Details
          </h1>
        </div>
      </header>

      <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-24 pt-3 sm:px-5 sm:pt-4">
        <section
          aria-label={`${offer.code} coupon offer`}
          className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-b from-[#FFF1F2] via-[#FFF6F7] to-white px-4 pb-3.5 pt-4 shadow-[0_8px_22px_-14px_rgba(217,35,45,0.2)] sm:px-5 sm:pb-4 sm:pt-5"
        >
          <span aria-hidden="true" className="absolute -left-3 top-[50%] h-6 w-6 -translate-y-1/2 rounded-full border-r border-rose-200/80 bg-[#F8FAFC] sm:-left-3.5 sm:h-7 sm:w-7" />
          <span aria-hidden="true" className="absolute -right-3 top-[50%] h-6 w-6 -translate-y-1/2 rounded-full border-l border-rose-200/80 bg-[#F8FAFC] sm:-right-3.5 sm:h-7 sm:w-7" />

          <div className="flex items-center justify-between gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D9232D] text-white shadow-sm shadow-rose-300/50 sm:h-11 sm:w-11">
              <Percent className="h-5 w-5" strokeWidth={2.6} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700">
              <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
              <span>Active</span>
            </span>
          </div>

          <div className="px-2 pb-3 pt-1.5 text-center sm:pb-3.5">
            <p className="text-[11.5px] font-extrabold tracking-wide text-[#D9232D] sm:text-xs">{offerTitle(offer)}</p>
            <p className="mt-1 text-[clamp(1.75rem,7vw,2.35rem)] font-black leading-[1.06] tracking-tight tabular-nums text-[#D9232D]">
              {benefitText(offer)}
            </p>
            <p className="mt-1 text-[13px] font-medium text-slate-700 sm:text-sm">
              {offer.minimum_order_value > 0
                ? `on orders of ${moneyText(offer.minimum_order_value)} or more`
                : 'on your next order'}
            </p>
            {offer.discount_type === 'PERCENTAGE' && offer.max_discount !== null && (
              <p className="mt-0.5 text-[11.5px] font-semibold text-rose-700 tabular-nums">
                Save up to {moneyText(offer.max_discount)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-rose-300 bg-white/95 p-2.5 shadow-2xs sm:p-3">
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Coupon Code</p>
              <p className="mt-0.5 break-all font-mono text-[clamp(1.05rem,4vw,1.4rem)] font-black leading-tight tracking-[0.06em] text-[#D9232D]">
                {offer.code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyCode()}
              aria-label={`Copy coupon code ${offer.code}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EF263E] to-[#C8172B] text-white shadow-sm transition hover:brightness-105 active:scale-95"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p aria-live="polite" className="mt-1.5 min-h-4 text-center text-[11px] font-semibold text-rose-700">
            {copied ? 'Coupon code copied' : copyError ? 'Copy unavailable — select the code above' : ''}
          </p>
        </section>

        <section
          aria-label="Coupon terms"
          className="space-y-2.5 rounded-2xl border border-slate-200/85 bg-white px-4 py-3.5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)] sm:px-5 sm:py-4"
        >
          <DetailRow
            icon={<ShoppingBag />}
            label="Minimum Order Value"
            value={offer.minimum_order_value > 0 ? moneyText(offer.minimum_order_value) : 'No minimum'}
          />
          <DetailRow
            icon={<Percent />}
            label="Maximum Discount"
            value={offer.max_discount === null ? 'No discount cap' : moneyText(offer.max_discount)}
          />
          <DetailRow icon={<CalendarDays />} label="Valid Till" value={formatExpiry(offer.expires_at)} />
          <DetailRow icon={<UserRound />} label="Applicable For" value={eligibilityText(offer.eligibility)} />
          <DetailRow icon={<FileText />} label="Terms & Conditions" value={terms.join(' ')} compact />
        </section>
      </div>

      <footer className="shrink-0 border-t border-slate-200/80 bg-white/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur-md sm:px-5">
        <button
          type="button"
          onClick={onShopNow}
          className="banner-cta-shine group/cta mx-auto flex min-h-11 w-full max-w-2xl items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D9232D] via-[#E51E35] to-[#B91822] px-5 text-[13.5px] font-extrabold text-white shadow-md transition-all hover:brightness-105 hover:shadow-lg active:scale-[0.98]"
        >
          <span>Shop Now</span>
          <ArrowRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
        </button>
      </footer>
    </main>
  );
}

function DetailRow({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.9]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold text-slate-500">{label}</p>
        <p
          className={
            compact
              ? 'mt-0.5 text-[12.5px] font-medium leading-relaxed text-slate-600'
              : 'mt-0.5 text-[14px] font-extrabold leading-snug tabular-nums text-slate-900'
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}
