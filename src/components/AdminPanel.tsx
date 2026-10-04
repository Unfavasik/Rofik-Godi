import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ClipboardList,
  Download,
  Eye,
  Filter,
  Image,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { AdminProductManager } from './AdminProductManager';
import { CouponManagement } from './CouponManagement';
import { AdminReviewsView } from './AdminReviewsView';
import { BannersView, CategoriesView, NotificationsView, ReportsView } from './AdminSections';
import {
  loadAdminOrders,
  updatePickupOrderStatus,
  verifyPickupPayment,
  type AdminOrderRecord,
} from '../lib/supabaseAdminOrders';
import {
  loadAdminCustomers,
  loadAdminNotifications,
  loadAdminSettings,
  loadDashboardMetrics,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  saveAdminSettings,
  type AdminCustomer,
  type AdminNotification,
} from '../lib/supabaseAdmin';
import { loadAdminProducts } from '../lib/supabaseProducts';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';
import { supabase } from '../lib/supabase';

type AdminSection =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'customers'
  | 'reviews'
  | 'marketing'
  | 'banners'
  | 'notifications'
  | 'reports'
  | 'settings';
type OrderStatus = AdminOrderRecord['status'];

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview' as AdminSection, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'orders' as AdminSection, label: 'Orders', icon: ClipboardList },
      { id: 'products' as AdminSection, label: 'Products', icon: Package },
      { id: 'categories' as AdminSection, label: 'Categories', icon: Tag },
      { id: 'customers' as AdminSection, label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Store & engagement',
    items: [
      { id: 'reviews' as AdminSection, label: 'Reviews', icon: Star },
      { id: 'marketing' as AdminSection, label: 'Coupons', icon: Tag },
      { id: 'banners' as AdminSection, label: 'Banners', icon: Image },
      { id: 'notifications' as AdminSection, label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Insights',
    items: [{ id: 'reports' as AdminSection, label: 'Reports', icon: BarChart3 }],
  },
];
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const dateLabel = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
const csv = (rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    columns.map(escape).join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n');
};
const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
  const content = csv(rows);
  if (!content) return false;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  tone: string;
}) {
  const positive = !change?.startsWith('-');
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}
          >
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {change}
          </span>
        )}
      </div>
      <p className="mt-4 text-[12px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export const AdminPanel: React.FC<{ onBackToStore?: () => void }> = ({ onBackToStore }) => {
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'All' | OrderStatus>('All');
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);
  const refresh = useCallback(async () => {
    setError('');
    const [orderResult, productResult, customerResult, metricResult, notificationResult] =
      await Promise.all([
        loadAdminOrders(),
        loadAdminProducts(),
        loadAdminCustomers(),
        loadDashboardMetrics(),
        loadAdminNotifications(),
      ]);
    const errors: string[] = [];
    if (orderResult.error) errors.push(`Orders: ${orderResult.error.message}`);
    else setOrders(orderResult.data);
    if (productResult) setProducts(productResult);
    if (customerResult.error) errors.push(`Customers: ${customerResult.error.message}`);
    else setCustomers(customerResult.data);
    if (metricResult.data) setMetrics(metricResult.data);
    if (!notificationResult.error) setNotifications(notificationResult.data);
    setError(errors.join(' · '));
  }, []);
  useEffect(() => {
    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [refresh]);
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (orderFilter === 'All' || order.status === orderFilter) &&
          `${order.id} ${order.customer} ${order.phone} ${order.product}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [orders, orderFilter, query],
  );
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name} ${customer.email} ${customer.phone}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [customers, query],
  );
  const goTo = (next: AdminSection) => {
    setSection(next);
    setSidebarOpen(false);
    setQuery('');
  };
  const title = (
    {
      overview: 'Dashboard',
      orders: 'Orders',
      products: 'Products',
      categories: 'Categories',
      customers: 'Customers',
      reviews: 'Reviews',
      marketing: 'Coupons',
      banners: 'Banners',
      notifications: 'Notifications',
      reports: 'Reports',
      settings: 'Settings',
    } as Record<AdminSection, string>
  )[section];
  const exportOrders = () => {
    const ok = downloadCsv(
      `rofig-godi-center-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredOrders.map((order) => ({
        order_id: order.id,
        customer: order.customer,
        phone: order.phone,
        vehicle: order.vehicleModel,
        products: order.items
          .map((item) => `${item.product_name || ''} x${item.quantity || 1}`)
          .join('; '),
        quantity: order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        total: order.amount,
        payment_status: order.paymentStatus,
        order_status: order.status,
        pickup_store: order.pickupStore,
        created_at: order.createdAt,
      })),
    );
    notify(ok ? 'Orders CSV downloaded' : 'No orders to export');
  };
  const exportCustomers = () => {
    const ok = downloadCsv(
      `rofig-godi-center-customers-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredCustomers.map((customer) => ({
        customer_id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        total_orders: customer.orderCount,
        total_spending: customer.totalSpent,
        last_order: customer.lastOrder,
        created_at: customer.createdAt,
      })),
    );
    notify(ok ? 'Customers CSV downloaded' : 'No customers to export');
  };
  const exportReport = () => {
    const ok = downloadCsv(
      `rofig-godi-center-report-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        {
          date: new Date().toISOString(),
          orders: metrics?.total_orders || 0,
          completed_orders: metrics?.completed_orders || 0,
          pending_orders: metrics?.pending_orders || 0,
          cancelled_orders: metrics?.cancelled_orders || 0,
          revenue: metrics?.total_revenue || 0,
          verified_payments: metrics?.verified_payments || 0,
        },
      ],
    );
    notify(ok ? 'Report CSV downloaded' : 'Report unavailable');
  };
  return (
    <div className="min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-2">
          <p className="text-sm font-black">
            ROFIK <span className="text-[#D9232D]">GODI</span>
          </p>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <div className="mt-8 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => goTo(id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-bold ${section === id ? 'bg-red-50 text-[#D9232D]' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-slate-100 pt-4">
          <button
            onClick={() => goTo('settings')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-bold text-slate-500"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={onBackToStore}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-bold text-slate-500"
          >
            <ShoppingBag className="h-4 w-4" />
            Back to storefront
          </button>
        </div>
      </aside>
      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] font-bold text-slate-400">
                Admin / <span className="text-slate-600">{title}</span>
              </p>
              <h1 className="mt-0.5 text-lg font-black">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search orders or customers..."
                className="w-40 bg-transparent text-xs outline-none"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setNotificationOpen((open) => !open)}
                className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
              >
                <Bell className="h-4 w-4" />
                {notifications.some((item) => !item.read_at) && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#D9232D]" />
                )}
              </button>
              {notificationOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onRead={async (id) => {
                    await markAdminNotificationRead(id);
                    setNotifications((items) =>
                      items.map((item) =>
                        item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
                      ),
                    );
                  }}
                  onReadAll={async () => {
                    await markAllAdminNotificationsRead();
                    setNotifications((items) =>
                      items.map((item) => ({
                        ...item,
                        read_at: item.read_at || new Date().toISOString(),
                      })),
                    );
                  }}
                />
              )}
            </div>
            <button
              onClick={() => window.open('/home', '_blank', 'noopener,noreferrer')}
              className="hidden rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 sm:block"
            >
              Preview store
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 md:p-8">
          {error && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {error}
              <button onClick={() => void refresh()} className="font-black underline">
                Retry
              </button>
            </div>
          )}
          {section === 'overview' && (
            <Overview
              metrics={metrics}
              orders={orders}
              products={products}
              onExport={exportReport}
              onNavigate={goTo}
            />
          )}
          {section === 'orders' && (
            <OrdersView
              orders={filteredOrders}
              filter={orderFilter}
              setFilter={setOrderFilter}
              onExport={exportOrders}
              onRefresh={() => void refresh()}
              onSelect={setSelectedOrder}
              notify={notify}
            />
          )}
          {section === 'products' && (
            <AdminProductManager
              initialProducts={products}
              onProductsChange={setProducts}
              notify={notify}
            />
          )}
          {section === 'categories' && (
            <CategoriesView products={products} onManageProducts={() => goTo('products')} />
          )}
          {section === 'customers' && (
            <CustomersView
              customers={filteredCustomers}
              onExport={exportCustomers}
              onSelect={setSelectedCustomer}
            />
          )}
          {section === 'reviews' && <AdminReviewsView notify={notify} query={query} />}
          {section === 'marketing' && <CouponManagement notify={notify} />}
          {section === 'banners' && <BannersView notify={notify} />}
          {section === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onRead={async (id) => {
                const result = await markAdminNotificationRead(id);
                if (result.error) notify(result.error.message);
                else
                  setNotifications((items) =>
                    items.map((item) =>
                      item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
                    ),
                  );
              }}
              onReadAll={async () => {
                const result = await markAllAdminNotificationsRead();
                if (result.error) notify(result.error.message);
                else
                  setNotifications((items) =>
                    items.map((item) => ({
                      ...item,
                      read_at: item.read_at || new Date().toISOString(),
                    })),
                  );
              }}
            />
          )}
          {section === 'reports' && (
            <ReportsView
              metrics={metrics}
              orders={orders}
              onExport={exportReport}
              onNavigate={goTo}
            />
          )}
          {section === 'settings' && (
            <SettingsAdmin
              notify={notify}
              onSignOut={async () => {
                await supabase?.auth.signOut();
                onBackToStore?.();
              }}
            />
          )}
        </main>
      </div>
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onChanged={() => {
            setSelectedOrder(null);
            void refresh();
          }}
          notify={notify}
        />
      )}
      {selectedCustomer && (
        <CustomerProfile
          customer={selectedCustomer}
          orders={orders}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <Check className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
};

function NotificationPanel({
  notifications,
  onRead,
  onReadAll,
}: {
  notifications: AdminNotification[];
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  return (
    <div className="absolute right-0 top-12 z-50 w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <b className="text-xs">Notifications</b>
        <button onClick={onReadAll} className="text-[10px] font-bold text-[#D9232D]">
          Mark all as read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length ? (
          notifications.map((item) => (
            <button
              key={item.id}
              onClick={() => onRead(item.id)}
              className={`block w-full border-b border-slate-50 px-2 py-3 text-left ${item.read_at ? 'opacity-60' : ''}`}
            >
              <p className="text-xs font-black">{item.title}</p>
              <p className="mt-1 text-[11px] text-slate-500">{item.body}</p>
              <p className="mt-1 text-[10px] text-slate-400">{dateLabel(item.created_at)}</p>
            </button>
          ))
        ) : (
          <p className="p-5 text-center text-xs text-slate-400">No notifications yet</p>
        )}
      </div>
    </div>
  );
}
function Overview({
  metrics,
  orders,
  products,
  onExport,
  onNavigate,
}: {
  metrics: Record<string, number> | null;
  orders: AdminOrderRecord[];
  products: Product[];
  onExport: () => void;
  onNavigate: (section: AdminSection) => void;
}) {
  const salesDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const key = day.toDateString();
    const amount = orders
      .filter((order) => new Date(order.createdAt).toDateString() === key)
      .filter((order) => order.paymentStatus === 'PAID' || order.status === 'COMPLETED')
      .reduce((total, order) => total + order.amount, 0);
    return { label: day.toLocaleDateString('en-IN', { weekday: 'short' }), amount };
  });
  const maxSales = Math.max(1, ...salesDays.map((day) => day.amount));
  const topProducts = new Map<string, { quantity: number; revenue: number }>();
  orders.forEach((order) =>
    order.items.forEach((item) => {
      const name = item.product_name || 'Product';
      const current = topProducts.get(name) || { quantity: 0, revenue: 0 };
      const quantity = Number(item.quantity || 1);
      topProducts.set(name, {
        quantity: current.quantity + quantity,
        revenue: current.revenue + Number(item.unit_price || 0) * quantity,
      });
    }),
  );
  const bestsellers = [...topProducts.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5);
  const statuses: Array<{ key: OrderStatus; label: string; color: string }> = [
    { key: 'NEW', label: 'New', color: '#f59e0b' },
    { key: 'CONFIRMED', label: 'Confirmed', color: '#3b82f6' },
    { key: 'PREPARING', label: 'Preparing', color: '#8b5cf6' },
    { key: 'READY_FOR_PICKUP', label: 'Ready', color: '#06b6d4' },
    { key: 'PICKED_UP', label: 'Picked up', color: '#10b981' },
    { key: 'COMPLETED', label: 'Completed', color: '#16a34a' },
    { key: 'CANCELLED', label: 'Cancelled', color: '#ef4444' },
  ];
  const statusTotal = orders.length || 1;
  let sweep = 0;
  const statusGradient = statuses
    .map(({ key, color }) => {
      const start = sweep;
      sweep += (orders.filter((order) => order.status === key).length / statusTotal) * 100;
      return `${color} ${start}% ${sweep}%`;
    })
    .join(', ');
  return (
    <>
      <PageIntro
        eyebrow="Rofik Godi Centre · Store operations"
        title="Dashboard"
        description="A live snapshot of orders, revenue and catalog activity."
        action={
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
          >
            <Download className="h-4 w-4" />
            Export report
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total orders"
          value={String(metrics?.total_orders ?? '—')}
          icon={ClipboardList}
          tone="bg-blue-50 text-blue-600"
        />
        <MetricCard
          label="Total revenue"
          value={metrics ? money(metrics.total_revenue) : '—'}
          icon={BarChart3}
          tone="bg-red-50 text-[#D9232D]"
        />
        <MetricCard
          label="Total customers"
          value={String(metrics?.total_customers ?? '—')}
          icon={Users}
          tone="bg-violet-50 text-violet-600"
        />
        <MetricCard
          label="Total products"
          value={String(metrics?.total_products ?? products.length)}
          icon={Package}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black">Sales overview</h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Paid or completed orders · last 7 days
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              ₹ {salesDays.reduce((sum, day) => sum + day.amount, 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div
            className="mt-6 flex h-40 items-end gap-3"
            role="img"
            aria-label="Seven-day sales bar chart"
          >
            {salesDays.map((day) => (
              <div
                key={day.label}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[9px] font-semibold text-slate-400">
                  {day.amount ? money(day.amount) : '—'}
                </span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#D9232D] to-[#f39b9f]"
                  style={{ height: `${Math.max(5, (day.amount / maxSales) * 100)}%` }}
                />
                <span className="text-[10px] font-bold text-slate-500">{day.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            Sales chart uses the latest 100 order records available to this dashboard.
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black">Order status</h3>
              <p className="mt-1 text-[11px] text-slate-500">Latest {orders.length} orders</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-[10px] font-bold text-[#D9232D]"
            >
              View all
            </button>
          </div>
          <div className="mt-5 flex items-center gap-5">
            <div
              className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(${statusGradient})` }}
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center">
                <span>
                  <b className="block text-xl">{orders.length}</b>
                  <small className="text-[9px] text-slate-400">orders</small>
                </span>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2">
              {statuses.map((status) => (
                <div
                  key={status.key}
                  className="flex items-center gap-1.5 text-[10px] text-slate-500"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.label}
                  <b className="ml-auto text-slate-800">
                    {orders.filter((order) => order.status === status.key).length}
                  </b>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">Recent orders</h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-[10px] font-bold text-[#D9232D]"
            >
              See all orders
            </button>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {orders.slice(0, 5).map((order) => (
              <button
                key={order.id}
                onClick={() => onNavigate('orders')}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="min-w-0">
                  <b className="block truncate text-xs">
                    {order.id} · {order.customer}
                  </b>
                  <small className="text-[10px] text-slate-400">{dateLabel(order.createdAt)}</small>
                </span>
                <span className="text-right">
                  <b className="block text-xs">{money(order.amount)}</b>
                  <small className="text-[10px] text-slate-500">{order.status}</small>
                </span>
              </button>
            ))}
            {!orders.length && (
              <p className="py-8 text-center text-xs text-slate-400">No orders yet</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">Top products</h3>
            <button
              onClick={() => onNavigate('products')}
              className="text-[10px] font-bold text-[#D9232D]"
            >
              Manage products
            </button>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {bestsellers.map(([name, product], index) => (
              <div key={name} className="flex items-center gap-3 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-xs font-black text-[#D9232D]">
                  0{index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{name}</span>
                <span className="text-right">
                  <b className="block text-xs">{product.quantity} sold</b>
                  <small className="text-[10px] text-slate-400">{money(product.revenue)}</small>
                </span>
              </div>
            ))}
            {!bestsellers.length && (
              <p className="py-8 text-center text-xs text-slate-400">
                Product sales will appear after orders are placed.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black">Quick actions</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Add a product',
              detail: 'Update your catalog',
              section: 'products' as AdminSection,
              icon: Package,
            },
            {
              label: 'Review new orders',
              detail: 'Check order queue',
              section: 'orders' as AdminSection,
              icon: ClipboardList,
            },
            {
              label: 'Create a coupon',
              detail: 'Promote your store',
              section: 'marketing' as AdminSection,
              icon: Tag,
            },
            {
              label: 'View reports',
              detail: 'Export business data',
              section: 'reports' as AdminSection,
              icon: BarChart3,
            },
          ].map(({ label, detail, section, icon: Icon }) => (
            <button
              key={label}
              onClick={() => onNavigate(section)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-red-200 hover:bg-red-50/40"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <b className="block text-xs">{label}</b>
                <small className="text-[10px] text-slate-400">{detail}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
function OrdersView({
  orders,
  filter,
  setFilter,
  onExport,
  onRefresh,
  onSelect,
  notify,
}: {
  orders: AdminOrderRecord[];
  filter: 'All' | OrderStatus;
  setFilter: (value: 'All' | OrderStatus) => void;
  onExport: () => void;
  onRefresh: () => void;
  onSelect: (order: AdminOrderRecord) => void;
  notify: (message: string) => void;
}) {
  return (
    <>
      <PageIntro
        eyebrow="Store operations"
        title="Orders"
        description="Live orders from Supabase, auto-refreshed every 30 seconds. Fulfillment currently follows the store-pickup workflow."
        action={
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={onRefresh}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
            >
              Refresh
            </button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        {(
          [
            'All',
            'NEW',
            'CONFIRMED',
            'PREPARING',
            'READY_FOR_PICKUP',
            'PICKED_UP',
            'COMPLETED',
            'CANCELLED',
          ] as const
        ).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${filter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <b>{order.id}</b>
                  <StatusPill status={order.status} />
                </div>
                <p className="mt-2 text-xs font-bold">
                  {order.customer} · {order.phone || 'No phone'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {order.product} · {money(order.amount)} · {order.paymentStatus}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onSelect(order)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold"
                >
                  <Eye className="mr-1 inline h-3 w-3" />
                  Details
                </button>
                {order.paymentStatus !== 'PAID' && (
                  <button
                    onClick={async () => {
                      const result = await verifyPickupPayment(order.orderNumber);
                      notify(result.error ? result.error.message : 'Payment verified');
                      onRefresh();
                    }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700"
                  >
                    Verify payment
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!orders.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center text-sm font-semibold text-slate-400">
            No orders found
          </div>
        )}
      </div>
    </>
  );
}
function OrderDetails({
  order,
  onClose,
  onChanged,
  notify,
}: {
  order: AdminOrderRecord;
  onClose: () => void;
  onChanged: () => void;
  notify: (message: string) => void;
}) {
  const nextStatus = (
    {
      NEW: 'CONFIRMED',
      CONFIRMED: 'PREPARING',
      PREPARING: 'READY_FOR_PICKUP',
      READY_FOR_PICKUP: 'PICKED_UP',
      PICKED_UP: 'COMPLETED',
    } as Partial<Record<OrderStatus, OrderStatus>>
  )[order.status];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">Order {order.id}</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <p>
            <b>Customer:</b> {order.customer}
          </p>
          <p>
            <b>Phone:</b> {order.phone || '—'}
          </p>
          <p>
            <b>Vehicle:</b> {order.vehicleModel || '—'}
          </p>
          <p>
            <b>Pickup store:</b> {order.pickupStore || '—'}
          </p>
          <p>
            <b>Total:</b> {money(order.amount)}
          </p>
          <p>
            <b>Payment:</b> {order.paymentStatus}
          </p>
          <p>
            <b>Status:</b> {order.status}
          </p>
          <p>
            <b>Created:</b> {dateLabel(order.createdAt)}
          </p>
          <div>
            <b>Products:</b>
            {order.items.map((item, index) => (
              <p key={index} className="mt-1 text-slate-600">
                {item.product_name || 'Product'} × {item.quantity || 1}
              </p>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {nextStatus && (
            <button
              onClick={async () => {
                const result = await updatePickupOrderStatus(order.orderNumber, nextStatus);
                notify(result.error ? result.error.message : `Order marked ${nextStatus}`);
                if (!result.error) onChanged();
              }}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
            >
              Mark {nextStatus}
            </button>
          )}
          {order.paymentStatus !== 'PAID' && (
            <button
              onClick={async () => {
                const result = await verifyPickupPayment(order.orderNumber);
                notify(result.error ? result.error.message : 'Payment verified');
                if (!result.error) onChanged();
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
            >
              Verify payment
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
function CustomersView({
  customers,
  onExport,
  onSelect,
}: {
  customers: AdminCustomer[];
  onExport: () => void;
  onSelect: (customer: AdminCustomer) => void;
}) {
  return (
    <>
      <PageIntro
        eyebrow="Relationships"
        title="Customers"
        description="Customer accounts and order totals from Supabase."
        action={
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold"
          >
            <Download className="h-4 w-4" />
            Export customers
          </button>
        }
      />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3">Customer</th>
              <th>Phone/email</th>
              <th>Orders</th>
              <th>Spent</th>
              <th>Last order</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-5 py-4 font-black">{customer.name}</td>
                <td className="py-4 text-slate-500">{customer.email || customer.phone || '—'}</td>
                <td className="py-4 font-bold">{customer.orderCount}</td>
                <td className="py-4 font-black">{money(customer.totalSpent)}</td>
                <td className="py-4 text-slate-500">{dateLabel(customer.lastOrder)}</td>
                <td className="py-4">
                  <button
                    onClick={() => onSelect(customer)}
                    className="rounded-lg p-2 text-slate-400"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && (
          <p className="p-14 text-center text-sm text-slate-400">No customers found</p>
        )}
      </div>
    </>
  );
}
function CustomerProfile({
  customer,
  orders,
  onClose,
}: {
  customer: AdminCustomer;
  orders: AdminOrderRecord[];
  onClose: () => void;
}) {
  const history = orders
    .filter((order) =>
      customer.phone ? order.phone === customer.phone : order.customer === customer.name,
    )
    .slice(0, 10);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <aside className="h-full w-full max-w-md bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">Customer profile</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <p>
            <b>Name:</b> {customer.name}
          </p>
          <p>
            <b>Email:</b> {customer.email || 'Not available'}
          </p>
          <p>
            <b>Phone:</b> {customer.phone || 'Not available'}
          </p>
          <p>
            <b>Created:</b> {dateLabel(customer.createdAt)}
          </p>
          <p>
            <b>Total orders:</b> {customer.orderCount}
          </p>
          <p>
            <b>Total spending:</b> {money(customer.totalSpent)}
          </p>
          <p>
            <b>Status:</b> {customer.status}
          </p>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-black">Recent order history</h3>
          <p className="mt-1 text-[10px] text-slate-400">
            Matched from the latest 100 orders by phone or name.
          </p>
          <div className="mt-3 divide-y divide-slate-100">
            {history.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                <span>
                  <b className="block">{order.id}</b>
                  <small className="text-slate-400">
                    {dateLabel(order.createdAt)} · {order.status}
                  </small>
                </span>
                <b>{money(order.amount)}</b>
              </div>
            ))}
            {!history.length && (
              <p className="py-5 text-xs text-slate-400">No matching order records found.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
function SettingsAdmin({
  notify,
  onSignOut,
}: {
  notify: (message: string) => void;
  onSignOut: () => void;
}) {
  const [settings, setSettings] = useState({
    alerts: true,
    lowStock: true,
    whatsapp: true,
    maintenance: false,
  });
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  useEffect(() => {
    void loadAdminSettings().then((result) => {
      if (result.data) setSettings((current) => ({ ...current, ...result.data }));
    });
    void supabase?.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email || ''));
  }, []);
  const save = async () => {
    setSaving(true);
    const result = await saveAdminSettings(settings);
    setSaving(false);
    notify(result.error ? result.error.message : 'Settings saved to Supabase');
  };
  return (
    <>
      <PageIntro
        eyebrow="Workspace"
        title="Settings"
        description="Persisted admin settings."
        action={
          <button
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black">Store information</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Store identity and catalog context for this workspace.
          </p>
          <div className="mt-4 space-y-3 text-xs">
            <p className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Store name</span>
              <b>Rofik Godi Centre</b>
            </p>
            <p className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Currency</span>
              <b>INR · ₹</b>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Catalog</span>
              <b>{PRODUCTS.length} starter products</b>
            </p>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black">Payment settings</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Payment provider credentials remain in secure environment configuration.
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs">
            <b>Current checkout</b>
            <p className="mt-1 leading-relaxed text-slate-500">
              Payment status and verification are managed on each order. This admin panel never
              stores or displays secret payment keys.
            </p>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black">Delivery settings</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Fulfillment choices currently supported by the database.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 p-4 text-xs">
            <span>
              <b className="block">Store pickup</b>
              <small className="mt-1 block text-blue-700">Pickup-only orders are enabled.</small>
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-blue-700">
              Active
            </span>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            Shipping address and courier delivery are not part of the current order schema.
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black">Notifications</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {Object.entries(settings).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-4 py-3 text-xs font-bold"
              >
                <span>
                  {key === 'lowStock'
                    ? 'Low stock warnings'
                    : key === 'whatsapp'
                      ? 'WhatsApp order updates'
                      : key === 'maintenance'
                        ? 'Maintenance mode'
                        : 'New order alerts'}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => setSettings((current) => ({ ...current, [key]: !value }))}
                  className="h-5 w-5 accent-[#D9232D]"
                />
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black">Admin profile</h3>
          <p className="mt-1 text-[11px] text-slate-500">Signed-in Supabase administrator.</p>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div>
              <b className="block text-xs">{adminEmail || 'Loading account…'}</b>
              <small className="mt-1 block text-[10px] text-slate-400">
                Access is verified through the admin_users role.
              </small>
            </div>
            <button
              onClick={onSignOut}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700"
            >
              Logout
            </button>
          </div>
        </section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-black text-amber-950">Security</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-900">
            Use a unique admin email, keep email confirmation enabled, and require MFA for
            administrator accounts in Supabase Auth settings. Never place a Supabase secret key in
            browser code.
          </p>
        </section>
      </div>
    </>
  );
}
