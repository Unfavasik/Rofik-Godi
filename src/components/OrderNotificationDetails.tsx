import { useCallback, useEffect, useRef, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileText,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Phone,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';
import { getMyOrderByNumber } from '../lib/supabaseOrders';
import type { CustomerOrderRecord } from '../types';
import { formatInr, useI18n, type TranslationKey } from '../lib/i18n';
import { isOrderComplete } from '../lib/orderPresentation';

const money = formatInr;
const orderDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(date);
  return `${dateLabel}, ${timeLabel}`;
};

const statusKeys: Record<string, TranslationKey> = {
  NEW: 'status.received',
  CONFIRMED: 'status.confirmed',
  PREPARING: 'status.preparing',
  READY_FOR_PICKUP: 'status.ready',
  PICKED_UP: 'status.completed',
  COMPLETED: 'status.completed',
  CANCELLED: 'status.cancelled',
};
const statusDescriptionKeys: Record<string, TranslationKey> = {
  NEW: 'status.receivedDescription',
  CONFIRMED: 'status.confirmedDescription',
  PREPARING: 'status.preparingDescription',
  READY_FOR_PICKUP: 'status.readyDescription',
  PICKED_UP: 'status.completedDescription',
  COMPLETED: 'status.completedDescription',
  CANCELLED: 'status.cancelledDescription',
};
const stages: TranslationKey[] = ['notification.stageReceived', 'status.confirmed', 'status.ready', 'status.pickedUp'];
const stageFor = (status: string) => {
  if (status === 'CONFIRMED' || status === 'PREPARING') return 1;
  if (status === 'READY_FOR_PICKUP') return 2;
  if (status === 'PICKED_UP' || status === 'COMPLETED') return 3;
  return 0;
};

const screenClass = 'fixed inset-0 z-[70] flex min-h-0 flex-col overflow-hidden bg-[#F8FAFC] font-sans text-slate-900';

export function OrderNotificationDetails({
  userId,
  orderNumber,
  initialOrder,
  notificationTitle,
  notificationBody,
  onBuyAgain,
  autoBuyAgain = false,
  onBack,
  onOpenMyOrders,
}: {
  userId: string;
  orderNumber: string;
  initialOrder?: CustomerOrderRecord | null;
  notificationTitle?: string;
  notificationBody?: string;
  onBuyAgain?: (order: CustomerOrderRecord) => Promise<{ error?: string }>;
  autoBuyAgain?: boolean;
  onBack: () => void;
  onOpenMyOrders: (orderSlug?: string) => void;
}) {
  const { t, language } = useI18n();
  const locale = language === 'bn' ? 'bn-IN' : 'en-IN';
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [order, setOrder] = useState<CustomerOrderRecord | null>(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [loadError, setLoadError] = useState(false);
  const autoBuyAgainHandledRef = useRef(false);
  const [buyAgainLoading, setBuyAgainLoading] = useState(false);
  const [buyAgainError, setBuyAgainError] = useState('');

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

  useEffect(() => {
    let active = true;
    if (initialOrder) {
      setOrder(initialOrder);
      setLoading(false);
      setLoadError(false);
      return () => { active = false; };
    }
    setLoading(true);
    setLoadError(false);
    void getMyOrderByNumber(userId, orderNumber)
      .then((result) => {
        if (!active) return;
        setOrder(result);
        setLoadError(!result);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [initialOrder, orderNumber, userId]);

  const viewportStyle = { height: viewportHeight ? `${viewportHeight}px` : '100dvh' };
  const phoneHref = `tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`;
  const mapHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}&travelmode=driving`;
  const openDirections = () => {
    if (!Capacitor.isNativePlatform()) {
      window.open(mapHref, '_blank', 'noopener,noreferrer');
      return;
    }
    void Browser.open({ url: mapHref }).catch(() => window.open(mapHref, '_blank', 'noopener,noreferrer'));
  };
  const handleBuyAgain = useCallback(async () => {
    if (!order || !onBuyAgain || buyAgainLoading) return;
    setBuyAgainLoading(true);
    setBuyAgainError('');
    try {
      const result = await onBuyAgain(order);
      if (result.error) setBuyAgainError(result.error);
    } catch (error) {
      setBuyAgainError(error instanceof Error ? error.message : 'The items could not be added to your cart. Please try again.');
    } finally {
      setBuyAgainLoading(false);
    }
  }, [buyAgainLoading, onBuyAgain, order]);

  useEffect(() => {
    if (!autoBuyAgain || autoBuyAgainHandledRef.current || !order || loading || loadError || !onBuyAgain || !isOrderComplete(order.status)) return;
    autoBuyAgainHandledRef.current = true;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('buyAgain');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // The action still proceeds when history state is unavailable in an embedded WebView.
    }
    void handleBuyAgain();
  }, [autoBuyAgain, handleBuyAgain, loadError, loading, onBuyAgain, order]);

  if (loading) {
    return (
      <main className={screenClass} style={viewportStyle}>
        <OrderHeader orderNumber={orderNumber} onBack={onBack} />
        <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" aria-label={t('common.loading')}>
          <div className="rounded-3xl border border-slate-200/85 bg-white p-5 space-y-3">
            <div className="skeleton-shimmer h-12 w-12 rounded-2xl bg-rose-50" />
            <div className="skeleton-shimmer h-6 w-2/3 rounded-lg bg-slate-200/80" />
            <div className="skeleton-shimmer h-4 w-full rounded bg-slate-100" />
          </div>
          <div className="rounded-3xl border border-slate-200/85 bg-white p-5 space-y-3">
            <div className="skeleton-shimmer h-4 w-32 rounded bg-slate-200/75" />
            <div className="skeleton-shimmer h-10 w-full rounded-xl bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton-shimmer h-24 rounded-3xl border border-slate-200/85 bg-white" />
            <div className="skeleton-shimmer h-24 rounded-3xl border border-slate-200/85 bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (!order || loadError) {
    return (
      <main className={screenClass} style={viewportStyle}>
        <OrderHeader orderNumber={orderNumber} onBack={onBack} />
        <div className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-5">
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t('notification.orderLoadFailed')}
          </div>
          <button
            type="button"
            onClick={() => onOpenMyOrders()}
            className="banner-cta-shine group/cta mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#D9232D] px-4 text-sm font-extrabold text-white shadow-sm hover:brightness-105 active:scale-[0.98]"
          >
            <span>{t('notification.openMyOrders')}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          </button>
        </div>
      </main>
    );
  }

  const cancelled = order.status === 'CANCELLED';
  const activeStage = stageFor(order.status);
  const items = order.order_items || [];
  const units = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const statusTone = cancelled
    ? 'text-rose-700'
    : order.status === 'COMPLETED' || order.status === 'PICKED_UP'
      ? 'text-emerald-700'
      : order.status === 'READY_FOR_PICKUP'
        ? 'text-blue-700'
        : 'text-[#D9232D]';

  return (
    <main className={screenClass} style={viewportStyle}>
      <OrderHeader orderNumber={order.order_number} onBack={onBack} />

      <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-3.5 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-4 pt-4 sm:space-y-4 sm:px-5 sm:pt-5">
        <section className="relative isolate overflow-hidden rounded-3xl border border-rose-100/90 bg-gradient-to-br from-[#FFF1F2] via-white to-[#FFF8F7] p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-5">
          <PackageCheck aria-hidden="true" className="pointer-events-none absolute right-4 top-6 h-24 w-24 rotate-[-8deg] text-[#D9232D]/[0.07] sm:right-6 sm:h-28 sm:w-28" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#D9232D] shadow-2xs ring-1 ring-rose-100">
              <Truck className="h-6 w-6" strokeWidth={2.2} />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-emerald-600 text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </span>
            <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-extrabold ${statusTone}`}>
              {cancelled ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.8} />}
              <span>{statusKeys[order.status] ? t(statusKeys[order.status]) : order.status.replaceAll('_', ' ').toLowerCase()}</span>
            </span>
          </div>
          <p className="relative mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D9232D]">
            {t('notification.latestUpdate')}
          </p>
          <h2 className="relative mt-1 max-w-[90%] text-[22px] font-black leading-[1.15] tracking-tight text-slate-950 sm:text-[26px]">
            {notificationTitle || (statusKeys[order.status] ? t(statusKeys[order.status]) : order.status.replaceAll('_', ' ').toLowerCase())}
          </h2>
          <p className="relative mt-2 max-w-[92%] text-[13.5px] leading-relaxed text-slate-600 sm:text-[14.5px]">
            {notificationBody || (statusDescriptionKeys[order.status] ? t(statusDescriptionKeys[order.status]) : t('notification.statusUpdated'))}
          </p>
          <div className="relative mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-rose-100/80 pt-3 text-[11.5px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-mono tabular-nums">#{order.order_number}</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{t('notification.placed')} {orderDate(order.created_at, locale)}</span>
            </span>
          </div>
        </section>

        {!cancelled && (
          <section aria-label={t('orders.progress')} className="rounded-3xl border border-slate-200/85 bg-white px-4 py-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)] sm:px-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[14.5px] font-extrabold text-slate-950">{t('notification.progress')}</h3>
              <span className="text-[11.5px] font-extrabold tabular-nums text-[#D9232D]">
                {t('notification.step', { current: activeStage + 1, total: stages.length })}
              </span>
            </div>
            <div className="relative">
              <div className="absolute left-[12.5%] right-[12.5%] top-[17px] h-1.5 rounded-full bg-slate-200" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-[#D9232D] transition-[width] duration-300"
                  style={{ width: `${(activeStage / (stages.length - 1)) * 100}%` }}
                />
              </div>
              <ol className="relative grid grid-cols-4 gap-1">
                {stages.map((stage, index) => {
                  const isDone = index <= activeStage;
                  return (
                    <li key={stage} aria-current={index === activeStage ? 'step' : undefined} className="flex min-w-0 flex-col items-center text-center">
                      <span className={`grid h-[35px] w-[35px] place-items-center rounded-full border-[3px] border-white shadow-sm ${isDone ? 'bg-[#D9232D] text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="text-[11px] font-extrabold tabular-nums">{index + 1}</span>}
                      </span>
                      <span className={`mt-1.5 max-w-full truncate text-[10px] font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                        {t(stage)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-[#D9232D]">
              <Package className="h-5 w-5" />
            </span>
            <p className="mt-2.5 text-[11.5px] font-semibold text-slate-500">{t('orders.orderItems')}</p>
            <p className="mt-0.5 text-[18px] font-black tabular-nums text-slate-950">
              {t('notification.orderUnits', { count: units })}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <span className="text-lg font-black leading-none">₹</span>
            </span>
            <p className="mt-2.5 text-[11.5px] font-semibold text-slate-500">{t('notification.orderTotal')}</p>
            <p className="mt-0.5 text-[18px] font-black tabular-nums text-slate-950">{money(order.total)}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[14.5px] font-extrabold text-slate-950">{t('checkout.orderSummary')}</h3>
            <span className="text-[11px] font-semibold tabular-nums text-slate-400">
              {t('notification.productCount', { count: items.length })}
            </span>
          </div>
          {items.length ? (
            <div className="divide-y divide-slate-100">
              {items.map((item, index) => {
                const options = [
                  item.color,
                  item.selected_thickness && t('orders.thickness', { value: item.selected_thickness }),
                  item.selected_stitch && t('orders.stitch', { value: item.selected_stitch }),
                ].filter(Boolean);
                return (
                  <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-1">
                    <div className="grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-rose-50 text-[#D9232D]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-extrabold text-slate-950">{item.product_name}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                        {options.length ? `${options.join(' · ')} · ` : ''}
                        {t('orders.quantity', { count: item.quantity })}
                      </p>
                      {item.custom_embroidery_text && (
                        <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
                          {t('orders.embroidery', { value: item.custom_embroidery_text })}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-[13px] font-extrabold tabular-nums text-slate-950">
                      {money(Number(item.unit_price || 0) * Number(item.quantity || 0))}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-3 text-xs text-slate-500">{t('orders.noItems')}</p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[12px]">
            <span className="font-medium text-slate-600">{t('orders.storePickupOrder')}</span>
            <span className="font-extrabold tabular-nums text-slate-950">{money(order.total)}</span>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-950">
                {t('checkout.pickupAt', { store: order.pickup_store || WORKSHOP_INFO.name })}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{WORKSHOP_INFO.address}</p>
            </div>
            <a
              href={mapHref}
              onClick={(event) => {
                event.preventDefault();
                openDirections();
              }}
              aria-label={t('notification.openMap')}
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
            >
              <Navigation className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>

      <footer className="shrink-0 border-t border-slate-200/80 bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur-md sm:px-5">
        <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto] gap-2.5">
          <button
            type="button"
            aria-label={t('notification.openOrderAria', { orderNumber: order.order_number })}
            onClick={() => onOpenMyOrders(order.order_slug)}
            className="banner-cta-shine group/cta flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 text-sm font-extrabold text-white shadow-sm transition-all hover:brightness-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 active:scale-[0.98]"
          >
            <Store className="h-4 w-4" />
            <span>{t('notification.openOrder')}</span>
            <span className="sr-only">{t('notification.openOrderSr')}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          </button>
          <a
            href={phoneHref}
            aria-label={t('notification.callStore')}
            className="grid min-h-12 min-w-12 place-items-center rounded-2xl border border-slate-200/90 bg-white text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
          >
            <Phone className="h-5 w-5" />
          </a>
          {isOrderComplete(order.status) && onBuyAgain && (
            <button
              type="button"
              onClick={() => void handleBuyAgain()}
              disabled={buyAgainLoading}
              className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-[#D9232D] transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
            >
              {buyAgainLoading ? <Clock3 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              <span>{buyAgainLoading ? t('orders.adding') : t('orders.buyAgain')}</span>
            </button>
          )}
          {buyAgainError && (
            <p role="alert" className="col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
              {buyAgainError}
            </p>
          )}
        </div>
      </footer>
    </main>
  );
}

function OrderHeader({ orderNumber, onBack }: { orderNumber: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <header className="relative z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[58px] w-full max-w-2xl shrink-0 items-center gap-3 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('notification.back')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D9232D]">{t('notification.header')}</p>
          <h1 className="truncate text-[19px] font-black leading-tight tracking-tight text-slate-900 sm:text-[21px]">
            {t('notification.orderUpdate')}
          </h1>
        </div>
        <span className="max-w-[44%] shrink-0 truncate font-mono text-xs font-bold tabular-nums text-slate-600">
          #{orderNumber}
        </span>
      </div>
    </header>
  );
}
