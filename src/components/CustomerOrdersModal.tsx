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
import { formatInr, useI18n, type TranslationKey } from '../lib/i18n';
import type { PreferredLanguage } from '../lib/customerPreferences';

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
  if (status === 'COMPLETED' || status === 'PICKED_UP') return 'border-[#E6CE73] bg-[#FFF8D6] text-[#6B352A]';
  if (status === 'CANCELLED') return 'border-[#E9C2B5] bg-[#FDF2EE] text-[#9E2A2B]';
  if (status === 'READY_FOR_PICKUP') return 'border-[#6B352A]/30 bg-[#F6EAE4] text-[#6B352A]';
  return 'border-[#E6CE73] bg-[#FFF8D6] text-[#9A4D16]';
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  const { t } = useI18n();
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${statusTone(status)}`}>
    {isOrderComplete(status) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {statusName(status, t)}
  </span>;
};

const ProductThumb = ({ name, image, className = '' }: { name: string; image?: string | null; className?: string }) => (
  <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#E8D8C4] bg-gradient-to-br from-[#FAF4EA] to-[#EFE2D2] ${className}`}>
    {image
      ? <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" />
      : <Package className="h-5 w-5 text-[#6B352A]" aria-hidden="true" />}
  </div>
);

const OrderTimeline = ({ orderId, status, createdAt }: { orderId: string; status: string; createdAt: string }) => {
  const { t, language } = useI18n();
  const [history, setHistory] = useState<{ to_status: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    setHistoryError(false);
    void listMyOrderStatusHistory(orderId)
      .then((rows) => { if (active) setHistory(rows); })
      .catch(() => { if (active) setHistoryError(true); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  const steps = getCustomerOrderTimeline(status, createdAt, history);
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  const iconFor = (key: string) => key === 'placed' ? Package
    : key === 'confirmed' ? ShieldCheck
      : key === 'ready' ? MapPin
        : key === 'cancelled' ? X : PackageCheck;

  return (
    <div id="customer-order-progress" aria-label={t('orders.progress')} className="overflow-hidden rounded-[22px] border border-[#E8D8C4] bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#8A6C63]">{t('orders.progress')}</p><p className="mt-1 text-[13px] font-black text-[#2B1611]">{statusName(status, t)}</p></div>
        <span className="rounded-full border border-[#E6CE73] bg-[#FFF8D6] px-2.5 py-1 text-[9px] font-extrabold text-[#6B352A]">{currentIndex + 1} / {steps.length}</span>
      </div>
      {historyLoading && <p role="status" className="mb-3 text-xs font-medium text-[#6B4C44]">{t('orders.loadingDates')}</p>}
      {historyError && <p role="alert" className="mb-3 rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-3 py-2 text-xs font-semibold text-[#9A4D16]">{t('orders.datesFailed')}</p>}
      {!historyLoading && !historyError && history.length === 0 && <p className="mb-3 text-xs font-medium text-[#8A6C63]">{t('orders.noChanges')}</p>}
      {status === 'CANCELLED' && <p className="mb-3 rounded-xl border border-[#E9C2B5] bg-[#FDF2EE] px-3 py-2 text-xs font-semibold text-[#9E2A2B]">{t('orders.cancelledHelp')}</p>}
      <ol className="space-y-0" aria-label={t('orders.progress')}>
        {steps.map((step, index) => {
          const Icon = iconFor(step.key);
          const highlighted = step.state !== 'upcoming';
          return <li key={step.key} className="flex gap-3">
            <div className="flex w-8 shrink-0 flex-col items-center">
              <span className={`grid h-8 w-8 place-items-center rounded-full ${highlighted ? 'bg-[#6B352A] text-[#FFF1A6]' : 'bg-[#EFE2D2] text-[#8A6C63]'} ${step.state === 'current' ? 'ring-4 ring-[#FFF1A6]' : ''}`}>
                {step.state === 'complete' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
              </span>
              {index < steps.length - 1 && <span className={`min-h-5 w-0.5 flex-1 ${step.state === 'complete' ? 'bg-[#6B352A]' : 'bg-[#EFE2D2]'}`} />}
            </div>
            <div className={`min-w-0 flex-1 ${index < steps.length - 1 ? 'pb-5' : ''}`}>
              <p className={`text-sm font-extrabold ${highlighted ? 'text-[#2B1611]' : 'text-[#8A6C63]'}`}>{step.key === 'placed' ? t('status.received') : step.key === 'confirmed' ? t('status.confirmed') : step.key === 'ready' ? t('status.ready') : step.key === 'cancelled' ? t('status.cancelled') : t('status.completed')}</p>
              <p className="mt-0.5 text-xs font-medium text-[#6B4C44]">
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
    if (selectedOrderId) setSelectedOrderId(null);
    setDirectOrder(null);
    setDirectOrderNotFound(false);
    let active = true;
    initialOrderHandled.current = lookupKey;
    setDirectOrderLoading(true);
    void getMyOrderBySlug(currentUserId, initialOrderSlug)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setDirectOrderNotFound(true);
          return;
        }
        setDirectOrder(result);
        setSelectedOrderId(result.id);
        if (shouldAutoOpenInvoice()) {
          setInvoiceOrder(result);
        }
        onInitialOrderOpened?.();
      })
      .catch(() => { if (active) setDirectOrderNotFound(true); })
      .finally(() => { if (active) setDirectOrderLoading(false); });
    return () => { active = false; };
  }, [currentUserId, initialOrderSlug, loading, onInitialOrderOpened, orders, selectedOrderId]);

  const openInvoice = (order: CustomerOrderRecord) => setInvoiceOrder(order);

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="customer-orders-title">
      <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-label={t('orders.close')} className="fixed inset-0 bg-[#1F0E0A]/60 backdrop-blur-[3px]" />
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 flex h-[100dvh] max-h-[920px] w-full max-w-full flex-col overflow-hidden overflow-x-hidden bg-[#FFFCF4] shadow-2xl sm:h-[90vh] sm:max-w-[760px] sm:rounded-[30px] sm:border sm:border-[#E8D8C4]"
      >
        <header className="relative shrink-0 border-b border-[#E8D8C4] bg-[#FFFCF4] px-4 py-4 sm:px-7 sm:py-5">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {selectedOrder && <button type="button" onClick={() => { setSelectedOrderId(null); onBackToOrdersRoute?.(); }} aria-label={t('orders.backAll')} className="mt-0.5 grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-[#FAF4EA] text-[#6B352A] transition hover:bg-[#EFE2D2]"><ArrowLeft className="h-4 w-4" /></button>}
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#6B352A]"><Store className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t('orders.pickupOrders')}</span></p>
                <h2 id="customer-orders-title" className="mt-1 truncate text-[21px] font-black tracking-tight text-[#2B1611] sm:text-[25px]">{selectedOrder ? t('orders.details') : t('orders.title')}</h2>
                <p className="mt-1 truncate text-[11px] font-medium text-[#8A6C63]">{selectedOrder ? `Order #${selectedOrder.order_number}` : t('orders.subtitle')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label={t('orders.close')} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-[#FAF4EA] text-[#6B352A] transition hover:bg-[#EFE2D2]"><X className="h-4 w-4" /></button>
          </div>
          {!selectedOrder && (
            <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryTile label={t('orders.all')} value={orders.length} icon={<Package className="h-3.5 w-3.5" />} />
              <SummaryTile label={t('orders.inProgress')} value={activeCount} icon={<Clock3 className="h-3.5 w-3.5" />} />
              <SummaryTile label={t('orders.completed')} value={completedCount} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            </div>
          )}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {selectedOrder ? (
            <motion.div key="details" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
              <OrderDetails order={selectedOrder} products={products} customerName={customerName} reviews={reviews} onRefresh={onRefresh} onInvoice={() => openInvoice(selectedOrder)} onReview={onReview} onBuyAgain={onBuyAgain} onNeedHelp={onNeedHelp ? () => onNeedHelp(selectedOrder) : undefined} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.16 }} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
              {directOrderLoading && <p role="status" className="mb-3 rounded-xl bg-[#FAF4EA] px-3 py-2 text-xs font-semibold text-[#6B4C44]">{t('common.loading')}</p>}
              {directOrderNotFound && <p role="alert" className="mb-3 rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-3 py-2 text-xs font-semibold text-[#9A4D16]">{t('orders.notFound')}</p>}
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label={t('orders.filterOrders')}>
                {([
                  ['all', 'orders.all', orders.length],
                  ['active', 'orders.inProgress', activeCount],
                  ['completed', 'orders.completed', completedCount],
                  ['cancelled', 'orders.cancelled', orders.filter((order) => order.status === 'CANCELLED').length],
                ] as [OrderFilter, TranslationKey, number][]).map(([value, labelKey, count]) => (
                  <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-extrabold transition ${filter === value ? 'bg-[#6B352A] text-[#FFF1A6] shadow-[0_5px_14px_rgba(107,53,42,0.22)]' : 'border border-[#E8D8C4] bg-white text-[#6B4C44] hover:bg-[#FAF4EA]'}`}>
                    {t(labelKey)}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${filter === value ? 'bg-[#FFF1A6]/20 text-[#FFF1A6]' : 'bg-[#FAF4EA] text-[#8A6C63]'}`}>{count}</span>
                  </button>
                ))}
              </div>
              {error ? (
                <div role="alert" className="rounded-2xl border border-[#E9C2B5] bg-[#FDF2EE] px-4 py-5 text-center">
                  <p className="text-sm font-bold text-[#9E2A2B]">{t('orders.error')}</p>
                  <p className="mt-1 text-xs text-[#9E2A2B]/85">{error}</p>
                  <button type="button" onClick={() => void onRefresh?.()} className="mt-3 min-h-11 rounded-full bg-[#9E2A2B] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#7F2021]">{t('orders.tryAgain')}</button>
                </div>
              ) : loading ? (
                <div className="space-y-3" aria-label={t('common.loading')}>
                  {[0, 1, 2].map((item) => <div key={item} className="h-[160px] animate-pulse rounded-[22px] border border-[#E8D8C4] bg-white" />)}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="grid min-h-[280px] place-items-center rounded-[24px] border border-dashed border-[#D4C0AA] bg-white px-7 py-10 text-center">
                  <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF8D6] text-[#6B352A]"><Package className="h-6 w-6" /></span><h3 className="mt-4 text-base font-black text-[#2B1611]">{orders.length ? t('orders.emptyFilter') : t('orders.emptyTitle')}</h3><p className="mx-auto mt-1.5 max-w-[270px] text-xs leading-relaxed text-[#6B4C44]">{orders.length ? t('orders.tryFilter') : t('orders.emptyBody')}</p></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order, index) => <OrderCard key={order.id} order={order} index={index} onOpen={() => { setSelectedOrderId(order.id); onSelectOrderRoute?.(order.order_slug); }} onInvoice={() => openInvoice(order)} />)}
                </div>
              )}
              <p className="mt-4 flex items-center justify-center gap-1.5 pb-1 text-[10px] font-medium text-[#8A6C63]"><ShieldCheck className="h-3.5 w-3.5 text-[#6B352A]" />{t('orders.private')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
    {invoiceOrder && (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#FAF4EA]">
        <InvoiceTemplate order={invoiceOrder} products={products} onClose={() => setInvoiceOrder(null)} />
      </div>
    )}
    </>
  );
};

const SummaryTile = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#E8D8C4] bg-[#FAF4EA] px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-[#6B4C44]">{icon}<span className="text-[9px] font-bold">{label}</span></div>
    <p className="mt-1 text-lg font-black leading-none text-[#2B1611]">{value}</p>
  </div>
);

const OrderCard = ({ order, index, onOpen, onInvoice }: { order: CustomerOrderRecord; index: number; onOpen: () => void; onInvoice: () => void }) => {
  const { t, language } = useI18n();
  const previews = getOrderPreviewItems(order.order_items || []);
  const units = (order.order_items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const itemCount = (order.order_items || []).length;
  const complete = isOrderComplete(order.status);
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.16), duration: 0.22 }} className="overflow-hidden rounded-[22px] border border-[#E8D8C4] bg-white shadow-[0_4px_18px_rgba(43,22,17,0.04)] transition hover:border-[#CBB8A6] hover:shadow-[0_8px_26px_rgba(43,22,17,0.08)]">
      <button type="button" onClick={onOpen} aria-label={t('orders.viewDetailsFor', { orderNumber: order.order_number })} className="block w-full p-4 text-left sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-[11px] font-black tracking-wide text-[#2B1611]">#{order.order_number}</span><span className="text-[#CBB8A6]">·</span><span className="text-[10px] font-semibold text-[#8A6C63]">{formatDate(order.created_at, false, language)}</span></div>
            <p className="mt-2 truncate text-[13px] font-extrabold text-[#2B1611]">{previews[0]?.product_name || t('orders.storePickupOrder')}{itemCount > 1 ? <span className="font-semibold text-[#8A6C63]"> {t('orders.moreItems', { count: itemCount - 1 })}</span> : null}</p>
            <p className="mt-1 text-[10px] font-medium text-[#8A6C63]">{t('orders.unitsCount', { count: units })}{order.vehicle_model ? ` · ${order.vehicle_model}` : ''}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#FAF4EA] p-3">
          <div className="flex min-w-0 items-center">
            {previews.slice(0, 3).map((item, imageIndex) => <ProductThumb key={`${item.product_id}-${imageIndex}`} name={item.product_name} image={item.image_url} className={`h-12 w-12 ${imageIndex ? '-ml-3 ring-[3px] ring-[#FAF4EA]' : ''}`} />)}
            {previews.length > 3 && <span className="-ml-3 grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[3px] border-[#FAF4EA] bg-[#EFE2D2] text-[10px] font-black text-[#6B352A]">+{previews.length - 3}</span>}
            {!previews.length && <ProductThumb name="Order" className="h-12 w-12" />}
            <span className="ml-3 min-w-0 truncate text-[10px] font-bold text-[#6B4C44]">{previews.length > 1 ? t('orders.productCount', { count: previews.length }) : t('orders.orderItems')}</span>
          </div>
          <div className="shrink-0 text-right"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A6C63]">{t('orders.total')}</p><p className="mt-0.5 text-sm font-black text-[#2B1611]">{formatMoney(order.total)}</p></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-[#6B4C44]"><span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-[#8A6C63]" />{order.payment_status?.toLowerCase() === 'paid' ? t('orders.paid') : t('orders.payAtStore')}</span><span className="inline-flex items-center gap-1 text-[#6B352A]">{t('orders.viewDetails')}<ChevronRight className="h-3.5 w-3.5" /></span></div>
        {order.status === 'READY_FOR_PICKUP' && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#E6CE73] bg-[#FFF8D6] px-2.5 py-1.5 text-[9px] font-extrabold text-[#6B352A]"><QrCode className="h-3.5 w-3.5" />{t('orders.qrReady')}</p>}
      </button>
      {complete && <div className="flex items-center justify-between gap-3 border-t border-[#E6CE73] bg-[#FFF8D6]/80 px-4 py-2.5 sm:px-5"><span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#6B352A]"><CheckCircle2 className="h-3.5 w-3.5" />{t('orders.invoiceReady')}</span><button type="button" onClick={onInvoice} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#6B352A] px-3 py-1.5 text-[10px] font-extrabold text-[#FFF1A6] shadow-sm transition hover:bg-[#53271E]"><Printer className="h-3.5 w-3.5" />{t('orders.viewInvoice')}</button></div>}
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
    <div className="space-y-3.5 pb-4">
      <section className="overflow-hidden rounded-[22px] border border-[#E8D8C4] bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#FFF8D6]/75 to-[#FAF4EA] p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#6B352A] text-[#FFF1A6]"><Package className="h-6 w-6" /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8A6C63]">{formatDate(order.created_at, true, language)}</p><h2 className="mt-1 text-[17px] font-black tracking-tight text-[#2B1611]">{statusName(order.status, t)}</h2><p className="mt-1 text-[10px] leading-relaxed text-[#6B4C44]">{order.status === 'CANCELLED' ? t('orders.currentlyCancelled') : t('orders.keepUpdatedShort')}</p></div></div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE2D2] px-4 py-3"><span className="font-mono text-[10px] font-bold text-[#6B4C44]">#{order.order_number}</span><span className="text-[10px] font-semibold text-[#8A6C63]">{t('orders.itemsCount', { count: items.length })} · {t('orders.unitsCount', { count: units })}</span>{complete && <button type="button" onClick={onInvoice} className="banner-cta-shine group/cta inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#FF6115] px-3 py-2 text-[9px] font-extrabold text-[#1F0E0A] shadow-xs hover:bg-[#E5520D] active:scale-95"><Printer className="h-3.5 w-3.5" />{t('orders.viewInvoice')}</button>}</div>
      </section>

      {canCancel && <section className="flex items-center justify-between gap-3 rounded-[22px] border border-[#E9C2B5] bg-white p-4 shadow-sm"><div className="min-w-0"><p className="text-[12px] font-extrabold text-[#2B1611]">{t('orders.cancelPrompt')}</p><p className="mt-1 text-[10px] leading-relaxed text-[#6B4C44]">{t('orders.cancelInfo')}</p></div><button type="button" onClick={() => { setCancelError(''); setCancelDialogOpen(true); }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#E9C2B5] bg-[#FDF2EE] px-3.5 text-[10px] font-extrabold text-[#9E2A2B] transition hover:bg-[#F9E3DC]"><X className="h-3.5 w-3.5" />{t('orders.cancelOrder')}</button></section>}

      {complete && onBuyAgain && <section className="rounded-[22px] border border-[#E6CE73] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="text-[12px] font-extrabold text-[#2B1611]">{t('orders.buyAgainTitle')}</p><p className="mt-1 text-[10px] leading-relaxed text-[#6B4C44]">{t('orders.buyAgainHint')}</p></div>
          <button type="button" onClick={() => void handleBuyAgain()} disabled={buyAgainSubmitting} className="banner-cta-shine group/cta inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6115] px-4 text-[11px] font-extrabold text-[#1F0E0A] shadow-[0_6px_16px_-4px_rgba(255,97,21,0.35)] transition-all hover:bg-[#E5520D] hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
            {buyAgainSubmitting ? <><Clock3 className="h-4 w-4 animate-spin" />{t('orders.adding')}</> : <><Package className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />{t('orders.buyAgain')}</>}
          </button>
        </div>
        {buyAgainError && <p role="alert" className="mt-3 rounded-xl border border-[#E9C2B5] bg-[#FDF2EE] px-3 py-2 text-xs font-semibold text-[#9E2A2B]">{buyAgainError}</p>}
      </section>}

      <OrderTimeline key={order.id} orderId={order.id} status={order.status} createdAt={order.created_at} />
      <PickupQrCard order={order} onRefresh={onRefresh} />

      <section className="rounded-[22px] border border-[#E8D8C4] bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <img src="/images/rofik-godi-store.webp" alt="Rofik Godi Centre storefront" className="h-36 w-full shrink-0 rounded-2xl object-cover sm:h-[128px] sm:w-[128px]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-1.5 text-[11px] font-black text-[#6B352A]"><MapPin className="h-4 w-4 shrink-0" />{t('orders.pickupFromStore')}</h3><a href={mapHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-[#FFF8D6] px-2.5 py-1.5 text-[9px] font-extrabold text-[#6B352A] hover:bg-[#FFF1A6]"><Navigation className="h-3 w-3" />{t('orders.openMap')}</a></div>
            <p className="mt-1 text-[11px] font-black text-[#2B1611]">{order.pickup_store || WORKSHOP_INFO.name}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#6B4C44] break-words">{WORKSHOP_INFO.address}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-[#6B4C44]"><Clock3 className="h-3 w-3 shrink-0" />{WORKSHOP_INFO.workingHours}</p>
            <a href={phoneHref} className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#4A2B23] hover:text-[#6B352A]"><Phone className="h-3 w-3 shrink-0" />{WORKSHOP_INFO.phone}</a>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-[#E8D8C4] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#EFE2D2] px-4 py-3.5"><div><h3 className="flex items-center gap-2 text-[13px] font-black text-[#2B1611]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF8D6] text-[#6B352A]"><Package className="h-4 w-4" /></span>{t('orders.itemsCount', { count: items.length })}</h3><p className="mt-1 text-[9px] font-medium text-[#8A6C63]">{t('orders.unitsCount', { count: units })}</p></div></div>
        <div className="divide-y divide-[#EFE2D2] px-3.5 sm:px-4">
          {items.map((item, index) => {
            const productReview = reviews.find((review) => review.order_id === order.id && review.product_id === item.product_id);
            const reviewable = complete && Boolean(item.product_id && /^[0-9a-f-]{36}$/i.test(item.product_id));
            return <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 py-3">
              <ProductThumb name={item.product_name} image={item.image_url} className="h-[58px] w-[58px] rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[11px] font-extrabold leading-snug text-[#2B1611]">{item.product_name}</p>
                <p className="mt-1 text-[10px] text-[#6B4C44]">{item.color ? `${item.color} · ` : ''}{t('orders.quantity', { count: item.quantity })}</p>
                {(item.selected_thickness || item.selected_stitch || item.custom_embroidery_text) && <p className="mt-1 text-[9px] leading-relaxed text-[#8A6C63]">{[item.selected_thickness && t('orders.thickness', { value: item.selected_thickness }), item.selected_stitch && t('orders.stitch', { value: item.selected_stitch }), item.custom_embroidery_text && t('orders.embroidery', { value: item.custom_embroidery_text })].filter(Boolean).join(' · ')}</p>}
                {productReview?.is_verified_purchase && <p className="mt-1 text-[9px] font-bold text-[#6B352A]">{t('orders.verifiedPurchase')}</p>}
                {reviewable && <button type="button" onClick={() => onReview(order, item.product_id!, item.product_name, productReview)} className="mt-1.5 min-h-11 text-[9px] font-extrabold text-[#6B352A] underline decoration-[#6B352A]/40 underline-offset-2">{productReview ? t('orders.editReview') : t('orders.rateItem')}</button>}
              </div>
              <div className="shrink-0 text-right"><p className="text-[11px] font-black text-[#2B1611]">{formatMoney(Number(item.unit_price || 0) * Number(item.quantity || 0))}</p><p className="mt-0.5 text-[9px] text-[#8A6C63]">{t('orders.quantity', { count: item.quantity })}</p></div>
            </div>;
          })}
          {!items.length && <p className="py-7 text-center text-xs text-[#8A6C63]">{t('orders.noItems')}</p>}
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

      <section className="rounded-[22px] border border-[#E8D8C4] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-[13px] font-black text-[#2B1611]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF8D6] text-[#6B352A]"><CreditCard className="h-4 w-4" /></span>{t('orders.paymentDetails')}</h3><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-extrabold ${isPaid ? 'bg-[#FFF8D6] text-[#6B352A]' : cancelledUnpaid ? 'bg-[#FDF2EE] text-[#9E2A2B]' : 'bg-[#F6EAE4] text-[#9A4D16]'}`}>{isPaid ? <CheckCircle2 className="h-3 w-3" /> : cancelledUnpaid ? <X className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{isPaid ? t('orders.paymentConfirmed') : cancelledUnpaid ? t('orders.cancelledUnpaid') : t('orders.paymentPending')}</span></div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="border-b border-[#EFE2D2] pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3"><p className="text-[10px] text-[#8A6C63]">{t('orders.totalAmount')}</p><p className="mt-1 text-[21px] font-black text-[#6B352A]">{formatMoney(order.total)}</p><p className="mt-3 text-[10px] text-[#8A6C63]">{t('orders.paymentMethod')}</p><p className="mt-1 text-[11px] font-bold text-[#2B1611]">{paymentMethod}</p><p className="mt-3 text-[10px] text-[#8A6C63]">{t('orders.paymentStatus')}</p><p className={`mt-1 text-[11px] font-bold ${isPaid ? 'text-[#6B352A]' : cancelledUnpaid ? 'text-[#9E2A2B]' : 'text-[#9A4D16]'}`}>{isPaid ? t('orders.paid') : cancelledUnpaid ? t('orders.cancelledUnpaid') : t('orders.dueAtPickup')}</p></div><div className="space-y-2 pt-1 text-[11px]"><MoneyRow label={t('orders.itemsTotal')} amount={order.subtotal} /><div className="flex items-center justify-between"><span className="text-[#6B4C44]">{t('orders.storePickupOrder')}</span><span className="font-bold text-[#6B352A]">{t('cart.free')}</span></div><MoneyRow label={t('checkout.discount')} amount={-Number(order.discount || 0)} discount /><div className="border-t border-[#EFE2D2] pt-2"><MoneyRow label={isPaid ? t('orders.totalPaid') : cancelledUnpaid ? t('orders.cancelledOrderTotal') : t('orders.totalDue')} amount={order.total} /></div></div></div>
      </section>

      <section className="rounded-[22px] border border-[#E8D8C4] bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-[13px] font-black text-[#2B1611]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FAF4EA] text-[#6B352A]"><ReceiptText className="h-4 w-4" /></span>{t('orders.orderInformation')}</h3>
        <div className="mt-3 divide-y divide-[#EFE2D2] text-[11px]"><InfoRow label={t('checkout.orderId')} value={`#${order.order_number}`} /><InfoRow label={t('orders.orderDate')} value={formatDate(order.created_at, true, language)} /><InfoRow label={t('orders.orderType')} value={t('orders.storePickupOrder')} /><InfoRow label={t('orders.customer')} value={customerName || order.customer_name || '—'} /><InfoRow label={t('orders.paymentStatus')} value={displayedPaymentStatus} /><InfoRow label={t('orders.vehicle')} value={order.vehicle_model || t('orders.notSpecified')} /></div>
      </section>

      <div className="grid grid-cols-2 gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:grid-cols-3">
        <button type="button" onClick={() => document.getElementById('customer-order-progress')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#E8D8C4] bg-[#FAF4EA] px-2.5 text-[11px] font-extrabold text-[#2B1611] hover:bg-[#EFE2D2]"><Truck className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t('orders.track')}</span></button>
        <button type="button" onClick={() => { if (onNeedHelp) onNeedHelp(); else window.location.href = `mailto:${WORKSHOP_INFO.email}?subject=${encodeURIComponent(`Help with order ${order.order_number}`)}`; }} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#E8D8C4] bg-[#FAF4EA] px-2.5 text-[11px] font-extrabold text-[#2B1611] hover:bg-[#EFE2D2]"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t('orders.needHelp')}</span></button>
        <a href={phoneHref} className="banner-cta-shine group/cta col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#FF6115] px-3 text-[11px] font-extrabold text-[#1F0E0A] shadow-xs transition-all hover:bg-[#E5520D] active:scale-95 sm:col-span-1"><Phone className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" /><span className="truncate">{t('orders.contactStore')}</span></a>
      </div>
      <ConfirmDialog
        open={cancelDialogOpen}
        title={t('orders.cancelDialogTitle')}
        message={t('orders.cancelMessage', { orderNumber: order.order_number })}
        confirmLabel={cancelSubmitting ? t('orders.cancelling') : t('orders.confirmCancel')}
        cancelLabel={t('orders.keepOrder')}
        confirmDisabled={cancelSubmitting}
        cancelDisabled={cancelSubmitting}
        onConfirm={() => { void handleCancelOrder(); }}
        onCancel={() => {
          if (cancelRequestLock.current) return;
          setCancelDialogOpen(false);
          setCancelReason('');
          setCancelError('');
        }}
      >
        <div className="mt-4 space-y-2">
          <label htmlFor="customer-order-cancel-reason" className="block text-xs font-bold text-[#4A2B23]">{t('orders.cancelDialogReason')} <span className="font-medium text-[#8A6C63]">{t('orders.optional')}</span></label>
          <textarea id="customer-order-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={500} rows={3} disabled={cancelSubmitting} placeholder={t('orders.cancelReasonPlaceholder')} className="w-full resize-y rounded-xl border border-[#E8D8C4] px-3 py-2.5 text-base sm:text-sm text-[#2B1611] outline-none transition placeholder:text-[#8A6C63] focus:border-[#6B352A] focus:ring-2 focus:ring-[#FFF1A6] disabled:bg-[#FAF4EA]" />
          {cancelError && <p role="alert" className="text-xs font-semibold text-[#9E2A2B]">{cancelError}</p>}
        </div>
      </ConfirmDialog>
    </div>
  );
};

const MoneyRow = ({ label, amount, discount = false }: { label: string; amount: number; discount?: boolean }) => <div className="flex items-center justify-between"><span className="font-medium text-[#6B4C44]">{label}</span><span className={`font-bold ${discount && amount < 0 ? 'text-[#6B352A]' : 'text-[#2B1611]'}`}>{discount && amount < 0 ? `−${formatMoney(Math.abs(amount))}` : formatMoney(amount)}</span></div>;

const InfoRow = ({ label, value }: { label: string; value: string }) => <div className="flex items-center justify-between gap-3 py-2.5"><span className="text-[#8A6C63]">{label}</span><span className="text-right font-semibold text-[#2B1611]">{value}</span></div>;
