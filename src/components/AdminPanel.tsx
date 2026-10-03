import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';
import { AdminProductManager } from './AdminProductManager';
import { CouponManagement } from './CouponManagement';
import { AdminReviewsView } from './AdminReviewsView';
import { loadAdminOrders, updatePickupOrderStatus, verifyPickupPayment, type AdminOrderRecord } from '../lib/supabaseAdminOrders';
import { PickupVerification } from './PickupVerification';

type AdminSection = 'overview' | 'orders' | 'products' | 'customers' | 'reviews' | 'marketing' | 'analytics' | 'settings';
type OrderStatus = 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED';

type AdminOrder = {
  id: string;
  customer: string;
  phone?: string;
  initials: string;
  product: string;
  amount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status: OrderStatus;
  date: string;
  channel: string;
};

const ORDERS: AdminOrder[] = [
  { id: '#RG-1084', customer: 'Arindam Das', initials: 'AD', product: 'Premium Bike Seat Cover', amount: 649, status: 'NEW', date: '02 Oct, 10:42 AM', channel: 'Website' },
  { id: '#RG-1083', customer: 'Moumita Roy', initials: 'MR', product: 'Toto Driver Comfort Godi', amount: 999, status: 'CONFIRMED', date: '02 Oct, 09:18 AM', channel: 'WhatsApp' },
  { id: '#RG-1082', customer: 'Sourav Ghosh', initials: 'SG', product: 'Gel Seat Cushion', amount: 799, status: 'PREPARING', date: '01 Oct, 06:45 PM', channel: 'Website' },
  { id: '#RG-1081', customer: 'Ritu Sharma', initials: 'RS', product: 'Waterproof Seat Cover', amount: 649, status: 'COMPLETED', date: '01 Oct, 04:12 PM', channel: 'Website' },
  { id: '#RG-1080', customer: 'Abhishek Singh', initials: 'AS', product: 'Classic Seat Cover', amount: 549, status: 'CANCELLED', date: '01 Oct, 11:25 AM', channel: 'Instagram' },
  { id: '#RG-1079', customer: 'Puja Karmakar', initials: 'PK', product: 'Sport Bike Seat Cover', amount: 599, status: 'COMPLETED', date: '30 Sep, 03:30 PM', channel: 'Website' },
];

const CUSTOMERS = [
  { name: 'Arindam Das', email: 'arindam.das@gmail.com', phone: '+91 98321 45678', orders: 8, spent: 5240, lastSeen: 'Today', tag: 'VIP' },
  { name: 'Moumita Roy', email: 'moumita.roy@gmail.com', phone: '+91 90070 12121', orders: 4, spent: 2680, lastSeen: 'Today', tag: 'Returning' },
  { name: 'Sourav Ghosh', email: 'sourav.g@outlook.com', phone: '+91 89102 33901', orders: 2, spent: 1498, lastSeen: 'Yesterday', tag: 'New' },
  { name: 'Ritu Sharma', email: 'ritu.sharma@gmail.com', phone: '+91 98745 22310', orders: 6, spent: 4090, lastSeen: 'Sep 30', tag: 'Returning' },
];

const navGroups = [
  { label: 'Workspace', items: [
    { id: 'overview' as AdminSection, label: 'Overview', icon: LayoutDashboard },
    { id: 'orders' as AdminSection, label: 'Pickup orders', icon: ClipboardList, count: '12' },
    { id: 'products' as AdminSection, label: 'Products', icon: Package },
    { id: 'customers' as AdminSection, label: 'Customers', icon: Users },
  ] },
  { label: 'Growth', items: [
    { id: 'reviews' as AdminSection, label: 'Reviews', icon: Star },
    { id: 'marketing' as AdminSection, label: 'Coupons & offers', icon: Tag },
    { id: 'analytics' as AdminSection, label: 'Analytics', icon: BarChart3 },
  ] },
];

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

function StatusPill({ status }: { status: OrderStatus | string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-blue-50 text-blue-700 ring-blue-200', CONFIRMED: 'bg-indigo-50 text-indigo-700 ring-indigo-200', PREPARING: 'bg-amber-50 text-amber-700 ring-amber-200', READY_FOR_PICKUP: 'bg-emerald-50 text-emerald-700 ring-emerald-200', PICKED_UP: 'bg-violet-50 text-violet-700 ring-violet-200', COMPLETED: 'bg-green-50 text-green-700 ring-green-200', CANCELLED: 'bg-red-50 text-red-700 ring-red-200', Published: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${styles[status] || 'bg-slate-50 text-slate-600 ring-slate-200'}`}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function MetricCard({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: React.ElementType; tone: string }) {
  const positive = !change.startsWith('-');
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/60">
    <div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div><span className={`inline-flex items-center gap-1 text-[11px] font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>{positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{change}</span></div>
    <p className="mt-4 text-[12px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-400">vs. previous 30 days</p>
  </div>;
}

export const AdminPanel: React.FC<{ onBackToStore?: () => void }> = ({ onBackToStore }) => {
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'All' | OrderStatus>('All');
  const [toast, setToast] = useState('');
  const [productList, setProductList] = useState<Product[]>(PRODUCTS);
  const [liveOrders, setLiveOrders] = useState<AdminOrderRecord[] | null>(null);
  const [settings, setSettings] = useState({ alerts: true, lowStock: true, whatsapp: true, maintenance: false });

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  useEffect(() => { loadAdminOrders().then((orders) => { if (orders) setLiveOrders(orders); }); }, []);
  const sourceOrders = liveOrders || [];
  const filteredOrders = useMemo(() => sourceOrders.filter((order) => (orderFilter === 'All' || order.status === orderFilter) && `${order.id} ${order.customer} ${order.phone || ''} ${order.product}`.toLowerCase().includes(query.toLowerCase())), [orderFilter, query, sourceOrders]);
  const filteredProducts = useMemo(() => productList.filter((product) => `${product.title} ${product.categoryLabel}`.toLowerCase().includes(query.toLowerCase())), [productList, query]);

  const goTo = (next: AdminSection) => { setSection(next); setSidebarOpen(false); setQuery(''); };
  const title = ({ overview: 'Overview', orders: 'Orders', products: 'Products', customers: 'Customers', reviews: 'Reviews', marketing: 'Coupons & offers', analytics: 'Analytics', settings: 'Settings' } as Record<AdminSection, string>)[section];

  return <div className="min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D9232D] text-sm font-black text-white">RG</div><div><p className="text-sm font-black tracking-tight">ROFIK <span className="text-[#D9232D]">GODI</span></p><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Admin workspace</p></div></div><button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
      <div className="mt-8 space-y-6 overflow-y-auto">
        {navGroups.map((group) => <div key={group.label}><p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{group.label}</p><div className="space-y-1">{group.items.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => goTo(id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[12px] font-bold transition ${section === id ? 'bg-red-50 text-[#D9232D]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><span className="flex items-center gap-3"><Icon className="h-4 w-4" />{label}</span>{count && <span className={`rounded-full px-2 py-0.5 text-[10px] ${section === id ? 'bg-white text-[#D9232D]' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}</button>)}</div></div>)}
      </div>
      <div className="mt-auto space-y-2 border-t border-slate-100 pt-4"><button onClick={() => goTo('settings')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-bold ${section === 'settings' ? 'bg-red-50 text-[#D9232D]' : 'text-slate-500 hover:bg-slate-50'}`}><Settings className="h-4 w-4" />Settings</button><button onClick={onBackToStore} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-bold text-slate-500 hover:bg-slate-50"><ShoppingBag className="h-4 w-4" />Back to storefront</button><div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">AS</div><div className="min-w-0"><p className="truncate text-[11px] font-black">Admin Sharma</p><p className="text-[10px] text-slate-400">Super admin</p></div><MoreHorizontal className="ml-auto h-4 w-4 text-slate-400" /></div></div>
    </aside>

    <div className="lg:pl-[250px]"><header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button><div><p className="text-[11px] font-bold text-slate-400">Admin / <span className="text-slate-600">{title}</span></p><h1 className="mt-0.5 text-lg font-black tracking-tight">{title}</h1></div></div><div className="flex items-center gap-2 md:gap-4"><div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything..." className="w-40 bg-transparent text-xs outline-none placeholder:text-slate-400" /></div><button onClick={() => notify('You are all caught up')} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#D9232D]" /></button><button onClick={() => notify('Store preview opened')} className="hidden rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 sm:block">Preview store</button></div></header>
      <main className="mx-auto max-w-[1440px] p-4 md:p-8">
        {section === 'overview' && <Overview onNavigate={goTo} notify={notify} />}
        {section === 'orders' && <OrdersView orders={filteredOrders} filter={orderFilter} setFilter={setOrderFilter} query={query} notify={notify} onOrdersChanged={() => { void loadAdminOrders().then((nextOrders) => { if (nextOrders) setLiveOrders(nextOrders); }); }} />}
        {section === 'products' && <AdminProductManager initialProducts={productList} onProductsChange={setProductList} notify={notify} />}
        {section === 'customers' && <CustomersView query={query} notify={notify} />}
        {section === 'reviews' && <AdminReviewsView notify={notify} query={query} />}
        {section === 'marketing' && <CouponManagement notify={notify} />}
        {section === 'analytics' && <AnalyticsView />}
        {section === 'settings' && <SettingsAdmin settings={settings} setSettings={setSettings} notify={notify} />}
      </main>
    </div>
    {toast && <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl"><Check className="h-4 w-4 text-emerald-400" />{toast}</div>}
  </div>;
};

const PageIntro: React.FC<{ eyebrow: string; title: string; description: string; action?: React.ReactNode }> = ({ eyebrow, title, description, action }) => <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>{action}</div>;

const Overview: React.FC<{ onNavigate: (s: AdminSection) => void; notify: (s: string) => void }> = ({ onNavigate, notify }) => <>
  <PageIntro eyebrow="Tuesday, 2 October 2026" title="Good morning, Admin Sharma" description="Here’s what’s happening with your store today." action={<button onClick={() => notify('Report downloaded as CSV')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800"><Download className="h-4 w-4" />Export report</button>} />
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total revenue" value="₹1,84,920" change="12.8%" icon={BarChart3} tone="bg-red-50 text-[#D9232D]" /><MetricCard label="Total orders" value="286" change="8.4%" icon={ClipboardList} tone="bg-blue-50 text-blue-600" /><MetricCard label="Active customers" value="1,248" change="16.2%" icon={Users} tone="bg-violet-50 text-violet-600" /><MetricCard label="Avg. order value" value="₹646" change="-2.1%" icon={ShoppingBag} tone="bg-amber-50 text-amber-600" /></div>
  <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="text-sm font-black">Revenue overview</h3><p className="mt-1 text-[11px] text-slate-400">Last 30 days · All channels</p></div><button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-500">Last 30 days <ChevronDown className="h-3.5 w-3.5" /></button></div><div className="mt-7 flex h-[210px] items-end gap-2 px-1 sm:gap-3">{[34, 42, 30, 48, 54, 44, 61, 57, 70, 66, 83, 74, 92, 78, 88, 98, 84, 93, 76, 88, 100, 91, 82, 94, 86, 97, 90, 96].map((height, i) => <div key={i} className="group relative flex h-full flex-1 items-end"><div style={{ height: `${height}%` }} className={`w-full rounded-t-md transition-all group-hover:bg-[#D9232D] ${i > 24 ? 'bg-red-400' : 'bg-red-100'}`} /></div>)}</div><div className="mt-3 flex justify-between text-[10px] font-semibold text-slate-400"><span>Sep 03</span><span>Sep 10</span><span>Sep 17</span><span>Sep 24</span><span>Oct 02</span></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="text-sm font-black">Order status</h3><p className="mt-1 text-[11px] text-slate-400">286 orders this month</p></div><button onClick={() => onNavigate('orders')} className="text-[11px] font-bold text-[#D9232D]">View all</button></div><div className="mt-7 flex items-center gap-6"><div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(#10b981 0 62%, #8b5cf6 62% 82%, #f59e0b 82% 94%, #ef4444 94% 100%)' }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-black">286</span><span className="text-[10px] text-slate-400">orders</span></div></div><div className="space-y-3 text-[11px] font-bold">{[['Completed', '178', 'bg-emerald-500'], ['Ready for pickup', '57', 'bg-violet-500'], ['Preparing', '34', 'bg-amber-500'], ['Cancelled', '17', 'bg-red-500']].map(([label, count, color]) => <div className="flex items-center gap-2" key={label}><span className={`h-2 w-2 rounded-full ${color}`} /><span className="w-16 text-slate-500">{label}</span><span>{count}</span></div>)}</div></div></div></div>
  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-black">Recent orders</h3><p className="mt-1 text-[11px] text-slate-400">Latest activity across all channels</p></div><button onClick={() => onNavigate('orders')} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#D9232D] hover:bg-red-50">View all orders →</button></div><OrderTable orders={ORDERS.slice(0, 4)} notify={notify} /></div>
</>;

const OrdersView: React.FC<{ orders: AdminOrder[]; filter: 'All' | OrderStatus; setFilter: (f: 'All' | OrderStatus) => void; query: string; notify: (s: string) => void; onOrdersChanged: () => void }> = ({ orders, filter, setFilter, notify, onOrdersChanged }) => <><PageIntro eyebrow="Store operations" title="Pickup orders" description="Confirm, prepare and hand over every store pickup order." action={<div className="flex flex-wrap gap-2"><button onClick={() => notify('Orders exported as CSV')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm"><Download className="h-4 w-4" />Export orders</button><PickupVerification onVerified={() => { notify('Pickup verified and order marked picked up'); onOrdersChanged(); }} /></div>} /><div className="mb-4 flex flex-wrap items-center gap-2"><Filter className="h-4 w-4 text-slate-400" />{(['All', 'NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED', 'CANCELLED'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${filter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{value}</button>)}</div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><PickupOrderTable orders={orders} notify={notify} /></div></>;

const PickupOrderTable: React.FC<{ orders: AdminOrder[]; notify: (s: string) => void }> = ({ orders, notify }) => <div className="space-y-3">{orders.map((order) => <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><p className="font-mono text-sm font-black">{order.id}</p><StatusPill status={order.status} /></div><p className="mt-2 text-xs font-bold">Customer: {order.customer} <span className="font-normal text-slate-400">· {order.phone || 'Mobile unavailable'}</span></p><p className="mt-1 text-[11px] text-slate-500">Product: {order.product} · Total: {money(order.amount)} · Pickup: Store Pickup</p><p className="mt-1 text-[10px] font-bold text-slate-400">Payment: {order.paymentMethod === 'PAY_ONLINE' ? 'Pay Online' : 'Pay at Store'} · {order.paymentStatus || 'PENDING'}</p></div><div className="flex flex-wrap gap-2">{(['CONFIRMED','PREPARING','READY_FOR_PICKUP','PICKED_UP','COMPLETED'] as const).filter((status) => status !== order.status && !(order.status === 'NEW' && status !== 'CONFIRMED')).slice(0, 1).map((next) => <button key={next} onClick={async () => { const result = await updatePickupOrderStatus(order.id, next); notify(result.error ? 'Status update failed' : `Order marked ${next}`); }} className="rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black text-white">{next === 'READY_FOR_PICKUP' ? 'Ready for Pickup' : next === 'PICKED_UP' ? 'Mark as Picked Up' : next === 'COMPLETED' ? 'Complete Order' : next === 'PREPARING' ? 'Start Preparing' : 'Confirm Order'}</button>)}{!['COMPLETED','CANCELLED'].includes(order.status) && <button onClick={async () => { const result = await updatePickupOrderStatus(order.id, 'CANCELLED'); notify(result.error ? 'Cancellation failed' : 'Pickup order cancelled'); }} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black text-red-700">Cancel</button>}{order.paymentStatus !== 'PAID' && <button onClick={async () => { const result = await verifyPickupPayment(order.id); notify(result.error ? 'Payment verification failed' : 'Payment verified'); }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">Verify payment</button>}<button onClick={() => notify(`Pickup details opened for ${order.id}`)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600"><Eye className="mr-1 inline h-3 w-3" />Details</button></div></div></div>)}{orders.length === 0 && <div className="py-14 text-center text-sm font-semibold text-slate-400">No pickup orders match this filter.</div>}</div>;


const OrderTable: React.FC<{ orders: AdminOrder[]; notify: (s: string) => void }> = ({ orders, notify }) => <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400"><th className="pb-3">Order</th><th className="pb-3">Customer</th><th className="pb-3">Product</th><th className="pb-3">Amount</th><th className="pb-3">Status</th><th className="pb-3">Date</th><th className="pb-3" /></tr></thead><tbody className="divide-y divide-slate-100">{orders.map((order) => <tr key={order.id} className="text-xs"><td className="py-4 font-black text-slate-800">{order.id}<p className="mt-1 text-[10px] font-medium text-slate-400">{order.channel}</p></td><td className="py-4"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[10px] font-black text-[#D9232D]">{order.initials}</span><span className="font-bold">{order.customer}</span></div></td><td className="max-w-[180px] py-4 font-medium text-slate-500">{order.product}</td><td className="py-4 font-black">{money(order.amount)}</td><td className="py-4"><StatusPill status={order.status} /></td><td className="py-4 text-[11px] text-slate-400">{order.date}</td><td className="py-4"><button onClick={() => notify(`Opening ${order.id}`)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table>{orders.length === 0 && <div className="py-14 text-center text-sm font-semibold text-slate-400">No orders match this filter.</div>}</div>;


const CustomersView: React.FC<{ query: string; notify: (s: string) => void }> = ({ query, notify }) => { const rows = CUSTOMERS.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase())); return <><PageIntro eyebrow="Relationships" title="Customers" description="Understand your customers and build stronger retention." action={<button onClick={() => notify('Customer list exported')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm"><Download className="h-4 w-4" />Export customers</button>} /><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Total customers" value="1,248" change="16.2%" icon={Users} tone="bg-violet-50 text-violet-600" /><MetricCard label="Repeat purchase rate" value="42.8%" change="5.6%" icon={UserCheck} tone="bg-emerald-50 text-emerald-600" /><MetricCard label="New this month" value="184" change="21.4%" icon={Plus} tone="bg-blue-50 text-blue-600" /></div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400"><th className="pb-3">Customer</th><th className="pb-3">Contact</th><th className="pb-3">Orders</th><th className="pb-3">Total spent</th><th className="pb-3">Last active</th><th className="pb-3" /></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((customer) => <tr key={customer.email} className="text-xs"><td className="py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{customer.name.split(' ').map((p) => p[0]).join('')}</span><div><p className="font-black">{customer.name}</p><span className="text-[10px] text-[#D9232D]">{customer.tag}</span></div></div></td><td className="py-4 text-slate-500">{customer.email}<p className="mt-1 text-[10px] text-slate-400">{customer.phone}</p></td><td className="py-4 font-bold">{customer.orders}</td><td className="py-4 font-black">{money(customer.spent)}</td><td className="py-4 text-slate-500">{customer.lastSeen}</td><td className="py-4"><button onClick={() => notify(`Opening ${customer.name}'s profile`)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></div></>; };

const AnalyticsView: React.FC = () => <><PageIntro eyebrow="Insights" title="Analytics" description="See what is driving revenue, conversions and repeat purchase." action={<button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><ChevronDown className="h-4 w-4" />October 2026</button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Store conversion" value="4.82%" change="0.64%" icon={BarChart3} tone="bg-blue-50 text-blue-600" /><MetricCard label="Sessions" value="24,860" change="18.1%" icon={Eye} tone="bg-violet-50 text-violet-600" /><MetricCard label="Add to cart" value="8.4%" change="2.1%" icon={ShoppingBag} tone="bg-amber-50 text-amber-600" /><MetricCard label="Return customers" value="42.8%" change="5.6%" icon={UserCheck} tone="bg-emerald-50 text-emerald-600" /></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-black">Top products by revenue</h3><div className="mt-5 space-y-4">{PRODUCTS.slice(0, 5).map((product, i) => <div key={product.id}><div className="mb-1.5 flex justify-between text-[11px]"><span className="font-bold">{i + 1}. {product.title}</span><span className="font-black">{money([32400, 28600, 21450, 19800, 16220][i])}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#D9232D]" style={{ width: `${[92, 81, 68, 57, 46][i]}%` }} /></div></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-black">Traffic sources</h3><div className="mt-5 space-y-4">{[['Direct / returning', '46%', 'bg-[#D9232D]'], ['Instagram', '28%', 'bg-violet-500'], ['Google search', '17%', 'bg-blue-500'], ['WhatsApp', '9%', 'bg-emerald-500']].map(([name, percent, color]) => <div key={name} className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="flex-1 text-xs font-bold text-slate-600">{name}</span><span className="text-xs font-black">{percent}</span></div>)}</div><div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="flex h-full"><span className="w-[46%] bg-[#D9232D]" /><span className="w-[28%] bg-violet-500" /><span className="w-[17%] bg-blue-500" /><span className="w-[9%] bg-emerald-500" /></div></div></div></div></>;

const SettingsAdmin: React.FC<{ settings: { alerts: boolean; lowStock: boolean; whatsapp: boolean; maintenance: boolean }; setSettings: React.Dispatch<React.SetStateAction<{ alerts: boolean; lowStock: boolean; whatsapp: boolean; maintenance: boolean }>>; notify: (s: string) => void }> = ({ settings, setSettings, notify }) => <><PageIntro eyebrow="Workspace" title="Settings" description="Configure your store operations, notifications and team access." action={<button onClick={() => notify('Settings saved')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Save changes</button>} /><div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-black">Store profile</h3><p className="mt-1 text-[11px] text-slate-400">Shown on invoices and customer messages.</p><div className="mt-5 space-y-4">{[['Store name', 'ROFIK GODI Centre'], ['Support phone', '+91 98321 45678'], ['Support email', 'hello@rofikgodi.in'], ['Workshop address', 'Bardhaman, West Bengal']].map(([label, value]) => <label key={label} className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-500">{label}</span><input defaultValue={value} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#D9232D]" /></label>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-black">Notifications & operations</h3><p className="mt-1 text-[11px] text-slate-400">Choose which events should alert your team.</p><div className="mt-5 divide-y divide-slate-100">{[['alerts', 'New order alerts', 'Get notified when a new order is placed'], ['lowStock', 'Low stock warnings', 'Alert when a product has fewer than 5 units'], ['whatsapp', 'WhatsApp order updates', 'Send automatic status updates to customers'], ['maintenance', 'Maintenance mode', 'Temporarily hide checkout from customers']].map(([key, label, description]) => <div key={key} className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-black">{label}</p><p className="mt-1 text-[11px] text-slate-400">{description}</p></div><button onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] })} className={`h-6 w-11 shrink-0 rounded-full p-1 transition ${settings[key as keyof typeof settings] ? 'bg-emerald-500' : 'bg-slate-200'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${settings[key as keyof typeof settings] ? 'translate-x-5' : ''}`} /></button></div>)}</div></div></div></>;
