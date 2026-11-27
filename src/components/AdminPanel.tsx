import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bike,
  Bell,
  Check,
  ChevronRight,
  ClipboardList,
  Command,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Image,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Package,
  Printer,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Tag,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { AdminActivityView } from './AdminActivityView';
import { AdminProductManager } from './AdminProductManager';
import { AdminVehicleCatalogManager } from './AdminVehicleCatalogManager';
import { AdminVehicleModelEdit } from './AdminVehicleModelEdit';
import { CouponManagement } from './CouponManagement';
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';
import { AdminReviewsView } from './AdminReviewsView';
import { InvoiceTemplate } from './InvoiceTemplate';
import { AdminOrderDetails } from './AdminOrderDetails';
import { PickupVerification } from './PickupVerification';
import { BannersView, NotificationsView, ReportsView } from './AdminSections';
import { AdminAppUpdate } from './AdminAppUpdate';
import { AdminCategoriesManager } from './AdminCategoriesManager';
import { AdminCustomerProfile } from './AdminCustomerProfile';
import { AdminCustomerAvatar } from './AdminCustomerAvatar';
import {
  loadAdminOrderById,
  loadAdminOrders,
  completePickupOrderManually,
  getNextPickupOrderStatus,
  matchesAdminOrderSearch,
  resolveOrderItemProductImage,
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
import { readSwrCache, writeSwrCache } from '../lib/swrCache';
import { subscribePullToRefresh } from '../lib/pullToRefresh';

type AdminWorkspaceCache = {
  orders: AdminOrderRecord[];
  products: Product[];
  customers: AdminCustomer[];
  metrics: Record<string, number> | null;
  notifications: AdminNotification[];
  activityUnreadCount: number;
};

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
    items: [
      { id: 'reports' as AdminSection, label: 'Reports', icon: BarChart3 },
      { id: 'app-update' as AdminSection, label: 'App update', icon: Rocket },
    ],
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
  const ready = status === 'READY_FOR_PICKUP' || status === 'PICKED_UP';
  const toneClass = complete
    ? 'bg-emerald-50/90 text-emerald-700 ring-emerald-200/90'
    : cancelled
      ? 'bg-rose-50/90 text-rose-700 ring-rose-200/90'
      : ready
        ? 'bg-sky-50/90 text-sky-700 ring-sky-200/90'
        : 'bg-amber-50/90 text-amber-800 ring-amber-200/90';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-tight ring-1 shadow-2xs ${toneClass}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {getOrderStatusLabel(status)}
    </span>
  );
}
function MetricCard({
  label,
  value,
  sublabel,
  change,
  icon: Icon,
  tone,
  loading = false,
  onClick,
}: {
  label: string;
  value: string;
  sublabel?: string;
  change?: string;
  icon: React.ElementType;
  tone: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  const positive = !change?.startsWith('-');
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-slate-200/85 bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors duration-200 md:hover:border-slate-300 ${onClick ? 'w-full cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        {change ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${positive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/70'}`}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {change}
          </span>
        ) : onClick ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors group-hover:bg-slate-100 group-hover:text-slate-700">
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-6 w-24 rounded-lg bg-slate-200/80 animate-shimmer" aria-hidden="true" />
      ) : (
        <p className="mt-0.5 font-display text-lg font-extrabold tracking-tight text-slate-950 tabular-nums md:text-xl">{value}</p>
      )}
      {sublabel && (
        <p className="mt-1 truncate text-[10.5px] font-medium text-slate-500">{sublabel}</p>
      )}
    </Wrapper>
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
    <div className="mb-4 rounded-2xl border border-slate-200/85 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-4 sm:py-3.5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D9232D]">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-display text-lg font-extrabold tracking-tight text-slate-950 md:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 max-w-2xl text-[11.5px] font-medium leading-relaxed text-slate-500">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export const AdminPanel: React.FC<{ onBackToStore?: () => void }> = ({ onBackToStore }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>(() => getAdminSectionFromPath(location.pathname) || 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [quickDockOpen, setQuickDockOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    const nextOrders = orderResult.error ? undefined : orderResult.data;
    const nextProducts = productResult.error ? undefined : (productResult.data ?? undefined);
    const nextCustomers = customerResult.error ? undefined : customerResult.data;
    const nextMetrics = metricResult.error ? undefined : (metricResult.data ?? undefined);
    const nextNotifications = notificationResult.error ? undefined : notificationResult.data;
    const nextActivityUnreadCount = activityResult.error ? undefined : activityResult.count;

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
    const workspaceKey = `admin:${authData.user.id}:workspace`;
    const previousCache = readSwrCache<AdminWorkspaceCache>(workspaceKey);
    writeSwrCache<AdminWorkspaceCache>(workspaceKey, {
      orders: nextOrders ?? previousCache?.orders ?? [],
      products: nextProducts ?? previousCache?.products ?? PRODUCTS,
      customers: nextCustomers ?? previousCache?.customers ?? [],
      metrics: nextMetrics ?? previousCache?.metrics ?? null,
      notifications: nextNotifications ?? previousCache?.notifications ?? [],
      activityUnreadCount: nextActivityUnreadCount ?? previousCache?.activityUnreadCount ?? 0,
    });
    setError(errors.join(' · '));
  }, []);
  useEffect(() => {
    if (!adminUserId) return;
    const cached = readSwrCache<AdminWorkspaceCache>(`admin:${adminUserId}:workspace`);
    if (cached) {
      setOrders(cached.orders);
      setProducts(cached.products);
      setCustomers(cached.customers);
      setCustomersLoaded(true);
      if (cached.metrics) setMetrics(cached.metrics);
      setNotifications(cached.notifications);
      setActivityUnreadCount(cached.activityUnreadCount);
    }
    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 30_000);
    const unsubscribePtr = subscribePullToRefresh(() => refresh());
    return () => {
      window.clearInterval(refreshTimer);
      unsubscribePtr();
    };
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
    const avatarCacheKey = `admin:customer-avatar:${selectedCustomerId}`;
    const cachedAvatar = readSwrCache<{ url: string | null }>(avatarCacheKey);
    setCustomerAvatarUrl(cachedAvatar ? cachedAvatar.url : null);
    void loadAdminCustomerAvatar(selectedCustomerId)
      .then(({ data, error: avatarError }) => {
        if (!active) return;
        const nextUrl = avatarError ? null : data;
        setCustomerAvatarUrl(nextUrl);
        if (!avatarError) writeSwrCache(avatarCacheKey, { url: nextUrl });
      })
      .catch(() => {
        if (active && !cachedAvatar) setCustomerAvatarUrl(null);
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
    // Deep links carry the product id; the URL shows the human-readable slug.
    const product = products.find((item) => item.id === event.entity_id);
    navigate(getPathForAdminProduct(product?.slug || event.entity_id));
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
      'app-update': 'App update',
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
  const triggerManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (event.key === 'Escape' && commandOpen) {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandOpen]);

  const activeOrderCount = useMemo(
    () =>
      orders.filter(
        (order) => !isOrderComplete(order.status) && order.status !== 'CANCELLED',
      ).length,
    [orders],
  );
  const lowOrOutOfStockCount = useMemo(
    () =>
      products.filter(
        (product) =>
          !product.inStock ||
          (product.stockQuantity != null &&
            product.stockQuantity <= (product.lowStockThreshold ?? 5)),
      ).length,
    [products],
  );

  const getNavBadge = (id: AdminSection): { count: number | string; tone: string } | null => {
    if (id === 'orders' && activeOrderCount > 0) {
      return { count: activeOrderCount, tone: 'bg-amber-100 text-amber-800 ring-amber-200/80' };
    }
    if (id === 'products') {
      if (lowOrOutOfStockCount > 0) {
        return { count: `${products.length} · !`, tone: 'bg-rose-100 text-[#D9232D] ring-rose-200/80' };
      }
      return { count: products.length, tone: 'bg-slate-100 text-slate-600 ring-slate-200/80' };
    }
    if (id === 'customers' && customers.length > 0) {
      return { count: customers.length, tone: 'bg-slate-100 text-slate-600 ring-slate-200/80' };
    }
    if (id === 'activity' && activityUnreadCount > 0) {
      return {
        count: activityUnreadCount > 99 ? '99+' : activityUnreadCount,
        tone: 'bg-[#D9232D] text-white ring-[#D9232D]',
      };
    }
    return null;
  };

  const allNavItems = useMemo(
    () => [
      ...navGroups.flatMap((group) =>
        group.items.map((item) => ({ ...item, groupLabel: group.label })),
      ),
      { id: 'settings' as AdminSection, label: 'Settings', icon: Settings, groupLabel: 'System' },
    ],
    [],
  );

  const matchingCommandSections = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return allNavItems;
    return allNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.groupLabel.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [allNavItems, commandQuery]);

  const matchingCommandOrders = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return orders.slice(0, 3);
    return orders.filter((order) => matchesAdminOrderSearch(order, q)).slice(0, 5);
  }, [orders, commandQuery]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-[#f6f8fc] via-[#f4f6fb] to-[#fdf4f5] font-sans text-slate-900 selection:bg-red-100 selection:text-[#D9232D]">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Enhanced Glassmorphic Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[228px] max-w-[85vw] flex-col border-r border-slate-200/85 bg-white/92 px-3 py-3.5 shadow-[6px_0_32px_-14px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between gap-2 px-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#D9232D] to-[#991B1B] text-[11px] font-black text-white shadow-sm shadow-red-500/25">
              RG
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xs font-black tracking-tight text-slate-900">
                ROFIK <span className="text-[#D9232D]">GODI</span>
              </p>
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Admin Console
              </span>
            </div>
          </div>
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Quick Command Search Trigger */}
        <button
          type="button"
          onClick={() => {
            setSidebarOpen(false);
            setCommandOpen(true);
          }}
          className="mt-3.5 flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/85 px-2.5 py-2 text-left text-[11px] font-semibold text-slate-500 shadow-2xs transition hover:border-red-200 hover:bg-white hover:text-slate-800"
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-[#D9232D]" />
            <span>Quick jump…</span>
          </span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-slate-400">
            ⌘K
          </kbd>
        </button>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-0.5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2.5 text-[9.5px] font-black uppercase tracking-[0.16em] text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = section === id;
                  const badge = getNavBadge(id);
                  return (
                    <button
                      key={id}
                      onClick={() => goTo(id)}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11.5px] font-bold transition-colors ${
                        active
                          ? 'bg-rose-50/85 text-[#D9232D] ring-1 ring-rose-200/70'
                          : 'text-slate-600 hover:bg-slate-100/75 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-[#D9232D]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors ${
                            active
                              ? 'bg-[#D9232D] text-white'
                              : 'bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-slate-800'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{label}</span>
                      </span>
                      {badge && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold tabular-nums ring-1 ${badge.tone}`}
                        >
                          {badge.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 border-t border-slate-200/75 pt-3">
          <button
            onClick={() => goTo('settings')}
            aria-current={section === 'settings' ? 'page' : undefined}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11.5px] font-bold transition ${
              section === 'settings'
                ? 'bg-red-50 text-[#D9232D] ring-1 ring-red-200/70'
                : 'text-slate-600 hover:bg-slate-100/75 hover:text-slate-900'
            }`}
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-lg ${
                section === 'settings' ? 'bg-[#D9232D] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
            </span>
            Settings
          </button>
          <button
            onClick={onBackToStore}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5 text-left text-[11.5px] font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50/40 hover:text-[#D9232D]"
          >
            <span className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-white text-slate-600 shadow-2xs">
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
              Back to storefront
            </span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 lg:pl-[228px]">
        <header className="sticky top-0 z-30 relative isolate overflow-hidden bg-[#090808] pt-[env(safe-area-inset-top)]">
          <VignetteBarBackdrop variant="top" />
          <div className="relative z-10 flex min-h-[56px] items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md hover:bg-white/22 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/60 sm:block">
                Rofik Godi Workspace
              </p>
              <h1 className="truncate font-display text-base font-black tracking-tight text-white">{headerTitle}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Global Search Box */}
            <div className="hidden items-center gap-2 rounded-full border border-white/18 bg-white/14 px-3 py-1.5 backdrop-blur-md transition focus-within:border-white/40 focus-within:bg-white/20 md:flex">
              <Search className="h-3.5 w-3.5 text-white/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search orders or customers..."
                className="w-40 bg-transparent text-[11.5px] font-semibold text-white outline-none placeholder:font-medium placeholder:text-white/60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full bg-white/18 p-0.5 text-white/80 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Command Palette Button */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              title="Open Quick Command Palette (Ctrl+K)"
              aria-label="Open Quick Command Palette"
              className="inline-flex min-h-9 h-9 items-center gap-1.5 rounded-full border border-white/18 bg-white/14 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md transition hover:bg-white/22"
            >
              <Command className="h-3.5 w-3.5 text-rose-300" />
              <span className="hidden sm:inline">Jump</span>
              <kbd className="hidden rounded bg-white/15 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-white/80 lg:inline">
                ⌘K
              </kbd>
            </button>

            {/* Manual Workspace Sync Button */}
            <button
              type="button"
              onClick={() => void triggerManualRefresh()}
              disabled={isRefreshing}
              title="Refresh live workspace data"
              aria-label="Refresh workspace"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition hover:bg-white/22 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-rose-300' : ''}`} />
            </button>

            {/* Activity Notification Bell */}
            <div className="relative">
              <button
                onClick={() => goTo('activity')}
                aria-label={`Open activity notifications${activityUnreadCount ? `, ${activityUnreadCount} unread` : ''}`}
                className="relative grid h-9 w-9 place-items-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition hover:bg-white/22"
              >
                <Bell className="h-3.5 w-3.5" />
                {activityUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-[#181412] bg-[#D9232D] px-1 py-0.5 text-[9px] font-black leading-none text-white tabular-nums shadow-xs">
                    {activityUnreadCount > 99 ? '99+' : activityUnreadCount}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => onBackToStore ? onBackToStore() : navigate('/home')}
              className="hidden min-h-9 items-center gap-1.5 rounded-full border border-white/18 bg-white/14 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur-md transition hover:bg-white/22 sm:inline-flex"
            >
              <Store className="h-3.5 w-3.5 text-rose-300" />
              Preview store
            </button>
          </div>
          </div>
        </header>

        <div className="relative -mt-px">
          <VignettePageCurtain className="h-[190px] sm:h-[220px]" />
          <main className="relative z-10 mx-auto w-full min-w-0 max-w-[1320px] p-3 pb-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))] sm:p-5 md:p-6 md:pb-20">
          {error && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-red-200/90 bg-gradient-to-r from-red-50 via-rose-50/80 to-white px-3.5 py-2.5 text-[11px] font-semibold text-red-800 shadow-2xs">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#D9232D]" />
                {error}
              </span>
              <button
                onClick={() => void triggerManualRefresh()}
                className="rounded-xl bg-[#D9232D] px-3 py-1.5 text-[11px] font-black text-white shadow-2xs hover:bg-red-700"
              >
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
              onOpenOrder={openOrder}
            />
          )}
          {section === 'orders' && (
            <OrdersView
              orders={filteredOrders}
              allOrders={orders}
              products={products}
              filter={orderFilter}
              setFilter={setOrderFilter}
              onExport={exportOrders}
              onRefresh={() => void triggerManualRefresh()}
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
          {section === 'vehicle' &&
            (vehicleEditModelId ? (
              <AdminVehicleModelEdit modelId={vehicleEditModelId} notify={notify} />
            ) : (
              <AdminVehicleCatalogManager notify={notify} />
            ))}
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
          {section === 'customers' &&
            (selectedCustomerId ? (
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
                isLoading={!customersLoaded}
                onExport={exportCustomers}
                onSelect={(customer) => {
                  setSelectedCustomerId(customer.id);
                  navigate(getPathForAdminCustomer(customer.id));
                }}
              />
            ))}
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
              products={products}
              onExport={exportReport}
              onNavigate={goTo}
            />
          )}
          {section === 'app-update' && <AdminAppUpdate notify={notify} />}
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
      </div>

      {/* Floating Glass Quick-Action Toolbar */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-2 sm:right-5">
        {quickDockOpen && (
          <div className="mb-1 flex max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-xl">
            <p className="px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400">
              Quick Workspace Actions
            </p>
            <button
              type="button"
              onClick={() => {
                setQuickDockOpen(false);
                goTo('orders');
              }}
              className="flex min-h-9 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-bold text-slate-700 transition hover:bg-red-50 hover:text-[#D9232D]"
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
              <span>Order Queue ({activeOrderCount} active)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickDockOpen(false);
                goTo('products');
              }}
              className="flex min-h-9 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-bold text-slate-700 transition hover:bg-red-50 hover:text-[#D9232D]"
            >
              <Package className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>Manage Products ({products.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickDockOpen(false);
                goTo('marketing');
              }}
              className="flex min-h-9 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-bold text-slate-700 transition hover:bg-red-50 hover:text-[#D9232D]"
            >
              <Tag className="h-3.5 w-3.5 shrink-0 text-violet-600" />
              <span>Create / Edit Coupons</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickDockOpen(false);
                exportOrders();
              }}
              className="flex min-h-9 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-bold text-slate-700 transition hover:bg-red-50 hover:text-[#D9232D]"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-sky-600" />
              <span>Export Orders CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickDockOpen(false);
                setCommandOpen(true);
              }}
              className="flex min-h-9 items-center gap-2 rounded-xl border-t border-slate-100 px-2.5 pt-2 pb-1 text-left text-[11px] font-extrabold text-[#D9232D] transition hover:bg-red-50"
            >
              <Command className="h-3.5 w-3.5 shrink-0" />
              <span>Command Palette (⌘K)</span>
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setQuickDockOpen((prev) => !prev)}
          aria-label="Toggle quick actions toolbar"
          className="banner-cta-shine inline-flex min-h-10 items-center gap-1.5 rounded-full border border-red-200/80 bg-gradient-to-r from-[#D9232D] to-[#B91C1C] px-3.5 py-2 text-[11px] font-extrabold text-white shadow-[0_10px_24px_-8px_rgba(217,35,45,0.5)] transition-all hover:scale-105 active:scale-95"
        >
          {quickDockOpen ? <X className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{quickDockOpen ? 'Close' : 'Quick Actions'}</span>
        </button>
      </div>

      {/* Command Palette Modal (Ctrl+K / Cmd+K) */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-950/45 p-3 pt-10 backdrop-blur-xs sm:p-4 sm:pt-14"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="flex max-h-[82dvh] w-full max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 shadow-2xl backdrop-blur-xl sm:max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[#D9232D]" />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Jump to any section, search order #, customer name, or action..."
                className="min-h-9 min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 sm:text-xs"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="min-h-8 shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200"
              >
                ESC
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2.5">
              <div>
                <p className="px-2 pb-1 text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Admin Sections
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {matchingCommandSections.map(({ id, label, icon: Icon, groupLabel }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setCommandOpen(false);
                        setCommandQuery('');
                        goTo(id);
                      }}
                      className={`flex min-h-9 min-w-0 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[11.5px] font-bold transition ${
                        section === id
                          ? 'bg-red-50 text-[#D9232D] ring-1 ring-red-200/70'
                          : 'text-slate-700 hover:bg-slate-100/80'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
                        <span className="truncate">{label}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400">{groupLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {matchingCommandOrders.length > 0 && (
                <div>
                  <p className="px-2 pb-1 text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Matching Orders
                  </p>
                  <div className="space-y-1">
                    {matchingCommandOrders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setCommandOpen(false);
                          setCommandQuery('');
                          openOrder(order);
                        }}
                        className="flex min-h-9 w-full min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[11.5px] transition hover:bg-slate-100/80"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-black text-slate-900">{order.id}</span>
                          <span className="ml-2 font-bold text-slate-700">{order.customer}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-bold tabular-nums text-slate-900">{money(order.amount)}</span>
                          <StatusPill status={order.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden">
          <InvoiceTemplate
            order={toCustomerOrderRecord(invoiceOrder)}
            products={products}
            onClose={() => setInvoiceOrder(null)}
          />
        </div>
      )}
      {toast && (
        <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-slate-700/80 bg-slate-900/95 px-4 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-md">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 break-words">{toast}</span>
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
  onOpenOrder,
}: {
  metrics: Record<string, number> | null;
  orders: AdminOrderRecord[];
  products: Product[];
  onExport: () => void;
  onNavigate: (section: AdminSection) => void;
  onOpenOrder: (order: AdminOrderRecord) => void;
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
  const totalSevenDaySales = salesDays.reduce((sum, day) => sum + day.amount, 0);
  const maxSales = Math.max(1, ...salesDays.map((day) => day.amount));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const productsByName = new Map(
    products.map((product) => [product.title.trim().toLowerCase(), product]),
  );
  const topProducts = new Map<
    string,
    { key: string; name: string; quantity: number; revenue: number; image: string | null }
  >();
  orders.forEach((order) =>
    order.items.forEach((item) => {
      const rawName = (item.product_name || 'Product').trim() || 'Product';
      const normalizedName = rawName.toLowerCase();
      const matchedProduct =
        (item.product_id ? productsById.get(item.product_id) : undefined) ||
        productsByName.get(normalizedName);
      const key = matchedProduct?.id || normalizedName;
      const current = topProducts.get(key);
      const quantity = Number(item.quantity || 1);
      const revenue = Number(item.unit_price || 0) * quantity;
      const resolvedImage = resolveOrderItemProductImage(item, productsById, productsByName);
      if (current) {
        current.quantity += quantity;
        current.revenue += revenue;
        if (!current.image && resolvedImage) current.image = resolvedImage;
      } else {
        topProducts.set(key, {
          key,
          name: matchedProduct?.title || rawName,
          quantity,
          revenue,
          image: resolvedImage,
        });
      }
    }),
  );
  const bestsellers = [...topProducts.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const maxBestsellerQty = Math.max(1, ...bestsellers.map((item) => item.quantity));

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
  const statusGradient = orders.length
    ? statuses
        .map(({ key, color }) => {
          const start = sweep;
          sweep += (orders.filter((order) => order.status === key).length / statusTotal) * 100;
          return `${color} ${start}% ${sweep}%`;
        })
        .join(', ')
    : '#e2e8f0 0% 100%';

  const activeQueueCount = orders.filter(
    (order) => !isOrderComplete(order.status) && order.status !== 'CANCELLED',
  ).length;
  const inStockCount = products.filter((product) => product.inStock).length;

  return (
    <>
      <PageIntro
        eyebrow="Rofik Godi Centre · Store operations"
        title="Dashboard"
        description="A live snapshot of orders, revenue and catalog activity."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:border-red-200 hover:bg-red-50/40 hover:text-[#D9232D]"
            >
              <ClipboardList className="h-3.5 w-3.5 text-[#D9232D]" />
              Order Queue ({activeQueueCount})
            </button>
            <button
              onClick={onExport}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              Export report
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total orders"
          value={String(metrics?.total_orders ?? orders.length)}
          sublabel={`${activeQueueCount} active in pickup queue`}
          icon={ClipboardList}
          tone="bg-slate-100 text-slate-700"
          onClick={() => onNavigate('orders')}
        />
        <MetricCard
          label="Total revenue"
          value={metrics ? money(metrics.total_revenue) : '—'}
          sublabel={metrics ? `${metrics.verified_payments ?? 0} verified payments` : 'Syncing revenue ledger'}
          icon={Wallet}
          tone="bg-rose-50 text-[#D9232D]"
          onClick={() => onNavigate('reports')}
        />
        <MetricCard
          label="Total customers"
          value={String(metrics?.total_customers ?? '—')}
          sublabel="Registered store accounts"
          icon={Users}
          tone="bg-slate-100 text-slate-700"
          onClick={() => onNavigate('customers')}
        />
        <MetricCard
          label="Total products"
          value={String(metrics?.total_products ?? products.length)}
          sublabel={`${inStockCount} published in storefront`}
          icon={Package}
          tone="bg-slate-100 text-slate-700"
          onClick={() => onNavigate('products')}
        />
      </div>

      {(() => {
        const outOfStock = products.filter(
          (product) => !product.inStock || (product.stockQuantity != null && product.stockQuantity <= 0),
        );
        const lowStock = products.filter(
          (product) =>
            product.inStock &&
            product.stockQuantity != null &&
            product.stockQuantity > 0 &&
            product.stockQuantity <= (product.lowStockThreshold ?? 5),
        );
        if (!outOfStock.length && !lowStock.length) return null;
        return (
          <section className="mt-4 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black text-amber-950">Inventory alerts</h3>
                  <p className="mt-0.5 text-[11px] font-medium text-amber-800/90">
                    {outOfStock.length + lowStock.length}{' '}
                    {outOfStock.length + lowStock.length === 1 ? 'product needs' : 'products need'}{' '}
                    attention — out of stock or running low.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="shrink-0 rounded-xl bg-amber-900 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-2xs transition hover:bg-amber-950"
              >
                Manage products
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...outOfStock, ...lowStock].slice(0, 6).map((product) => {
                const out = !product.inStock || (product.stockQuantity != null && product.stockQuantity <= 0);
                return (
                  <div
                    key={product.id}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-amber-200/60 bg-white/95 px-3 py-2 shadow-2xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-lg object-cover bg-slate-100"
                        />
                      ) : (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                          <Package className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span className="min-w-0 truncate text-[11.5px] font-extrabold text-slate-800">
                        {product.title}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
                        out ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {out ? 'Out of stock' : `Only ${product.stockQuantity} left`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#D9232D]" />
                <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Sales overview</h3>
              </div>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Paid or completed orders · last 7 days
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-black text-emerald-700 ring-1 ring-emerald-200/70 tabular-nums">
                ₹ {totalSevenDaySales.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div
            className="mt-4 flex h-36 w-full min-w-0 items-end gap-1.5 overflow-x-auto rounded-xl bg-slate-50/70 p-2.5 ring-1 ring-slate-100 sm:gap-2.5 sm:p-3"
            role="img"
            aria-label="Seven-day sales bar chart"
          >
            {salesDays.map((day) => {
              const barPct = Math.max(8, (day.amount / maxSales) * 100);
              return (
                <div
                  key={day.label}
                  className="group flex h-full min-w-[30px] flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="max-w-full truncate text-[9px] font-extrabold text-slate-500 tabular-nums transition-colors group-hover:text-[#D9232D]">
                    {day.amount ? money(day.amount) : '—'}
                  </span>
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div
                      className={`w-full max-w-[36px] rounded-t-lg transition-colors duration-200 ${
                        day.amount > 0
                          ? 'bg-[#D9232D] group-hover:bg-[#BE1C25]'
                          : 'bg-slate-200/75'
                      }`}
                      style={{ height: `${barPct}%` }}
                    />
                  </div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-[10px] font-medium text-slate-400">
            Sales chart uses the latest 100 order records available to this dashboard.
          </p>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Order status</h3>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Latest {orders.length} orders
              </p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="min-h-8 shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-[10.5px] font-extrabold text-[#D9232D] transition hover:bg-red-100"
            >
              View all
            </button>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
            <div
              className="grid h-28 w-28 shrink-0 place-items-center rounded-full p-2.5 shadow-inner"
              style={{ background: `conic-gradient(${statusGradient})` }}
            >
              <div className="grid h-18 w-18 place-items-center rounded-full bg-white text-center shadow-sm">
                <span>
                  <b className="block font-display text-lg font-black text-slate-900 tabular-nums">
                    {orders.length}
                  </b>
                  <small className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    orders
                  </small>
                </span>
              </div>
            </div>
            <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-x-2.5 gap-y-1.5 sm:grid-cols-2">
              {statuses.map((status) => {
                const count = orders.filter((order) => order.status === status.key).length;
                return (
                  <div
                    key={status.key}
                    className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50/80 px-2 py-1 text-[10.5px] font-semibold text-slate-600 ring-1 ring-slate-100"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="truncate">{status.label}</span>
                    <b className="ml-auto font-black text-slate-900 tabular-nums">{count}</b>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Recent orders</h3>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Click any order to inspect items or update status
              </p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="min-h-8 shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-[10.5px] font-extrabold text-[#D9232D] transition hover:bg-red-100"
            >
              See all orders
            </button>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {orders.slice(0, 5).map((order) => (
              <button
                key={order.id}
                onClick={() => onOpenOrder(order)}
                className="group flex w-full min-w-0 items-center justify-between gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50/90"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <AdminCustomerAvatar
                    name={order.customer}
                    initials={order.initials || 'RG'}
                    avatarUrl={order.customerAvatarUrl}
                    className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 group-hover:bg-red-50 group-hover:text-[#D9232D]"
                    textClassName="font-mono text-[10.5px] font-black"
                  />
                  <span className="min-w-0">
                    <b className="block truncate text-[11.5px] font-extrabold text-slate-900">
                      <span className="font-mono">{order.id}</span> · {order.customer}
                    </b>
                    <small className="text-[10px] font-medium text-slate-400">
                      {dateLabel(order.createdAt)}
                    </small>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-right">
                  <span>
                    <b className="block text-[11.5px] font-black text-slate-900 tabular-nums">
                      {money(order.amount)}
                    </b>
                    <small className="text-[10px] font-bold text-slate-500">
                      {getOrderStatusLabel(order.status)}
                    </small>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D9232D]" />
                </span>
              </button>
            ))}
            {!orders.length && (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">No orders yet</p>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Top products</h3>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Highest velocity seat covers &amp; accessories
              </p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="min-h-8 shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-[10.5px] font-extrabold text-[#D9232D] transition hover:bg-red-100"
            >
              Manage products
            </button>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {bestsellers.map((product, index) => {
              const pct = Math.max(12, Math.round((product.quantity / maxBestsellerQty) * 100));
              return (
                <div key={product.key} className="py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 shadow-2xs">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                      <span className="absolute -left-1.5 -top-1.5 grid h-4.5 w-4.5 place-items-center rounded-md bg-[#D9232D] font-mono text-[9px] font-black text-white shadow-xs ring-2 ring-white">
                        0{index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                        <span className="min-w-0 truncate text-[11.5px] font-extrabold text-slate-900">
                          {product.name}
                        </span>
                        <span className="shrink-0 text-right">
                          <b className="text-[11.5px] font-black text-slate-900 tabular-nums">
                            {product.quantity} sold
                          </b>
                          <span className="mx-1 text-slate-300">·</span>
                          <small className="text-[10.5px] font-bold text-emerald-700 tabular-nums">
                            {money(product.revenue)}
                          </small>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#D9232D] to-rose-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!bestsellers.length && (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">
                Product sales will appear after orders are placed.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Quick actions</h3>
            <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
              Direct shortcuts to everyday store operations
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Add a product',
              detail: 'Update your catalog',
              section: 'products' as AdminSection,
              icon: Package,
              tone: 'bg-red-50 text-[#D9232D]',
            },
            {
              label: 'Review new orders',
              detail: 'Check order queue',
              section: 'orders' as AdminSection,
              icon: ClipboardList,
              tone: 'bg-blue-50 text-blue-600',
            },
            {
              label: 'Create a coupon',
              detail: 'Promote your store',
              section: 'marketing' as AdminSection,
              icon: Tag,
              tone: 'bg-violet-50 text-violet-600',
            },
            {
              label: 'View reports',
              detail: 'Export business data',
              section: 'reports' as AdminSection,
              icon: BarChart3,
              tone: 'bg-emerald-50 text-emerald-600',
            },
          ].map(({ label, detail, section: targetSection, icon: Icon, tone }) => (
            <button
              key={label}
              onClick={() => onNavigate(targetSection)}
              className="group flex items-center gap-2.5 rounded-xl border border-slate-200/85 bg-slate-50/40 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-white hover:shadow-md"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[11.5px] font-extrabold text-slate-900 group-hover:text-[#D9232D]">
                  {label}
                </b>
                <small className="text-[10.5px] font-medium text-slate-500">{detail}</small>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D9232D]" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function OrdersView({
  orders,
  allOrders,
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
  allOrders: AdminOrderRecord[];
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
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const productsByName = useMemo(
    () => new Map(products.map((product) => [product.title.trim().toLowerCase(), product])),
    [products],
  );

  const countByStatus = useMemo(() => {
    const map: Record<string, number> = { All: allOrders.length };
    allOrders.forEach((order) => {
      map[order.status] = (map[order.status] || 0) + 1;
    });
    return map;
  }, [allOrders]);

  const paidRevenue = useMemo(
    () =>
      allOrders
        .filter((order) => order.paymentStatus === 'PAID' || isOrderComplete(order.status))
        .reduce((sum, order) => sum + order.amount, 0),
    [allOrders],
  );

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
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              onClick={onRefresh}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        }
      />

      {/* Order Queue Summary Strip */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Orders
          </p>
          <p className="mt-0.5 font-display text-lg font-black text-slate-900 tabular-nums">
            {allOrders.length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 shadow-2xs">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-amber-700">
            Awaiting Action
          </p>
          <p className="mt-0.5 font-display text-lg font-black text-amber-900 tabular-nums">
            {(countByStatus.NEW || 0) + (countByStatus.CONFIRMED || 0) + (countByStatus.PREPARING || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-3 shadow-2xs">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-sky-700">
            Ready for Pickup
          </p>
          <p className="mt-0.5 font-display text-lg font-black text-sky-900 tabular-nums">
            {countByStatus.READY_FOR_PICKUP || 0}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 shadow-2xs">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-700">
            Verified Value
          </p>
          <p className="mt-0.5 font-display text-lg font-black text-emerald-900 tabular-nums">
            {money(paidRevenue)}
          </p>
        </div>
      </div>

      {/* Status Filter Pills with Live Counts */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 p-2 shadow-2xs">
        <span className="inline-flex items-center gap-1 px-1.5 text-[10.5px] font-extrabold text-slate-400">
          <Filter className="h-3 w-3" />
          Status
        </span>
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
        ).map((value) => {
          const active = filter === value;
          const count = countByStatus[value] || 0;
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-extrabold transition ${
                active
                  ? 'bg-[#D9232D] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{value === 'All' ? value : getOrderStatusLabel(value)}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-black tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 shadow-2xs focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 sm:max-w-lg">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <input
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
            placeholder="Search order ID, customer, phone, vehicle or product"
            aria-label="Search orders"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 sm:text-xs"
          />
          {orderSearch && (
            <button
              type="button"
              onClick={() => setOrderSearch('')}
              aria-label="Clear order search"
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          )}
        </label>
        <p className="text-[11px] font-bold text-slate-400 tabular-nums">
          {visibleOrders.length} of {orders.length} shown
        </p>
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
          const isPaid = order.paymentStatus.toUpperCase() === 'PAID';
          return (
            <article
              key={order.id}
              className="group rounded-2xl border border-slate-200/85 bg-white p-3.5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.08)] transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <AdminCustomerAvatar
                    name={order.customer}
                    initials={order.initials || 'RG'}
                    avatarUrl={order.customerAvatarUrl}
                    className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-2xs ring-1 ring-slate-200/80"
                    textClassName="font-mono text-[11px] font-black"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <b className="font-mono text-xs font-black text-[#0F172A]">{order.id}</b>
                      <StatusPill status={order.status} />
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ring-1 ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-amber-50 text-amber-800 ring-amber-200'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-extrabold text-slate-900">
                      {order.customer}{' '}
                      <span className="font-semibold text-slate-500">
                        · {order.phone || 'No phone'}
                      </span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-medium text-slate-500">
                      <span>{dateLabel(order.createdAt)}</span>
                      {order.vehicleModel && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                            <Bike className="h-3 w-3 text-[#D9232D]" />
                            {order.vehicleCompany ? `${order.vehicleCompany} ` : ''}
                            {order.vehicleModel}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-base font-black text-slate-900 tabular-nums">
                    {money(order.amount)}
                  </p>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    {order.paymentMethod.replaceAll('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-[#F8FAFC] p-2">
                <div className="flex shrink-0 items-center">
                  {previews.slice(0, 3).map((item, index) => {
                    const image = resolveOrderItemProductImage(item, productsById, productsByName);
                    return (
                      <div
                        key={`${item.product_id || item.product_name}-${index}`}
                        className={`grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-white bg-white shadow-2xs ${
                          index ? '-ml-2 ring-2 ring-[#F8FAFC]' : ''
                        }`}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={item.product_name || 'Product'}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-3.5 w-3.5 text-slate-300" />
                        )}
                      </div>
                    );
                  })}
                  {previews.length > 3 && (
                    <span className="-ml-2 grid h-9 w-9 place-items-center rounded-lg border-2 border-[#F8FAFC] bg-slate-200 text-[9.5px] font-black text-slate-600">
                      +{previews.length - 3}
                    </span>
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-[11.5px] font-extrabold text-slate-700">
                  {previews.length
                    ? `${previews[0]?.product_name || order.product}${
                        previews.length > 1 ? ` + ${previews.length - 1} more` : ''
                      }`
                    : 'No product details saved'}
                  {order.items.length > 0 && (
                    <span className="ml-1.5 font-semibold text-slate-400 tabular-nums">
                      · {order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} units
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelect(order)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-800 shadow-2xs transition hover:border-red-200 hover:bg-red-50/40 hover:text-[#D9232D]"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" /> Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInvoice(order)}
                    disabled={!isOrderComplete(order.status)}
                    title={
                      isOrderComplete(order.status)
                        ? 'Open order invoice'
                        : 'Invoice available after pickup'
                    }
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      isOrderComplete(order.status)
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <Printer className="h-3.5 w-3.5" /> Invoice
                  </button>
                </div>
                <OrderActionMenu order={order} onRefresh={onRefresh} notify={notify} />
              </div>
            </article>
          );
        })}
        {!visibleOrders.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs font-semibold text-slate-400">
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
        notify(
          result.partial
            ? `Pickup is recorded, but completion failed: ${result.error.message}`
            : result.error.message || 'Order could not be completed.',
        );
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
    const reference = isOnlinePayment
      ? window.prompt('Enter the UPI transaction reference / UTR after checking your payment statement:')
      : '';
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
      <summary
        aria-label={`Actions for order ${order.orderNumber}`}
        className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal className="h-3.5 w-3.5" /> Actions
      </summary>
      <div className="absolute right-0 top-full z-30 mt-1.5 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        {nextStatus && (
          <button
            type="button"
            onClick={(event) => void applyStatus(event)}
            disabled={busyAction}
            className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Package className="h-3.5 w-3.5 shrink-0 text-blue-600" /> Mark {getOrderStatusLabel(nextStatus)}
          </button>
        )}
        {canCompleteWithoutQr && (
          <button
            type="button"
            onClick={(event) => void completeWithoutQr(event)}
            disabled={busyAction}
            className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5 shrink-0" /> Complete without QR
          </button>
        )}
        {order.paymentStatus.toUpperCase() === 'PENDING' && order.status !== 'CANCELLED' && (
          <button
            type="button"
            onClick={(event) => void verifyPayment(event)}
            disabled={busyAction}
            className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5 shrink-0" /> Verify payment
          </button>
        )}
      </div>
    </details>
  );
}

function OrderDetails({
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
  return (
    <AdminOrderDetails
      order={order}
      products={products}
      onClose={onClose}
      onChanged={onChanged}
      notify={notify}
    />
  );
}

function CustomersView({
  customers,
  isLoading,
  onExport,
  onSelect,
}: {
  customers: AdminCustomer[];
  isLoading?: boolean;
  onExport: () => void;
  onSelect: (customer: AdminCustomer) => void;
}) {
  const totalLifetimeSpend = customers.reduce((sum, item) => sum + Number(item.totalSpent || 0), 0);
  const returningCount = customers.filter((item) => item.orderCount > 1).length;

  return (
    <>
      <PageIntro
        eyebrow="Relationships"
        title="Customers"
        description="Customer accounts and order totals from Supabase."
        action={
          <button
            onClick={onExport}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export customers
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Customers
          </p>
          <p className="mt-0.5 font-display text-lg font-black text-slate-900 tabular-nums">
            {customers.length}
          </p>
        </div>
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 shadow-2xs">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-violet-700">
            Repeat Buyers
          </p>
          <p className="mt-0.5 font-display text-lg font-black text-violet-900 tabular-nums">
            {returningCount}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 shadow-2xs">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-700">
            Total Customer Spend
          </p>
          <p className="mt-0.5 font-display text-lg font-black text-emerald-900 tabular-nums">
            {money(totalLifetimeSpend)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Customer</th>
                <th className="py-2.5">Phone/email</th>
                <th className="py-2.5">Orders</th>
                <th className="py-2.5">Spent</th>
                <th className="py-2.5">Last order</th>
                <th className="py-2.5 pr-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && !customers.length
                ? Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2.5">
                        <div className="h-4 w-32 rounded-lg bg-slate-200/80 animate-shimmer" />
                      </td>
                      <td className="py-2.5">
                        <div className="h-4 w-40 rounded-lg bg-slate-200/80 animate-shimmer" />
                      </td>
                      <td className="py-2.5">
                        <div className="h-4 w-10 rounded-lg bg-slate-200/70 animate-shimmer" />
                      </td>
                      <td className="py-2.5">
                        <div className="h-4 w-16 rounded-lg bg-slate-200/80 animate-shimmer" />
                      </td>
                      <td className="py-2.5">
                        <div className="h-4 w-24 rounded-lg bg-slate-200/70 animate-shimmer" />
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <div className="ml-auto h-7 w-8 rounded-lg bg-slate-200/70 animate-shimmer" />
                      </td>
                    </tr>
                  ))
                : customers.map((customer) => {
                    const initials = customer.name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <tr
                        key={customer.id}
                        className="group transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 font-mono text-[11px] font-black text-[#D9232D] ring-1 ring-red-100">
                              {initials || 'CU'}
                            </span>
                            <div>
                              <p className="text-xs font-extrabold text-slate-900">{customer.name}</p>
                              <span className="inline-block text-[10px] font-bold text-slate-400">
                                {customer.status}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-[11.5px] font-medium text-slate-600">
                          {customer.email || customer.phone || '—'}
                        </td>
                        <td className="py-2.5 font-extrabold text-slate-800 tabular-nums">
                          {customer.orderCount}
                        </td>
                        <td className="py-2.5 font-black text-slate-900 tabular-nums">
                          {money(customer.totalSpent)}
                        </td>
                        <td className="py-2.5 text-[11px] font-medium text-slate-500">
                          {dateLabel(customer.lastOrder)}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => onSelect(customer)}
                            aria-label={`View ${customer.name} profile`}
                            title={`View ${customer.name} profile`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:border-red-200 hover:bg-red-50 hover:text-[#D9232D]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        {!isLoading && !customers.length && (
          <p className="p-10 text-center text-xs font-semibold text-slate-400">No customers found</p>
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
    const syncAdminSettings = () =>
      Promise.all([
        loadAdminSettings().then((result) => {
          if (result.data) setSettings((current) => ({ ...current, ...result.data }));
        }),
        supabase?.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email || '')) ?? Promise.resolve(),
      ]);
    void syncAdminSettings();
    return subscribePullToRefresh(syncAdminSettings);
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
            className="banner-cta-shine inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#D9232D] px-4 py-2 text-[11px] font-extrabold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-[#D9232D]">
              <Store className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Store information</h3>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Store identity and catalog context for this workspace.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            <p className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <span className="font-semibold text-slate-500">Store name</span>
              <b className="font-extrabold text-slate-900">Rofik Godi Centre</b>
            </p>
            <p className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <span className="font-semibold text-slate-500">Currency</span>
              <b className="font-extrabold text-slate-900">INR · ₹</b>
            </p>
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-500">Active products</span>
              <b className="font-extrabold text-slate-900 tabular-nums">{productCount}</b>
            </p>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Payment settings</h3>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Payment provider credentials remain in secure environment configuration.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11.5px]">
            <b className="font-extrabold text-slate-900">Current checkout</b>
            <p className="mt-1 leading-relaxed text-slate-500">
              Payment status and verification are managed on each order. This admin panel never
              stores or displays secret payment keys.
            </p>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Delivery settings</h3>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Fulfillment choices currently supported by the database.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-blue-200/70 bg-blue-50/70 p-3 text-xs">
            <span className="min-w-0">
              <b className="block font-extrabold text-slate-900">Store pickup</b>
              <small className="mt-0.5 block text-[11px] font-medium text-blue-700">
                Pickup-only orders are enabled.
              </small>
            </span>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 shadow-2xs">
              Active
            </span>
          </div>
          <p className="mt-2.5 text-[10px] leading-relaxed text-slate-400">
            Shipping address and courier delivery are not part of the current order schema.
          </p>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Notifications</h3>
              <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
                Configure real-time alerts and storefront operational toggles.
              </p>
            </div>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {Object.entries(settings).map(([key, value]) => (
              <label
                key={key}
                className="flex min-h-9 cursor-pointer items-center justify-between gap-4 py-2 text-xs font-extrabold text-slate-800"
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
                  className="h-4 w-4 shrink-0 rounded accent-[#D9232D]"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-2xs sm:p-5">
          <h3 className="font-display text-xs font-black text-slate-900 sm:text-sm">Admin profile</h3>
          <p className="mt-0.5 text-[10.5px] font-medium text-slate-500">
            Signed-in Supabase administrator.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="min-w-0 flex-1">
              <b className="block break-all text-xs font-extrabold text-slate-900">
                {adminEmail || 'Loading account…'}
              </b>
              <small className="mt-0.5 block text-[10px] font-medium text-slate-400">
                Access is verified through the admin_users role.
              </small>
            </div>
            <button
              onClick={onSignOut}
              className="min-h-9 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:border-red-200 hover:bg-red-50 hover:text-[#D9232D]"
            >
              Logout
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <h3 className="font-display text-xs font-black text-amber-950 sm:text-sm">Security</h3>
          </div>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-amber-900">
            Use a unique admin email, keep email confirmation enabled, and require MFA for
            administrator accounts in Supabase Auth settings. Never place a Supabase secret key in
            browser code.
          </p>
        </section>
      </div>
    </>
  );
}

