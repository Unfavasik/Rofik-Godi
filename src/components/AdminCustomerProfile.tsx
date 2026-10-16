import React from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Image as ImageIcon,
  Mail,
  Package,
  Phone,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import type { AdminCustomer } from '../lib/supabaseAdmin';
import {
  matchesAdminOrderToCustomer,
  type AdminOrderRecord,
} from '../lib/supabaseAdminOrders';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const dateLabel = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

function findProductImage(item: AdminOrderRecord['items'][number], products: Product[]) {
  const catalog = [...products, ...PRODUCTS];
  const byId = item.product_id
    ? catalog.find((product) => product.id === item.product_id)
    : undefined;
  const normalizedName = item.product_name?.trim().toLowerCase();
  const byName = normalizedName
    ? catalog.find((product) => product.title.trim().toLowerCase() === normalizedName)
    : undefined;
  return byId?.image || byName?.image || '';
}

function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#D9232D]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span className="mt-1 block break-all text-[13px] font-semibold text-slate-800">
          {value || 'Not available'}
        </span>
      </span>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,.035)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
          Customer
        </span>
      </div>
      <p className="mt-4 text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] text-slate-400">{note}</p>
    </article>
  );
}

export interface AdminCustomerProfileProps {
  customer: AdminCustomer | null;
  customerId: string;
  avatarUrl: string | null;
  orders: AdminOrderRecord[];
  products: Product[];
  isLoading: boolean;
  onBack: () => void;
  onOpenOrder: (order: AdminOrderRecord) => void;
}

export const AdminCustomerProfile: React.FC<AdminCustomerProfileProps> = ({
  customer,
  customerId,
  avatarUrl,
  orders,
  products,
  isLoading,
  onBack,
  onOpenOrder,
}) => {
  const history = customer
    ? orders
        .filter((order) => matchesAdminOrderToCustomer(order, customer))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .slice(0, 10)
    : [];

  if (!customer) {
    return (
      <section className="mx-auto max-w-4xl" aria-labelledby="customer-profile-title">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </button>
        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm" role={isLoading ? 'status' : 'alert'}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 id="customer-profile-title" className="mt-4 text-lg font-black text-slate-900">
            {isLoading ? 'Loading customer profile' : 'Customer not found'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
            {isLoading
              ? 'Loading this customer’s account and order history from the store.'
              : `No customer record is available for ${customerId}. Return to the customer list and try again.`}
          </p>
        </div>
      </section>
    );
  }

  const initials = customer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const returning = /return|repeat|loyal/i.test(customer.status);

  return (
    <section className="mx-auto max-w-[1280px]" aria-labelledby="customer-profile-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
            Customer relationships
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Admin / Customers / Profile</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          All customers
        </button>
      </div>

      <header className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#D9232D] via-[#bd1e28] to-[#851b25] p-5 text-white shadow-[0_18px_45px_rgba(150,24,34,.2)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.07]" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-48 w-48 rounded-full bg-white/[0.06] blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-xl font-black shadow-inner sm:h-[72px] sm:w-[72px]">
              <span aria-hidden="true">{initials || 'C'}</span>
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={`${customer.name} profile photo`}
                  loading="lazy"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Customer profile</p>
              <h2 id="customer-profile-title" className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
                {customer.name}
              </h2>
              <p className="mt-1 truncate text-xs text-white/75">{customer.email || customer.phone || 'Customer account'}</p>
            </div>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-extrabold ${returning ? 'border-emerald-100/30 bg-emerald-300/15 text-emerald-50' : 'border-white/20 bg-white/10 text-white'}`}>
            <span className={`h-2 w-2 rounded-full ${returning ? 'bg-emerald-300' : 'bg-white/70'}`} />
            {customer.status || 'New'}
          </span>
        </div>
        <p className="relative mt-5 border-t border-white/15 pt-3 font-mono text-[10px] text-white/60">
          Customer ID · {customer.id}
        </p>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          icon={ShoppingBag}
          label="Total orders"
          value={Number(customer.orderCount || 0).toLocaleString('en-IN')}
          note="Orders recorded for this account"
          tone="bg-rose-50 text-[#D9232D]"
        />
        <Metric
          icon={Wallet}
          label="Total spending"
          value={money(customer.totalSpent)}
          note="Lifetime spend recorded by the store"
          tone="bg-emerald-50 text-emerald-700"
        />
        <Metric
          icon={CalendarDays}
          label="Customer since"
          value={dateLabel(customer.createdAt).split(',')[0] || '—'}
          note={`Last order · ${dateLabel(customer.lastOrder)}`}
          tone="bg-sky-50 text-sky-700"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.035)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Account</p>
              <h3 className="mt-1 text-base font-black text-slate-900">Contact details</h3>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500">
              <Package className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            <DetailLine icon={Mail} label="Email address" value={customer.email} />
            <DetailLine icon={Phone} label="Phone number" value={customer.phone} />
            <DetailLine icon={CalendarDays} label="Account created" value={dateLabel(customer.createdAt)} />
          </div>
        </aside>

        <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,.035)] sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Latest activity</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Recent order history</h3>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Matched from the latest 100 orders by account, phone or name.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">
              {history.length} {history.length === 1 ? 'order' : 'orders'} shown
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {history.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenOrder(order)}
                    aria-label={`Open order ${order.orderNumber}`}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#D9232D]">
                      <ShoppingBag className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12px] font-black text-slate-900">{order.id}</span>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {dateLabel(order.createdAt)} <span className="px-1 text-slate-300">·</span> {order.status}
                      </span>
                    </span>
                  </button>
                  <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-900">
                    {money(order.amount)}
                  </span>
                </div>

                {order.items.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3 lg:grid-cols-4">
                    {order.items.map((item, index) => {
                      const image = findProductImage(item, products);
                      const itemName = item.product_name || 'Product';
                      const quantity = Math.max(1, Number(item.quantity || 1));
                      return (
                        <div key={`${order.id}-${item.product_id || itemName}-${index}`} className="min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70">
                          <div className="aspect-[1.18/1] overflow-hidden bg-slate-100">
                            {image ? (
                              <img src={image} alt={itemName} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-slate-300" aria-label={`${itemName} image unavailable`}>
                                <ImageIcon className="h-7 w-7" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-[10px] font-bold text-slate-800" title={itemName}>{itemName}</p>
                            <p className="mt-0.5 truncate text-[9px] text-slate-500">
                              {[item.color, `Qty ${quantity}`].filter(Boolean).join(' · ')}
                            </p>
                            <p className="mt-1 text-[10px] font-black text-slate-900">
                              {money(Number(item.unit_price || 0) * quantity)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">No item details were saved for this order.</p>
                )}
              </article>
            ))}
            {!history.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-bold text-slate-700">No matching order records</p>
                <p className="mt-1 text-[10px] text-slate-400">Orders from the latest 100 records will appear here when available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
