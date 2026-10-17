import { useEffect, useState } from 'react';
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

const money = formatInr;
const orderDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
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

const screenClass = 'fixed inset-0 z-[70] flex min-h-0 flex-col overflow-hidden bg-[#f5f6f8] font-sans text-slate-900';

export function OrderNotificationDetails({
  userId,
  orderNumber,
  initialOrder,
  notificationTitle,
  notificationBody,
  onBack,
  onOpenMyOrders,
}: {
  userId: string;
  orderNumber: string;
  initialOrder?: CustomerOrderRecord | null;
  notificationTitle?: string;
  notificationBody?: string;
  onBack: () => void;
  onOpenMyOrders: (orderNumber: string) => void;
}) {
  const { t, language } = useI18n();
  const locale = language === 'bn' ? 'bn-IN' : 'en-IN';
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [order, setOrder] = useState<CustomerOrderRecord | null>(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [loadError, setLoadError] = useState(false);

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
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}`;

  if (loading) return <main className={screenClass} style={viewportStyle}>
    <OrderHeader orderNumber={orderNumber} onBack={onBack} />
    <div className="mx-auto min-h-0 w-full max-w-xl flex-1 space-y-3 overflow-y-auto p-4" aria-label={t('common.loading')}>
      {[0, 1, 2].map((key) => <div key={key} className="h-24 animate-pulse rounded-3xl bg-white" />)}
    </div>
  </main>;

  if (!order || loadError) return <main className={screenClass} style={viewportStyle}>
    <OrderHeader orderNumber={orderNumber} onBack={onBack} />
    <div className="mx-auto w-full max-w-xl flex-1 p-4">
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('notification.orderLoadFailed')}</div>
      <button type="button" onClick={() => onOpenMyOrders(orderNumber)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#d9232d] px-4 text-sm font-extrabold text-white">{t('notification.openMyOrders')} <ArrowRight className="h-4 w-4" /></button>
    </div>
  </main>;

  const cancelled = order.status === 'CANCELLED';
  const activeStage = stageFor(order.status);
  const items = order.order_items || [];
  const units = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const statusTone = cancelled
    ? 'bg-rose-100 text-rose-800'
    : order.status === 'COMPLETED' || order.status === 'PICKED_UP'
      ? 'bg-emerald-100 text-emerald-800'
      : order.status === 'READY_FOR_PICKUP'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-rose-100 text-[#b51e29]';

  return <main className={screenClass} style={viewportStyle}>
    <OrderHeader orderNumber={order.order_number} onBack={onBack} />

    <div className="mx-auto min-h-0 w-full max-w-xl flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4 pt-4 sm:space-y-4 sm:px-5 sm:pt-5">
      <section className="relative isolate overflow-hidden rounded-[26px] border border-rose-100 bg-gradient-to-br from-[#fff0f1] via-white to-[#fff8f6] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.045)] sm:p-5">
        <PackageCheck aria-hidden="true" className="pointer-events-none absolute right-5 top-[42%] h-24 w-24 -translate-y-1/2 rotate-[-8deg] text-[#d9232d]/10 sm:right-8 sm:h-28 sm:w-28" />
        <span aria-hidden="true" className="pointer-events-none absolute right-5 top-[48%] h-11 w-11 rounded-full border-[5px] border-white bg-rose-100/80 shadow-sm" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-white text-[#d9232d] shadow-[0_4px_16px_rgba(15,23,42,0.07)]">
            <Truck className="h-8 w-8" strokeWidth={2.2} />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-emerald-600 text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold shadow-sm ${statusTone}`}>
            <span className="grid h-4 w-4 place-items-center rounded-full bg-current/10">{cancelled ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" strokeWidth={3} />}</span>
            {statusKeys[order.status] ? t(statusKeys[order.status]) : order.status.replaceAll('_', ' ').toLowerCase()}
          </span>
        </div>
        <p className="relative mt-4 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#c92330]">{t('notification.latestUpdate')}</p>
        <h2 className="relative mt-1 max-w-[88%] text-[25px] font-black leading-[1.12] tracking-tight text-slate-950 sm:max-w-[84%] sm:text-[30px]">{notificationTitle || (statusKeys[order.status] ? t(statusKeys[order.status]) : order.status.replaceAll('_', ' ').toLowerCase())}</h2>
        <p className="relative mt-2 max-w-[88%] text-[13px] leading-relaxed text-slate-600 sm:text-[15px]">{notificationBody || (statusDescriptionKeys[order.status] ? t(statusDescriptionKeys[order.status]) : t('notification.statusUpdated'))}</p>
        <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rose-100 pt-3 text-[10px] font-semibold text-slate-600 sm:text-[11px]">
          <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-slate-500" /><span className="font-mono">#{order.order_number}</span></span>
          <span className="hidden h-5 w-px bg-rose-200 sm:block" aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 shrink-0 text-slate-500" />{t('notification.placed')} {orderDate(order.created_at, locale)}</span>
        </div>
      </section>

      {!cancelled && <section aria-label={t('orders.progress')} className="rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_5px_18px_rgba(15,23,42,0.04)] sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[15px] font-extrabold text-slate-950">{t('notification.progress')}</h3><span className="text-[11px] font-extrabold text-[#c92330]">{t('notification.step', { current: activeStage + 1, total: stages.length })}</span></div>
        <div className="relative">
          <div className="absolute left-[12.5%] right-[12.5%] top-[17px] h-1.5 rounded-full bg-slate-200" aria-hidden="true">
            <span className="block h-full rounded-full bg-[#d9232d] transition-[width] duration-300" style={{ width: `${(activeStage / (stages.length - 1)) * 100}%` }} />
          </div>
          <ol className="relative grid grid-cols-4 gap-1">
            {stages.map((stage, index) => {
              const isDone = index <= activeStage;
              return <li key={stage} aria-current={index === activeStage ? 'step' : undefined} className="flex min-w-0 flex-col items-center text-center">
                <span className={`grid h-[35px] w-[35px] place-items-center rounded-full border-[3px] border-white shadow-sm ${isDone ? 'bg-[#d9232d] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="text-[11px] font-extrabold">{index + 1}</span>}
                </span>
                <span className={`mt-1.5 max-w-full truncate text-[9px] font-bold sm:text-[10px] ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>{t(stage)}</span>
              </li>;
            })}
          </ol>
        </div>
      </section>}

      <section className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-[0_5px_18px_rgba(15,23,42,0.035)] sm:p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-[#d9232d]"><Package className="h-5 w-5" /></span>
          <p className="mt-2 text-[11px] font-semibold text-slate-500">{t('orders.orderItems')}</p>
          <p className="mt-0.5 text-[18px] font-black text-slate-950">{t('notification.orderUnits', { count: units })}</p>
        </div>
        <div className="rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-[0_5px_18px_rgba(15,23,42,0.035)] sm:p-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><span className="text-xl font-black leading-none">₹</span></span>
          <p className="mt-2 text-[11px] font-semibold text-slate-500">{t('notification.orderTotal')}</p>
          <p className="mt-0.5 text-[18px] font-black text-slate-950">{money(order.total)}</p>
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[15px] font-extrabold text-slate-950">{t('checkout.orderSummary')}</h3><span className="text-[10px] font-semibold text-slate-400">{t('notification.productCount', { count: items.length })}</span></div>
        {items.length ? <div className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const options = [
              item.color,
              item.selected_thickness && t('orders.thickness', { value: item.selected_thickness }),
              item.selected_stitch && t('orders.stitch', { value: item.selected_stitch }),
            ].filter(Boolean);
            return <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-1">
              <div className="grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#fff3f1] text-[#c92330]">
                {item.image_url ? <img src={item.image_url} alt={item.product_name} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-extrabold text-slate-950">{item.product_name}</p><p className="mt-1 truncate text-[11px] text-slate-500">{options.length ? `${options.join(' · ')} · ` : ''}{t('orders.quantity', { count: item.quantity })}</p>
                {item.custom_embroidery_text && <p className="mt-1 truncate text-[9px] text-slate-500">{t('orders.embroidery', { value: item.custom_embroidery_text })}</p>}
              </div>
              <p className="shrink-0 text-[12px] font-extrabold text-slate-950">{money(Number(item.unit_price || 0) * Number(item.quantity || 0))}</p>
            </div>;
          })}
        </div> : <p className="py-3 text-xs text-slate-500">{t('orders.noItems')}</p>}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]"><span className="font-medium text-slate-600">{t('orders.storePickupOrder')}</span><span className="font-extrabold text-slate-950">{money(order.total)}</span></div>
      </section>

      <section className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#d9232d]"><MapPin className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-[12px] font-extrabold text-slate-950">{t('checkout.pickupAt', { store: order.pickup_store || WORKSHOP_INFO.name })}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{WORKSHOP_INFO.address}</p></div>
          <a href={mapHref} target="_blank" rel="noreferrer" aria-label={t('notification.openMap')} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9232d]"><Navigation className="h-5 w-5" /></a>
        </div>
      </section>
    </div>

    <footer className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-5px_20px_rgba(15,23,42,0.07)] backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-[1fr_auto] gap-2.5">
        <button type="button" aria-label={t('notification.openOrderAria', { orderNumber: order.order_number })} onClick={() => onOpenMyOrders(order.order_number)} className="flex min-h-[56px] items-center justify-center gap-2 rounded-[18px] bg-[#d9232d] px-4 text-[14px] font-extrabold text-white shadow-[0_5px_14px_rgba(217,35,45,0.18)] transition hover:bg-[#c91d2a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 active:scale-[0.99]"><Store className="h-5 w-5" />{t('notification.openOrder')} <span className="sr-only">{t('notification.openOrderSr')}</span><ArrowRight className="h-5 w-5" /></button>
        <a href={phoneHref} aria-label={t('notification.callStore')} className="grid min-h-[56px] min-w-[56px] place-items-center rounded-[18px] border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9232d]"><Phone className="h-5 w-5" /></a>
      </div>
    </footer>
  </main>;
}

function OrderHeader({ orderNumber, onBack }: { orderNumber: string; onBack: () => void }) {
  const { t } = useI18n();
  return <header className="relative z-10 mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 bg-gradient-to-br from-[#d9232d] to-[#c51d29] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 text-white shadow-[0_7px_22px_rgba(190,29,41,0.16)] sm:px-5">
    <button type="button" onClick={onBack} aria-label={t('notification.back')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ArrowLeft className="h-6 w-6" /></button>
    <div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/75">{t('notification.header')}</p><h1 className="truncate text-[22px] font-black leading-tight tracking-tight sm:text-[25px]">{t('notification.orderUpdate')}</h1></div>
    <span className="max-w-[44%] shrink-0 truncate rounded-full border border-white/50 bg-white/90 px-3 py-2 font-mono text-[10px] font-bold text-slate-700 shadow-sm sm:text-[11px]">#{orderNumber}</span>
  </header>;
}
