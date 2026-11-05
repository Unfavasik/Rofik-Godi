import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  IndianRupee,
  MoreHorizontal,
  Package,
  Phone,
  Printer,
  Store,
  UserRound,
  XCircle,
} from 'lucide-react';
import type { Product } from '../types';
import { InvoiceTemplate } from './InvoiceTemplate';
import {
  completePickupOrderManually,
  getAdminOrderTimelineEvents,
  getNextPickupOrderStatus,
  toCustomerOrderRecord,
  updatePickupOrderStatus,
  verifyPickupPayment,
  type AdminOrderRecord,
} from '../lib/supabaseAdminOrders';
import { getOrderStatusLabel, isOrderComplete } from '../lib/orderPresentation';

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const statusHero = (status: string) => {
  if (status === 'PICKED_UP') return {
    title: 'Order has been picked up',
    description: 'Customer collected the order from the store.',
    icon: CheckCircle2,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconTone: 'bg-white text-emerald-700',
  };
  if (status === 'READY_FOR_PICKUP') return {
    title: 'Ready for pickup',
    description: 'Customer can collect this order from the store.',
    icon: Package,
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
    iconTone: 'bg-white text-blue-700',
  };
  if (status === 'COMPLETED') return {
    title: 'Order completed',
    description: 'The order has been successfully completed.',
    icon: CheckCircle2,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconTone: 'bg-white text-emerald-700',
  };
  if (status === 'CANCELLED') return {
    title: 'Order cancelled',
    description: 'No further fulfillment action is required.',
    icon: XCircle,
    tone: 'border-rose-200 bg-rose-50 text-rose-800',
    iconTone: 'bg-white text-rose-700',
  };
  if (status === 'PREPARING') return {
    title: 'Being prepared',
    description: 'The store team is preparing this order.',
    icon: Clock3,
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
    iconTone: 'bg-white text-amber-700',
  };
  if (status === 'CONFIRMED') return {
    title: 'Order confirmed',
    description: 'The store has confirmed this order.',
    icon: CheckCircle2,
    tone: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    iconTone: 'bg-white text-indigo-700',
  };
  return {
    title: 'Order received',
    description: 'The order is waiting for store confirmation.',
    icon: Package,
    tone: 'border-slate-200 bg-slate-50 text-slate-800',
    iconTone: 'bg-white text-slate-700',
  };
};

type DetailTab = 'overview' | 'products' | 'timeline' | 'notes';

export function AdminOrderDetails({
  order,
  products,
  onClose,
  onChanged,
  notify,
}: {
  order: AdminOrderRecord;
  products: Product[];
  onClose: () => void;
  onChanged: () => void;
  notify: (message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [showInvoice, setShowInvoice] = useState(false);
  const [busyAction, setBusyAction] = useState<'status' | 'payment' | null>(null);
  const prefersReducedMotion = useReducedMotion();
  // On phones the details render as a full opaque page — no dimmed backdrop
  // and no entrance animation — so opening an order feels like a page
  // navigation instead of a translucent drawer sliding over the list.
  const [isDesktopLayout, setIsDesktopLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
  );
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const handleChange = (event: MediaQueryListEvent) => setIsDesktopLayout(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const timelineEvents = getAdminOrderTimelineEvents(order);
  const nextStatus = getNextPickupOrderStatus(order.status);
  const hero = statusHero(order.status);
  const pendingPayment = order.paymentStatus.toUpperCase() === 'PENDING' && order.status !== 'CANCELLED';
  const hasInvoice = isOrderComplete(order.status);
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'notes', label: 'Notes' },
  ];

  const updateStatus = async () => {
    if (!nextStatus || busyAction) return;
    setBusyAction('status');
    try {
      const result = await updatePickupOrderStatus(order.orderNumber, nextStatus);
      if (result.error) {
        notify(result.error.message || 'Order status could not be updated.');
        return;
      }
      notify(`Order moved to ${getOrderStatusLabel(nextStatus)}.`);
      onChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Order status could not be updated.');
    } finally {
      setBusyAction(null);
    }
  };

  const verifyPayment = async () => {
    if (!pendingPayment || busyAction) return;
    const isOnlinePayment = order.paymentMethod.toUpperCase() === 'PAY_ONLINE';
    const reference = isOnlinePayment ? window.prompt('Enter the UPI transaction reference / UTR after checking your payment statement:') : '';
    if (isOnlinePayment && reference === null) return;
    const providerReference = reference?.trim().toUpperCase() || '';
    if (isOnlinePayment && !/^[A-Z0-9/-]{6,64}$/.test(providerReference)) {
      notify('Enter a valid UPI transaction reference (6–64 letters, digits, / or -).');
      return;
    }
    setBusyAction('payment');
    try {
      const result = await verifyPickupPayment(order.orderNumber, providerReference);
      if (result.error) {
        notify(result.error.message || 'Payment could not be verified.');
        return;
      }
      notify('Payment verified.');
      onChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Payment could not be verified.');
    } finally {
      setBusyAction(null);
    }
  };

  const completeWithoutQr = async () => {
    if (order.status !== 'READY_FOR_PICKUP' || busyAction) return;
    setBusyAction('status');
    try {
      const result = await completePickupOrderManually(order.orderNumber, order.status);
      if (result.error) {
        notify(result.partial
          ? `Pickup is recorded, but completion failed: ${result.error.message}`
          : result.error.message || 'Order could not be completed.');
        if (result.partial) onChanged();
        return;
      }
      notify('Order completed without a QR scan.');
      onChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Order could not be completed.');
      onChanged();
    } finally {
      setBusyAction(null);
    }
  };

  const copyOrderNumber = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(order.orderNumber);
      notify('Order number copied.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not copy the order number.');
    }
  };

  const notes = [
    ...(order.pickupNote ? [{ label: 'Customer pickup note', text: order.pickupNote, date: null as string | null }] : []),
    ...order.statusHistory
      .filter((event) => event.note && event.note !== 'Order status updated')
      .map((event) => ({ label: `Status note · ${getOrderStatusLabel(event.to_status)}`, text: event.note!, date: event.created_at })),
  ];

  const renderOverview = () => (
    <div className="space-y-4">
      <StatusHero hero={hero} status={order.status} />
      {order.status === 'COMPLETED' && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3 text-emerald-800">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white"><FileText className="h-5 w-5" /></span>
            <div><h3 className="text-sm font-black">Invoice ready</h3><p className="mt-0.5 text-[11px] leading-relaxed">The customer invoice is ready to view or print.</p></div>
          </div>
          <button type="button" onClick={() => setShowInvoice(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3.5 text-xs font-black text-white transition hover:bg-emerald-800"><Printer className="h-4 w-4" />Open invoice</button>
        </section>
      )}
      <section aria-label="Order information" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InformationCard icon={UserRound} label="Customer" value={order.customer || '—'} />
        <InformationCard icon={Phone} label="Phone" value={order.phone || '—'} />
        <VehicleInformationCard order={order} />
        <InformationCard icon={Store} label="Pickup store" value={order.pickupStore || '—'} />
        <InformationCard icon={IndianRupee} label="Total amount" value={money(order.amount)} strong />
        <InformationCard icon={CreditCard} label="Payment status" value={order.paymentStatus || 'PENDING'} />
        <InformationCard icon={CheckCircle2} label="Order status" value={getOrderStatusLabel(order.status)} />
        <InformationCard icon={CalendarDays} label="Created at" value={formatDateTime(order.createdAt)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Products <span className="text-slate-400">({order.items.length})</span></h3>
            <p className="mt-0.5 text-[11px] text-slate-500">Items saved with this order</p>
          </div>
          {order.items.length > 0 && (
            <button type="button" onClick={() => setActiveTab('products')} className="inline-flex min-h-10 items-center gap-1 text-xs font-extrabold text-[#D9232D]">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {order.items.length ? (
          <div className="divide-y divide-slate-100">
            {order.items.slice(0, 3).map((item, index) => (
              <OrderProductRow key={`${item.product_id || item.product_name}-${index}`} item={item} product={item.product_id ? productsById.get(item.product_id) : undefined} />
            ))}
            {order.items.length > 3 && <p className="py-2 text-[10px] font-bold text-slate-400">+{order.items.length - 3} more · open Products to view all</p>}
          </div>
        ) : <EmptyState icon={Package} title="No products on this order" detail="No order-item rows were returned." />}
      </section>

      <PaymentSummary order={order} pendingPayment={pendingPayment} busy={busyAction === 'payment'} onVerify={() => void verifyPayment()} />
    </div>
  );

  const renderProducts = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h3 className="text-base font-black text-slate-900">Products</h3><p className="mt-1 text-xs text-slate-500">{order.items.length} {order.items.length === 1 ? 'line item' : 'line items'} · {order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} total units</p></div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{order.items.length} items</span>
      </div>
      {order.items.length ? (
        <div className="divide-y divide-slate-100">
          {order.items.map((item, index) => (
            <OrderProductRow key={`${item.product_id || item.product_name}-${index}`} item={item} product={item.product_id ? productsById.get(item.product_id) : undefined} roomy />
          ))}
        </div>
      ) : <EmptyState icon={Package} title="No products on this order" detail="No order-item rows were returned." />}
    </section>
  );

  const renderTimeline = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h3 className="text-base font-black text-slate-900">Order timeline</h3><p className="mt-1 text-xs text-slate-500">Only events recorded by the order system are shown.</p></div>
        <Clock3 className="h-4 w-4 text-slate-400" />
      </div>
      <ol className="space-y-0">
        {timelineEvents.map((event, index) => {
          const isCurrent = event.status === order.status;
          const isLast = index === timelineEvents.length - 1;
          return (
            <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-slate-200" aria-hidden="true" />}
              <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${isCurrent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                {event.kind === 'placed' ? <Package className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-xs font-extrabold text-slate-800">{event.kind === 'placed' ? 'Order placed' : getOrderStatusLabel(event.status)}{isCurrent && <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Current</span>}</p>
                  <time className="text-[10px] font-medium text-slate-400">{formatDateTime(event.createdAt)}</time>
                </div>
                {event.note && event.note !== 'Order status updated' && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{event.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {timelineEvents.length <= 1 && order.status !== 'NEW' && (
        <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">Earlier status timestamps are not available for this order. No dates have been inferred.</p>
      )}
      {timelineEvents.length === 1 && order.status === 'NEW' && (
        <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">New status events will appear here as they are recorded.</p>
      )}
    </section>
  );

  const renderNotes = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-500" /><div><h3 className="text-base font-black text-slate-900">Order notes</h3><p className="mt-1 text-xs text-slate-500">Customer pickup notes and meaningful notes recorded with status events.</p></div></div>
      {notes.length ? (
        <div className="space-y-3">
          {notes.map((note, index) => (
            <article key={`${note.label}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-extrabold text-slate-700">{note.label}</p>{note.date && <time className="text-[10px] text-slate-400">{formatDateTime(note.date)}</time>}</div>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{note.text}</p>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={FileText} title="No notes recorded" detail="This order has no customer pickup note or additional status note." />}
    </section>
  );

  const tabContent: Record<DetailTab, () => React.ReactNode> = {
    overview: renderOverview,
    products: renderProducts,
    timeline: renderTimeline,
    notes: renderNotes,
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="admin-order-details-title">
        <motion.button
          type="button"
          aria-label="Close order details"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
          className="absolute inset-0 bg-slate-950/45 max-sm:hidden"
        />
        <motion.aside
          initial={isDesktopLayout && !prefersReducedMotion ? { x: 24, opacity: 0.92 } : false}
          animate={{ x: 0, opacity: 1 }}
          transition={isDesktopLayout && !prefersReducedMotion ? { duration: 0.2, ease: 'easeOut' } : { duration: 0 }}
          className="relative z-10 flex h-[100dvh] w-full max-w-[620px] flex-col overflow-hidden border-l border-slate-200 bg-[#F6F8FB] shadow-2xl max-sm:border-l-0 max-sm:shadow-none"
        >
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} aria-label="Back to orders" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 active:scale-95">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 id="admin-order-details-title" className="truncate text-base font-black tracking-tight text-[#0F172A] sm:text-lg">Order Details</h2>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-slate-500"><span className="shrink-0 font-semibold">Order ID</span><span className="truncate font-mono font-bold text-slate-700">#{order.orderNumber}</span></p>
              </div>
              <StatusBadge status={order.status} />
              <details className="relative shrink-0">
                <summary aria-label="Order actions" className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 [&::-webkit-details-marker]:hidden"><MoreHorizontal className="h-5 w-5" /></summary>
                <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button type="button" onClick={() => void copyOrderNumber()} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><Copy className="h-3.5 w-3.5 text-slate-400" />Copy order number</button>
                  {order.status === 'READY_FOR_PICKUP' && <button type="button" onClick={() => void completeWithoutQr()} disabled={busyAction !== null} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Complete without QR</button>}
                  {pendingPayment && <button type="button" onClick={() => void verifyPayment()} disabled={busyAction !== null} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50"><CreditCard className="h-3.5 w-3.5" />Verify payment</button>}
                  {hasInvoice && <button type="button" onClick={() => setShowInvoice(true)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50"><Printer className="h-3.5 w-3.5" />Open invoice</button>}
                </div>
              </details>
            </div>
          </header>

          <nav className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-6" role="tablist" aria-label="Order details sections">
            <div className="flex min-w-max gap-5">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`order-tab-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={`relative min-h-12 px-0.5 text-xs font-extrabold transition-colors ${activeTab === tab.id ? 'text-[#D9232D]' : 'text-slate-500 hover:text-slate-800'}`}>
                  {tab.label}
                  {activeTab === tab.id && <motion.span layoutId={prefersReducedMotion ? undefined : 'admin-order-tab-underline'} className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#D9232D]" />}
                </button>
              ))}
            </div>
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5" id={`order-tab-${activeTab}`} role="tabpanel" tabIndex={0} aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label} details`}>
            <motion.div key={activeTab} initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}>
              {tabContent[activeTab]()}
            </motion.div>
          </div>

          <footer className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-3">
              {order.status === 'COMPLETED' ? (
                <div className="flex min-h-11 min-w-0 items-center gap-2 text-xs font-extrabold text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Completed</span></div>
              ) : hasInvoice ? (
                <button type="button" onClick={() => setShowInvoice(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"><Printer className="h-4 w-4" />Invoice / Print</button>
              ) : order.status === 'CANCELLED' ? (
                <span className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-rose-700"><XCircle className="h-4 w-4" />Order cancelled</span>
              ) : (
                <span className="max-w-[40%] text-[10px] font-semibold leading-relaxed text-slate-400">Invoice available after pickup</span>
              )}

              {order.status === 'COMPLETED' ? (
                <button type="button" onClick={() => setShowInvoice(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white transition hover:bg-emerald-800 active:scale-[0.98]"><Printer className="h-4 w-4" />Open invoice</button>
              ) : order.status === 'CANCELLED' ? (
                <span className="text-xs font-bold text-slate-400">No further fulfillment</span>
              ) : nextStatus ? (
                <button type="button" onClick={() => void updateStatus()} disabled={busyAction !== null} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-2.5 text-center text-xs font-black text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:px-4">
                  {busyAction === 'status' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <ChevronRight className="h-4 w-4" />}
                  {busyAction === 'status' ? 'Updating…' : `Mark ${getOrderStatusLabel(nextStatus)}`}
                </button>
              ) : null}
            </div>
          </footer>
        </motion.aside>
      </div>

      {showInvoice && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-200">
          <InvoiceTemplate order={toCustomerOrderRecord(order)} onClose={() => setShowInvoice(false)} />
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'COMPLETED' || status === 'PICKED_UP'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'CANCELLED'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : status === 'READY_FOR_PICKUP'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-amber-200 bg-amber-50 text-amber-800';
  return <span className={`max-w-[86px] shrink-0 truncate rounded-full border px-2 py-1 text-[9px] font-extrabold sm:max-w-none sm:px-2.5 sm:text-[10px] ${tone}`}>{getOrderStatusLabel(status)}</span>;
}

function StatusHero({ hero, status }: { hero: ReturnType<typeof statusHero>; status: string }) {
  const Icon = hero.icon;
  return (
    <section className={`flex items-center gap-3 rounded-2xl border p-4 sm:p-5 ${hero.tone}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${hero.iconTone}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-black leading-snug sm:text-base">{hero.title}</h3><p className="mt-1 text-[11px] leading-relaxed opacity-80">{hero.description}</p></div>
      <span className="hidden rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide sm:inline-flex">{getOrderStatusLabel(status)}</span>
    </section>
  );
}

function InformationCard({ icon: Icon, label, value, strong = false }: { icon: React.ElementType; label: string; value: string; strong?: boolean }) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-center gap-2 text-slate-400"><Icon className="h-3.5 w-3.5 shrink-0" /><p className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</p></div>
      <p className={`mt-2 break-words text-xs leading-snug ${strong ? 'text-base font-black text-[#0F172A]' : 'font-bold text-slate-800'}`}>{value}</p>
    </article>
  );
}

function VehicleInformationCard({ order }: { order: AdminOrderRecord }) {
  const vehicleLabel = order.vehicleModel || 'Vehicle not specified';
  return (
    <article aria-label="Vehicle" className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-center gap-2 text-slate-400"><CarFront className="h-3.5 w-3.5 shrink-0" /><p className="text-[10px] font-bold uppercase tracking-[0.08em]">Vehicle</p></div>
      <div className="mt-2 flex items-center gap-3">
        {order.vehicleImage ? (
          <img src={order.vehicleImage} alt={`${order.vehicleCompany || 'Vehicle'} ${vehicleLabel}`} className="h-14 w-20 shrink-0 rounded-lg bg-slate-50 object-contain p-1" />
        ) : (
          <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-300"><CarFront className="h-6 w-6" /></span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{order.vehicleType || 'Vehicle'}</p>
          {order.vehicleCompany && <p className="truncate text-xs font-extrabold text-slate-600">{order.vehicleCompany}</p>}
          <p className="break-words text-sm font-black leading-snug text-slate-900">{vehicleLabel}</p>
        </div>
      </div>
    </article>
  );
}

function OrderProductRow({ item, product, roomy = false }: { item: AdminOrderRecord['items'][number]; product?: Product; roomy?: boolean }) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unit_price || 0);
  const image = product?.image;
  return (
    <article className={`flex min-w-0 items-center gap-3 ${roomy ? 'py-3.5' : 'py-3'}`}>
      <div className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${roomy ? 'h-16 w-16' : 'h-14 w-14'}`}>
        {image ? <img src={image} alt={item.product_name || 'Order product'} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-300" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-extrabold leading-snug text-slate-800">{item.product_name || 'Product'}</p>
        <p className="mt-1 text-[10px] text-slate-500">Qty: {quantity}{item.color ? ` · ${item.color}` : ''}{product?.categoryLabel ? ` · ${product.categoryLabel}` : ''}</p>
        {(item.selected_thickness || item.selected_stitch || item.custom_embroidery_text) && <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{[item.selected_thickness && `Thickness: ${item.selected_thickness}`, item.selected_stitch && `Stitch: ${item.selected_stitch}`, item.custom_embroidery_text && `Embroidery: ${item.custom_embroidery_text}`].filter(Boolean).join(' · ')}</p>}
        <p className="mt-0.5 text-[10px] text-slate-400">{money(unitPrice)} each</p>
      </div>
      <p className="shrink-0 text-right text-xs font-black text-[#0F172A]">{money(unitPrice * quantity)}</p>
    </article>
  );
}

function PaymentSummary({ order, pendingPayment, busy, onVerify }: { order: AdminOrderRecord; pendingPayment: boolean; busy: boolean; onVerify: () => void }) {
  const paymentStatus = order.paymentStatus || 'PENDING';
  const statusTone = paymentStatus.toUpperCase() === 'PAID' ? 'bg-emerald-50 text-emerald-700' : paymentStatus.toUpperCase() === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Payment summary</h3><p className="mt-1 text-[11px] text-slate-500">{order.paymentMethod.replaceAll('_', ' ') || 'Payment method unavailable'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusTone}`}>{paymentStatus}</span></div>
      <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3 text-xs">
        <MoneyLine label="Subtotal" amount={order.subtotal} />
        <MoneyLine label="Discount" amount={-Math.abs(order.discount)} discount />
        <div className="my-2 border-t border-dashed border-slate-200" />
        <MoneyLine label="Total" amount={order.amount} strong />
      </div>
      {pendingPayment && (
        <button type="button" onClick={onVerify} disabled={busy} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white transition hover:bg-emerald-800 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <CreditCard className="h-4 w-4" />}{busy ? 'Verifying…' : 'Verify Payment'}
        </button>
      )}
    </section>
  );
}

function MoneyLine({ label, amount, discount = false, strong = false }: { label: string; amount: number; discount?: boolean; strong?: boolean }) {
  const value = Number(amount || 0);
  const rendered = discount && value < 0 ? `−${money(Math.abs(value))}` : money(value);
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'text-sm' : ''}`}><span className={strong ? 'font-black text-slate-900' : 'font-medium text-slate-500'}>{label}</span><span className={`${strong ? 'font-black text-slate-900' : 'font-bold text-slate-700'} ${discount && value < 0 ? 'text-emerald-700' : ''}`}>{rendered}</span></div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6 text-center"><div><Icon className="mx-auto h-5 w-5 text-slate-300" /><p className="mt-2 text-xs font-extrabold text-slate-700">{title}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{detail}</p></div></div>;
}
