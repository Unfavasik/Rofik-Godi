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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1F0E0A]/70 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-orders-title"
    >
      <div className="flex h-full w-full max-w-full sm:max-w-[1160px] flex-col overflow-hidden overflow-x-hidden bg-[#FFFCF4] shadow-[0_32px_100px_rgba(43,22,17,0.35)] sm:h-[min(900px,94vh)] sm:rounded-[30px]">
        <header className="relative shrink-0 overflow-hidden bg-[#4A221A] px-4 pb-4 pt-4 text-white sm:px-8 sm:pb-6 sm:pt-6">
          <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-[#FFF1A6]/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFF1A6]/80"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6115]" /> <span className="truncate">Your ride, in good hands</span></p>
              <h2 id="my-orders-title" className="mt-2 text-[25px] font-black tracking-[-0.04em] text-[#FFFCF4] sm:text-[32px]">My orders<span className="text-[#FFF1A6]">.</span></h2>
              <p className="mt-1 text-[12px] text-[#F6EAE4]/75">Track your fitment, revisit past orders and keep every receipt close.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close orders" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#FFF8D6] transition hover:bg-white/20 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:max-w-[510px] sm:gap-3">
            <SummaryStat label="Total orders" value={orders.length} icon={<ShoppingBag className="h-3.5 w-3.5" />} />
            <SummaryStat label="In progress" value={counts['In progress']} icon={<Clock3 className="h-3.5 w-3.5" />} />
            <SummaryStat label="Completed" value={counts.Completed} icon={<BadgeCheck className="h-3.5 w-3.5" />} />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(310px,0.84fr)_minmax(0,1.3fr)]">
          <section className={`min-h-0 min-w-0 flex-col overflow-x-hidden border-[#E8D8C4] bg-[#FAF4EA] md:border-r ${selectedOrder ? 'hidden md:flex' : 'flex'}`} aria-label="Order list">
            <div className="shrink-0 border-b border-[#E8D8C4] px-4 pb-3 pt-4 sm:px-5">
              <label className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#E8D8C4] bg-white px-3 text-[#8A6C63] focus-within:border-[#6B352A] focus-within:ring-2 focus-within:ring-[#FFF1A6]">
                <Search className="h-4 w-4 shrink-0" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an order or product" className="min-w-0 flex-1 bg-transparent text-base sm:text-xs font-medium text-[#2B1611] outline-none placeholder:text-[#8A6C63]/70" aria-label="Find an order or product" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="grid min-h-11 min-w-11 -mr-2 place-items-center text-[#6B4C44]"><X className="h-3.5 w-3.5" /></button>}
              </label>
              <div className="no-scrollbar mt-3 flex max-w-full gap-1 overflow-x-auto" role="tablist" aria-label="Filter orders">
                {filters.map((name) => <button key={name} type="button" role="tab" aria-selected={filter === name} onClick={() => setFilter(name)} className={`min-h-11 shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold transition ${filter === name ? 'bg-[#6B352A] text-[#FFF1A6]' : 'bg-transparent text-[#6B4C44] hover:bg-[#EFE2D2]'}`}>{name}<span className={`ml-1.5 ${filter === name ? 'text-[#FFF1A6]/75' : 'text-[#8A6C63]'}`}>{counts[name]}</span></button>)}
              </div>
            </div>
            <div className="no-scrollbar min-h-0 min-w-0 flex-1 space-y-2.5 overflow-x-hidden overflow-y-auto p-3.5 sm:p-4">
              {loading ? <LoadingOrders /> : visibleOrders.length === 0 ? <EmptyOrders hasOrders={orders.length > 0} onShop={onShop} /> : visibleOrders.map((order) => (
                <OrderCard key={order.id} order={order} products={productById} selected={selectedOrderId === order.id} onSelect={() => setSelectedOrderId(order.id)} />
              ))}
            </div>
            <div className="hidden shrink-0 items-center gap-2 border-t border-[#E8D8C4] px-5 py-3 text-[10px] font-medium text-[#8A6C63] md:flex"><ShieldCheck className="h-3.5 w-3.5 text-[#6B352A]" /> Securely linked to your account</div>
          </section>

          <section className={`no-scrollbar min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-[#FFFCF4] ${selectedOrder ? 'flex' : 'hidden md:flex'}`} aria-label="Order details">
            {selectedOrder ? <OrderDetails
              order={selectedOrder}
              products={productById}
              reviews={reviews}
              customerName={customerName}
              onBack={() => setSelectedOrderId(null)}
              onReview={onReview}
            /> : <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[24px] border border-[#E8D8C4] bg-white text-[#8A6C63] shadow-[0_5px_20px_rgba(43,22,17,0.05)]"><Package className="h-8 w-8" strokeWidth={1.5} /></div>
              <h3 className="mt-5 text-[17px] font-extrabold tracking-tight text-[#2B1611]">Every order has a story.</h3>
              <p className="mt-2 max-w-[270px] text-[12px] leading-5 text-[#6B4C44]">Choose an order to see product details, fitment status and your invoice.</p>
              <div className="mt-6 flex items-center gap-2 rounded-full border border-[#E8D8C4] bg-white px-3 py-2 text-[10px] font-bold text-[#6B352A]"><ArrowLeft className="h-3.5 w-3.5" /> Select an order from the list</div>
            </div>}
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="min-w-0 overflow-hidden flex items-center gap-2 rounded-xl border border-[#FFF1A6]/15 bg-white/10 px-2.5 py-2 sm:gap-3 sm:px-3.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6B352A] text-[#FFF1A6]">{icon}</span><span className="min-w-0"><b className="block text-[14px] font-black leading-none text-[#FFFCF4] sm:text-[16px]">{value}</b><span className="mt-1 block truncate text-[9px] font-medium text-[#F6EAE4]/75">{label}</span></span></div>;
}

function OrderCard({ order, products, selected, onSelect }: { order: CustomerOrderRecord; products: Map<string, Product>; selected: boolean; onSelect: () => void }) {
  const complete = isComplete(order.status);
  const cancelled = order.status === 'CANCELLED';
  const itemCount = order.order_items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const firstNames = order.order_items.slice(0, 2).map((item) => item.product_name).filter(Boolean);
  return <article className={`group relative overflow-hidden rounded-[18px] border bg-white transition duration-200 ${selected ? 'border-[#6B352A] shadow-[0_8px_28px_rgba(107,53,42,0.12)] ring-2 ring-[#FFF1A6]' : 'border-[#E8D8C4] shadow-[0_3px_12px_rgba(43,22,17,0.03)] hover:-translate-y-0.5 hover:border-[#CBB8A6] hover:shadow-[0_10px_25px_rgba(43,22,17,0.07)]'}`}>
    <button type="button" onClick={onSelect} className="w-full p-3.5 text-left sm:p-4" aria-label={`View details for order ${order.order_number}`}>
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 -space-x-2.5 pt-0.5">
          {order.order_items.slice(0, 3).map((item, index) => <ProductThumb key={`${item.product_id || item.product_name}-${index}`} item={item} product={item.product_id ? products.get(item.product_id) : undefined} size="small" />)}
          {order.order_items.length === 0 && <ProductThumb size="small" />}
          {order.order_items.length > 3 && <span className="z-10 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-white bg-[#6B352A] text-[9px] font-black text-[#FFF1A6]">+{order.order_items.length - 3}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><span className="truncate font-mono text-[10px] font-bold tracking-wide text-[#8A6C63]">#{order.order_number}</span><StatusBadge status={order.status} /></div>
          <h3 className="mt-1.5 line-clamp-1 text-[12px] font-extrabold text-[#2B1611]">{firstNames[0] || 'Store pickup order'}{order.order_items.length > 1 && <span className="font-semibold text-[#8A6C63]"> + {order.order_items.length - 1} more</span>}</h3>
          <p className="mt-1 text-[10px] font-medium text-[#8A6C63]">{formatDate(order.created_at)} <span className="px-0.5">·</span> {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
      </div>
      <div className="mt-3.5 flex items-end justify-between border-t border-[#EFE2D2] pt-3">
        <div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#8A6C63]">Order total</p><p className="mt-0.5 text-[15px] font-black tracking-tight text-[#2B1611]">{formatMoney(order.total)}</p></div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold transition ${selected ? 'text-[#6B352A]' : 'text-[#6B4C44] group-hover:text-[#6B352A]'}`}>{cancelled ? 'Details' : complete ? 'View details' : 'Track order'}<ChevronRight className="h-3.5 w-3.5" /></span>
      </div>
    </button>
  </article>;
}

function ProductThumb({ item, product, size = 'large' }: { item?: CustomerOrderRecord['order_items'][number]; product?: Product; size?: 'small' | 'large' }) {
  const [failed, setFailed] = useState(false);
  const box = size === 'small' ? 'h-10 w-10 rounded-xl' : 'h-[66px] w-[66px] rounded-[15px]';
  if (product?.image && !failed) return <span className={`relative block shrink-0 overflow-hidden border-2 border-white bg-[#FAF4EA] shadow-sm ${box}`}><img src={product.image} alt={product.title} onError={() => setFailed(true)} className="h-full w-full object-cover" loading="lazy" /></span>;
  return <span className={`flex shrink-0 items-center justify-center border-2 border-white bg-[#FAF4EA] text-[#8A6C63] shadow-sm ${box}`} role="img" aria-label={item?.product_name ? `Product image unavailable for ${item.product_name}` : 'Product image unavailable'}>{failed ? <ImageOff className={size === 'small' ? 'h-4 w-4' : 'h-6 w-6'} /> : <Package className={size === 'small' ? 'h-4 w-4' : 'h-6 w-6'} strokeWidth={1.5} />}</span>;
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
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8D8C4] bg-[#FFFCF4]/95 px-4 py-2.5 backdrop-blur sm:px-7 sm:py-3">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-[#6B352A] hover:bg-[#FAF4EA] md:hidden"><ArrowLeft className="h-4 w-4" />All orders</button>
      <span className="hidden text-[10px] font-bold uppercase tracking-[0.17em] text-[#8A6C63] md:inline">Order details</span>
      <span className="ml-auto font-mono text-[10px] font-bold text-[#6B4C44]">#{order.order_number}</span>
    </div>
    <div className="mx-auto w-full max-w-[760px] space-y-4 p-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:p-6 sm:pb-10 sm:px-8">
      <section className={`relative overflow-hidden rounded-[22px] p-5 text-white shadow-sm sm:p-6 ${cancelled ? 'bg-[#3A241E]' : complete ? 'bg-[#4A221A]' : 'bg-[#2B1611]'}`}>
        <div className="pointer-events-none absolute -right-5 -top-14 h-44 w-44 rounded-full bg-[#FFF1A6]/12 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#FFF1A6]/75">{cancelled ? 'Order update' : complete ? 'All set' : 'We’re on it'}</p><h1 className="mt-2 text-[21px] font-black tracking-[-0.04em] text-[#FFFCF4] sm:text-[25px]">{cancelled ? 'Order cancelled' : complete ? 'Order completed' : 'Your order is moving.'}</h1><p className="mt-1.5 max-w-[370px] text-[11px] leading-5 text-[#F6EAE4]/80">{cancelled ? 'This order was cancelled. Need a hand? Contact our workshop.' : complete ? 'Your order is complete. Thanks for riding with us.' : 'We’ll update you here as your order gets prepared for pickup.'}</p></div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${cancelled ? 'bg-white/10 text-[#F6EAE4]/80' : complete ? 'bg-[#FFF1A6]/20 text-[#FFF1A6]' : 'bg-[#FF6115]/20 text-[#FFF1A6]'}`}>{cancelled ? <X className="h-5 w-5" /> : complete ? <CheckCircle2 className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}</div>
        </div>
        {!cancelled && <div className="relative mt-5 rounded-2xl border border-[#FFF1A6]/15 bg-white/[0.06] px-2.5 py-3.5 sm:px-4">
          <div className="relative grid grid-cols-6 gap-1">{steps.map((step, index) => {
            const done = index <= currentStep;
            return <div key={step.key} className="min-w-0 flex flex-col items-center text-center"><span className={`relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border ${done ? complete ? 'border-[#FFF1A6] bg-[#FFF1A6] text-[#2B1611]' : 'border-[#FF6115] bg-[#FF6115] text-[#1F0E0A]' : 'border-white/20 bg-white/10 text-white/45'}`}>{done ? <Check className="h-3 w-3" /> : <span className="text-[8px] font-bold">{index + 1}</span>}</span><span className={`mt-2 text-[8px] font-bold leading-3 break-words sm:text-[9px] ${done ? complete ? 'text-[#FFF1A6]' : 'text-[#FFF8D6]' : 'text-white/45'}`}>{step.label}</span></div>;
          })}</div>
        </div>}
        <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-medium text-[#F6EAE4]/70"><span>Placed {formatDate(order.created_at, true)}</span>{complete && <span className="inline-flex items-center gap-1 font-bold text-[#FFF1A6]"><CheckCircle2 className="h-3 w-3" />Fulfilled</span>}</div>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-[#E8D8C4] bg-white shadow-[0_4px_16px_rgba(43,22,17,0.03)]">
        <div className="flex items-end justify-between gap-3 border-b border-[#EFE2D2] px-4 py-4 sm:px-5"><div><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#8A6C63]">In this order</p><h2 className="mt-1 text-[14px] font-extrabold text-[#2B1611]">{order.order_items.length} {order.order_items.length === 1 ? 'product' : 'products'}</h2></div><span className="text-[10px] font-semibold text-[#8A6C63]">Qty {order.order_items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} total</span></div>
        <div className="divide-y divide-[#EFE2D2] px-4 sm:px-5">{order.order_items.map((item, index) => {
          const product = item.product_id ? products.get(item.product_id) : undefined;
          const review = item.product_id ? reviews.find((entry) => entry.order_id === order.id && entry.product_id === item.product_id) : undefined;
          return <div key={`${item.product_id || item.product_name}-${index}`} className="flex items-center gap-3 py-3.5 sm:gap-4">
            <ProductThumb item={item} product={product} />
            <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-[11px] font-extrabold leading-4 text-[#2B1611] sm:text-[12px]">{item.product_name || 'Product'}</h3><p className="mt-1 text-[10px] font-medium text-[#8A6C63]">{item.color ? `${item.color} · ` : ''}Qty {item.quantity}</p>{review?.is_verified_purchase && <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FFF8D6] px-2 py-0.5 text-[9px] font-bold text-[#6B352A]"><BadgeCheck className="h-3 w-3" />Verified purchase · Reviewed</p>}{complete && item.product_id && <button type="button" onClick={() => onReview({ productId: item.product_id!, orderId: order.id, orderNumber: order.order_number, productTitle: item.product_name, review })} className="mt-1.5 block rounded-full bg-[#F6EAE4] px-2.5 py-1 text-[8px] font-bold text-[#6B352A] transition hover:bg-[#EFE2D2]">{review ? 'Edit review' : 'Rate & review'}</button>}</div>
            <div className="text-right"><p className="text-[11px] font-extrabold text-[#2B1611]">{formatMoney(Number(item.unit_price || 0) * Number(item.quantity || 0))}</p><p className="mt-1 text-[9px] text-[#8A6C63]">{formatMoney(item.unit_price)} each</p></div>
          </div>;
        })}</div>
        <div className="border-t border-[#EFE2D2] bg-[#FAF4EA] px-4 py-3.5 sm:px-5">
          <PriceRow label="Subtotal" amount={order.subtotal} />
          {Number(order.discount) > 0 && <PriceRow label="Savings" amount={-Number(order.discount)} highlight />}
          <div className="mt-2.5 flex items-center justify-between border-t border-[#E8D8C4] pt-3"><span className="text-[11px] font-extrabold text-[#4A2B23]">Total</span><span className="text-[19px] font-black tracking-tight text-[#2B1611]">{formatMoney(order.total)}</span></div>
          {complete && <div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => {
            const productOverrideDate = order.order_items.map((item) => (item.product_id ? products.get(item.product_id)?.guaranteeValidUntil : null)).find(Boolean) ?? null;
            void downloadOrderInvoice(order, customerName || order.customer_name, { productOverrideDate, products: Array.from(products.values()) });
          }} className="banner-cta-shine group/cta inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6115] px-4 text-[10px] font-extrabold text-[#1F0E0A] shadow-[0_5px_14px_rgba(255,97,21,0.26)] transition-all hover:bg-[#E5520D] hover:shadow-md active:scale-[0.98]"><Download className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />Download invoice PDF</button><div className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-3 text-[9px] font-bold text-[#6B352A]"><ShieldCheck className="h-3.5 w-3.5 text-[#6B352A]" />Payment {order.payment_status.toLowerCase()}</div></div>}
          {!complete && !cancelled && <p className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#8A6C63]"><FileText className="h-3.5 w-3.5" />Invoice unlocks when your order is complete</p>}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <InfoCard icon={<MapPin className="h-4 w-4" />} label="Pickup details" title={order.pickup_store || 'Workshop pickup'} detail={order.vehicle_model ? `Fitment for ${order.vehicle_model}` : 'Bring your vehicle for a perfect fit.'} />
        <InfoCard icon={<ShieldCheck className="h-4 w-4" />} label="Order placed by" title={customerName || order.customer_name || 'Customer'} detail={`${order.customer_phone || 'Phone not provided'} · ${order.payment_method.replaceAll('_', ' ').toLowerCase()}`} />
      </section>
      {complete && <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8D8C4] bg-white px-4 py-3"><p className="text-[10px] font-semibold text-[#6B4C44]">Love the fit? Leave a quick product review.</p><button type="button" onClick={() => {
        const item = order.order_items.find((row) => row.product_id);
        if (!item?.product_id) return;
        const review = reviews.find((entry) => entry.order_id === order.id && entry.product_id === item.product_id);
        onReview({ productId: item.product_id, orderId: order.id, orderNumber: order.order_number, productTitle: item.product_name, review });
      }} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-extrabold text-[#6B352A] hover:text-[#53271E]">Write a review<ArrowRight className="h-3 w-3" /></button></div>}
    </div>
  </motion.div>;
}

function StatusBadge({ status }: { status: string }) {
  const cancelled = status === 'CANCELLED';
  const complete = isComplete(status);
  const tone = cancelled ? 'bg-[#FDF2EE] text-[#9E2A2B]' : complete ? 'bg-[#FFF8D6] text-[#6B352A]' : 'bg-[#F6EAE4] text-[#6B352A]';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-extrabold leading-none ${tone}`}><span className={`h-1.5 w-1.5 rounded-full ${cancelled ? 'bg-[#9E2A2B]' : complete ? 'bg-[#6B352A]' : 'bg-[#FF6115]'}`} />{statusCopy(status)}</span>;
}

function PriceRow({ label, amount, highlight = false }: { label: string; amount: number; highlight?: boolean }) {
  return <div className="flex items-center justify-between py-1"><span className="text-[10px] font-medium text-[#8A6C63]">{label}</span><span className={`text-[10px] font-bold ${highlight ? 'text-[#6B352A]' : 'text-[#4A2B23]'}`}>{highlight ? `−${formatMoney(Math.abs(amount))}` : formatMoney(amount)}</span></div>;
}

function InfoCard({ icon, label, title, detail }: { icon: ReactNode; label: string; title: string; detail: string }) {
  return <div className="min-w-0 rounded-[18px] border border-[#E8D8C4] bg-white p-4"><div className="flex items-center gap-2 text-[#8A6C63]"><span className="text-[#6B352A]">{icon}</span><span className="text-[9px] font-bold uppercase tracking-[0.15em]">{label}</span></div><p className="mt-2 truncate text-[11px] font-extrabold text-[#2B1611]">{title}</p><p className="mt-1 line-clamp-2 text-[9px] leading-4 text-[#8A6C63]">{detail}</p></div>;
}

function LoadingOrders() {
  return <div className="space-y-3" aria-label="Loading orders">{[0, 1, 2].map((key) => <div key={key} className="skeleton-shimmer h-[125px] rounded-[18px] bg-[#EFE2D2]" />)}</div>;
}

function EmptyOrders({ hasOrders, onShop }: { hasOrders: boolean; onShop: () => void }) {
  return <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#D4C0AA] bg-white/80 px-6 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#FAF4EA] text-[#6B352A]"><Package className="h-6 w-6" /></span><h3 className="mt-4 text-[13px] font-extrabold text-[#2B1611]">{hasOrders ? 'No orders match' : 'Your next ride starts here.'}</h3><p className="mt-1.5 max-w-[225px] text-[10px] leading-4 text-[#8A6C63]">{hasOrders ? 'Try another filter or search for a different product.' : 'Your orders will show up here as soon as you place one.'}</p>{!hasOrders && <button type="button" onClick={onShop} className="banner-cta-shine group/cta mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#6B352A] px-4 py-2 text-[10px] font-bold text-[#FFF1A6] shadow-sm hover:bg-[#53271E] hover:shadow-md active:scale-95">Explore products<ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover/cta:translate-x-0.5" /></button>}</div>;
}
