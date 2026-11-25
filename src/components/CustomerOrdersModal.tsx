import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  LoaderCircle,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Phone,
  Printer,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Store,
  Truck,
  X,
} from 'lucide-react';
import type { CustomerOrderRecord, Product } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import type { ProductReviewRecord } from '../lib/supabaseReviews';
import { canCancelCustomerOrder, getCustomerOrderTimeline, getOrderPreviewItems, isOrderComplete } from '../lib/orderPresentation';
import { getCustomerOrderDeepLinkLookupKey } from '../lib/customerOrderDeepLink';
import { cancelMyOrder, getMyOrderBySlug, listMyOrderStatusHistory } from '../lib/supabaseOrders';
import { InvoiceTemplate } from './InvoiceTemplate';
import { GuaranteeTerms } from './GuaranteeTerms';
import { PickupQrCard } from './PickupQrCard';
import { ConfirmDialog } from './ConfirmDialog';
import { CustomerOrderDetailsSkeleton, CustomerOrdersListSkeleton } from './AccountPageSkeleton';
import { formatInr, useI18n, type TranslationKey } from '../lib/i18n';
import type { PreferredLanguage } from '../lib/customerPreferences';
import { readSwrCache, writeSwrCache } from '../lib/swrCache';
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';

interface CustomerOrdersModalProps {
  orders: CustomerOrderRecord[];
  products?: Product[];
  reviews: ProductReviewRecord[];
  loading: boolean;
  error?: string;
  customerName: string;
  currentUserId: string;
  initialOrderSlug?: string | null;
  onInitialOrderOpened?: () => void;
  onSelectOrderRoute?: (orderSlug: string) => void;
  onBackToOrdersRoute?: () => void;
  onClose: () => void;
  onRefresh?: () => Promise<void> | void;
  onNeedHelp?: (order: CustomerOrderRecord) => void;
  onReview: (order: CustomerOrderRecord, productId: string, productTitle: string, review?: ProductReviewRecord) => void;
  onBuyAgain?: (order: CustomerOrderRecord) => Promise<BuyAgainResult>;
}

type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';
export type BuyAgainResult = { addedCount: number; skippedItems: string[]; error?: string };

type Translate = ReturnType<typeof useI18n>['t'];
const statusName = (status: string, t: Translate) => {
  const keys: Record<string, TranslationKey> = {
    NEW: 'status.received', CONFIRMED: 'status.confirmed', PREPARING: 'status.preparing',
    READY_FOR_PICKUP: 'status.ready', PICKED_UP: 'status.completed', COMPLETED: 'status.completed', CANCELLED: 'status.cancelled',
  };
  return keys[status] ? t(keys[status]) : status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
};

const formatMoney = formatInr;
const formatDate = (value: string, includeTime = false, language: PreferredLanguage = 'en') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-IN' : 'en-IN', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
};

const statusTone = (status: string) => {
  if (status === 'COMPLETED' || status === 'PICKED_UP') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'CANCELLED') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'READY_FOR_PICKUP') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  const { t } = useI18n();
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-extrabold ${statusTone(status)}`}>
    {isOrderComplete(status) ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {statusName(status, t)}
  </span>;
};

const ProductThumb = ({ name, image, className = '' }: { name: string; image?: string | null; className?: string }) => (
  <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200/80 bg-gradient-to-br from-[#fff7f2] to-[#f2f4f7] ${className}`}>
    {image
      ? <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" />
      : <Package className="h-4.5 w-4.5 text-[#c05a47]" aria-hidden="true" />}
  </div>
);

const OrderTimeline = ({ orderId, status, createdAt }: { orderId: string; status: string; createdAt: string }) => {
  const { t, language } = useI18n();
  const historyCacheKey = `user:order-history:${orderId}`;
  const [history, setHistory] = useState<{ to_status: string; created_at: string }[]>(
    () => readSwrCache<{ to_status: string; created_at: string }[]>(historyCacheKey) ?? [],
  );
  const [historyLoading, setHistoryLoading] = useState(
    () => readSwrCache(historyCacheKey) === undefined,
  );
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = readSwrCache<{ to_status: string; created_at: string }[]>(historyCacheKey);
    if (cached !== undefined) {
      setHistory(cached);
      setHistoryLoading(false);
    } else {
      setHistoryLoading(true);
    }
    setHistoryError(false);
    void listMyOrderStatusHistory(orderId)
      .then((rows) => {
        if (active) {
          setHistory(rows);
          writeSwrCache(historyCacheKey, rows);
        }
      })
      .catch(() => {
        if (active && cached === undefined) setHistoryError(true);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, [historyCacheKey, orderId, status]);

  const steps = getCustomerOrderTimeline(status, createdAt, history);
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  const iconFor = (key: string) => key === 'placed' ? Package
    : key === 'confirmed' ? ShieldCheck
      : key === 'ready' ? MapPin
        : key === 'cancelled' ? X : PackageCheck;

  return (
    <div id="customer-order-progress" aria-label={t('orders.progress')} className="overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div><p className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{t('orders.progress')}</p><p className="mt-0.5 text-[12px] font-black text-slate-900">{statusName(status, t)}</p></div>
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold text-[#c92330]">{currentIndex + 1} / {steps.length}</span>
      </div>
      {historyLoading && (
        <p
          role="status"
          className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600"
        >
          <LoaderCircle className="h-3 w-3 animate-spin text-[#d9232d]" aria-hidden="true" />
          {t('orders.loadingDates')}
        </p>
      )}
      {historyError && <p role="alert" className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">{t('orders.datesFailed')}</p>}
      {!historyLoading && !historyError && history.length === 0 && <p className="mb-2 text-[11px] font-medium text-slate-500">{t('orders.noChanges')}</p>}
      {status === 'CANCELLED' && <p className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800">{t('orders.cancelledHelp')}</p>}
      <ol className="space-y-0" aria-label={t('orders.progress')}>
        {steps.map((step, index) => {
          const Icon = iconFor(step.key);
          const highlighted = step.state !== 'upcoming';
          return <li key={step.key} className="flex gap-2">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${highlighted ? 'bg-[#d9232d] text-white' : 'bg-slate-200 text-slate-600'} ${step.state === 'current' ? 'ring-2 ring-rose-100' : ''}`}>
                {step.state === 'complete' ? <Check className="h-3 w-3" aria-hidden="true" /> : <Icon className="h-3 w-3" aria-hidden="true" />}
              </span>
              {index < steps.length - 1 && <span className={`min-h-3 w-0.5 flex-1 ${step.state === 'complete' ? 'bg-[#d9232d]' : 'bg-slate-200'}`} />}
            </div>
            <div className={`min-w-0 flex-1 ${index < steps.length - 1 ? 'pb-2.5' : ''}`}>
              <p className={`text-[12px] font-extrabold ${highlighted ? 'text-slate-900' : 'text-slate-500'}`}>{step.key === 'placed' ? t('status.received') : step.key === 'confirmed' ? t('status.confirmed') : step.key === 'ready' ? t('status.ready') : step.key === 'cancelled' ? t('status.cancelled') : t('status.completed')}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                {step.timestamp ? formatDate(step.timestamp, true, language) : step.state === 'current' ? t('orders.currentStatus') : step.state === 'complete' ? t('orders.previousStep') : t('orders.awaitingUpdate')}
              </p>
            </div>
          </li>;
        })}
      </ol>
    </div>
  );
};

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({ orders, products = [], reviews, loading, error, customerName, currentUserId, initialOrderSlug, onInitialOrderOpened, onSelectOrderRoute, onBackToOrdersRoute, onClose, onRefresh, onNeedHelp, onReview, onBuyAgain }) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const initialOrderHandled = useRef<string | null>(null);
  const [directOrder, setDirectOrder] = useState<CustomerOrderRecord | null>(null);
  const [directOrderLoading, setDirectOrderLoading] = useState(false);
  const [directOrderNotFound, setDirectOrderNotFound] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<CustomerOrderRecord | null>(null);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId)
    || (directOrder?.id === selectedOrderId ? directOrder : null);
  const showOrderDetailsSkeleton =
    !selectedOrder && Boolean(initialOrderSlug) && (directOrderLoading || loading) && !directOrderNotFound && !error;
  const completedCount = orders.filter((order) => isOrderComplete(order.status)).length;
  const activeCount = orders.filter((order) => !isOrderComplete(order.status) && order.status !== 'CANCELLED').length;
  const filteredOrders = useMemo(() => orders.filter((order) => {
    if (filter === 'active') return !isOrderComplete(order.status) && order.status !== 'CANCELLED';
    if (filter === 'completed') return isOrderComplete(order.status);
    if (filter === 'cancelled') return order.status === 'CANCELLED';
    return true;
  }), [filter, orders]);

  useEffect(() => {
    if (!onRefresh) return;
    let refreshing = false;
    const refresh = () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      void Promise.resolve(onRefresh()).catch(() => undefined).finally(() => { refreshing = false; });
    };
    const interval = window.setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [onRefresh]);

  useEffect(() => {
    if (!initialOrderSlug) {
      if (initialOrderHandled.current) {
        initialOrderHandled.current = null;
        setSelectedOrderId(null);
        setDirectOrder(null);
        setDirectOrderNotFound(false);
      }
      setDirectOrderLoading(false);
      return;
    }
    const lookupKey = getCustomerOrderDeepLinkLookupKey(currentUserId, initialOrderSlug);
    if (!lookupKey) return;
    if (loading || !currentUserId) return;
    // Prefer the already-loaded list: on slow connections the direct fetch can
    // take seconds, but the target order usually arrives with the list first.
    const shouldAutoOpenInvoice = () => {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'invoice' || Boolean(params.get('verify'));
    };

    const targetOrder = orders.find((order) => order.order_slug?.toLowerCase() === initialOrderSlug.toLowerCase());
    if (targetOrder) {
      const alreadyOpen = selectedOrderId === targetOrder.id;
      initialOrderHandled.current = lookupKey;
      setDirectOrderLoading(false);
      setDirectOrderNotFound(false);
      if (!alreadyOpen) {
        setDirectOrder(null);
        setSelectedOrderId(targetOrder.id);
        if (shouldAutoOpenInvoice()) {
          setInvoiceOrder(targetOrder);
        }
        onInitialOrderOpened?.();
      }
      return;
    }
    if (initialOrderHandled.current === lookupKey) return;
    const slugCacheKey = `user:${currentUserId}:order-slug:${initialOrderSlug.toLowerCase()}`;
    const cachedOrder = readSwrCache<CustomerOrderRecord>(slugCacheKey);
    if (selectedOrderId && !cachedOrder) setSelectedOrderId(null);
    if (cachedOrder) {
      setDirectOrder(cachedOrder);
      setSelectedOrderId(cachedOrder.id);
      setDirectOrderLoading(false);
      if (shouldAutoOpenInvoice()) {
        setInvoiceOrder(cachedOrder);
      }
      onInitialOrderOpened?.();
    } else {
      setDirectOrder(null);
      setDirectOrderLoading(true);
    }
    setDirectOrderNotFound(false);
    let active = true;
    initialOrderHandled.current = lookupKey;
    void getMyOrderBySlug(currentUserId, initialOrderSlug)
      .then((result) => {
        if (!active) return;
        if (!result) {
          if (!cachedOrder) setDirectOrderNotFound(true);
          return;
        }
        writeSwrCache(slugCacheKey, result);
        setDirectOrder(result);
        setSelectedOrderId(result.id);
        if (!cachedOrder) {
          if (shouldAutoOpenInvoice()) {
            setInvoiceOrder(result);
          }
          onInitialOrderOpened?.();
        }
      })
      .catch(() => { if (active && !cachedOrder) setDirectOrderNotFound(true); })
      .finally(() => { if (active) setDirectOrderLoading(false); });
    return () => { active = false; };
  }, [currentUserId, initialOrderSlug, loading, onInitialOrderOpened, orders, selectedOrderId]);

  const openInvoice = (order: CustomerOrderRecord) => setInvoiceOrder(order);

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="customer-orders-title">
      <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-label={t('orders.close')} className="fixed inset-0 bg-slate-950/55 backdrop-blur-[3px]" />
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 flex h-[100dvh] w-full max-w-full flex-col overflow-hidden overflow-x-hidden bg-[#f7f7f8] shadow-2xl sm:h-[85vh] sm:max-h-[760px] sm:max-w-[540px] sm:rounded-2xl sm:border sm:border-white/70"
      >
        <header className="relative isolate shrink-0 overflow-hidden bg-[#090808] px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-white sm:px-4">
          <VignetteBarBackdrop variant="top" />
          <div className="relative z-10 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              {selectedOrder && <button type="button" onClick={() => { setSelectedOrderId(null); onBackToOrdersRoute?.(); }} aria-label={t('orders.backAll')} className="mt-0.5 grid h-8.5 w-8.5 shrink-0 place-items-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition hover:bg-white/22"><ArrowLeft className="h-4 w-4" /></button>}
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-rose-300"><Store className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{t('orders.pickupOrders')}</span></p>
                <h2 id="customer-orders-title" className="mt-0.5 truncate text-[16px] font-black tracking-tight text-white sm:text-[17.5px]">{selectedOrder || showOrderDetailsSkeleton ? t('orders.details') : t('orders.title')}</h2>
                <p className="truncate text-[10.5px] font-medium text-white/70">{selectedOrder ? `Order #${selectedOrder.order_number}` : showOrderDetailsSkeleton ? t('common.loading') : t('orders.subtitle')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label={t('orders.close')} className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition hover:bg-white/22"><X className="h-4 w-4" /></button>
          </div>
          {!selectedOrder && !showOrderDetailsSkeleton && (
            <div className="relative z-10 mt-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
              <SummaryTile label={t('orders.all')} value={orders.length} icon={<Package className="h-3 w-3" />} />
              <SummaryTile label={t('orders.inProgress')} value={activeCount} icon={<Clock3 className="h-3 w-3" />} />
              <SummaryTile label={t('orders.completed')} value={completedCount} icon={<CheckCircle2 className="h-3 w-3" />} />
            </div>
          )}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {selectedOrder ? (
            <motion.div key="details" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }} className="relative -mt-px min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4 sm:py-3.5">
              <VignettePageCurtain className="h-[210px] sm:h-[240px]" />
              <div className="relative z-10">
                <OrderDetails order={selectedOrder} products={products} customerName={customerName} reviews={reviews} onRefresh={onRefresh} onInvoice={() => openInvoice(selectedOrder)} onReview={onReview} onBuyAgain={onBuyAgain} onNeedHelp={onNeedHelp ? () => onNeedHelp(selectedOrder) : undefined} />
              </div>
            </motion.div>
          ) : showOrderDetailsSkeleton ? (
            <motion.div key="details-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} className="relative -mt-px min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4 sm:py-3.5">
              <VignettePageCurtain className="h-[210px] sm:h-[240px]" />
              <div className="relative z-10">
                <CustomerOrderDetailsSkeleton label={t('common.loading')} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.16 }} className="relative -mt-px min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4 sm:py-3.5">
              <VignettePageCurtain className="h-[210px] sm:h-[240px]" />
              <div className="relative z-10">
              {directOrderNotFound && <p role="alert" className="mb-2 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">{t('orders.notFound')}</p>}
              <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label={t('orders.filterOrders')}>
                {([
                  ['all', 'orders.all', orders.length],
                  ['active', 'orders.inProgress', activeCount],
                  ['completed', 'orders.completed', completedCount],
                  ['cancelled', 'orders.cancelled', orders.filter((order) => order.status === 'CANCELLED').length],
                ] as [OrderFilter, TranslationKey, number][]).map(([value, labelKey, count]) => (
                  <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold transition ${filter === value ? 'bg-white text-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.22)]' : 'border border-white/20 bg-white/14 text-white/90 backdrop-blur-md hover:bg-white/22'}`}>
                    {t(labelKey)}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${filter === value ? 'bg-[#D9232D]/12 text-[#D9232D]' : 'bg-white/15 text-white'}`}>{count}</span>
                  </button>
                ))}
              </div>
              {error ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-center">
                  <p className="text-sm font-bold text-rose-800">{t('orders.error')}</p>
                  <p className="mt-1 text-xs text-rose-700">{error}</p>
                  <button type="button" onClick={() => void onRefresh?.()} className="mt-2.5 min-h-9 rounded-full bg-rose-700 px-3.5 py-1 text-xs font-extrabold text-white">{t('orders.tryAgain')}</button>
                </div>
              ) : loading ? (
                <CustomerOrdersListSkeleton count={3} label={t('common.loading')} />
              ) : filteredOrders.length === 0 ? (
                <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center shadow-[0_10px_28px_-14px_rgba(15,23,42,0.16)]">
                  <div><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#fff0ec] text-[#d94335]"><Package className="h-4.5 w-4.5" /></span><h3 className="mt-2.5 text-[14px] font-black text-slate-900">{orders.length ? t('orders.emptyFilter') : t('orders.emptyTitle')}</h3><p className="mx-auto mt-1 max-w-[240px] text-[11.5px] leading-relaxed text-slate-500">{orders.length ? t('orders.tryFilter') : t('orders.emptyBody')}</p></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map((order, index) => <OrderCard key={order.id} order={order} index={index} onOpen={() => { setSelectedOrderId(order.id); onSelectOrderRoute?.(order.order_slug); }} onInvoice={() => openInvoice(order)} />)}
                </div>
              )}
              <p className="mt-3 flex items-center justify-center gap-1.5 pb-1 text-[10px] font-medium text-slate-400"><ShieldCheck className="h-3.5 w-3.5" />{t('orders.private')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
    {invoiceOrder && (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-200">
        <InvoiceTemplate order={invoiceOrder} products={products} onClose={() => setInvoiceOrder(null)} />
      </div>
    )}
    </>
  );
};

const SummaryTile = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-xl border border-white/15 bg-white/[0.08] px-2.5 py-2 backdrop-blur-md">
    <div className="flex items-center gap-1 text-white/75">{icon}<span className="text-[8.5px] font-bold">{label}</span></div>
    <p className="mt-1 text-[14px] font-black leading-none text-white tabular-nums">{value}</p>
  </div>
);

const OrderCard = ({ order, index, onOpen, onInvoice }: { order: CustomerOrderRecord; index: number; onOpen: () => void; onInvoice: () => void }) => {
  const { t, language } = useI18n();
  const previews = getOrderPreviewItems(order.order_items || []);
  const units = (order.order_items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const itemCount = (order.order_items || []).length;
  const complete = isOrderComplete(order.status);
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.16), duration: 0.22 }} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
      <button type="button" onClick={onOpen} aria-label={t('orders.viewDetailsFor', { orderNumber: order.order_number })} className="block w-full p-2.5 text-left sm:p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5"><span className="text-[10.5px] font-black tracking-wide text-slate-900">#{order.order_number}</span><span className="text-slate-300">·</span><span className="text-[9.5px] font-semibold text-slate-500">{formatDate(order.created_at, false, language)}</span></div>
            <p className="mt-0.5 truncate text-[12px] font-extrabold text-slate-900">{previews[0]?.product_name || t('orders.storePickupOrder')}{itemCount > 1 ? <span className="font-semibold text-slate-500"> {t('orders.moreItems', { count: itemCount - 1 })}</span> : null}</p>
            <p className="mt-0.5 text-[9.5px] font-medium text-slate-500">{t('orders.unitsCount', { count: units })}{order.vehicle_model ? ` · ${order.vehicle_model}` : ''}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#f7f7f8] p-2">
          <div className="flex min-w-0 items-center">
            {previews.slice(0, 3).map((item, imageIndex) => <ProductThumb key={`${item.product_id}-${imageIndex}`} name={item.product_name} image={item.image_url} className={`h-9 w-9 ${imageIndex ? '-ml-2 ring-2 ring-[#f7f7f8]' : ''}`} />)}
            {previews.length > 3 && <span className="-ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-[#f7f7f8] bg-slate-200 text-[9.5px] font-black text-slate-600">+{previews.length - 3}</span>}
            {!previews.length && <ProductThumb name="Order" className="h-9 w-9" />}
            <span className="ml-2 min-w-0 truncate text-[9.5px] font-bold text-slate-500">{previews.length > 1 ? t('orders.productCount', { count: previews.length }) : t('orders.orderItems')}</span>
          </div>
          <div className="shrink-0 text-right"><p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('orders.total')}</p><p className="mt-0.5 text-[13px] font-black text-slate-900">{formatMoney(order.total)}</p></div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[9.5px] font-bold text-slate-500"><span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3 text-slate-400" />{order.payment_status?.toLowerCase() === 'paid' ? t('orders.paid') : t('orders.payAtStore')}</span><span className="inline-flex items-center gap-0.5 text-[#cf4033]">{t('orders.viewDetails')}<ChevronRight className="h-3 w-3" /></span></div>
        {order.status === 'READY_FOR_PICKUP' && <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800"><QrCode className="h-3 w-3" />{t('orders.qrReady')}</p>}
      </button>
      {complete && <div className="flex items-center justify-between gap-2 border-t border-emerald-100 bg-emerald-50/60 px-3 py-1.5"><span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-800"><CheckCircle2 className="h-3 w-3" />{t('orders.invoiceReady')}</span><button type="button" onClick={onInvoice} className="inline-flex min-h-7.5 shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[9.5px] font-extrabold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"><Printer className="h-3 w-3" />{t('orders.viewInvoice')}</button></div>}
    </motion.article>
  );
};

export const OrderDetails = ({ order: sourceOrder, products = [], customerName, reviews, onRefresh, onInvoice, onReview, onBuyAgain, onNeedHelp }: { order: CustomerOrderRecord; products?: Product[]; customerName: string; reviews: ProductReviewRecord[]; onRefresh?: CustomerOrdersModalProps['onRefresh']; onInvoice: () => void; onReview: CustomerOrdersModalProps['onReview']; onBuyAgain?: CustomerOrdersModalProps['onBuyAgain']; onNeedHelp?: () => void }) => {
  const { t, language } = useI18n();
  const [cancelledAfterSuccess, setCancelledAfterSuccess] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const cancelRequestLock = useRef(false);
  const [buyAgainSubmitting, setBuyAgainSubmitting] = useState(false);
  const [buyAgainError, setBuyAgainError] = useState('');
  const buyAgainRequestLock = useRef(false);
  useEffect(() => {
    setCancelledAfterSuccess(false);
    setCancelDialogOpen(false);
    setCancelReason('');
    setCancelError('');
    cancelRequestLock.current = false;
    setBuyAgainError('');
    buyAgainRequestLock.current = false;
  }, [sourceOrder.id, sourceOrder.status]);
  const order = cancelledAfterSuccess ? { ...sourceOrder, status: 'CANCELLED' } : sourceOrder;
  const complete = isOrderComplete(order.status);
  const items = useMemo(() => order.order_items || [], [order.order_items]);
  const isPaid = order.payment_status?.toLowerCase() === 'paid';
  const cancelledUnpaid = order.status === 'CANCELLED' && !isPaid;
  const displayedPaymentStatus = isPaid ? t('orders.paid') : cancelledUnpaid ? t('orders.cancelledUnpaid') : t('orders.paymentPending');
  const canCancel = canCancelCustomerOrder(order.status, order.payment_status);
  const paymentMethod = cancelledUnpaid ? t('orders.paymentMethodCancelled') : order.payment_method === 'PAY_ONLINE' ? 'UPI online' : 'Pay at workshop on pickup';
  const phoneHref = `tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}`;
  const units = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const guaranteeTarget = useMemo(() => {
    for (const item of items) {
      const matched = products.find(
        (p) =>
          (item.product_id && (p.id === item.product_id || p.slug === item.product_id)) ||
          String(p.title || '').trim().toLowerCase() === String(item.product_name || '').trim().toLowerCase(),
      );
      if (matched?.guaranteeValidUntil || matched?.id || item.product_id) {
        return {
          productId: matched?.id || item.product_id || null,
          productSlug: matched?.slug || null,
          guaranteeDate: matched?.guaranteeValidUntil || null,
        };
      }
    }
    return null;
  }, [items, products]);
  const handleCancelOrder = async () => {
    if (cancelRequestLock.current || cancelSubmitting) return;
    cancelRequestLock.current = true;
    setCancelSubmitting(true);
    setCancelError('');
    try {
      const result = await cancelMyOrder(order.order_number, cancelReason);
      if (result.error || !result.data || result.data.status !== 'CANCELLED') {
        setCancelError(result.error?.message || 'The cancellation service did not confirm this order.');
        return;
      }
      setCancelledAfterSuccess(true);
      setCancelDialogOpen(false);
      setCancelReason('');
      try {
        await onRefresh?.();
      } catch {
        // The server has already confirmed cancellation; keep the local status updated.
      }
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'This order could not be cancelled. Please try again.');
    } finally {
      cancelRequestLock.current = false;
      setCancelSubmitting(false);
    }
  };
  const handleBuyAgain = async () => {
    if (buyAgainRequestLock.current || buyAgainSubmitting || !onBuyAgain) return;
    buyAgainRequestLock.current = true;
    setBuyAgainSubmitting(true);
    setBuyAgainError('');
    try {
      const result = await onBuyAgain(order);
      if (result.error) setBuyAgainError(result.error);
    } catch (error) {
      setBuyAgainError(error instanceof Error ? error.message : 'The items could not be added to your cart. Please try again.');
    } finally {
      buyAgainRequestLock.current = false;
      setBuyAgainSubmitting(false);
    }
  };
  return (
    <div className="space-y-2 pb-2">
      <section className="overflow-hidden rounded-xl border border-rose-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-2.5 bg-gradient-to-r from-[#fff2f3] to-[#fff8f8] p-2.5 sm:p-3">
          <div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-lg bg-[#ffe5e8] text-[#d9232d]"><Package className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-500">{formatDate(order.created_at, true, language)}</p><h2 className="mt-0.5 text-[14px] font-black tracking-tight text-slate-900">{statusName(order.status, t)}</h2><p className="mt-0.5 text-[10px] leading-snug text-slate-600">{order.status === 'CANCELLED' ? t('orders.currentlyCancelled') : t('orders.keepUpdatedShort')}</p></div></div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rose-50 px-3 py-2"><span className="font-mono text-[10px] font-bold text-slate-600">#{order.order_number}</span><span className="text-[10px] font-semibold text-slate-500">{t('orders.itemsCount', { count: items.length })} · {t('orders.unitsCount', { count: units })}</span>{complete && <button type="button" onClick={onInvoice} className="banner-cta-shine group/cta inline-flex min-h-7.5 items-center gap-1 rounded-full bg-gradient-to-r from-[#d9232d] to-[#b91822] px-2.5 py-1 text-[9.5px] font-extrabold text-white shadow-xs hover:brightness-105 active:scale-95"><Printer className="h-3 w-3" />{t('orders.viewInvoice')}</button>}</div>
      </section>

      {canCancel && <section className="flex items-center justify-between gap-2.5 rounded-xl border border-rose-100 bg-white p-2.5 sm:p-3 shadow-sm"><div className="min-w-0"><p className="text-[11.5px] font-extrabold text-slate-900">{t('orders.cancelPrompt')}</p><p className="mt-0.5 text-[9.5px] leading-snug text-slate-500">{t('orders.cancelInfo')}</p></div><button type="button" onClick={() => { setCancelError(''); setCancelDialogOpen(true); }} className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-extrabold text-[#c92330] transition hover:bg-rose-100"><X className="h-3 w-3" />{t('orders.cancelOrder')}</button></section>}

      {complete && onBuyAgain && <section className="rounded-xl border border-emerald-100 bg-white p-2.5 sm:p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="text-[11.5px] font-extrabold text-slate-900">{t('orders.buyAgainTitle')}</p><p className="mt-0.5 text-[9.5px] leading-snug text-slate-600">{t('orders.buyAgainHint')}</p></div>
          <button type="button" onClick={() => void handleBuyAgain()} disabled={buyAgainSubmitting} className="banner-cta-shine group/cta inline-flex min-h-8.5 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3 text-[10.5px] font-extrabold text-white shadow-[0_5px_14px_-4px_rgba(217,35,45,0.35)] transition-all hover:brightness-105 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
            {buyAgainSubmitting ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{t('orders.adding')}</> : <><Package className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />{t('orders.buyAgain')}</>}
          </button>
        </div>
        {buyAgainError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800">{buyAgainError}</p>}
      </section>}

      <OrderTimeline key={order.id} orderId={order.id} status={order.status} createdAt={order.created_at} />
      <PickupQrCard order={order} onRefresh={onRefresh} />

      <section className="rounded-xl border border-slate-100 bg-white p-2.5 sm:p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <img src="/images/rofik-godi-store.webp" alt="Rofik Godi Centre storefront" className="h-20 w-full shrink-0 rounded-lg object-cover sm:h-18 sm:w-20" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5"><h3 className="flex items-center gap-1 text-[10.5px] font-black text-[#c92330]"><MapPin className="h-3 w-3 shrink-0" />{t('orders.pickupFromStore')}</h3><a href={mapHref} target="_blank" rel="noreferrer" className="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[9px] font-extrabold text-[#c92330]"><Navigation className="h-2.5 w-2.5" />{t('orders.openMap')}</a></div>
            <p className="mt-0.5 text-[11px] font-black text-slate-900">{order.pickup_store || WORKSHOP_INFO.name}</p>
            <p className="mt-0.5 text-[9.5px] leading-snug text-slate-600 break-words">{WORKSHOP_INFO.address}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <p className="inline-flex items-center gap-1 text-[9.5px] text-slate-600"><Clock3 className="h-2.5 w-2.5 shrink-0" />{WORKSHOP_INFO.workingHours}</p>
              <a href={phoneHref} className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-slate-700"><Phone className="h-2.5 w-2.5 shrink-0" />{WORKSHOP_INFO.phone}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-rose-50 text-[#d9232d]"><Package className="h-3 w-3" /></span><h3 className="text-[12px] font-black text-slate-900">{t('orders.itemsCount', { count: items.length })}</h3></div><p className="text-[9.5px] font-medium text-slate-500">{t('orders.unitsCount', { count: units })}</p></div>
        <div className="divide-y divide-slate-100 px-3">
          {items.map((item, index) => {
            const productReview = reviews.find((review) => review.order_id === order.id && review.product_id === item.product_id);
            const reviewable = complete && Boolean(item.product_id && /^[0-9a-f-]{36}$/i.test(item.product_id));
            return <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-2.5 py-2">
              <ProductThumb name={item.product_name} image={item.image_url} className="h-10 w-10 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[11px] font-extrabold leading-snug text-slate-900">{item.product_name}</p>
                <p className="mt-0.5 text-[9.5px] text-slate-500">{item.color ? `${item.color} · ` : ''}{t('orders.quantity', { count: item.quantity })}</p>
                {(item.selected_thickness || item.selected_stitch || item.custom_embroidery_text) && <p className="mt-0.5 text-[9px] leading-snug text-slate-500">{[item.selected_thickness && t('orders.thickness', { value: item.selected_thickness }), item.selected_stitch && t('orders.stitch', { value: item.selected_stitch }), item.custom_embroidery_text && t('orders.embroidery', { value: item.custom_embroidery_text })].filter(Boolean).join(' · ')}</p>}
                {productReview?.is_verified_purchase && <p className="mt-0.5 text-[9px] font-bold text-emerald-700">{t('orders.verifiedPurchase')}</p>}
                {reviewable && <button type="button" onClick={() => onReview(order, item.product_id!, item.product_name, productReview)} className="mt-0.5 min-h-7 text-[9.5px] font-extrabold text-[#cf4033] underline decoration-[#cf4033]/30 underline-offset-2">{productReview ? t('orders.editReview') : t('orders.rateItem')}</button>}
              </div>
              <div className="shrink-0 text-right"><p className="text-[11px] font-black text-slate-900">{formatMoney(Number(item.unit_price || 0) * Number(item.quantity || 0))}</p><p className="mt-0.5 text-[9px] text-slate-400">{t('orders.quantity', { count: item.quantity })}</p></div>
            </div>;
          })}
          {!items.length && <p className="py-5 text-center text-xs text-slate-500">{t('orders.noItems')}</p>}
        </div>
      </section>

      {guaranteeTarget && (
        <GuaranteeTerms
          variant="compact"
          productId={guaranteeTarget.productId}
          productSlug={guaranteeTarget.productSlug}
          guaranteeDate={guaranteeTarget.guaranteeDate}
        />
      )}

      <section className="rounded-xl border border-slate-100 bg-white p-2.5 sm:p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-1.5 text-[12px] font-black"><span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-50 text-emerald-700"><CreditCard className="h-3 w-3" /></span>{t('orders.paymentDetails')}</h3><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${isPaid ? 'bg-emerald-50 text-emerald-700' : cancelledUnpaid ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{isPaid ? <CheckCircle2 className="h-2.5 w-2.5" /> : cancelledUnpaid ? <X className="h-2.5 w-2.5" /> : <Clock3 className="h-2.5 w-2.5" />}{isPaid ? t('orders.paymentConfirmed') : cancelledUnpaid ? t('orders.cancelledUnpaid') : t('orders.paymentPending')}</span></div>
        <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2"><div className="border-b border-slate-100 pb-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3"><p className="text-[9.5px] text-slate-500">{t('orders.totalAmount')}</p><p className="mt-0.5 text-[16px] font-black text-[#d9232d]">{formatMoney(order.total)}</p><p className="mt-1.5 text-[9.5px] text-slate-500">{t('orders.paymentMethod')}</p><p className="mt-0.5 text-[10.5px] font-bold text-slate-800">{paymentMethod}</p><p className="mt-1.5 text-[9.5px] text-slate-500">{t('orders.paymentStatus')}</p><p className={`mt-0.5 text-[10.5px] font-bold ${isPaid ? 'text-emerald-700' : cancelledUnpaid ? 'text-rose-700' : 'text-amber-700'}`}>{isPaid ? t('orders.paid') : cancelledUnpaid ? t('orders.cancelledUnpaid') : t('orders.dueAtPickup')}</p></div><div className="space-y-1 pt-0.5 text-[10.5px]"><MoneyRow label={t('orders.itemsTotal')} amount={order.subtotal} /><div className="flex items-center justify-between"><span className="text-slate-500">{t('orders.storePickupOrder')}</span><span className="font-bold text-emerald-700">{t('cart.free')}</span></div><MoneyRow label={t('checkout.discount')} amount={-Number(order.discount || 0)} discount /><div className="border-t border-slate-100 pt-1.5"><MoneyRow label={isPaid ? t('orders.totalPaid') : cancelledUnpaid ? t('orders.cancelledOrderTotal') : t('orders.totalDue')} amount={order.total} /></div></div></div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-2.5 sm:p-3 shadow-sm">
        <h3 className="flex items-center gap-1.5 text-[12px] font-black"><span className="grid h-6 w-6 place-items-center rounded-md bg-rose-50 text-[#d9232d]"><ReceiptText className="h-3 w-3" /></span>{t('orders.orderInformation')}</h3>
        <div className="mt-1.5 divide-y divide-slate-100 text-[10.5px]"><InfoRow label={t('checkout.orderId')} value={`#${order.order_number}`} /><InfoRow label={t('orders.orderDate')} value={formatDate(order.created_at, true, language)} /><InfoRow label={t('orders.orderType')} value={t('orders.storePickupOrder')} /><InfoRow label={t('orders.customer')} value={customerName || order.customer_name || '—'} /><InfoRow label={t('orders.paymentStatus')} value={displayedPaymentStatus} /><InfoRow label={t('orders.vehicle')} value={order.vehicle_model || t('orders.notSpecified')} /></div>
      </section>

      <div className="grid grid-cols-2 gap-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:grid-cols-3">
        <button type="button" onClick={() => document.getElementById('customer-order-progress')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[10.5px] font-extrabold text-slate-800"><Truck className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t('orders.track')}</span></button>
        <button type="button" onClick={() => { if (onNeedHelp) onNeedHelp(); else window.location.href = `mailto:${WORKSHOP_INFO.email}?subject=${encodeURIComponent(`Help with order ${order.order_number}`)}`; }} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[10.5px] font-extrabold text-slate-800"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t('orders.needHelp')}</span></button>
        <a href={phoneHref} className="banner-cta-shine group/cta col-span-2 flex min-h-9 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#d9232d] to-[#b91822] px-2.5 text-[10.5px] font-extrabold text-white shadow-xs transition-all hover:brightness-105 active:scale-95 sm:col-span-1"><Phone className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" /><span className="truncate">{t('orders.contactStore')}</span></a>
      </div>
      <ConfirmDialog
        open={cancelDialogOpen}
        title={t('orders.cancelDialogTitle')}
        message={t('orders.cancelMessage', { orderNumber: order.order_number })}
        confirmLabel={cancelSubmitting ? t('orders.cancelling') : t('orders.confirmCancel')}
        cancelLabel={t('orders.keepOrder')}
        confirmDisabled={cancelSubmitting}
        confirmLoading={cancelSubmitting}
        cancelDisabled={cancelSubmitting}
        onConfirm={() => { void handleCancelOrder(); }}
        onCancel={() => {
          if (cancelRequestLock.current) return;
          setCancelDialogOpen(false);
          setCancelReason('');
          setCancelError('');
        }}
      >
        <div className="mt-3 space-y-1.5">
          <label htmlFor="customer-order-cancel-reason" className="block text-xs font-bold text-slate-700">{t('orders.cancelDialogReason')} <span className="font-medium text-slate-400">{t('orders.optional')}</span></label>
          <textarea id="customer-order-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={500} rows={3} disabled={cancelSubmitting} placeholder={t('orders.cancelReasonPlaceholder')} className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#d9232d] disabled:bg-slate-50" />
          {cancelError && <p role="alert" className="text-xs font-semibold text-red-700">{cancelError}</p>}
        </div>
      </ConfirmDialog>
    </div>
  );
};

const MoneyRow = ({ label, amount, discount = false }: { label: string; amount: number; discount?: boolean }) => <div className="flex items-center justify-between"><span className="font-medium text-slate-500">{label}</span><span className={`font-bold ${discount && amount < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{discount && amount < 0 ? `−${formatMoney(Math.abs(amount))}` : formatMoney(amount)}</span></div>;

const InfoRow = ({ label, value }: { label: string; value: string }) => <div className="flex items-center justify-between gap-3 py-1.5"><span className="text-slate-500">{label}</span><span className="text-right font-semibold text-slate-700">{value}</span></div>;
