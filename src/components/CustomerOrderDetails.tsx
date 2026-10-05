import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Store,
  UserRound,
  XCircle,
} from 'lucide-react';
import type { CustomerOrderRecord } from '../types';
import type { ProductReviewRecord } from '../lib/supabaseReviews';
import { canShowPickupQr, getOrderStatusLabel, isOrderComplete } from '../lib/orderPresentation';

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const StatusBadge = ({ status }: { status: string }) => {
  const tone = status === 'COMPLETED' || status === 'PICKED_UP'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'CANCELLED'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : status === 'READY_FOR_PICKUP'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-amber-200 bg-amber-50 text-amber-700';
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${tone}`}>{isOrderComplete(status) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{getOrderStatusLabel(status)}</span>;
};

const InformationCard = ({ icon: Icon, label, value, strong = false }: { icon: React.ElementType; label: string; value: string; strong?: boolean }) => (
  <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
    <div className="flex items-center gap-2 text-slate-400"><Icon className="h-3.5 w-3.5 shrink-0" /><p className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</p></div>
    <p className={`mt-2 break-words text-xs leading-snug ${strong ? 'text-base font-black text-slate-900' : 'font-bold text-slate-800'}`}>{value || '—'}</p>
  </article>
);

const ProductThumb = ({ name, image }: { name: string; image?: string | null }) => (
  <div className="grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-orange-50 to-slate-50">
    {image ? <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-orange-300" aria-hidden="true" />}
  </div>
);

const OrderTimeline = ({ status }: { status: string }) => {
  const steps = [
    { label: 'Order placed', icon: Package },
    { label: 'Confirmed', icon: ShieldCheck },
    { label: 'Preparing', icon: Clock3 },
    { label: 'Ready for pickup', icon: MapPin },
    { label: 'Picked up', icon: PackageCheck },
    { label: 'Completed', icon: CheckCircle2 },
  ];
  const progressIndex = Math.max(0, ['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED'].indexOf(status));
  if (status === 'CANCELLED') return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-800">This order was cancelled. If you need help, contact the store team.</div>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Order journey</p><p className="mt-1 text-sm font-extrabold text-slate-900">{getOrderStatusLabel(status)}</p></div><span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{progressIndex + 1} of {steps.length}</span></div>
      <ol className="space-y-0">
        {steps.map(({ label, icon: Icon }, index) => {
          const done = index <= progressIndex;
          const current = index === progressIndex;
          return <li key={label} className="relative flex min-h-10 items-start gap-3">
            {index < steps.length - 1 && <span className={`absolute left-[13px] top-7 h-4 w-px ${index < progressIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} aria-hidden="true" />}
            <span className={`relative z-10 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-300'} ${current ? 'ring-4 ring-emerald-50' : ''}`}>{done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}</span>
            <span className={`pt-1 text-[11px] ${current ? 'font-extrabold text-slate-900' : done ? 'font-semibold text-slate-600' : 'font-medium text-slate-400'}`}>{label}{current ? ' · Current' : ''}</span>
          </li>;
        })}
      </ol>
      <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-500">Stages show the order’s current progress. Recorded update times are shown only when available.</p>
    </section>
  );
};

const MoneyRow = ({ label, amount, discount = false }: { label: string; amount: number; discount?: boolean }) => (
  <div className="flex items-center justify-between"><span className="font-medium text-slate-500">{label}</span><span className={`font-bold ${discount && amount < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{discount && amount < 0 ? `−${money(Math.abs(amount))}` : money(amount)}</span></div>
);

type DetailTab = 'overview' | 'products' | 'timeline' | 'notes';

export function CustomerOrderDetails({
  order,
  customerName,
  reviews,
  pickupToken,
  pickupTokenLoading,
  pickupTokenError,
  onRetryPickupToken,
  onInvoice,
  onReview,
}: {
  order: CustomerOrderRecord;
  customerName: string;
  reviews: ProductReviewRecord[];
  pickupToken: string | null;
  pickupTokenLoading: boolean;
  pickupTokenError: string;
  onRetryPickupToken: () => void;
  onInvoice: () => void;
  onReview: (order: CustomerOrderRecord, productId: string, productTitle: string, review?: ProductReviewRecord) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const items = order.order_items || [];
  const complete = isOrderComplete(order.status);
  const tabs: Array<{ id: DetailTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'timeline', label: 'Timeline', icon: Clock3 },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  const renderProductRow = (item: CustomerOrderRecord['order_items'][number], index: number) => {
    const review = reviews.find((entry) => entry.order_id === order.id && entry.product_id === item.product_id);
    const reviewable = complete && Boolean(item.product_id && /^[0-9a-f-]{36}$/i.test(item.product_id));
    return <article key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 py-3">
      <ProductThumb name={item.product_name} image={item.image_url} />
      <div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-extrabold leading-snug text-slate-900">{item.product_name}</p><p className="mt-1 text-[10px] text-slate-500">Qty: {item.quantity}{item.color ? ` · ${item.color}` : ''}</p>{review?.is_verified_purchase && <p className="mt-1 text-[9px] font-bold text-emerald-700">Verified purchase · Review saved</p>}</div>
      <div className="shrink-0 text-right"><p className="text-xs font-black text-slate-900">{money(Number(item.unit_price || 0) * Number(item.quantity || 0))}</p><p className="mt-0.5 text-[9px] text-slate-400">{money(item.unit_price)} each</p>{reviewable && <button type="button" onClick={() => onReview(order, item.product_id!, item.product_name, review)} className="mt-1.5 text-[9px] font-extrabold text-[#cf4033] underline decoration-[#cf4033]/30 underline-offset-2">{review ? 'Edit review' : 'Rate item'}</button>}</div>
    </article>;
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <section className={`flex items-center gap-3 rounded-2xl border p-4 sm:p-5 ${order.status === 'COMPLETED' || order.status === 'PICKED_UP' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : order.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-800' : order.status === 'READY_FOR_PICKUP' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white">{order.status === 'CANCELLED' ? <XCircle className="h-5 w-5" /> : complete ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-black">{order.status === 'COMPLETED' ? 'Order completed' : order.status === 'PICKED_UP' ? 'Order has been picked up' : order.status === 'CANCELLED' ? 'Order cancelled' : order.status === 'READY_FOR_PICKUP' ? 'Ready for pickup' : getOrderStatusLabel(order.status)}</h3><p className="mt-1 text-[11px] leading-relaxed opacity-80">{order.status === 'COMPLETED' ? 'Your invoice is ready to view or print.' : order.status === 'PICKED_UP' ? 'The store has recorded this order as picked up.' : order.status === 'CANCELLED' ? 'No pickup QR is available for a cancelled order.' : 'Track your order and show the pickup QR when collecting it.'}</p></div>
        <StatusBadge status={order.status} />
      </section>

      {order.status === 'COMPLETED' && <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white"><FileText className="h-5 w-5" /></span><div><h3 className="text-sm font-black">Order completed</h3><p className="mt-0.5 text-[11px]">Your customer invoice is ready.</p></div></div><button type="button" onClick={onInvoice} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3.5 text-xs font-black text-white hover:bg-emerald-800"><Printer className="h-4 w-4" />Open invoice</button></section>}

      <section aria-label="Order information" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InformationCard icon={UserRound} label="Customer" value={order.customer_name || customerName} />
        <InformationCard icon={Phone} label="Phone" value={order.customer_phone || '—'} />
        <InformationCard icon={CarFront} label="Vehicle" value={order.vehicle_model || '—'} />
        <InformationCard icon={Store} label="Pickup store" value={order.pickup_store || 'Rofik Godi Centre'} />
        <InformationCard icon={IndianRupee} label="Total amount" value={money(order.total)} strong />
        <InformationCard icon={CreditCard} label="Payment status" value={order.payment_status || 'PENDING'} />
        <InformationCard icon={CheckCircle2} label="Order status" value={getOrderStatusLabel(order.status)} />
        <InformationCard icon={CalendarDays} label="Created at" value={formatDateTime(order.created_at)} />
      </section>

      {canShowPickupQr(order.status) && <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><QrCode className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-900">Pickup QR code</h3><p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">Show this one-time code to the store team when your order is ready.</p></div></div>
        {pickupTokenLoading ? <div className="grid min-h-40 place-items-center rounded-xl bg-slate-50 text-xs font-semibold text-slate-500"><span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />Loading your secure QR…</span></div> : pickupToken ? <div className="flex flex-col items-center gap-4 rounded-xl bg-emerald-50/60 p-4 sm:flex-row sm:items-center">
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><QRCodeSVG value={pickupToken} size={168} level="M" title={`Pickup QR for order ${order.order_number}`} /></div>
          <div className="min-w-0 text-center sm:text-left"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-800">One-time pickup code</p><code className="mt-2 block break-all rounded-xl border border-emerald-100 bg-white px-3 py-2 font-mono text-[10px] font-bold leading-relaxed text-slate-700">{pickupToken}</code><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Only an authorized store administrator can scan this code. It disappears after pickup is recorded.</p></div>
        </div> : <div className="rounded-xl bg-amber-50 p-3.5 text-center"><p className="text-[11px] font-semibold leading-relaxed text-amber-800">{pickupTokenError || 'Pickup QR is temporarily unavailable.'}</p><button type="button" onClick={onRetryPickupToken} className="mt-2 rounded-lg bg-white px-3 py-1.5 text-[10px] font-extrabold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">Try again</button></div>}
      </section>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Products <span className="text-slate-400">({items.length})</span></h3><p className="mt-0.5 text-[10px] text-slate-500">Items saved with this order</p></div>{items.length > 0 && <button type="button" onClick={() => setActiveTab('products')} className="text-xs font-extrabold text-[#cf4033]">View all</button>}</div>
        {items.length ? <div className="divide-y divide-slate-100">{items.slice(0, 3).map(renderProductRow)}{items.length > 3 && <p className="py-2 text-[10px] font-bold text-slate-400">+{items.length - 3} more products</p>}</div> : <p className="py-5 text-center text-xs text-slate-500">No item details available for this order.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-slate-400" /><h3 className="text-sm font-black text-slate-900">Payment &amp; bill summary</h3></div><p className="mb-3 text-[10px] font-semibold capitalize text-slate-500">{order.payment_method?.replaceAll('_', ' ').toLowerCase() || 'Pay at store'} · {order.payment_status?.toLowerCase() === 'paid' ? 'Paid' : 'Amount due at pickup'}</p><div className="space-y-2 text-[11px]"><MoneyRow label="Subtotal" amount={order.subtotal} /><MoneyRow label="Discount" amount={-Number(order.discount || 0)} discount /><div className="my-2 border-t border-dashed border-slate-200" /><div className="flex items-center justify-between text-sm"><span className="font-black text-slate-900">Total paid / due</span><span className="font-black text-slate-900">{money(order.total)}</span></div></div></section>
    </div>
  );

  const renderProducts = () => <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-3"><h3 className="text-base font-black text-slate-900">Products</h3><p className="mt-1 text-xs text-slate-500">{items.length} {items.length === 1 ? 'line item' : 'line items'} · {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} total units</p></div>{items.length ? <div className="divide-y divide-slate-100">{items.map(renderProductRow)}</div> : <p className="py-6 text-center text-xs text-slate-500">No products on this order.</p>}</section>;
  const renderTimeline = () => <OrderTimeline status={order.status} />;
  const renderNotes = () => <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-500" /><div><h3 className="text-base font-black text-slate-900">Order notes</h3><p className="mt-1 text-xs text-slate-500">Notes saved with your store-pickup order.</p></div></div>{order.pickup_note?.trim() ? <article className="rounded-xl border border-slate-100 bg-slate-50 p-3.5"><p className="text-[11px] font-extrabold text-slate-700">Your pickup note</p><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{order.pickup_note}</p></article> : <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">No pickup note was added to this order.</p>}</section>;
  const panels: Record<DetailTab, () => React.ReactNode> = { overview: renderOverview, products: renderProducts, timeline: renderTimeline, notes: renderNotes };

  return <div className="flex min-h-full flex-col">
    <div className="flex-1 space-y-4 pb-4">
      <nav className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Order detail sections">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`customer-order-panel-${id}`} onClick={() => setActiveTab(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[10px] font-extrabold transition ${activeTab === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      </nav>
      <div id={`customer-order-panel-${activeTab}`} role="tabpanel" tabIndex={0} aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label} details`}>
        {panels[activeTab]()}
      </div>
    </div>
    <footer className="sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-7 sm:px-7">
      <div className="min-w-0 text-[10px] font-bold text-slate-500">{order.status === 'COMPLETED' ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" />Order completed</span> : order.status === 'PICKED_UP' ? 'Picked up · invoice available' : order.status === 'CANCELLED' ? 'Order cancelled' : 'Pickup QR is available in Overview'}</div>
      {complete && <button type="button" onClick={onInvoice} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white transition hover:bg-emerald-800"><Printer className="h-4 w-4" />Invoice / Print</button>}
    </footer>
  </div>;
}
