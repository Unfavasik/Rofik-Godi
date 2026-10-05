import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  MapPin,
  Package,
  PackageCheck,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { CustomerOrderRecord } from '../types';
import type { ProductReviewRecord } from '../lib/supabaseReviews';
import { downloadOrderInvoice } from '../lib/orderInvoice';
import { getOrderPreviewItems, isOrderComplete } from '../lib/orderPresentation';

interface CustomerOrdersModalProps {
  orders: CustomerOrderRecord[];
  reviews: ProductReviewRecord[];
  loading: boolean;
  customerName: string;
  onClose: () => void;
  onReview: (order: CustomerOrderRecord, productId: string, productTitle: string, review?: ProductReviewRecord) => void;
}

type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';

const statusName = (status: string) => {
  const labels: Record<string, string> = {
    NEW: 'Order received',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY_FOR_PICKUP: 'Ready for pickup',
    PICKED_UP: 'Completed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
};

const formatMoney = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const formatDate = (value: string, includeTime = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
};

const statusTone = (status: string) => {
  if (status === 'COMPLETED' || status === 'PICKED_UP') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'CANCELLED') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'READY_FOR_PICKUP') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

const OrderStatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${statusTone(status)}`}>
    {isOrderComplete(status) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {statusName(status)}
  </span>
);

const ProductThumb = ({ name, image, className = '' }: { name: string; image?: string | null; className?: string }) => (
  <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#fff7f2] to-[#f2f4f7] ${className}`}>
    {image
      ? <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" />
      : <Package className="h-5 w-5 text-[#c05a47]" aria-hidden="true" />}
  </div>
);

const OrderTimeline = ({ status }: { status: string }) => {
  const steps = [
    { label: 'Order placed', icon: Package },
    { label: 'Confirmed', icon: ShieldCheck },
    { label: 'Preparing', icon: Clock3 },
    { label: 'Ready for pickup', icon: MapPin },
    { label: 'Picked up', icon: PackageCheck },
  ];
  const progressIndex = status === 'COMPLETED' || status === 'PICKED_UP'
    ? 4
    : Math.max(0, ['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].indexOf(status));

  if (status === 'CANCELLED') {
    return <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 text-sm font-semibold text-rose-800">This order was cancelled. If you need help, contact the store team.</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-[#fafafa] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Order journey</p>
          <p className="mt-1 text-sm font-extrabold text-slate-900">{statusName(status)}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{progressIndex + 1} of {steps.length}</span>
      </div>
      <div className="space-y-0">
        {steps.map(({ label, icon: Icon }, index) => {
          const done = index <= progressIndex;
          const current = index === progressIndex;
          return (
            <div key={label} className="relative flex min-h-10 items-start gap-3">
              {index < steps.length - 1 && <span className={`absolute left-[13px] top-7 h-4 w-px ${index < progressIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              <span className={`relative z-10 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-300'} ${current ? 'ring-4 ring-emerald-50' : ''}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className={`pt-1 text-[11px] ${current ? 'font-extrabold text-slate-900' : done ? 'font-semibold text-slate-600' : 'font-medium text-slate-400'}`}>{label}{current ? ' · Current' : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({ orders, reviews, loading, customerName, onClose, onReview }) => {
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const completedCount = orders.filter((order) => isOrderComplete(order.status)).length;
  const activeCount = orders.filter((order) => !isOrderComplete(order.status) && order.status !== 'CANCELLED').length;
  const filteredOrders = useMemo(() => orders.filter((order) => {
    if (filter === 'active') return !isOrderComplete(order.status) && order.status !== 'CANCELLED';
    if (filter === 'completed') return isOrderComplete(order.status);
    if (filter === 'cancelled') return order.status === 'CANCELLED';
    return true;
  }), [filter, orders]);

  const openInvoice = (order: CustomerOrderRecord) => downloadOrderInvoice(order, customerName);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="customer-orders-title">
      <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-label="Close orders" className="fixed inset-0 bg-slate-950/55 backdrop-blur-[3px]" />
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 flex h-[100dvh] max-h-[920px] w-full max-w-[760px] flex-col overflow-hidden bg-[#f7f7f8] shadow-2xl sm:h-[90vh] sm:rounded-[30px] sm:border sm:border-white/70"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#251f20] via-[#171719] to-[#101114] px-5 pb-5 pt-5 text-white sm:px-7 sm:pt-6">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[#e54d3f]/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {selectedOrder && <button type="button" onClick={() => setSelectedOrderId(null)} aria-label="Back to all orders" className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></button>}
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#ffac9e]">Rofik Godi Centre · Pickup orders</p>
                <h2 id="customer-orders-title" className="mt-1 text-[23px] font-black tracking-tight sm:text-[27px]">{selectedOrder ? 'Order details' : 'Your orders'}</h2>
                <p className="mt-1 text-[11px] font-medium text-white/65">{selectedOrder ? `Order #${selectedOrder.order_number}` : 'Every order, update and invoice in one place.'}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close orders" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"><X className="h-4 w-4" /></button>
          </div>
          {!selectedOrder && (
            <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryTile label="All orders" value={orders.length} icon={<Package className="h-3.5 w-3.5" />} />
              <SummaryTile label="In progress" value={activeCount} icon={<Clock3 className="h-3.5 w-3.5" />} />
              <SummaryTile label="Completed" value={completedCount} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            </div>
          )}
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {selectedOrder ? (
            <motion.div key="details" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
              <OrderDetails order={selectedOrder} customerName={customerName} reviews={reviews} onInvoice={() => openInvoice(selectedOrder)} onReview={onReview} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.16 }} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Filter orders">
                {([
                  ['all', 'All orders', orders.length],
                  ['active', 'In progress', activeCount],
                  ['completed', 'Completed', completedCount],
                  ['cancelled', 'Cancelled', orders.filter((order) => order.status === 'CANCELLED').length],
                ] as [OrderFilter, string, number][]).map(([value, label, count]) => (
                  <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-extrabold transition ${filter === value ? 'bg-[#d94335] text-white shadow-[0_5px_14px_rgba(217,67,53,0.2)]' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                    {label}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${filter === value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="space-y-3" aria-label="Loading orders">
                  {[0, 1, 2].map((item) => <div key={item} className="h-[160px] animate-pulse rounded-[22px] border border-slate-100 bg-white" />)}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="grid min-h-[280px] place-items-center rounded-[24px] border border-dashed border-slate-300 bg-white px-7 py-10 text-center">
                  <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0ec] text-[#d94335]"><Package className="h-6 w-6" /></span><h3 className="mt-4 text-base font-black text-slate-900">{orders.length ? 'No orders in this view' : 'Your next ride starts here'}</h3><p className="mx-auto mt-1.5 max-w-[270px] text-xs leading-relaxed text-slate-500">{orders.length ? 'Try another status filter to find your order.' : 'Place an order and we’ll keep every update together right here.'}</p></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order, index) => <OrderCard key={order.id} order={order} index={index} onOpen={() => setSelectedOrderId(order.id)} onInvoice={() => openInvoice(order)} />)}
                </div>
              )}
              <p className="mt-4 flex items-center justify-center gap-1.5 pb-1 text-[10px] font-medium text-slate-400"><ShieldCheck className="h-3.5 w-3.5" />Your order details are visible only to you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
};

const SummaryTile = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.075] px-3 py-2.5 backdrop-blur-sm">
    <div className="flex items-center gap-1.5 text-white/55">{icon}<span className="text-[9px] font-bold">{label}</span></div>
    <p className="mt-1 text-lg font-black leading-none">{value}</p>
  </div>
);

const OrderCard = ({ order, index, onOpen, onInvoice }: { order: CustomerOrderRecord; index: number; onOpen: () => void; onInvoice: () => void }) => {
  const previews = getOrderPreviewItems(order.order_items || []);
  const units = (order.order_items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const itemCount = (order.order_items || []).length;
  const complete = isOrderComplete(order.status);
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.16), duration: 0.22 }} className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)] transition hover:border-slate-300 hover:shadow-[0_8px_26px_rgba(15,23,42,0.07)]">
      <button type="button" onClick={onOpen} aria-label={`View details for order ${order.order_number}`} className="block w-full p-4 text-left sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-[11px] font-black tracking-wide text-slate-900">#{order.order_number}</span><span className="text-slate-300">·</span><span className="text-[10px] font-semibold text-slate-500">{formatDate(order.created_at)}</span></div>
            <p className="mt-2 truncate text-[13px] font-extrabold text-slate-900">{previews[0]?.product_name || 'Store pickup order'}{itemCount > 1 ? <span className="font-semibold text-slate-500"> + {itemCount - 1} more</span> : null}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-500">{units} {units === 1 ? 'item' : 'items'}{order.vehicle_model ? ` · ${order.vehicle_model}` : ''}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#f7f7f8] p-3">
          <div className="flex min-w-0 items-center">
            {previews.slice(0, 3).map((item, imageIndex) => <ProductThumb key={`${item.product_id}-${imageIndex}`} name={item.product_name} image={item.image_url} className={`h-12 w-12 ${imageIndex ? '-ml-3 ring-[3px] ring-[#f7f7f8]' : ''}`} />)}
            {previews.length > 3 && <span className="-ml-3 grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[3px] border-[#f7f7f8] bg-slate-200 text-[10px] font-black text-slate-600">+{previews.length - 3}</span>}
            {!previews.length && <ProductThumb name="Order" className="h-12 w-12" />}
            <span className="ml-3 min-w-0 truncate text-[10px] font-bold text-slate-500">{previews.length > 1 ? `${previews.length} products in this order` : 'Order items'}</span>
          </div>
          <div className="shrink-0 text-right"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Total</p><p className="mt-0.5 text-sm font-black text-slate-900">{formatMoney(order.total)}</p></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-slate-400" />{order.payment_status?.toLowerCase() === 'paid' ? 'Paid' : 'Pay at store'}</span><span className="inline-flex items-center gap-1 text-[#cf4033]">View details<ChevronRight className="h-3.5 w-3.5" /></span></div>
      </button>
      {complete && <div className="flex items-center justify-between gap-3 border-t border-emerald-100 bg-emerald-50/60 px-4 py-2.5 sm:px-5"><span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Order complete · Invoice ready</span><button type="button" onClick={onInvoice} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"><ArrowDownToLine className="h-3.5 w-3.5" />Invoice</button></div>}
    </motion.article>
  );
};

const OrderDetails = ({ order, customerName, reviews, onInvoice, onReview }: { order: CustomerOrderRecord; customerName: string; reviews: ProductReviewRecord[]; onInvoice: () => void; onReview: CustomerOrdersModalProps['onReview'] }) => {
  const complete = isOrderComplete(order.status);
  const items = order.order_items || [];
  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">{formatDate(order.created_at, true)}</p><p className="mt-1 text-lg font-black tracking-tight text-slate-900">Order #{order.order_number}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{items.length} {items.length === 1 ? 'product' : 'products'} · {order.vehicle_model || 'Vehicle not specified'}</p></div><OrderStatusBadge status={order.status} /></div>
        {complete && <button type="button" onClick={onInvoice} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d94335] px-4 py-3 text-xs font-extrabold text-white shadow-[0_7px_16px_rgba(217,67,53,0.2)] transition hover:bg-[#be3429] sm:w-auto"><ArrowDownToLine className="h-4 w-4" />Download invoice PDF</button>}
      </div>

      <OrderTimeline status={order.status} />

      <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5"><div><p className="text-sm font-black text-slate-900">Items in your order</p><p className="mt-0.5 text-[10px] font-medium text-slate-500">{items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} total units</p></div><Package className="h-4 w-4 text-slate-400" /></div>
        <div className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const productReview = reviews.find((review) => review.order_id === order.id && review.product_id === item.product_id);
            const reviewable = complete && Boolean(item.product_id && /^[0-9a-f-]{36}$/i.test(item.product_id));
            return <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <ProductThumb name={item.product_name} image={item.image_url} className="h-[58px] w-[58px] rounded-2xl" />
              <div className="min-w-0 flex-1"><p className="line-clamp-2 text-[11px] font-extrabold leading-snug text-slate-900">{item.product_name}</p><p className="mt-1 text-[10px] text-slate-500">Qty {item.quantity}{item.color ? ` · ${item.color}` : ''}</p>{productReview?.is_verified_purchase && <p className="mt-1 text-[9px] font-bold text-emerald-700">Verified purchase · Review saved</p>}</div>
              <div className="shrink-0 text-right"><p className="text-[11px] font-black text-slate-900">{formatMoney(Number(item.unit_price || 0) * Number(item.quantity || 0))}</p><p className="mt-0.5 text-[9px] text-slate-400">{formatMoney(item.unit_price)} each</p>{reviewable && <button type="button" onClick={() => onReview(order, item.product_id!, item.product_name, productReview)} className="mt-1.5 text-[9px] font-extrabold text-[#cf4033] underline decoration-[#cf4033]/30 underline-offset-2">{productReview ? 'Edit review' : 'Rate item'}</button>}</div>
            </div>;
          })}
          {!items.length && <p className="px-5 py-7 text-center text-xs text-slate-500">No item details available for this order.</p>}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600"><MapPin className="h-4 w-4" /></span><div><p className="text-xs font-black text-slate-900">Pickup details</p><p className="text-[9px] font-medium text-slate-500">Collect from our workshop</p></div></div><p className="mt-3 text-[11px] font-extrabold text-slate-800">{order.pickup_store || 'Rofik Godi Centre'}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{order.fulfillment_method?.replaceAll('_', ' ') || 'Store pickup'} · Kadbeltala, Murshidabad</p></section>
        <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet-600"><CreditCard className="h-4 w-4" /></span><div><p className="text-xs font-black text-slate-900">Payment</p><p className="text-[9px] font-medium text-slate-500">Method &amp; current state</p></div></div><p className="mt-3 text-[11px] font-extrabold capitalize text-slate-800">{order.payment_method?.replaceAll('_', ' ').toLowerCase() || 'Pay at store'}</p><p className="mt-1 text-[10px] text-slate-500">{order.payment_status?.toLowerCase() === 'paid' ? 'Payment received' : 'Payment pending'}</p></section>
      </div>

      <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 sm:p-5"><div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /><p className="text-xs font-black text-slate-900">Bill summary</p></div><div className="space-y-2 text-[11px]"><MoneyRow label="Subtotal" amount={order.subtotal} /><MoneyRow label="Discount" amount={-Number(order.discount || 0)} discount /><div className="my-2 border-t border-dashed border-slate-200" /><div className="flex items-center justify-between text-sm"><span className="font-black text-slate-900">Total paid / due</span><span className="font-black text-slate-900">{formatMoney(order.total)}</span></div></div><p className="mt-2 text-[9px] text-slate-400">{order.payment_status?.toLowerCase() === 'paid' ? 'Paid' : 'Amount due at pickup'} · {customerName || order.customer_name}</p></section>
      <div className="flex items-center justify-center gap-1.5 pb-2 pt-1 text-[9px] font-medium text-slate-400"><CalendarDays className="h-3 w-3" />Placed {formatDate(order.created_at)}</div>
    </div>
  );
};

const MoneyRow = ({ label, amount, discount = false }: { label: string; amount: number; discount?: boolean }) => <div className="flex items-center justify-between"><span className="font-medium text-slate-500">{label}</span><span className={`font-bold ${discount && amount < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{discount && amount < 0 ? `−${formatMoney(Math.abs(amount))}` : formatMoney(amount)}</span></div>;
