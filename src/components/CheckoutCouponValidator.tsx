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
      className="mt-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#E8D8C4] bg-[#FFFCF4] p-3"
      data-testid="checkout-coupon-validator"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-extrabold text-[#2B1611]">
          <Tag className="h-3.5 w-3.5 shrink-0 text-[#6B352A]" />
          <span className="truncate">{t('cart.haveCoupon')}</span>
        </span>
        {appliedCoupon && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#9E2A2B] transition-colors hover:bg-[#FDF2EE] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
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
          className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-3 py-2.5 text-[#2B1611] shadow-2xs"
        >
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6B352A]" />
            <span className="truncate">{t('cart.applied', { code: appliedCoupon.code })}</span>
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs font-black text-[#6B352A] tabular-nums">
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
            className={`min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-base font-bold uppercase tracking-wide text-[#2B1611] outline-none transition placeholder:text-sm placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-[#8A6C63] disabled:opacity-60 sm:text-xs sm:placeholder:text-xs ${
              errorMessage
                ? 'border-[#9E2A2B] bg-[#FDF2EE] focus:border-[#9E2A2B] focus:ring-4 focus:ring-[#FDF2EE]'
                : 'border-[#E8D8C4] bg-white focus:border-[#6B352A] focus:ring-4 focus:ring-[#FFF8D6]'
            }`}
          />
          <button
            type="submit"
            disabled={isValidating}
            className="banner-cta-shine group/cta inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#6B352A] px-4 text-xs font-black text-[#FFFCF4] shadow-2xs transition-all hover:bg-[#53271E] hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap cursor-pointer"
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
          className="mt-2 flex items-start gap-1.5 rounded-xl border border-[#E9C2B5] bg-[#FDF2EE] px-2.5 py-2 text-[11px] font-semibold text-[#9E2A2B]"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9E2A2B]" />
          <span className="min-w-0 break-words">{errorMessage}</span>
        </div>
      )}

      {!appliedCoupon && unappliedOffers.length > 0 && (
        <div className="mt-3 border-t border-[#E8D8C4] pt-2.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold text-[#6B4C44]">{t('cart.eligibleOffers')}</p>
            <span className="text-[10.5px] font-semibold text-[#6B352A]">
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
                className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-[#E6CE73] bg-white px-2.5 py-2 text-left transition hover:border-[#6B352A]/50 hover:bg-[#FFF8D6] disabled:opacity-60 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-black tracking-wide text-[#6B352A]">
                      {offer.code}
                    </span>
                    <span className="text-[10.5px] font-bold text-[#4A2B23]">
                      {offer.discount_type === 'PERCENTAGE'
                        ? `${offer.discount_value}% ${t('cart.off')}`
                        : `${formatInr(offer.discount_value)} ${t('cart.off')}`}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-[#6B4C44]">
                    {offer.minimum_order_value > 0
                      ? t('cart.minimumOrder', { amount: formatInr(offer.minimum_order_value) })
                      : t('cart.noMinimum')}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10.5px] font-extrabold text-[#6B352A]">
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
