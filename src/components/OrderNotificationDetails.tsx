import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  MapPin,
  Navigation,
  Package,
  Phone,
  ReceiptText,
  Store,
  Truck,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';
import { getMyOrderByNumber } from '../lib/supabaseOrders';
import type { CustomerOrderRecord } from '../types';

const money = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const orderDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const readableStatus = (status: string) => ({
  NEW: 'Order received',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'Picked up',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}[status] || status.replaceAll('_', ' ').toLowerCase());
const statusHeadline = (status: string) => ({
  NEW: 'Order received',
  CONFIRMED: 'Order confirmed',
  PREPARING: 'Being prepared',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'Picked up',
  COMPLETED: 'Order completed',
  CANCELLED: 'Order cancelled',
}[status] || `Order ${readableStatus(status)}`);
const stages = [
  { label: 'Order received', statuses: ['NEW'] },
  { label: 'Confirmed', statuses: ['CONFIRMED', 'PREPARING'] },
  { label: 'Ready for pickup', statuses: ['READY_FOR_PICKUP'] },
  { label: 'Picked up', statuses: ['PICKED_UP', 'COMPLETED'] },
];
const currentStage = (status: string) => {
  const index = stages.findIndex((stage) => stage.statuses.includes(status));
  return Math.max(0, index);
};

export function OrderNotificationDetails({
  userId,
  orderNumber,
  initialOrder,
  onBack,
}: {
  userId: string;
  orderNumber: string;
  initialOrder?: CustomerOrderRecord | null;
  onBack: () => void;
}) {
  const [order, setOrder] = useState<CustomerOrderRecord | null>(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [loadError, setLoadError] = useState(false);

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

  const openMaps = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}`;
  const scrollToTracking = () => document.getElementById('order-notification-progress')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const phoneHref = `tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`;
  const emailHref = `mailto:${WORKSHOP_INFO.email}?subject=${encodeURIComponent(`Help with order ${orderNumber}`)}`;

  if (loading) return <main className="min-h-screen bg-[#f6f7f9] text-slate-900">
    <OrderHeader orderNumber={orderNumber} onBack={onBack} />
    <div className="mx-auto max-w-xl space-y-3 p-4" aria-label="Loading order details">
      {[0, 1, 2, 3].map((key) => <div key={key} className="h-28 animate-pulse rounded-2xl bg-white" />)}
    </div>
  </main>;

  if (!order || loadError) return <main className="min-h-screen bg-[#f6f7f9] text-slate-900">
    <OrderHeader orderNumber={orderNumber} onBack={onBack} />
    <div className="mx-auto max-w-xl p-5"><div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Could not load this order. It may have expired or is no longer available.</div></div>
  </main>;

  const cancelled = order.status === 'CANCELLED';
  const activeStage = currentStage(order.status);
  const isPaid = order.payment_status?.toLowerCase() === 'paid';
  const orderStatusTone = cancelled
    ? 'bg-rose-100 text-rose-700'
    : order.status === 'COMPLETED' || order.status === 'PICKED_UP'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-rose-100 text-[#b51e29]';
  const paymentMethod = order.payment_method === 'PAY_ONLINE' ? 'UPI online' : 'Pay at workshop on pickup';
  const units = order.order_items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return <main className="min-h-screen bg-[#f6f7f9] pb-24 font-sans text-slate-900">
    <OrderHeader orderNumber={order.order_number} onBack={onBack} />
    <div className="mx-auto w-full max-w-2xl space-y-3.5 px-3 py-4 sm:px-5">
      <section id="order-notification-progress" className="scroll-mt-4 overflow-hidden rounded-[22px] border border-rose-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#fff2f3] to-[#fff8f8] p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ffe5e8] text-[#d9232d]"><Package className="h-6 w-6" /></span>
            <div className="min-w-0"><h1 className="text-[17px] font-black tracking-tight">{statusHeadline(order.status)}</h1><p className="mt-1 text-[11px] leading-relaxed text-slate-600">{cancelled ? 'This order was cancelled. Contact the store if you need help.' : 'Your store-pickup order is saved. We’ll keep the latest status here.'}</p><p className="mt-1.5 text-[10px] font-medium text-slate-500">Placed {orderDate(order.created_at)}</p></div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${orderStatusTone}`}>{readableStatus(order.status)}</span>
        </div>
        {!cancelled && <div className="grid grid-cols-4 gap-1 px-3 py-4 sm:px-5">
          {stages.map((stage, index) => {
            const complete = index <= activeStage;
            return <div key={stage.label} className="relative flex flex-col items-center text-center">
              {index < stages.length - 1 && <span className={`absolute left-1/2 top-[11px] h-0.5 w-full ${index < activeStage ? 'bg-[#d9232d]' : 'bg-slate-200'}`} />}
              <span className={`relative z-[1] grid h-[23px] w-[23px] place-items-center rounded-full ${complete ? 'bg-[#d9232d] text-white' : 'bg-slate-200 text-white'}`}>{complete ? <Check className="h-3.5 w-3.5" /> : <span className="text-[9px] font-bold">{index + 1}</span>}</span>
              <span className={`mt-2 text-[9px] font-bold leading-3 sm:text-[10px] ${complete ? 'text-[#b51e29]' : 'text-slate-400'}`}>{stage.label}</span>
              <span className="mt-0.5 text-[9px] text-slate-400">{index === 0 ? orderDate(order.created_at).split(', ').slice(-1)[0] : complete ? 'Done' : 'Pending'}</span>
            </div>;
          })}
        </div>}
      </section>

      <section className="rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex gap-3">
          <img src="/images/rofik-godi-store.webp" alt="Rofik Godi Centre storefront" className="h-[112px] w-[112px] shrink-0 rounded-2xl object-cover sm:h-[132px] sm:w-[132px]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-1.5 text-[12px] font-black text-[#c92330]"><MapPin className="h-4 w-4 shrink-0" />Pickup from store</h2><a href={openMaps()} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1.5 text-[9px] font-extrabold text-[#c92330]"><Navigation className="h-3 w-3" />Open map</a></div>
            <p className="mt-1 text-[12px] font-black text-slate-900">{order.pickup_store || WORKSHOP_INFO.name}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">{WORKSHOP_INFO.address}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-slate-600"><Clock3 className="h-3 w-3 shrink-0" />{WORKSHOP_INFO.workingHours}</p>
            <a href={phoneHref} className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-700"><Phone className="h-3 w-3" />{WORKSHOP_INFO.phone}</a>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5"><h2 className="flex items-center gap-2 text-[14px] font-black"><span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-[#d9232d]"><Package className="h-4 w-4" /></span>Items ({order.order_items.length})</h2><span className="text-[10px] font-semibold text-slate-500">{units} total units</span></div>
        <div className="divide-y divide-slate-100 px-3.5 sm:px-4">
          {order.order_items.map((item, index) => <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 py-3">
            <div className="grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#fff5f3] text-[#d44b4c]">{item.image_url ? <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-5 w-5" />}</div>
            <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-[11px] font-extrabold leading-4 text-slate-900">{item.product_name}</h3><p className="mt-1 text-[10px] text-slate-500">{item.color ? `${item.color} · ` : ''}Qty: {item.quantity}</p></div>
            <div className="shrink-0 text-right"><p className="text-[11px] font-black text-slate-900">{money(item.unit_price * item.quantity)}</p><p className="mt-1 text-[9px] text-slate-500">Qty: {item.quantity}</p></div>
          </div>)}
          {!order.order_items.length && <p className="py-6 text-center text-xs text-slate-500">No item details are available for this order.</p>}
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-[14px] font-black"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CreditCard className="h-4 w-4" /></span>Payment details</h2><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-extrabold ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><CheckCircle2 className="h-3 w-3" />{isPaid ? 'Payment confirmed' : 'Payment pending'}</span></div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="border-r border-slate-100 pr-3"><p className="text-[10px] text-slate-500">Total amount</p><p className="mt-1 text-[21px] font-black text-[#d9232d]">{money(order.total)}</p><p className="mt-3 text-[10px] text-slate-500">Payment method</p><p className="mt-1 text-[11px] font-bold text-slate-800">{paymentMethod}</p><p className="mt-3 text-[10px] text-slate-500">Payment status</p><p className={`mt-1 text-[11px] font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>{isPaid ? 'Paid' : 'Due at pickup'}</p></div>
          <div className="space-y-2 pt-1 text-[10px]"><PriceLine label="Items total" amount={order.subtotal} /><div className="flex items-center justify-between"><span className="text-slate-500">Store pickup</span><span className="font-bold text-emerald-700">FREE</span></div><PriceLine label="Discount" amount={-Number(order.discount || 0)} discount /><div className="border-t border-slate-100 pt-2"><PriceLine label={isPaid ? 'Total paid' : 'Total due'} amount={order.total} strong /></div></div>
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-[13px] font-black"><span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-[#d9232d]"><ReceiptText className="h-4 w-4" /></span>Order information</h2>
        <div className="mt-3 divide-y divide-slate-100 text-[10px]">
          <InfoLine label="Order ID" value={`#${order.order_number}`} />
          <InfoLine label="Order date" value={orderDate(order.created_at)} />
          <InfoLine label="Order type" value="Store pickup" />
          <InfoLine label="Customer" value={order.customer_name || '—'} />
          <InfoLine label="Payment status" value={isPaid ? 'Paid' : 'Pending'} accent={isPaid ? 'green' : 'amber'} />
          {order.vehicle_model && <InfoLine label="Vehicle" value={order.vehicle_model} />}
        </div>
      </section>
    </div>

    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-5px_20px_rgba(15,23,42,0.07)] backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2">
        <button type="button" onClick={scrollToTracking} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-extrabold text-slate-800"><Truck className="h-4 w-4" />Track order</button>
        <a href={emailHref} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-extrabold text-slate-800"><FileText className="h-4 w-4" />Need help?</a>
        <a href={phoneHref} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#d9232d] px-2 text-[10px] font-extrabold text-white"><Phone className="h-4 w-4" />Contact store</a>
      </div>
    </footer>
  </main>;
}

function OrderHeader({ orderNumber, onBack }: { orderNumber: string; onBack: () => void }) {
  return <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-5">
    <button type="button" onClick={onBack} aria-label="Back to notifications" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-800"><ArrowLeft className="h-5 w-5" /></button>
    <div className="min-w-0 flex-1"><h1 className="text-[18px] font-black tracking-tight">Order Details</h1><p className="truncate font-mono text-[10px] text-slate-500">#{orderNumber}</p></div>
    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-[#d9232d]"><Store className="h-5 w-5" /></span>
  </header>;
}

function PriceLine({ label, amount, discount = false, strong = false }: { label: string; amount: number; discount?: boolean; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-2 ${strong ? 'text-[11px] font-black text-slate-900' : 'text-slate-600'}`}><span>{label}</span><span className={`${discount && amount < 0 ? 'font-bold text-emerald-700' : 'font-bold text-slate-800'}`}>{discount && amount < 0 ? `−${money(Math.abs(amount))}` : money(amount)}</span></div>;
}

function InfoLine({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'amber' }) {
  return <div className="flex items-center justify-between gap-3 py-2.5"><span className="text-slate-500">{label}</span><span className={`text-right font-semibold ${accent === 'green' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : 'text-slate-700'}`}>{value}</span></div>;
}
