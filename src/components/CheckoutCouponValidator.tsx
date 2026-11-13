import React from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Tag, X } from 'lucide-react';
import { getUnappliedCouponOffers } from '../lib/couponDisplay';
import type { CheckoutCouponState } from '../lib/checkoutCoupon';
import type { CustomerCouponOffer } from '../lib/supabaseCoupons';
import { formatInr, useI18n } from '../lib/i18n';

interface CheckoutCouponValidatorProps {
  couponInput: string;
  onCouponInputChange: (value: string) => void;
  appliedCoupon: CheckoutCouponState | null;
  errorMessage: string;
  isValidating: boolean;
  eligibleOffers?: CustomerCouponOffer[];
  onApply: (overrideCode?: string) => void;
  onRemove: () => void;
}

export const CheckoutCouponValidator: React.FC<CheckoutCouponValidatorProps> = ({
  couponInput,
  onCouponInputChange,
  appliedCoupon,
  errorMessage,
  isValidating,
  eligibleOffers = [],
  onApply,
  onRemove,
}) => {
  const { t } = useI18n();
  const errorId = 'checkout-coupon-error';
  const unappliedOffers = getUnappliedCouponOffers(eligibleOffers, appliedCoupon?.code).slice(0, 3);

  return (
    <div
      className="mt-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/85 bg-slate-50/75 p-3"
      data-testid="checkout-coupon-validator"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-extrabold text-slate-900">
          <Tag className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
          <span className="truncate">{t('cart.haveCoupon')}</span>
        </span>
        {appliedCoupon && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#D9232D] transition-colors hover:bg-rose-50 hover:underline whitespace-nowrap shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            <span>{t('cart.remove')}</span>
          </button>
        )}
      </div>

      {appliedCoupon ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="checkout-coupon-success"
          className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-3 py-2.5 text-emerald-900 shadow-2xs"
        >
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">{t('cart.applied', { code: appliedCoupon.code })}</span>
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs font-black text-emerald-700 tabular-nums">
            −{formatInr(appliedCoupon.discount)}
          </span>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onApply();
          }}
          className="flex min-w-0 items-stretch gap-2"
          noValidate
        >
          <input
            type="text"
            value={couponInput}
            onChange={(event) => onCouponInputChange(event.target.value.toUpperCase())}
            placeholder={t('cart.enterCoupon')}
            aria-label={t('cart.enterCoupon')}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? errorId : undefined}
            disabled={isValidating}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className={`min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-base font-bold uppercase tracking-wide text-slate-900 outline-none transition placeholder:text-sm placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 disabled:opacity-60 sm:text-xs sm:placeholder:text-xs ${
              errorMessage
                ? 'border-rose-400 bg-rose-50/50 focus:border-[#D9232D] focus:ring-4 focus:ring-rose-100'
                : 'border-slate-200/90 bg-white focus:border-[#D9232D] focus:ring-4 focus:ring-red-100'
            }`}
          />
          <button
            type="submit"
            disabled={isValidating}
            className="banner-cta-shine group/cta inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 text-xs font-black text-white shadow-2xs transition-all hover:brightness-105 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
          >
            {isValidating ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span>{t('cart.apply')}</span>
              </>
            ) : (
              <span>{t('cart.apply')}</span>
            )}
          </button>
        </form>
      )}

      {errorMessage && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          data-testid="checkout-coupon-error"
          className="mt-2 flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50/95 px-2.5 py-2 text-[11px] font-semibold text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
          <span className="min-w-0 break-words">{errorMessage}</span>
        </div>
      )}

      {!appliedCoupon && unappliedOffers.length > 0 && (
        <div className="mt-3 border-t border-slate-200/75 pt-2.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold text-slate-500">{t('cart.eligibleOffers')}</p>
            <span className="text-[10.5px] font-semibold text-emerald-700">
              {t('cart.available', { count: unappliedOffers.length })}
            </span>
          </div>
          <div className="space-y-1.5">
            {unappliedOffers.map((offer) => (
              <button
                key={offer.code}
                type="button"
                disabled={isValidating}
                onClick={() => onApply(offer.code)}
                className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-rose-200/75 bg-white px-2.5 py-2 text-left transition hover:border-[#D9232D]/50 hover:bg-rose-50/40 disabled:opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-black tracking-wide text-[#D9232D]">
                      {offer.code}
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-700">
                      {offer.discount_type === 'PERCENTAGE'
                        ? `${offer.discount_value}% ${t('cart.off')}`
                        : `${formatInr(offer.discount_value)} ${t('cart.off')}`}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                    {offer.minimum_order_value > 0
                      ? t('cart.minimumOrder', { amount: formatInr(offer.minimum_order_value) })
                      : t('cart.noMinimum')}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10.5px] font-extrabold text-[#D9232D]">
                  {t('cart.tapToApply')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
