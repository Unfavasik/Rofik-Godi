import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  ImageOff,
  MapPin,
  Package,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import type { CustomerOrderRecord, Product } from '../types';
import type { ProductReviewRecord } from '../lib/supabaseReviews';
import { downloadOrderInvoice } from '../lib/orderInvoice';
import { getOrderStatusLabel, isOrderComplete } from '../lib/orderPresentation';
import { Skeleton } from './Skeleton';

interface MyOrdersViewProps {
  orders: CustomerOrderRecord[];
  loading: boolean;
  products: Product[];
  reviews: ProductReviewRecord[];
  customerName?: string;
  onClose: () => void;
  onShop: () => void;
  onReview: (payload: { productId: string; orderId: string; orderNumber: string; productTitle: string; review?: ProductReviewRecord }) => void;
}

type OrderFilter = 'All orders' | 'In progress' | 'Completed' | 'Cancelled';
const filters: OrderFilter[] = ['All orders', 'In progress', 'Completed', 'Cancelled'];
const steps = [
  { key: 'NEW', label: 'Order placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PREPARING', label: 'Being prepared' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for pickup' },
  { key: 'PICKED_UP', label: 'Picked up' },
  { key: 'COMPLETED', label: 'Completed' },
];
const statusIndex: Record<string, number> = { NEW: 0, CONFIRMED: 1, PREPARING: 2, READY_FOR_PICKUP: 3, PICKED_UP: 4, COMPLETED: 5 };
const formatMoney = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatDate = (date: string, withTime = false) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? 'Date unavailable' : value.toLocaleString('en-IN', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
};
const isComplete = isOrderComplete;
const statusCopy = getOrderStatusLabel;

export function MyOrdersView({ orders, loading, products, reviews, customerName, onClose, onShop, onReview }: MyOrdersViewProps) {
  const [filter, setFilter] = useState<OrderFilter>('All orders');
  const [query, setQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const counts = useMemo(() => ({
    'All orders': orders.length,
    'In progress': orders.filter((order) => !isComplete(order.status) && order.status !== 'CANCELLED').length,
    Completed: orders.filter((order) => isComplete(order.status)).length,
    Cancelled: orders.filter((order) => order.status === 'CANCELLED').length,
  }), [orders]);
  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesFilter = filter === 'All orders'
      || (filter === 'In progress' && !isComplete(order.status) && order.status !== 'CANCELLED')
      || (filter === 'Completed' && isComplete(order.status))
      || (filter === 'Cancelled' && order.status === 'CANCELLED');
    const search = query.trim().toLowerCase();
    const matchesSearch = !search || `${order.order_number} ${order.order_items.map((item) => item.product_name).join(' ')}`.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  }), [filter, orders, query]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101114]/70 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-orders-title"
    >
      <div className="flex h-full w-full max-w-[1160px] flex-col overflow-hidden bg-[#f7f6f4] shadow-[0_32px_100px_rgba(0,0,0,0.35)] sm:h-[min(900px,94vh)] sm:rounded-[30px]">
        <header className="relative shrink-0 overflow-hidden bg-[#17191d] px-5 pb-5 pt-5 text-white sm:px-8 sm:pb-6 sm:pt-6">
          <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-[#d9232d]/25 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55"><span className="h-1.5 w-1.5 rounded-full bg-[#ef4b54]" /> Your ride, in good hands</p>
              <h2 id="my-orders-title" className="mt-2 text-[25px] font-black tracking-[-0.04em] sm:text-[32px]">My orders<span className="text-[#ed4049]">.</span></h2>
              <p className="mt-1 text-[12px] text-white/60">Track your fitment, revisit past orders and keep every receipt close.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close orders" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:max-w-[510px] sm:gap-3">
            <SummaryStat label="Total orders" value={orders.length} icon={<ShoppingBag className="h-3.5 w-3.5" />} />
            <SummaryStat label="In progress" value={counts['In progress']} icon={<Clock3 className="h-3.5 w-3.5" />} />
            <SummaryStat label="Completed" value={counts.Completed} icon={<BadgeCheck className="h-3.5 w-3.5" />} />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(310px,0.84fr)_minmax(0,1.3fr)]">
          <section className={`min-h-0 flex-col border-r border-[#e9e7e4] bg-[#fbfaf9] ${selectedOrder ? 'hidden md:flex' : 'flex'}`} aria-label="Order list">
            <div className="shrink-0 border-b border-[#e9e7e4] px-4 pb-3 pt-4 sm:px-5">
              <label className="flex h-10 items-center gap-2.5 rounded-xl border border-[#e7e5e2] bg-white px-3 text-[#86868b] focus-within:border-[#d9232d]/40 focus-within:ring-2 focus-within:ring-[#d9232d]/10">
                <Search className="h-4 w-4" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an order or product" className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[#24262a] outline-none placeholder:text-[#a1a1a7]" aria-label="Find an order or product" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>}
              </label>
              <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter orders">
                {filters.map((name) => <button key={name} type="button" role="tab" aria-selected={filter === name} onClick={() => setFilter(name)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${filter === name ? 'bg-[#202227] text-white' : 'bg-transparent text-[#777980] hover:bg-[#eeece9]'}`}>{name}<span className={`ml-1.5 ${filter === name ? 'text-white/60' : 'text-[#a1a1a7]'}`}>{counts[name]}</span></button>)}
              </div>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3.5 sm:p-4">
              {loading ? <LoadingOrders /> : visibleOrders.length === 0 ? <EmptyOrders hasOrders={orders.length > 0} onShop={onShop} /> : visibleOrders.map((order) => (
                <OrderCard key={order.id} order={order} products={productById} selected={selectedOrderId === order.id} onSelect={() => setSelectedOrderId(order.id)} />
              ))}
            </div>
            <div className="hidden shrink-0 items-center gap-2 border-t border-[#e9e7e4] px-5 py-3 text-[10px] font-medium text-[#96969b] md:flex"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Securely linked to your account</div>
          </section>

          <section className={`no-scrollbar min-h-0 flex-col overflow-y-auto bg-[#f7f6f4] ${selectedOrder ? 'flex' : 'hidden md:flex'}`} aria-label="Order details">
            {selectedOrder ? <OrderDetails
              order={selectedOrder}
              products={productById}
              reviews={reviews}
              customerName={customerName}
              onBack={() => setSelectedOrderId(null)}
              onReview={onReview}
            /> : <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[24px] bg-white text-[#c6c3bf] shadow-[0_5px_20px_rgba(25,25,25,0.04)]"><Package className="h-8 w-8" strokeWidth={1.5} /></div>
              <h3 className="mt-5 text-[17px] font-extrabold tracking-tight text-[#292a2e]">Every order has a story.</h3>
              <p className="mt-2 max-w-[270px] text-[12px] leading-5 text-[#8a8b91]">Choose an order to see product details, fitment status and your invoice.</p>
              <div className="mt-6 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-bold text-[#76777e]"><ArrowLeft className="h-3.5 w-3.5" /> Select an order from the list</div>
            </div>}
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.055] px-2.5 py-2 sm:gap-3 sm:px-3.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[#f06a71]">{icon}</span><span className="min-w-0"><b className="block text-[14px] font-black leading-none sm:text-[16px]">{value}</b><span className="mt-1 block truncate text-[9px] font-medium text-white/50">{label}</span></span></div>;
}

function OrderCard({ order, products, selected, onSelect }: { order: CustomerOrderRecord; products: Map<string, Product>; selected: boolean; onSelect: () => void }) {
  const complete = isComplete(order.status);
  const cancelled = order.status === 'CANCELLED';
  const itemCount = order.order_items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const firstNames = order.order_items.slice(0, 2).map((item) => item.product_name).filter(Boolean);
  return <article className={`group relative overflow-hidden rounded-[18px] border bg-white transition duration-200 ${selected ? 'border-[#d9232d]/40 shadow-[0_8px_28px_rgba(217,35,45,0.09)] ring-1 ring-[#d9232d]/10' : 'border-[#eceae7] shadow-[0_3px_12px_rgba(20,20,20,0.025)] hover:-translate-y-0.5 hover:border-[#d8d5d1] hover:shadow-[0_10px_25px_rgba(20,20,20,0.06)]'}`}>
    <button type="button" onClick={onSelect} className="w-full p-3.5 text-left sm:p-4" aria-label={`View details for order ${order.order_number}`}>
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 -space-x-2.5 pt-0.5">
          {order.order_items.slice(0, 3).map((item, index) => <ProductThumb key={`${item.product_id || item.product_name}-${index}`} item={item} product={item.product_id ? products.get(item.product_id) : undefined} size="small" />)}
          {order.order_items.length === 0 && <ProductThumb size="small" />}
          {order.order_items.length > 3 && <span className="z-10 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-[#25272c] text-[9px] font-black text-white">+{order.order_items.length - 3}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><span className="truncate font-mono text-[10px] font-bold tracking-wide text-[#888990]">#{order.order_number}</span><StatusBadge status={order.status} /></div>
          <h3 className="mt-1.5 line-clamp-1 text-[12px] font-extrabold text-[#292a2e]">{firstNames[0] || 'Store pickup order'}{order.order_items.length > 1 && <span className="font-semibold text-[#85868c]"> + {order.order_items.length - 1} more</span>}</h3>
          <p className="mt-1 text-[10px] font-medium text-[#96969b]">{formatDate(order.created_at)} <span className="px-0.5">·</span> {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
      </div>
      <div className="mt-3.5 flex items-end justify-between border-t border-[#f0efed] pt-3">
        <div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#a1a1a6]">Order total</p><p className="mt-0.5 text-[15px] font-black tracking-tight text-[#292a2e]">{formatMoney(order.total)}</p></div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold transition ${selected ? 'text-[#d9232d]' : 'text-[#73757c] group-hover:text-[#d9232d]'}`}>{cancelled ? 'Details' : complete ? 'View details' : 'Track order'}<ChevronRight className="h-3.5 w-3.5" /></span>
      </div>
    </button>
  </article>;
}

function ProductThumb({ item, product, size = 'large' }: { item?: CustomerOrderRecord['order_items'][number]; product?: Product; size?: 'small' | 'large' }) {
  const [failed, setFailed] = useState(false);
  const box = size === 'small' ? 'h-10 w-10 rounded-xl' : 'h-[66px] w-[66px] rounded-[15px]';
  if (product?.image && !failed) return <span className={`relative block shrink-0 overflow-hidden border-2 border-white bg-[#efeeec] shadow-sm ${box}`}><img src={product.image} alt={product.title} onError={() => setFailed(true)} className="h-full w-full object-cover" loading="lazy" /></span>;
  return <span className={`flex shrink-0 items-center justify-center border-2 border-white bg-[#efeeec] text-[#aaa8a4] shadow-sm ${box}`} role="img" aria-label={item?.product_name ? `Product image unavailable for ${item.product_name}` : 'Product image unavailable'}>{failed ? <ImageOff className={size === 'small' ? 'h-4 w-4' : 'h-6 w-6'} /> : <Package className={size === 'small' ? 'h-4 w-4' : 'h-6 w-6'} strokeWidth={1.5} />}</span>;
}

function OrderDetails({ order, products, reviews, customerName, onBack, onReview }: {
  order: CustomerOrderRecord;
  products: Map<string, Product>;
  reviews: ProductReviewRecord[];
  customerName?: string;
  onBack: () => void;
  onReview: MyOrdersViewProps['onReview'];
}) {
  const cancelled = order.status === 'CANCELLED';
  const complete = isComplete(order.status);
  const currentStep = statusIndex[order.status] ?? 0;
  return <motion.div key={order.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-full flex-col">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e9e7e4] bg-[#f7f6f4]/95 px-4 py-3 backdrop-blur sm:px-7">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-bold text-[#777980] hover:bg-white md:hidden"><ArrowLeft className="h-4 w-4" />All orders</button>
      <span className="hidden text-[10px] font-bold uppercase tracking-[0.17em] text-[#a0a0a5] md:inline">Order details</span>
      <span className="ml-auto font-mono text-[10px] font-bold text-[#85868d]">#{order.order_number}</span>
    </div>
    <div className="mx-auto w-full max-w-[760px] space-y-4 p-4 pb-8 sm:space-y-5 sm:p-6 sm:pb-10 sm:px-8">
      <section className={`relative overflow-hidden rounded-[22px] p-5 text-white shadow-sm sm:p-6 ${cancelled ? 'bg-[#33343a]' : complete ? 'bg-[#17251f]' : 'bg-[#23252a]'}`}>
        <div className="pointer-events-none absolute -right-5 -top-14 h-44 w-44 rounded-full bg-[#d9232d]/25 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">{cancelled ? 'Order update' : complete ? 'All set' : 'We’re on it'}</p><h1 className="mt-2 text-[21px] font-black tracking-[-0.04em] sm:text-[25px]">{cancelled ? 'Order cancelled' : complete ? 'Order completed' : 'Your order is moving.'}</h1><p className="mt-1.5 max-w-[370px] text-[11px] leading-5 text-white/65">{cancelled ? 'This order was cancelled. Need a hand? Contact our workshop.' : complete ? 'Your order is complete. Thanks for riding with us.' : 'We’ll update you here as your order gets prepared for pickup.'}</p></div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${cancelled ? 'bg-white/10 text-white/70' : complete ? 'bg-emerald-400/15 text-emerald-300' : 'bg-[#ed4049]/15 text-[#ff777d]'}`}>{cancelled ? <X className="h-5 w-5" /> : complete ? <CheckCircle2 className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}</div>
        </div>
        {!cancelled && <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3.5 sm:px-4">
          <div className="absolute left-[25px] right-[25px] top-[25px] h-px bg-white/15 sm:left-[34px] sm:right-[34px]" /><div className={`absolute left-[25px] top-[25px] h-px transition-all sm:left-[34px] ${complete ? 'bg-emerald-400' : 'bg-[#f0525b]'}`} style={{ width: `${(currentStep / (steps.length - 1)) * 100}%`, maxWidth: 'calc(100% - 50px)' }} />
          <div className="relative flex justify-between gap-1">{steps.map((step, index) => {
            const done = index <= currentStep;
            return <div key={step.key} className="flex w-[48px] flex-col items-center text-center sm:w-[90px]"><span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border ${done ? complete ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-[#ef535b] bg-[#d9232d] text-white' : 'border-white/20 bg-[#25272c] text-white/35'}`}>{done ? <Check className="h-3 w-3" /> : <span className="text-[8px] font-bold">{index + 1}</span>}</span><span className={`mt-2 text-[8px] font-bold leading-3 sm:text-[9px] ${done ? complete ? 'text-emerald-200' : 'text-white/85' : 'text-white/35'}`}>{step.label}</span></div>;
          })}</div>
        </div>}
        <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-medium text-white/50"><span>Placed {formatDate(order.created_at, true)}</span>{complete && <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3 w-3" />Fulfilled</span>}</div>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-[#eae8e5] bg-white shadow-[0_4px_16px_rgba(20,20,20,0.025)]">
        <div className="flex items-end justify-between gap-3 border-b border-[#f0efed] px-4 py-4 sm:px-5"><div><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#a3a2a0]">In this order</p><h2 className="mt-1 text-[14px] font-extrabold text-[#292a2e]">{order.order_items.length} {order.order_items.length === 1 ? 'product' : 'products'}</h2></div><span className="text-[10px] font-semibold text-[#9b9ba0]">Qty {order.order_items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} total</span></div>
        <div className="divide-y divide-[#f1f0ee] px-4 sm:px-5">{order.order_items.map((item, index) => {
          const product = item.product_id ? products.get(item.product_id) : undefined;
          const review = item.product_id ? reviews.find((entry) => entry.order_id === order.id && entry.product_id === item.product_id) : undefined;
          return <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 py-3.5 sm:gap-4">
            <ProductThumb item={item} product={product} />
            <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-[11px] font-extrabold leading-4 text-[#323338] sm:text-[12px]">{item.product_name || 'Product'}</h3><p className="mt-1 text-[10px] font-medium text-[#99999e]">{item.color ? `${item.color} · ` : ''}Qty {item.quantity}</p>{review?.is_verified_purchase && <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700"><BadgeCheck className="h-3 w-3" />Verified purchase · Reviewed</p>}{complete && item.product_id && <button type="button" onClick={() => onReview({ productId: item.product_id!, orderId: order.id, orderNumber: order.order_number, productTitle: item.product_name, review })} className="mt-1.5 block rounded-full bg-[#fff0ef] px-2.5 py-1 text-[8px] font-bold text-[#c5232d] transition hover:bg-[#ffe0dd]">{review ? 'Edit review' : 'Rate & review'}</button>}</div>
            <div className="text-right"><p className="text-[11px] font-extrabold text-[#323338]">{formatMoney(Number(item.unit_price || 0) * Number(item.quantity || 0))}</p><p className="mt-1 text-[9px] text-[#a2a2a6]">{formatMoney(item.unit_price)} each</p></div>
          </div>;
        })}</div>
        <div className="border-t border-[#f0efed] bg-[#fcfbfa] px-4 py-3.5 sm:px-5">
          <PriceRow label="Subtotal" amount={order.subtotal} />
          {Number(order.discount) > 0 && <PriceRow label="Savings" amount={-Number(order.discount)} highlight />}
          <div className="mt-2.5 flex items-center justify-between border-t border-[#eae8e5] pt-3"><span className="text-[11px] font-extrabold text-[#35363a]">Total</span><span className="text-[19px] font-black tracking-tight text-[#25262a]">{formatMoney(order.total)}</span></div>
          {complete && <div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => downloadOrderInvoice(order)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#d9232d] px-4 text-[10px] font-extrabold text-white shadow-[0_5px_14px_rgba(217,35,45,0.2)] transition hover:bg-[#bd1d26] active:scale-[0.99]"><Download className="h-3.5 w-3.5" />Download invoice PDF</button><div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#e9e7e4] bg-white px-3 text-[9px] font-bold text-[#7d7e83]"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Payment {order.payment_status.toLowerCase()}</div></div>}
          {!complete && !cancelled && <p className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#97979d]"><FileText className="h-3.5 w-3.5" />Invoice unlocks when your order is complete</p>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <InfoCard icon={<MapPin className="h-4 w-4" />} label="Pickup details" title={order.pickup_store || 'Workshop pickup'} detail={order.vehicle_model ? `Fitment for ${order.vehicle_model}` : 'Bring your vehicle for a perfect fit.'} />
        <InfoCard icon={<ShieldCheck className="h-4 w-4" />} label="Order placed by" title={customerName || order.customer_name || 'Customer'} detail={`${order.customer_phone || 'Phone not provided'} · ${order.payment_method.replaceAll('_', ' ').toLowerCase()}`} />
      </section>
      {complete && <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eae8e5] bg-white px-4 py-3"><p className="text-[10px] font-semibold text-[#777980]">Love the fit? Leave a quick product review.</p><button type="button" onClick={() => {
        const item = order.order_items.find((row) => row.product_id);
        if (!item?.product_id) return;
        const review = reviews.find((entry) => entry.order_id === order.id && entry.product_id === item.product_id);
        onReview({ productId: item.product_id, orderId: order.id, orderNumber: order.order_number, productTitle: item.product_name, review });
      }} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-extrabold text-[#c5232c]">Write a review<ArrowRight className="h-3 w-3" /></button></div>}
    </div>
  </motion.div>;
}

function StatusBadge({ status }: { status: string }) {
  const cancelled = status === 'CANCELLED';
  const complete = isComplete(status);
  const tone = cancelled ? 'bg-[#fff0ef] text-[#c72931]' : complete ? 'bg-[#eaf5ed] text-[#347449]' : 'bg-[#fff4e6] text-[#9c6421]';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-extrabold leading-none ${tone}`}><span className={`h-1.5 w-1.5 rounded-full ${cancelled ? 'bg-[#d9232d]' : complete ? 'bg-[#45a169]' : 'bg-[#d99842]'}`} />{statusCopy(status)}</span>;
}

function PriceRow({ label, amount, highlight = false }: { label: string; amount: number; highlight?: boolean }) {
  return <div className="flex items-center justify-between py-1"><span className="text-[10px] font-medium text-[#99999e]">{label}</span><span className={`text-[10px] font-bold ${highlight ? 'text-emerald-700' : 'text-[#65666c]'}`}>{highlight ? `−${formatMoney(Math.abs(amount))}` : formatMoney(amount)}</span></div>;
}

function InfoCard({ icon, label, title, detail }: { icon: ReactNode; label: string; title: string; detail: string }) {
  return <div className="min-w-0 rounded-[18px] border border-[#eae8e5] bg-white p-4"><div className="flex items-center gap-2 text-[#9a9a9e]"><span className="text-[#d9232d]">{icon}</span><span className="text-[9px] font-bold uppercase tracking-[0.15em]">{label}</span></div><p className="mt-2 truncate text-[11px] font-extrabold text-[#37383c]">{title}</p><p className="mt-1 line-clamp-2 text-[9px] leading-4 text-[#9a9a9e]">{detail}</p></div>;
}

function LoadingOrders() {
  return <div className="space-y-3" aria-label="Loading orders"><Skeleton kind="card" count={3} /></div>;
}

function EmptyOrders({ hasOrders, onShop }: { hasOrders: boolean; onShop: () => void }) {
  return <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#dedbd7] bg-white/70 px-6 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#f4f2ef] text-[#aaa7a2]"><Package className="h-6 w-6" /></span><h3 className="mt-4 text-[13px] font-extrabold text-[#35363a]">{hasOrders ? 'No orders match' : 'Your next ride starts here.'}</h3><p className="mt-1.5 max-w-[225px] text-[10px] leading-4 text-[#929298]">{hasOrders ? 'Try another filter or search for a different product.' : 'Your orders will show up here as soon as you place one.'}</p>{!hasOrders && <button type="button" onClick={onShop} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#24262b] px-4 py-2 text-[10px] font-bold text-white">Explore products<ChevronRight className="h-3 w-3" /></button>}</div>;
}
