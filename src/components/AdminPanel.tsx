import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bike,
  Bell,
  Check,
  ClipboardList,
  Download,
  Eye,
  Filter,
  Image,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Package,
  Printer,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { AdminActivityView } from './AdminActivityView';
import { AdminProductManager } from './AdminProductManager';
import { AdminVehicleCatalogManager } from './AdminVehicleCatalogManager';
import { AdminVehicleModelEdit } from './AdminVehicleModelEdit';
import { CouponManagement } from './CouponManagement';
import { AdminReviewsView } from './AdminReviewsView';
import { InvoiceTemplate } from './InvoiceTemplate';
import { AdminOrderDetails } from './AdminOrderDetails';
import { PickupVerification } from './PickupVerification';
import { BannersView, NotificationsView, ReportsView } from './AdminSections';
import { AdminCategoriesManager } from './AdminCategoriesManager';
import { AdminCustomerProfile } from './AdminCustomerProfile';
import {
  loadAdminOrderById,
  loadAdminOrders,
  completePickupOrderManually,
  getNextPickupOrderStatus,
  matchesAdminOrderSearch,
  toCustomerOrderRecord,
  updatePickupOrderStatus,
  verifyPickupPayment,
  type AdminOrderRecord,
} from '../lib/supabaseAdminOrders';
import { loadAdminActivityUnreadCount, type AdminActivityEvent } from '../lib/supabaseAdminActivity';
import {
  loadAdminCustomerAvatar,
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
import { getOrderStatusLabel, isOrderComplete } from '../lib/orderPresentation';
import { getAdminCouponIdFromPath, getAdminCustomerIdFromPath, getAdminOrderIdFromPath, getAdminProductIdFromPath, getAdminSectionFromPath, getAdminSupportRequestIdFromPath, getAdminVehicleModelIdFromPath, getPathForAdminCoupon, getPathForAdminCustomer, getPathForAdminOrder, getPathForAdminProduct, getPathForAdminSection, isAdminNotificationComposePath, type AdminSectionRoute } from '../lib/appRoutes';

type AdminSection = AdminSectionRoute;
type OrderStatus = AdminOrderRecord['status'];

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview' as AdminSection, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'orders' as AdminSection, label: 'Orders', icon: ClipboardList },
      { id: 'products' as AdminSection, label: 'Products', icon: Package },
      { id: 'vehicle' as AdminSection, label: 'Vehicle', icon: Bike },
      { id: 'categories' as AdminSection, label: 'Categories', icon: Tag },
      { id: 'customers' as AdminSection, label: 'Customers', icon: Users },
      { id: 'activity' as AdminSection, label: 'Notifications', icon: Activity },
      { id: 'support' as AdminSection, label: 'Support', icon: MessageSquareText },
    ],
  },
  {
    label: 'Store & engagement',
    items: [
      { id: 'reviews' as AdminSection, label: 'Reviews', icon: Star },
      { id: 'marketing' as AdminSection, label: 'Coupons', icon: Tag },
      { id: 'banners' as AdminSection, label: 'Banners', icon: Image },
      { id: 'notifications' as AdminSection, label: 'Campaigns', icon: Bell },
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
  const complete = isOrderComplete(status);
  const cancelled = status === 'CANCELLED';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${complete ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : cancelled ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {getOrderStatusLabel(status)}
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
  const location = useLocation();
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>(() => getAdminSectionFromPath(location.pathname) || 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'All' | OrderStatus>('All');
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [adminUserId, setAdminUserId] = useState('');
  const [focusProductId, setFocusProductId] = useState<string | null>(null);
  const [focusCouponId, setFocusCouponId] = useState<string | null>(null);
  const [focusCampaignId, setFocusCampaignId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<AdminOrderRecord | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => getAdminCustomerIdFromPath(location.pathname));
  const [customerAvatarUrl, setCustomerAvatarUrl] = useState<string | null>(null);
  const selectedCustomer = selectedCustomerId
    ? customers.find((customer) => customer.id === selectedCustomerId) || null
    : null;
  const vehicleEditModelId = getAdminVehicleModelIdFromPath(location.pathname);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);
  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setAdminUserId('');
      setError('Administrator session is missing or expired. Sign in again to load this workspace.');
      return;
    }
    setError('');
    const [orderResult, productResult, customerResult, metricResult, notificationResult, activityResult] =
      await Promise.all([
        loadAdminOrders(),
        loadAdminProducts()
          .then((data) => ({ data, error: null as { message: string } | null }))
          .catch((cause: unknown) => ({ data: null, error: { message: cause instanceof Error ? cause.message : 'Unexpected product catalog error.' } })),
        loadAdminCustomers(),
        loadDashboardMetrics(),
        loadAdminNotifications(),
        loadAdminActivityUnreadCount(),
      ]);
    const errors: string[] = [];
    if (orderResult.error) errors.push(`Orders: ${orderResult.error.message}`);
    else setOrders(orderResult.data);
    if (productResult.error) errors.push(`Products: ${productResult.error.message}`);
    else if (productResult.data) setProducts(productResult.data);
    if (customerResult.error) errors.push(`Customers: ${customerResult.error.message}`);
    else setCustomers(customerResult.data);
    setCustomersLoaded(true);
    if (metricResult.error) errors.push(`Dashboard: ${metricResult.error.message}`);
    else if (metricResult.data) setMetrics(metricResult.data);
    if (notificationResult.error) errors.push(`Campaigns: ${notificationResult.error.message}`);
    else setNotifications(notificationResult.data);
    if (activityResult.error) errors.push(`Activity: ${activityResult.error.message}`);
    else setActivityUnreadCount(activityResult.count);
    setError(errors.join(' · '));
  }, []);
  useEffect(() => {
    if (!adminUserId) return;
    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [adminUserId, refresh]);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active) setAdminUserId(data.user?.id || '');
    });
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setAdminUserId(session?.user.id || '');
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!supabase || !adminUserId) return;
    const client = supabase;
    const channel = client
      .channel('admin-activity-unread-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_activity_events' }, () => {
        void loadAdminActivityUnreadCount().then((result) => {
          if (!result.error) setActivityUnreadCount(result.count);
        });
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [adminUserId]);
  useEffect(() => {
    const customerId = getAdminCustomerIdFromPath(location.pathname);
    setSelectedCustomerId(customerId);
    const orderId = getAdminOrderIdFromPath(location.pathname);
    const productId = getAdminProductIdFromPath(location.pathname);
    const couponId = getAdminCouponIdFromPath(location.pathname);
    if (productId) setFocusProductId(productId);
    if (couponId) setFocusCouponId(couponId);
    const routeSection = getAdminSectionFromPath(location.pathname);
    if (!routeSection) return;
    setSection(routeSection);
    // Keep vehicle model edit deep links; the canonical path below would otherwise
    // bounce /admin/Vehicle/:modelId/edit straight back to the model list.
    const vehicleModelId = getAdminVehicleModelIdFromPath(location.pathname);
    if (customerId || orderId || productId || couponId || vehicleModelId || isAdminNotificationComposePath(location.pathname)) return;
    const requestId = getAdminSupportRequestIdFromPath(location.pathname);
    const canonicalPath = requestId
      ? `${getPathForAdminSection('support')}/${encodeURIComponent(requestId)}`
      : getPathForAdminSection(routeSection);
    if (location.pathname !== canonicalPath) navigate(canonicalPath, { replace: true });
  }, [location.pathname, navigate]);
  useEffect(() => {
    const orderId = getAdminOrderIdFromPath(location.pathname);
    if (!orderId) {
      setSelectedOrder(null);
      return;
    }
    const normalizedId = orderId.replace(/^#/, '').toLowerCase();
    const loadedOrder = orders.find((order) => order.orderNumber.toLowerCase() === normalizedId);
    if (loadedOrder) {
      setSelectedOrder(loadedOrder);
      return;
    }
    let active = true;
    void loadAdminOrderById(orderId).then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError || !data) {
        notify(loadError?.message || 'That order could not be loaded.');
        navigate(getPathForAdminSection('orders'), { replace: true });
        return;
      }
      setSelectedOrder(data);
    });
    return () => { active = false; };
  }, [location.pathname, navigate, notify, orders]);
  useEffect(() => {
    let active = true;
    if (!selectedCustomerId) {
      setCustomerAvatarUrl(null);
      return () => { active = false; };
    }
    setCustomerAvatarUrl(null);
    void loadAdminCustomerAvatar(selectedCustomerId)
      .then(({ data, error: avatarError }) => {
        if (active) setCustomerAvatarUrl(avatarError ? null : data);
      })
      .catch(() => {
        if (active) setCustomerAvatarUrl(null);
      });
    return () => { active = false; };
  }, [selectedCustomerId]);
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (orderFilter === 'All' || order.status === orderFilter) &&
          matchesAdminOrderSearch(order, query),
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
    const path = getPathForAdminSection(next);
    if (location.pathname !== path) navigate(path);
  };
  const openOrder = (order: AdminOrderRecord) => {
    setSection('orders');
    setSidebarOpen(false);
    setQuery('');
    setSelectedOrder(order);
    navigate(getPathForAdminOrder(order.orderNumber));
  };
  const openActivityOrder = async (event: AdminActivityEvent) => {
    const orderNumber = String(event.details.order_number || '').replace(/^#/, '');
    let order = orders.find((item) => item.orderNumber === orderNumber) || null;
    if (!order) {
      const result = await loadAdminOrderById(event.entity_id);
      if (result.error || !result.data) {
        notify(result.error?.message || 'That order could not be loaded.');
        return;
      }
      order = result.data;
    }
    openOrder(order);
  };
  const openActivityReview = (event: AdminActivityEvent) => {
    goTo('reviews');
    setQuery(event.entity_id);
  };
  const openActivityCustomer = (event: AdminActivityEvent) => {
    setSelectedCustomerId(event.entity_id);
    setSidebarOpen(false);
    setQuery('');
    navigate(getPathForAdminCustomer(event.entity_id));
  };
  const openActivityProduct = (event: AdminActivityEvent) => {
    setSidebarOpen(false);
    navigate(getPathForAdminProduct(event.entity_id));
  };
  const openActivityCoupon = (event: AdminActivityEvent) => {
    setSidebarOpen(false);
    navigate(getPathForAdminCoupon(event.entity_id));
  };
  const openActivityCampaign = (event: AdminActivityEvent) => {
    setFocusCampaignId(event.entity_id);
    goTo('notifications');
  };
  const title = (
    {
      overview: 'Dashboard',
      orders: 'Orders',
      products: 'Products',
      vehicle: 'Vehicle models',
      categories: 'Categories',
      customers: 'Customers',
      reviews: 'Reviews',
      marketing: 'Coupons',
      banners: 'Banners',
      notifications: 'Campaigns',
      activity: 'Notifications',
      support: 'Support',
      reports: 'Reports',
      settings: 'Settings',
    } as Record<AdminSection, string>
  )[section];
  const headerTitle = title;
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
                    aria-current={section === id ? 'page' : undefined}
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
              <h1 className="mt-0.5 text-lg font-black">{headerTitle}</h1>
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
                onClick={() => goTo('activity')}
                aria-label={`Open activity notifications${activityUnreadCount ? `, ${activityUnreadCount} unread` : ''}`}
                className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
              >
                <Bell className="h-4 w-4" />
                {activityUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#D9232D] px-1 py-0.5 text-[9px] font-black leading-none text-white">
                    {activityUnreadCount > 99 ? '99+' : activityUnreadCount}
                  </span>
                )}
              </button>
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
              products={products}
              filter={orderFilter}
              setFilter={setOrderFilter}
              onExport={exportOrders}
              onRefresh={() => void refresh()}
              onSelect={openOrder}
              onOpenInvoice={setInvoiceOrder}
              notify={notify}
            />
          )}
          {section === 'products' && (
            <div className="space-y-5">
            <AdminProductManager
              initialProducts={products}
              onProductsChange={setProducts}
              notify={notify}
              customers={customers}
              focusProductId={focusProductId}
              onFocusHandled={() => setFocusProductId(null)}
            />
            </div>
          )}
          {section === 'vehicle' && (vehicleEditModelId ? <AdminVehicleModelEdit modelId={vehicleEditModelId} notify={notify} /> : <AdminVehicleCatalogManager notify={notify} />)}
          {section === 'categories' && (
            <AdminCategoriesManager products={products} notify={notify} />
          )}
          {section === 'activity' && (
            <AdminActivityView
              onViewOrder={openActivityOrder}
              onViewReview={openActivityReview}
              onViewCustomer={openActivityCustomer}
              onViewProduct={openActivityProduct}
              onViewCoupon={openActivityCoupon}
              onViewCampaign={openActivityCampaign}
              adminUserId={adminUserId}
              notify={notify}
            />
          )}
          {section === 'support' && (
            <AdminActivityView
              onViewOrder={openActivityOrder}
              onViewReview={openActivityReview}
              onViewCustomer={openActivityCustomer}
              onViewProduct={openActivityProduct}
              onViewCoupon={openActivityCoupon}
              onViewCampaign={openActivityCampaign}
              adminUserId={adminUserId}
              notify={notify}
              supportOnly
              initialSupportRequestId={getAdminSupportRequestIdFromPath(location.pathname)}
            />
          )}
          {section === 'customers' && (
            selectedCustomerId ? (
              <AdminCustomerProfile
                customer={selectedCustomer}
                customerId={selectedCustomerId}
                avatarUrl={customerAvatarUrl}
                orders={orders}
                products={products}
                isLoading={!customersLoaded}
                onBack={() => navigate(getPathForAdminSection('customers'))}
                onOpenOrder={openOrder}
              />
            ) : (
              <CustomersView
                customers={filteredCustomers}
                onExport={exportCustomers}
                onSelect={(customer) => {
                  setSelectedCustomerId(customer.id);
                  navigate(getPathForAdminCustomer(customer.id));
                }}
              />
            )
          )}
          {section === 'reviews' && <AdminReviewsView notify={notify} query={query} />}
          {section === 'marketing' && (
            <CouponManagement
              notify={notify}
              focusCouponId={focusCouponId}
              onFocusHandled={() => setFocusCouponId(null)}
            />
          )}
          {section === 'banners' && <BannersView notify={notify} />}
          {section === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              customers={customers}
              notify={notify}
              onCampaignDeleted={(campaignId) =>
                setNotifications((items) => items.filter((item) => item.campaign_id !== campaignId))
              }
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
              focusCampaignId={focusCampaignId}
              onFocusHandled={() => setFocusCampaignId(null)}
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
              productCount={products.length}
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
          products={products}
          onClose={() => {
            setSelectedOrder(null);
            navigate(getPathForAdminSection('orders'));
          }}
          onChanged={() => {
            void refresh();
          }}
          notify={notify}
        />
      )}
      {invoiceOrder && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <InvoiceTemplate
            order={toCustomerOrderRecord(invoiceOrder)}
            onClose={() => setInvoiceOrder(null)}
          />
        </div>
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
  products,
  filter,
  setFilter,
  onExport,
  onRefresh,
  onSelect,
  onOpenInvoice,
  notify,
}: {
  orders: AdminOrderRecord[];
  products: Product[];
  filter: 'All' | OrderStatus;
  setFilter: (value: 'All' | OrderStatus) => void;
  onExport: () => void;
  onRefresh: () => void;
  onSelect: (order: AdminOrderRecord) => void;
  onOpenInvoice: (order: AdminOrderRecord) => void;
  notify: (message: string) => void;
}) {
  const [orderSearch, setOrderSearch] = useState('');
  const visibleOrders = orders.filter((order) => matchesAdminOrderSearch(order, orderSearch));
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  return (
    <>
      <PageIntro
        eyebrow="Store operations"
        title="Orders"
        description="Live orders from Supabase, auto-refreshed every 30 seconds. Fulfillment currently follows the store-pickup workflow."
        action={
          <div className="flex flex-wrap gap-2">
            <PickupVerification onVerified={onRefresh} />
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
            {value === 'All' ? value : getOrderStatusLabel(value)}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 sm:max-w-xl">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
            placeholder="Search order ID, customer, phone, vehicle or product"
            aria-label="Search orders"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
          />
          {orderSearch && <button type="button" onClick={() => setOrderSearch('')} aria-label="Clear order search" className="text-[10px] font-bold text-slate-500">Clear</button>}
        </label>
        <p className="text-[10px] font-semibold text-slate-400">{visibleOrders.length} of {orders.length} shown</p>
      </div>
      <div className="space-y-3">
        {visibleOrders.map((order) => {
          const seenProducts = new Set<string>();
          const previews = order.items.filter((item, index) => {
            const key = item.product_id || item.product_name || String(index);
            if (seenProducts.has(key)) return false;
            seenProducts.add(key);
            return true;
          });
          return (
            <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="font-mono text-[12px] font-black text-[#0F172A]">{order.id}</b>
                    <StatusPill status={order.status} />
                  </div>
                  <p className="mt-2 truncate text-xs font-extrabold text-slate-800">{order.customer} <span className="font-medium text-slate-500">· {order.phone || 'No phone'}</span></p>
                  <p className="mt-1 text-[10px] font-medium text-slate-500">{dateLabel(order.createdAt)} <span className="mx-1 text-slate-300">·</span> {money(order.amount)} <span className="mx-1 text-slate-300">·</span> {order.paymentStatus}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F6F8FB] p-3">
                <div className="flex shrink-0 items-center">
                  {previews.slice(0, 3).map((item, index) => {
                    const image = item.product_id ? productsById.get(item.product_id)?.image : undefined;
                    return (
                      <div key={`${item.product_id || item.product_name}-${index}`} className={`grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-white bg-white ${index ? '-ml-2.5 ring-2 ring-[#F6F8FB]' : ''}`}>
                        {image ? <img src={image} alt={item.product_name || 'Product'} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-300" />}
                      </div>
                    );
                  })}
                  {previews.length > 3 && <span className="-ml-2.5 grid h-11 w-11 place-items-center rounded-xl border-2 border-[#F6F8FB] bg-slate-200 text-[10px] font-black text-slate-600">+{previews.length - 3}</span>}
                </div>
                <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600">
                  {previews.length ? `${previews[0]?.product_name || order.product}${previews.length > 1 ? ` + ${previews.length - 1} more` : ''}` : 'No product details saved'}
                  {order.items.length > 0 && <span className="ml-1.5 font-medium text-slate-400">· {order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} units</span>}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex min-w-0 gap-2">
                  <button type="button" onClick={() => onSelect(order)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-extrabold text-slate-800 transition hover:bg-slate-50">
                    <Eye className="h-4 w-4 text-slate-500" /> Details
                  </button>
                  <button type="button" onClick={() => onOpenInvoice(order)} disabled={!isOrderComplete(order.status)} title={isOrderComplete(order.status) ? 'Open order invoice' : 'Invoice available after pickup'} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-[11px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${isOrderComplete(order.status) ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                    <Printer className="h-4 w-4" /> Invoice
                  </button>
                </div>
                <OrderActionMenu order={order} onRefresh={onRefresh} notify={notify} />
              </div>
            </article>
          );
        })}
        {!visibleOrders.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center text-sm font-semibold text-slate-400">
            {orderSearch ? 'No orders match your search' : 'No orders found'}
          </div>
        )}
      </div>
    </>
  );
}

function OrderActionMenu({
  order,
  onRefresh,
  notify,
}: {
  order: AdminOrderRecord;
  onRefresh: () => void;
  notify: (message: string) => void;
}) {
  const nextStatus = getNextPickupOrderStatus(order.status);
  const canCompleteWithoutQr = order.status === 'READY_FOR_PICKUP' || order.status === 'PICKED_UP';
  const [busyAction, setBusyAction] = useState(false);
  const closeMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
  };

  const applyStatus = async (event: React.MouseEvent<HTMLButtonElement>) => {
    closeMenu(event);
    if (!nextStatus || busyAction) return;
    setBusyAction(true);
    try {
      const result = await updatePickupOrderStatus(order.orderNumber, nextStatus);
      if (result.error) notify(result.error.message || 'Order status could not be updated.');
      else {
        notify(`Order moved to ${getOrderStatusLabel(nextStatus)}.`);
        onRefresh();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Order status could not be updated.');
    } finally {
      setBusyAction(false);
    }
  };

  const completeWithoutQr = async (event: React.MouseEvent<HTMLButtonElement>) => {
    closeMenu(event);
    if (!canCompleteWithoutQr || busyAction) return;
    setBusyAction(true);
    try {
      const result = await completePickupOrderManually(order.orderNumber, order.status);
      if (result.error) {
        notify(result.partial
          ? `Pickup is recorded, but completion failed: ${result.error.message}`
          : result.error.message || 'Order could not be completed.');
        if (result.partial) onRefresh();
      } else {
        notify('Order completed without a QR scan.');
        onRefresh();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Order could not be completed.');
      onRefresh();
    } finally {
      setBusyAction(false);
    }
  };

  const verifyPayment = async (event: React.MouseEvent<HTMLButtonElement>) => {
    closeMenu(event);
    if (busyAction) return;
    const isOnlinePayment = order.paymentMethod.toUpperCase() === 'PAY_ONLINE';
    const reference = isOnlinePayment ? window.prompt('Enter the UPI transaction reference / UTR after checking your payment statement:') : '';
    if (isOnlinePayment && reference === null) return;
    const providerReference = reference?.trim().toUpperCase() || '';
    if (isOnlinePayment && !/^[A-Z0-9/-]{6,64}$/.test(providerReference)) {
      notify('Enter a valid UPI transaction reference (6–64 letters, digits, / or -).');
      return;
    }
    setBusyAction(true);
    try {
      const result = await verifyPickupPayment(order.orderNumber, providerReference);
      if (result.error) notify(result.error.message || 'Payment could not be verified.');
      else {
        notify('Payment verified.');
        onRefresh();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Payment could not be verified.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <details className="relative">
      <summary aria-label={`Actions for order ${order.orderNumber}`} className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-extrabold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-4 w-4" /> Actions
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
        {nextStatus && (
          <button type="button" onClick={(event) => void applyStatus(event)} disabled={busyAction} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Package className="h-3.5 w-3.5 text-blue-600" /> Mark {getOrderStatusLabel(nextStatus)}
          </button>
        )}
        {canCompleteWithoutQr && (
          <button type="button" onClick={(event) => void completeWithoutQr(event)} disabled={busyAction} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            <Check className="h-3.5 w-3.5" /> Complete without QR
          </button>
        )}
        {order.paymentStatus.toUpperCase() === 'PENDING' && order.status !== 'CANCELLED' && (
          <button type="button" onClick={(event) => void verifyPayment(event)} disabled={busyAction} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            <Check className="h-3.5 w-3.5" /> Verify payment
          </button>
        )}
      </div>
    </details>
  );
}

function OrderDetails({ order, products, onClose, onChanged, notify }: {
  order: AdminOrderRecord;
  products: Product[];
  onClose: () => void;
  onChanged: () => void;
  notify: (message: string) => void;
}) {
  return <AdminOrderDetails order={order} products={products} onClose={onClose} onChanged={onChanged} notify={notify} />;
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
                    type="button"
                    onClick={() => onSelect(customer)}
                    aria-label={`View ${customer.name} profile`}
                    title={`View ${customer.name} profile`}
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
function SettingsAdmin({
  notify,
  productCount,
  onSignOut,
}: {
  notify: (message: string) => void;
  productCount: number;
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
              <span className="text-slate-500">Active products</span>
              <b>{productCount}</b>
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
