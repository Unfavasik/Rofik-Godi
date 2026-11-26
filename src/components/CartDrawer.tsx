import React, { useEffect, useState } from 'react';
import { CartItem } from '../types';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { loadCustomerCouponOffers, validateCustomerCoupon, type CustomerCouponOffer } from '../lib/supabaseCoupons';
import {
  getCouponOfferStatus,
  getUnappliedCouponOffers,
  sortCouponOffersByEligibility,
} from '../lib/couponDisplay';
import { MAX_ORDER_ITEM_QUANTITY } from '../lib/cart';
import { useI18n } from '../lib/i18n';
import { readSwrCache, writeSwrCache } from '../lib/swrCache';
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';
import { subscribePullToRefresh } from '../lib/pullToRefresh';
import {
  X,
  ShoppingBag,
  Trash2,
  TicketPercent,
  ArrowRight,
  Store,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  userId: string;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToCheckout: (appliedDiscount: number, couponCode: string, quote?: { subtotal: number; total: number }) => void;
  reorderNotice?: string | null;
  onDismissReorderNotice?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  userId,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  reorderNotice,
  onDismissReorderNotice,
}) => {
  const { t, formatMoney, language } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; subtotal: number; total: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [applyingOfferCode, setApplyingOfferCode] = useState<string | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [couponOffers, setCouponOffers] = useState<CustomerCouponOffer[]>(
    () => readSwrCache<CustomerCouponOffer[]>('public:customer-coupons') ?? [],
  );
  const [couponOffersLoading, setCouponOffersLoading] = useState(
    () => readSwrCache('public:customer-coupons') === undefined,
  );
  const [couponOffersError, setCouponOffersError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    let cancelled = false;
    const cached = readSwrCache<CustomerCouponOffer[]>('public:customer-coupons');
    if (cached !== undefined) {
      setCouponOffers(cached);
      setCouponOffersLoading(false);
    } else {
      setCouponOffersLoading(true);
    }
    setCouponOffersError('');
    const fetchCartOffers = () =>
      loadCustomerCouponOffers().then((response) => {
        if (cancelled) return;
        setCouponOffers(response.data);
        setCouponOffersError(response.error);
        if (!response.error) writeSwrCache('public:customer-coupons', response.data);
        setCouponOffersLoading(false);
      });
    void fetchCartOffers();
    const unsubscribePtr = subscribePullToRefresh(fetchCartOffers);
    return () => {
      cancelled = true;
      unsubscribePtr();
    };
  }, [isOpen, items.length, userId]);

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError('');
  }, [items]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const hasUnavailableItems = items.some((item) => !item.product.inStock);
  const displayedSubtotal = appliedCoupon?.subtotal ?? subtotal;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const grandTotal = appliedCoupon?.total ?? Math.max(0, subtotal - discount);
  const eligibleCouponOffers = sortCouponOffersByEligibility(
    getUnappliedCouponOffers(couponOffers, appliedCoupon?.code),
    subtotal,
  );
  const visibleCouponOffers = showAllOffers ? eligibleCouponOffers : eligibleCouponOffers.slice(0, 2);
  const couponErrorId = 'cart-coupon-error';

  const handleApplyCoupon = async (selectedCode?: string) => {
    const isFromOfferCard = typeof selectedCode === 'string';
    const rawCode = isFromOfferCard ? selectedCode : couponCode;
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) {
      setCouponError(t('cart.emptyCouponCode'));
      return;
    }
    setCouponError('');
    setIsApplyingCoupon(true);
    setApplyingOfferCode(isFromOfferCard ? code : null);
    try {
      const quote = await validateCustomerCoupon(code, items, userId);
      if (!quote.valid) {
        setAppliedCoupon(null);
        setCouponError(quote.message || t('cart.invalidCoupon'));
        return;
      }
      const quotedDiscount = Number(quote.discount_amount ?? quote.discount ?? 0);
      const quotedSubtotal = Number(quote.subtotal ?? subtotal);
      setAppliedCoupon({ code: quote.code || code, discount: quotedDiscount, subtotal: quotedSubtotal, total: Number(quote.final_total ?? Math.max(0, quotedSubtotal - quotedDiscount)) });
      setCouponCode('');
    } catch {
      setCouponError(t('cart.couponUnavailable'));
    } finally {
      setIsApplyingCoupon(false);
      setApplyingOfferCode(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-dialog-title"
          tabIndex={-1}
          className="relative w-full max-w-full sm:max-w-[420px] bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden overflow-x-hidden"
        >
          {/* Edge-to-Edge Vignette Header */}
          <div className="relative isolate flex shrink-0 justify-between items-center overflow-hidden bg-[#090808] px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-4">
            <VignetteBarBackdrop variant="top" />
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-full bg-white/14 border border-white/18 backdrop-blur-md flex items-center justify-center text-white">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 id="cart-dialog-title" className="text-[14.5px] font-extrabold text-white leading-tight">{t('cart.title')}</h3>
                <p className="text-[10.5px] text-white/70 font-medium">
                  {t('cart.selectedItems', { count: items.length })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="relative z-10 h-9 w-9 rounded-full border border-white/18 bg-white/14 hover:bg-white/22 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Edge-to-Edge Vignette Canvas */}
          <div className="relative -mt-px min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto no-scrollbar bg-white">
            <VignettePageCurtain className="h-[235px] sm:h-[260px]" />
            <div className="relative z-10 px-3.5 pt-3 pb-4 space-y-2.5 sm:px-4">
              {/* Store Pickup Floating Pill Card */}
              <div className="rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2.5 shadow-[0_10px_26px_-14px_rgba(9,8,8,0.28)] backdrop-blur-md">
                <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-900">
                  <Store className="h-3.5 w-3.5 text-[#D9232D]" />
                  <span>{t('cart.pickupTitle')}</span>
                </div>
                <p className="mt-0.5 pl-5 text-[10.5px] text-slate-500">{t('cart.pickupHint')}</p>
              </div>

              {reorderNotice && <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-950 shadow-xs">
                <p className="min-w-0 flex-1">{reorderNotice}</p>
                {onDismissReorderNotice && <button type="button" onClick={onDismissReorderNotice} aria-label={t('cart.dismissReorder')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-amber-900 hover:bg-amber-100"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
              </div>}

              {items.length === 0 ? (
              <div className="min-h-[340px] flex flex-col items-center justify-center text-center py-12 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_12px_28px_-16px_rgba(9,8,8,0.22)] px-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-[15px] font-black text-slate-900 mb-1">{t('cart.emptyTitle')}</h4>
                <p className="text-[12px] text-slate-500 max-w-[220px] mb-4">
                  {t('cart.emptyBody')}
                </p>
                <button
                  onClick={onClose}
                  className="banner-cta-shine group/cta min-h-11 bg-[#D9232D] text-white text-[12px] font-bold px-5 py-2.5 rounded-full shadow-md hover:bg-[#c01d26] hover:shadow-lg active:scale-95 transition-all"
                >
                  {t('cart.explore')}
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex gap-2.5 relative"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                    <img
                      src={item.selectedColor?.images?.[0] ?? item.product.image}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="min-w-0 pr-1 text-[12px] font-black text-gray-900 leading-tight break-words">
                          {item.product.title}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.cartItemId)}
                          className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={t('cart.removeItem')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Custom Tags (Color, stitch, embroidery) */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                          <span
                            className="w-2 h-2 rounded-full border border-gray-300"
                            style={{ backgroundColor: item.selectedColor.hex }}
                          />
                          {item.selectedColor.name}
                        </span>

                        {item.selectedStitch && (
                          <span className="text-[9.5px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {item.selectedStitch}
                          </span>
                        )}

                        {item.selectedThickness && item.selectedThickness.extraPrice > 0 && (
                          <span className="text-[9.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            {item.selectedThickness.label}
                          </span>
                        )}

                        {item.customEmbroideryText && (
                          <span className="text-[9.5px] font-black bg-black text-amber-300 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                            <Sparkles className="w-2 h-2" />
                            "{item.customEmbroideryText}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Quantity Stepper */}
                    <div className="flex flex-wrap justify-between items-center gap-2 mt-1.5 pt-1 border-t border-gray-50">
                      <div className="text-[12.5px] font-black text-[#D9232D] shrink-0">
                        {formatMoney(item.unitPrice * item.quantity)}
                      </div>

                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                          aria-label={t('cart.decreaseQuantity', { title: item.product.title })}
                          className="h-8 w-8 rounded bg-white shadow-2xs text-gray-700 text-xs font-bold flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-[11px] font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} disabled={!item.product.inStock || item.quantity >= MAX_ORDER_ITEM_QUANTITY}
                          aria-label={item.quantity >= MAX_ORDER_ITEM_QUANTITY ? t('cart.maxQuantity', { title: item.product.title }) : t('cart.increaseQuantity', { title: item.product.title })}
                          className="h-8 w-8 rounded bg-white shadow-2xs text-gray-700 text-xs font-bold flex items-center justify-center hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Coupons Section */}
            {items.length > 0 && (
              <section
                aria-labelledby="cart-coupon-heading"
                data-testid="cart-coupon-section"
                className="mt-2 rounded-xl border border-slate-200/85 bg-white/95 p-2.5 shadow-[0_4px_14px_-10px_rgba(15,23,42,0.12)]"
              >
                {/* Compact Single-Row Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-rose-100/90 bg-rose-50 text-[#D9232D]">
                      <TicketPercent className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <h4
                      id="cart-coupon-heading"
                      className="truncate text-[11.5px] font-black tracking-tight text-slate-900"
                    >
                      {t('cart.haveCoupon')}
                    </h4>
                  </div>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="inline-flex h-6.5 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-[10.5px] font-bold text-[#D9232D] transition-colors hover:bg-rose-50 active:scale-[0.97]"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      <span>{t('cart.remove')}</span>
                    </button>
                  ) : eligibleCouponOffers.length > 0 ? (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-700 tabular-nums">
                      {t('cart.available', { count: eligibleCouponOffers.length })}
                    </span>
                  ) : null}
                </div>

                {/* Applied Ticket OR Compact Input Form */}
                <div className="mt-2">
                  <AnimatePresence mode="wait" initial={false}>
                    {appliedCoupon ? (
                      <motion.div
                        key="applied-coupon"
                        role="status"
                        aria-live="polite"
                        data-testid="cart-coupon-applied"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -3 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-emerald-200/90 bg-gradient-to-r from-emerald-50/95 via-white to-emerald-50/60 px-2.5 py-1.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-md bg-emerald-600 text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-black leading-tight text-emerald-950">
                              {t('cart.applied', { code: appliedCoupon.code })}
                            </p>
                            <p className="truncate text-[9.5px] font-semibold text-emerald-700 tabular-nums">
                              {t('cart.savedOnOrder', { amount: formatMoney(appliedCoupon.discount) })}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-[12px] font-black text-emerald-700 tabular-nums">
                          −{formatMoney(appliedCoupon.discount)}
                        </span>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="coupon-form"
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.14 }}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void handleApplyCoupon();
                        }}
                        noValidate
                        className={`flex min-w-0 items-center gap-1 rounded-lg border p-0.5 transition-all ${
                          couponError
                            ? 'border-rose-300 bg-rose-50/40 focus-within:border-[#D9232D] focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-100'
                            : 'border-slate-200/90 bg-slate-50/80 focus-within:border-[#D9232D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D9232D]/12'
                        }`}
                      >
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            if (couponError) setCouponError('');
                          }}
                          placeholder={t('cart.enterCoupon')}
                          aria-label={t('cart.enterCoupon')}
                          aria-invalid={Boolean(couponError)}
                          aria-describedby={couponError ? couponErrorId : undefined}
                          disabled={isApplyingCoupon}
                          autoCapitalize="characters"
                          autoComplete="off"
                          spellCheck={false}
                          className="h-8 min-w-0 flex-1 bg-transparent px-2 text-base font-bold uppercase tracking-[0.05em] text-slate-900 placeholder:text-xs placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none disabled:opacity-60 sm:text-[11.5px] sm:placeholder:text-[11px]"
                        />
                        {couponCode.length > 0 && !isApplyingCoupon && (
                          <button
                            type="button"
                            onClick={() => {
                              setCouponCode('');
                              if (couponError) setCouponError('');
                            }}
                            aria-label={t('cart.clearCoupon')}
                            className="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isApplyingCoupon}
                          className={`banner-cta-shine inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md px-3 text-[11px] font-extrabold text-white transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap ${
                            couponCode.trim().length > 0
                              ? 'bg-[#D9232D] hover:bg-[#be1d26]'
                              : 'bg-slate-900 hover:bg-slate-800'
                          }`}
                        >
                          {isApplyingCoupon && !applyingOfferCode ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                          ) : (
                            t('cart.apply')
                          )}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {couponError && (
                    <div
                      id={couponErrorId}
                      role="alert"
                      aria-live="polite"
                      data-testid="cart-coupon-error"
                      className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-rose-200/90 bg-rose-50/90 px-2 py-1.5 text-[10.5px] font-semibold text-rose-700"
                    >
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-[#D9232D]" aria-hidden="true" />
                      <span className="min-w-0 break-words">{couponError}</span>
                    </div>
                  )}
                </div>

                {/* Compact Offers List */}
                {!(appliedCoupon && !couponOffersLoading && !couponOffersError && eligibleCouponOffers.length === 0) && (
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    {couponOffersLoading ? (
                      <div aria-busy="true">
                        <span className="sr-only">{t('cart.loadingCoupons')}</span>
                        <div className="h-11 rounded-lg border border-slate-100 bg-slate-50/90 animate-pulse" />
                      </div>
                    ) : couponOffersError ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-2 py-1.5 text-[10px] font-semibold text-amber-900">
                        <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" aria-hidden="true" />
                        <span>{couponOffersError}</span>
                      </div>
                    ) : eligibleCouponOffers.length === 0 ? (
                      <p className="py-1 text-center text-[10.5px] font-medium text-slate-400">
                        {t('cart.noEligibleCoupons')}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {visibleCouponOffers.map((offer) => {
                          const status = getCouponOfferStatus(offer, subtotal);
                          const isThisOfferApplying = isApplyingCoupon && applyingOfferCode === offer.code.trim().toUpperCase();
                          const formattedExpiry = new Intl.DateTimeFormat(
                            language === 'bn' ? 'bn-IN' : 'en-IN',
                            { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' },
                          ).format(new Date(offer.expires_at));
                          const discountHeadline =
                            offer.discount_type === 'PERCENTAGE'
                              ? `${offer.discount_value}% ${t('cart.off')}`
                              : `${formatMoney(offer.discount_value)} ${t('cart.off')}`;

                          return (
                            <div
                              key={offer.code}
                              data-testid={`cart-coupon-offer-${offer.code}`}
                              className={`rounded-lg border border-l-[3px] px-2.5 py-1.5 transition-all ${
                                status.isUnlocked
                                  ? 'border-slate-200/85 border-l-[#D9232D] bg-white hover:border-[#D9232D]/40'
                                  : 'border-slate-200/70 border-l-slate-300 bg-slate-50/70'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                    <span
                                      className={`text-[11.5px] font-black tracking-tight tabular-nums ${
                                        status.isUnlocked ? 'text-slate-900' : 'text-slate-600'
                                      }`}
                                    >
                                      {discountHeadline}
                                    </span>
                                    <span
                                      className={`rounded border border-dashed px-1.5 py-px font-mono text-[9.5px] font-extrabold tracking-wide ${
                                        status.isUnlocked
                                          ? 'border-[#D9232D]/35 bg-rose-50/70 text-[#D9232D]'
                                          : 'border-slate-300 bg-white text-slate-500'
                                      }`}
                                    >
                                      {offer.code}
                                    </span>
                                    {status.isUnlocked && status.estimatedSavings !== null && status.estimatedSavings > 0 ? (
                                      <span className="text-[10px] font-bold text-emerald-700 tabular-nums">
                                        {t('cart.estimatedSavings', { amount: formatMoney(status.estimatedSavings) })}
                                      </span>
                                    ) : offer.discount_type === 'PERCENTAGE' && offer.max_discount !== null && offer.max_discount > 0 ? (
                                      <span className="text-[9.5px] font-semibold text-slate-500 tabular-nums">
                                        {t('cart.upTo', { amount: formatMoney(offer.max_discount) })}
                                      </span>
                                    ) : null}
                                  </div>

                                  {status.isUnlocked ? (
                                    <p className="mt-0.5 truncate text-[9.5px] font-medium text-slate-500 tabular-nums">
                                      {status.minimumOrder > 0
                                        ? t('cart.minimumOrder', { amount: formatMoney(status.minimumOrder) })
                                        : t('cart.noMinimum')}
                                      {offer.discount_type === 'PERCENTAGE' && offer.max_discount !== null && offer.max_discount > 0
                                        ? ` · ${t('cart.upTo', { amount: formatMoney(offer.max_discount) })}`
                                        : ''}
                                      {' · '}
                                      {t('cart.validUntil', { date: formattedExpiry })}
                                    </p>
                                  ) : (
                                    <div className="mt-0.5">
                                      <p className="text-[9.5px] font-bold text-amber-800 tabular-nums">
                                        {t('cart.addMoreToUnlock', { amount: formatMoney(status.remainingAmount) })}
                                      </p>
                                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200/85">
                                        <div
                                          className="h-full rounded-full bg-[#D9232D]/75 transition-all duration-200"
                                          style={{ width: `${status.progressPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {status.isUnlocked ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleApplyCoupon(offer.code)}
                                    disabled={isApplyingCoupon}
                                    aria-label={`${t('cart.apply')} ${offer.code}`}
                                    className="inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-rose-200/90 bg-rose-50/90 px-2.5 text-[10.5px] font-extrabold text-[#D9232D] transition-all hover:border-[#D9232D] hover:bg-[#D9232D] hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                                  >
                                    {isThisOfferApplying ? (
                                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                    ) : (
                                      t('cart.apply')
                                    )}
                                  </button>
                                ) : (
                                  <span
                                    className="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-md bg-slate-200/70 text-slate-400"
                                    aria-hidden="true"
                                  >
                                    <Lock className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {eligibleCouponOffers.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setShowAllOffers((prev) => !prev)}
                            className="flex h-7 w-full items-center justify-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50/80 text-[10.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <span>
                              {showAllOffers
                                ? t('cart.showFewerOffers')
                                : t('cart.showAllOffers', { count: eligibleCouponOffers.length })}
                            </span>
                            {showAllOffers ? (
                              <ChevronUp className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-3 w-3" aria-hidden="true" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
            </div>
          </div>

          {/* Bottom Billing Breakdown & Checkout CTA */}
          {items.length > 0 && (
            <div className="shrink-0 p-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] space-y-2.5">
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatMoney(displayedSubtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{t('cart.coupon', { code: appliedCoupon.code })}</span>
                    <span>-{formatMoney(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-600">
                  <span>{t('cart.storePickup')}</span>
                  <strong>{t('cart.free')}</strong>
                </div>
                <div className="flex justify-between text-[13.5px] font-black text-gray-900 pt-1 border-t border-gray-100">
                  <span>{t('cart.grandTotal')}</span>
                  <span className="text-[#D9232D]">{formatMoney(grandTotal)}</span>
                </div>
              </div>

              <motion.button
                whileHover={hasUnavailableItems ? undefined : { scale: 1.015 }}
                whileTap={hasUnavailableItems ? undefined : { scale: 0.97 }}
                onClick={() => onProceedToCheckout(discount, appliedCoupon?.code || '', appliedCoupon ? { subtotal: appliedCoupon.subtotal, total: appliedCoupon.total } : undefined)} disabled={hasUnavailableItems}
                className="banner-cta-shine group/cta w-full min-h-11 py-2.5 bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] hover:brightness-105 text-white rounded-xl text-[12.5px] font-black shadow-[0_8px_20px_-4px_rgba(217,35,45,0.4)] hover:shadow-[0_10px_24px_-4px_rgba(217,35,45,0.5)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                <span>{hasUnavailableItems ? t('cart.removeUnavailable') : t('cart.proceedCheckout')}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
              </motion.button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{t('cart.secureOrder')}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
