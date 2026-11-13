import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  MessageCircle,
  Package,
  RotateCcw,
  Settings,
  ShieldAlert,
  Star,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  deleteMyNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/supabaseCustomer';
import { getNotificationOrderNumber } from '../lib/orderPresentation';
import { listMyOrders } from '../lib/supabaseOrders';
import type { CustomerOrderRecord, Product } from '../types';
import { OrderNotificationDetails } from './OrderNotificationDetails';
import { CouponDetailsView } from './CouponDetailsView';
import { loadCustomerCouponOffers, type CustomerCouponOffer } from '../lib/supabaseCoupons';
import { getCouponOfferForNotification, isCouponNotification } from '../lib/couponDisplay';
import { NewProductNotificationDetails } from './NewProductNotificationDetails';
import { SupportNotificationDetails } from './SupportNotificationDetails';
import {
  getCustomerNotificationCategory,
  getNotificationRowSurfaceClass,
  getSupportRequestIdFromNotification,
  isSupportNotification,
  matchesCustomerNotificationFilter,
  type CustomerNotificationFilter,
} from '../lib/notificationCategory';
import {
  isNotificationEnabledByPreferences,
  readCustomerAppPreferences,
  saveCustomerAppPreferences,
  type CustomerNotificationPreferences,
} from '../lib/customerPreferences';
import {
  readCustomerNotificationCache,
  writeCustomerNotificationCache,
  type CachedCustomerNotification,
} from '../lib/localCache';
import { getNotificationTargetPath } from '../lib/notificationTarget';

type NotificationItem = CachedCustomerNotification & {
  orderNumber?: string | null;
  orderRecord?: CustomerOrderRecord | null;
};

const readCachedNotificationItems = (userId: string): NotificationItem[] =>
  readCustomerNotificationCache(userId).map((item) => ({
    ...item,
    orderNumber: getNotificationOrderNumber(`${item.title} ${item.body} ${item.action_url || ''}`),
    orderRecord: null,
  }));

type NotificationFilter = CustomerNotificationFilter;
type NotificationPointerGesture = {
  notificationId: string;
  pointerId: number;
  startX: number;
  startY: number;
  timerId: number | null;
  revealed: boolean;
};

const timeAgo = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Kolkata',
});

const getNotificationDayGroup = (value: string): 'Today' | 'Earlier' => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  return dayKeyFormatter.format(date) === dayKeyFormatter.format(new Date()) ? 'Today' : 'Earlier';
};

const iconFor = (item: NotificationItem) => {
  if (isSupportNotification(item)) return <MessageCircle className="h-5 w-5" aria-hidden="true" />;
  const value = item.kind.toLowerCase();
  if (value.includes('security')) return <ShieldAlert className="h-5 w-5" aria-hidden="true" />;
  if (value.includes('order') || value.includes('pickup')) return <Truck className="h-5 w-5" aria-hidden="true" />;
  if (value.includes('offer') || value.includes('promo') || value.includes('coupon')) return <Tag className="h-5 w-5" aria-hidden="true" />;
  if (value.includes('review')) return <Star className="h-5 w-5" aria-hidden="true" />;
  if (value.includes('arrival') || value.includes('product')) return <Package className="h-5 w-5" aria-hidden="true" />;
  return <Bell className="h-5 w-5" aria-hidden="true" />;
};

const toneFor = (item: NotificationItem) => {
  if (isSupportNotification(item)) return 'bg-rose-100/80 text-[#D9232D]';
  const value = item.kind.toLowerCase();
  if (value.includes('security')) return 'bg-amber-100/70 text-amber-700';
  if (value.includes('order') || value.includes('pickup')) return 'bg-rose-100/80 text-[#D9232D]';
  if (value.includes('offer') || value.includes('promo') || value.includes('coupon')) return 'bg-rose-100/80 text-[#D9232D]';
  if (value.includes('review')) return 'bg-amber-100/70 text-amber-600';
  if (value.includes('arrival') || value.includes('product')) return 'bg-purple-100/70 text-purple-700';
  return 'bg-slate-100 text-slate-700';
};

export function NotificationsView({
  userId,
  isGuest,
  onBack,
  onNotificationsChanged,
  onOpenShop,
  onOpenProduct,
  products = [],
  onOpenMyOrders,
  onOpenSupportRequest,
  onOpenContactSupport,
  onOpenActionUrl,
  onBuyAgain,
  settingsRouteOpen = false,
  onOpenSettingsRoute,
  onCloseSettingsRoute,
}: {
  userId: string;
  isGuest: boolean;
  onBack: () => void;
  onNotificationsChanged?: () => void;
  settingsRouteOpen?: boolean;
  onOpenSettingsRoute?: () => void;
  onCloseSettingsRoute?: () => void;
  onOpenShop?: () => void;
  onOpenProduct?: (product: Product) => void;
  products?: Product[];
  onOpenMyOrders?: (orderSlug?: string) => void;
  onOpenSupportRequest?: (requestId: string) => void;
  onOpenContactSupport?: () => void;
  onOpenActionUrl?: (path: string) => void;
  onBuyAgain?: (order: CustomerOrderRecord) => Promise<{ error?: string }>;
}) {
  const [filter, setFilter] = useState<NotificationFilter>('All');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [autoBuyAgain] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('buyAgain') === '1');
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [couponOffer, setCouponOffer] = useState<CustomerCouponOffer | null>(null);
  const [couponDetailsLoading, setCouponDetailsLoading] = useState(false);
  const [couponDetailsError, setCouponDetailsError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(() => readCustomerAppPreferences(userId).notifications);
  const [items, setItems] = useState<NotificationItem[]>(() => (isGuest ? [] : readCachedNotificationItems(userId)));
  const [itemsOwnerId, setItemsOwnerId] = useState(userId);
  const [loading, setLoading] = useState(() => !isGuest && readCustomerNotificationCache(userId).length === 0);
  const [orderLookupReady, setOrderLookupReady] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealedDeleteId, setRevealedDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const liveNotificationIdsRef = useRef(new Set<string>());
  const pointerGestureRef = useRef<NotificationPointerGesture | null>(null);
  const suppressRowClickRef = useRef(false);
  const handledOrderDeepLinkRef = useRef('');

  useEffect(() => {
    setSelectedNotification(null);
    setFilter('All');
    setUnreadOnly(false);
    setRevealedDeleteId(null);
    setNotificationPreferences(readCustomerAppPreferences(userId).notifications);
    const gesture = pointerGestureRef.current;
    if (gesture?.timerId !== null && gesture?.timerId !== undefined) window.clearTimeout(gesture.timerId);
    pointerGestureRef.current = null;
    suppressRowClickRef.current = false;
  }, [userId, isGuest]);

  useEffect(() => () => {
    const gesture = pointerGestureRef.current;
    if (gesture?.timerId !== null && gesture?.timerId !== undefined) window.clearTimeout(gesture.timerId);
  }, []);

  useEffect(() => {
    let active = true;
    setOrderLookupReady(isGuest || !userId);
    if (isGuest || !userId) {
      setItems([]);
      setItemsOwnerId(userId);
      setLoadError('');
      setLoading(false);
      setOrderLookupReady(true);
      return () => { active = false; };
    }
    setOrderLookupReady(false);
    liveNotificationIdsRef.current.clear();
    const cachedRows = readCachedNotificationItems(userId);
    setItemsOwnerId(userId);
    setItems(cachedRows);
    setLoadError('');
    setLoading(cachedRows.length === 0);
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      if (cachedRows.length === 0) {
        setLoadError('The request is taking too long. Check your connection and try again.');
        setLoading(false);
      }
      setOrderLookupReady(true);
    }, 15000);
    void Promise.all([listMyNotifications(userId), listMyOrders(userId)]).then(([rows, orders]) => {
      if (!active) return;
      window.clearTimeout(timeoutId);
      const ordersByNumber = new Map(orders.map((order) => [order.order_number.toUpperCase(), order]));
      const enrichedRows = (rows as NotificationItem[]).map((item) => {
        const orderNumber = getNotificationOrderNumber(`${item.title} ${item.body} ${item.action_url || ''}`);
        const orderRecord = orderNumber ? ordersByNumber.get(orderNumber.toUpperCase()) || null : null;
        const firstProductImage = orderRecord?.order_items.find((orderItem) => orderItem.image_url)?.image_url;
        return { ...item, orderNumber, orderRecord, image_url: item.image_url || firstProductImage || null };
      });
      setItems((current) => {
        const byId = new Map<string, NotificationItem>(enrichedRows.map((item) => [item.id, item] as const));
        for (const item of current) {
          if (liveNotificationIdsRef.current.has(item.id) && !byId.has(item.id)) byId.set(item.id, item);
        }
        return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 50);
      });
    }).catch((error) => {
      window.clearTimeout(timeoutId);
      if (active && cachedRows.length === 0) setLoadError(error instanceof Error ? error.message : 'Your notifications could not be loaded.');
    }).finally(() => {
      window.clearTimeout(timeoutId);
      if (active) {
        setLoading(false);
        setOrderLookupReady(true);
      }
    });
    return () => { active = false; window.clearTimeout(timeoutId); };
  }, [userId, isGuest, loadAttempt]);

  useEffect(() => {
    if (isGuest || !userId || !supabase) return;
    const notificationClient = supabase;
    const channel = notificationClient
      .channel(`notifications-view-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const row = payload.new as CachedCustomerNotification;
        if (!row?.id || typeof row.title !== 'string' || typeof row.body !== 'string' || typeof row.created_at !== 'string') return;
        liveNotificationIdsRef.current.add(row.id);
        const orderNumber = getNotificationOrderNumber(`${row.title} ${row.body} ${row.action_url || ''}`);
        const incoming: NotificationItem = { ...row, orderNumber, orderRecord: null };
        setItems((current) => {
          if (current.some((item) => item.id === incoming.id)) return current;
          return [incoming, ...current].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 50);
        });
      })
      .subscribe();
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') setLoadAttempt((attempt) => attempt + 1);
    };
    window.addEventListener('focus', syncWhenVisible);
    document.addEventListener('visibilitychange', syncWhenVisible);
    return () => {
      window.removeEventListener('focus', syncWhenVisible);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      void notificationClient.removeChannel(channel);
    };
  }, [userId, isGuest]);

  useEffect(() => {
    if (isGuest || !userId || itemsOwnerId !== userId) return;
    writeCustomerNotificationCache(userId, items);
  }, [items, itemsOwnerId, isGuest, userId]);

  useEffect(() => {
    let active = true;
    if (!selectedNotification || !isCouponNotification(selectedNotification)) {
      setCouponOffer(null);
      setCouponDetailsError('');
      setCouponDetailsLoading(false);
      return () => { active = false; };
    }
    setCouponOffer(null);
    setCouponDetailsError('');
    setCouponDetailsLoading(true);
    void loadCustomerCouponOffers().then(({ data, error }) => {
      if (!active) return;
      const matchedOffer = getCouponOfferForNotification(selectedNotification, data);
      setCouponOffer(matchedOffer);
      setCouponDetailsError(error || (matchedOffer ? '' : 'This coupon is no longer active or its details are unavailable.'));
    }).catch(() => {
      if (active) setCouponDetailsError('Coupon details could not be loaded. Please try again.');
    }).finally(() => {
      if (active) setCouponDetailsLoading(false);
    });
    return () => { active = false; };
  }, [selectedNotification]);

  const enabledItems = useMemo(
    () => items.filter((item) => isNotificationEnabledByPreferences(notificationPreferences, item)),
    [items, notificationPreferences],
  );
  const categoryItems = useMemo(
    () => enabledItems.filter((item) => matchesCustomerNotificationFilter(item, filter)),
    [enabledItems, filter],
  );
  const visible = useMemo(
    () => (unreadOnly ? categoryItems.filter((item) => !item.read_at) : categoryItems),
    [categoryItems, unreadOnly],
  );
  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];
    for (const item of visible) {
      if (getNotificationDayGroup(item.created_at) === 'Today') {
        today.push(item);
      } else {
        earlier.push(item);
      }
    }
    return [
      { label: 'Today' as const, items: today },
      { label: 'Earlier' as const, items: earlier },
    ].filter((group) => group.items.length > 0);
  }, [visible]);

  const announcedProduct = useMemo(() => {
    if (!selectedNotification) return null;
    const kind = selectedNotification.kind.toLowerCase();
    const isProductArrival = kind.includes('product') || kind.includes('arrival') || /\/product\//i.test(selectedNotification.action_url || '');
    if (!isProductArrival) return null;
    const actionPath = selectedNotification.action_url || '';
    let slug = '';
    try { slug = new URL(actionPath, window.location.origin).pathname.split('/').filter(Boolean).at(-1) || ''; } catch { /* Ignore malformed action URLs. */ }
    const byLink = products.find((product) => product.slug === slug || product.id === slug);
    if (byLink) return byLink;
    const announcementText = `${selectedNotification.title} ${selectedNotification.body}`.toLowerCase();
    return products.find((product) => announcementText.includes(product.title.toLowerCase())) || null;
  }, [selectedNotification, products]);

  const counts = useMemo(() => ({
    All: enabledItems.length,
    Orders: enabledItems.filter((item) => getCustomerNotificationCategory(item) === 'Orders').length,
    Offers: enabledItems.filter((item) => getCustomerNotificationCategory(item) === 'Offers').length,
    Support: enabledItems.filter((item) => getCustomerNotificationCategory(item) === 'Support').length,
    System: enabledItems.filter((item) => getCustomerNotificationCategory(item) === 'System').length,
  }), [enabledItems]);
  const totalUnreadCount = useMemo(() => enabledItems.filter((item) => !item.read_at).length, [enabledItems]);
  const categoryUnreadCount = useMemo(() => categoryItems.filter((item) => !item.read_at).length, [categoryItems]);
  const hasUnreadSupport = enabledItems.some((item) => !item.read_at && getCustomerNotificationCategory(item) === 'Support');

  const openNotification = useCallback((item: NotificationItem) => {
    setSelectedNotification(item);
    if (!item.read_at && !isGuest) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read_at: readAt } : entry)));
      void markNotificationRead(item.id, userId).then(() => onNotificationsChanged?.());
    }
  }, [isGuest, onNotificationsChanged, userId]);

  const handleMarkAllRead = async () => {
    if (isGuest || markingAllRead || totalUnreadCount === 0) return;
    const readAt = new Date().toISOString();
    const previousItems = items;
    setDeleteError('');
    setMarkingAllRead(true);
    setItems((current) => current.map((entry) => (entry.read_at ? entry : { ...entry, read_at: readAt })));
    try {
      const result = await markAllNotificationsRead(userId);
      if (supabase && result?.error) {
        setItems(previousItems);
        setDeleteError('Could not mark notifications as read. Please try again.');
        return;
      }
      onNotificationsChanged?.();
    } catch {
      if (supabase) {
        setItems(previousItems);
        setDeleteError('Could not mark notifications as read. Please try again.');
      }
    } finally {
      setMarkingAllRead(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedNotificationId = params.get('notification');
    const requestedOrder = getNotificationOrderNumber(params.get('order') || '');
    if ((!requestedOrder && !requestedNotificationId) || loading) return;
    if ((requestedOrder || requestedNotificationId) && !orderLookupReady) return;
    const deepLinkKey = requestedNotificationId ? `${userId}:notification:${requestedNotificationId}` : `${userId}:order:${requestedOrder}`;
    if (handledOrderDeepLinkRef.current === deepLinkKey) return;
    handledOrderDeepLinkRef.current = deepLinkKey;
    const matchingByOrder = requestedOrder
      ? items.find((item) => item.orderNumber?.toUpperCase() === requestedOrder)
      : null;
    const orderSlug = matchingByOrder?.orderRecord?.order_slug;
    if (orderSlug && /^[0-9a-f]{32}$/i.test(orderSlug) && onOpenMyOrders) {
      if (matchingByOrder) openNotification(matchingByOrder);
      onOpenMyOrders(orderSlug.toLowerCase());
      return;
    }
    if (requestedNotificationId) {
      const matchingById = items.find((item) => item.id === requestedNotificationId);
      if (matchingById) {
        const notificationOrderSlug = matchingById.orderRecord?.order_slug;
        if (notificationOrderSlug && /^[0-9a-f]{32}$/i.test(notificationOrderSlug) && onOpenMyOrders) {
          openNotification(matchingById);
          onOpenMyOrders(notificationOrderSlug.toLowerCase());
          return;
        }
        const notificationKind = matchingById.kind.toLowerCase();
        const isProductNotification = notificationKind.includes('product') || notificationKind.includes('arrival');
        const actionPath = getNotificationTargetPath(matchingById.action_url);
        if (isProductNotification && /^\/shop\/products\/[^/?#]+/i.test(actionPath)) {
          openNotification(matchingById);
          onOpenActionUrl?.(actionPath);
          return;
        }
        if (matchingById.action_url && onOpenActionUrl) {
          openNotification(matchingById);
          onOpenActionUrl(actionPath);
          return;
        }
        openNotification(matchingById);
      }
      return;
    }
    if (matchingByOrder) {
      openNotification(matchingByOrder);
      return;
    }
    const createdAt = new Date().toISOString();
    setSelectedNotification({
      id: `order-deep-link-${requestedOrder}`,
      kind: 'order',
      title: 'Order update',
      body: `Order #${requestedOrder}`,
      action_url: null,
      image_url: null,
      read_at: createdAt,
      created_at: createdAt,
      expires_at: null,
      orderNumber: requestedOrder,
      orderRecord: null,
    });
  }, [items, loading, onOpenActionUrl, onOpenMyOrders, openNotification, orderLookupReady, userId]);

  const handleNotificationRowClick = (item: NotificationItem) => {
    if (suppressRowClickRef.current) {
      suppressRowClickRef.current = false;
      return;
    }
    if (revealedDeleteId === item.id) {
      setRevealedDeleteId(null);
      return;
    }
    setRevealedDeleteId(null);
    openNotification(item);
  };

  const startNotificationGesture = (event: React.PointerEvent<HTMLButtonElement>, item: NotificationItem) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const previous = pointerGestureRef.current;
    if (previous?.timerId !== null && previous?.timerId !== undefined) window.clearTimeout(previous.timerId);
    const gesture: NotificationPointerGesture = {
      notificationId: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timerId: null,
      revealed: false,
    };
    gesture.timerId = window.setTimeout(() => {
      if (pointerGestureRef.current !== gesture) return;
      gesture.revealed = true;
      setRevealedDeleteId(item.id);
    }, 520);
    pointerGestureRef.current = gesture;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture may be unavailable in a test or older browser. */ }
  };

  const moveNotificationGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (gesture.timerId !== null) window.clearTimeout(gesture.timerId);
      gesture.timerId = null;
      return;
    }
    if (Math.abs(deltaX) > 10 && gesture.timerId !== null) {
      window.clearTimeout(gesture.timerId);
      gesture.timerId = null;
    }
    if (deltaX < -44) {
      gesture.revealed = true;
      setRevealedDeleteId(gesture.notificationId);
    } else if (deltaX > 44 && revealedDeleteId === gesture.notificationId) {
      gesture.revealed = true;
      setRevealedDeleteId(null);
    }
  };

  const finishNotificationGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = pointerGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.timerId !== null) window.clearTimeout(gesture.timerId);
    if (gesture.revealed) {
      suppressRowClickRef.current = true;
      window.setTimeout(() => { suppressRowClickRef.current = false; }, 250);
    }
    pointerGestureRef.current = null;
  };

  const handleDeleteNotification = async (event: React.MouseEvent, item: NotificationItem) => {
    event.stopPropagation();
    setDeleteError('');
    setDeletingId(item.id);
    try {
      const result = await deleteMyNotification(item.id, userId);
      if (supabase && result.error) {
        setDeleteError('Could not delete this notification. Please try again.');
        return;
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setRevealedDeleteId(null);
      onNotificationsChanged?.();
    } catch {
      if (supabase) {
        setDeleteError('Could not delete this notification. Please try again.');
      } else {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setRevealedDeleteId(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (showSettings || settingsRouteOpen) {
    return (
      <NotificationSettingsView
        userId={userId}
        onBack={settingsRouteOpen && onCloseSettingsRoute ? onCloseSettingsRoute : () => setShowSettings(false)}
        onSaved={(preferences) => setNotificationPreferences(preferences)}
      />
    );
  }

  if (selectedNotification) {
    // Only ticket-linked notifications (action_url /support/<id>) open the ticket
    // details screen; admin-facing "New customer support request" notifications
    // point at /admin/activity and fall through to the generic details view.
    if (isSupportNotification(selectedNotification) && getSupportRequestIdFromNotification(selectedNotification)) {
      return (
        <SupportNotificationDetails
          requestId={getSupportRequestIdFromNotification(selectedNotification)}
          userId={userId}
          isAuthenticated={!isGuest}
          notificationBody={selectedNotification.body}
          notificationCreatedAt={selectedNotification.created_at}
          isUnread={!selectedNotification.read_at}
          onBack={() => setSelectedNotification(null)}
          onViewConversation={(requestId) => {
            setSelectedNotification(null);
            onOpenSupportRequest?.(requestId);
          }}
          onContactSupport={() => {
            setSelectedNotification(null);
            onOpenContactSupport?.();
          }}
        />
      );
    }
    if (selectedNotification.orderNumber) {
      return (
        <OrderNotificationDetails
          key={selectedNotification.orderNumber}
          userId={userId}
          orderNumber={selectedNotification.orderNumber}
          initialOrder={selectedNotification.orderRecord}
          notificationTitle={selectedNotification.title}
          notificationBody={selectedNotification.body}
          onBuyAgain={onBuyAgain}
          autoBuyAgain={autoBuyAgain}
          onBack={() => setSelectedNotification(null)}
          onOpenMyOrders={(orderSlug) => {
            setSelectedNotification(null);
            onOpenMyOrders?.(orderSlug);
          }}
        />
      );
    }
    if (isCouponNotification(selectedNotification)) {
      if (couponOffer) {
        return (
          <CouponDetailsView
            key={couponOffer.code}
            offer={couponOffer}
            onBack={() => setSelectedNotification(null)}
            onShopNow={() => {
              setSelectedNotification(null);
              onOpenShop?.();
            }}
          />
        );
      }
      return (
        <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] pb-[max(2rem,env(safe-area-inset-bottom))] font-sans text-slate-900">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-3 px-3 py-2 sm:px-5">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                aria-label="Back to notifications"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="truncate text-[19px] sm:text-[21px] font-extrabold tracking-tight text-slate-900">
                Coupon Details
              </h1>
            </div>
          </header>
          <section className="mx-auto max-w-2xl px-4 py-6 sm:px-5">
            {couponDetailsLoading ? (
              <div className="space-y-4 rounded-3xl border border-slate-200/85 bg-white p-6 shadow-xs" aria-busy="true" aria-label="Loading offer details">
                <div className="skeleton-shimmer mx-auto h-14 w-14 rounded-2xl bg-rose-100/70" />
                <div className="skeleton-shimmer mx-auto h-5 w-48 rounded-lg bg-slate-200/80" />
                <div className="skeleton-shimmer mx-auto h-4 w-64 max-w-full rounded bg-slate-200/65" />
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200/85 bg-white px-6 py-10 text-center shadow-[0_8px_24px_-12px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#D9232D]">
                  <Tag className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-900">Offer details unavailable</h2>
                <p role="status" className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  {couponDetailsError || 'This coupon is no longer active.'}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenShop?.()}
                  className="banner-cta-shine group/cta mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E51E35] to-[#B91822] px-6 py-3 text-sm font-extrabold text-white shadow-md hover:brightness-105 hover:shadow-lg active:scale-95"
                >
                  <span>Shop Now</span>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                </button>
              </div>
            )}
          </section>
        </main>
      );
    }
    if (announcedProduct) {
      return (
        <NewProductNotificationDetails
          product={announcedProduct}
          createdAt={selectedNotification.created_at}
          onBack={() => setSelectedNotification(null)}
          onViewProduct={(product) => onOpenProduct?.(product)}
        />
      );
    }
    const detailCategory = getCustomerNotificationCategory(selectedNotification);
    return (
      <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] pb-[max(2rem,env(safe-area-inset-bottom))] font-sans text-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-3 px-3 py-2 sm:px-5">
            <button
              type="button"
              onClick={() => setSelectedNotification(null)}
              aria-label="Back to notifications"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="truncate text-[19px] sm:text-[21px] font-extrabold tracking-tight text-slate-900">
              Notification Details
            </h1>
          </div>
        </header>
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-5 sm:py-6">
          <section className="rounded-3xl border border-slate-200/85 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-6">
            {selectedNotification.image_url && (
              <img
                src={selectedNotification.image_url}
                alt={selectedNotification.title}
                referrerPolicy="no-referrer"
                className="mb-4 max-h-[260px] w-full rounded-2xl border border-slate-100 object-cover"
              />
            )}
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneFor(selectedNotification)}`}>
                {iconFor(selectedNotification)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <span className="font-bold text-[#D9232D]">{detailCategory}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <time dateTime={selectedNotification.created_at} className="tabular-nums">
                    {timeAgo(selectedNotification.created_at)}
                  </time>
                </p>
                <h2 className="mt-1 text-[19px] sm:text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">
                  {selectedNotification.title}
                </h2>
              </div>
            </div>
            <p className="mt-4 border-t border-slate-100 pt-4 text-[14px] leading-relaxed text-slate-600">
              {selectedNotification.body}
            </p>
            {selectedNotification.action_url && (
              <button
                type="button"
                onClick={() => onOpenActionUrl?.(getNotificationTargetPath(selectedNotification.action_url))}
                className="banner-cta-shine group/cta mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E51E35] to-[#B91822] px-5 text-sm font-extrabold text-white shadow-md hover:brightness-105 hover:shadow-lg active:scale-[0.98]"
              >
                <span>View details</span>
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
              </button>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] pb-[max(2rem,env(safe-area-inset-bottom))] text-slate-900 font-sans">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-2.5 px-3 py-2 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-black tracking-tight text-slate-900 leading-tight">
              Notifications
            </h1>
            {!isGuest && !loading && (
              <p className="text-[11.5px] font-semibold text-slate-500 tabular-nums">
                {totalUnreadCount > 0 ? (
                  <span className="text-[#D9232D]">{totalUnreadCount} unread</span>
                ) : (
                  'All caught up'
                )}
              </p>
            )}
          </div>
          {!isGuest && totalUnreadCount > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={markingAllRead}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-[#D9232D] transition-colors hover:bg-rose-50 active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => (onOpenSettingsRoute ? onOpenSettingsRoute() : setShowSettings(true))}
            aria-label="Notification settings"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200/85 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto w-full max-w-2xl border-t border-slate-100 px-3 py-2 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Notification categories"
              className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/90 p-1"
            >
              {(['All', 'Orders', 'Offers', 'Support', 'System'] as NotificationFilter[]).map((name) => {
                const isActive = filter === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setFilter(name);
                      setRevealedDeleteId(null);
                    }}
                    className={`relative inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#D9232D] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{name}</span>
                    <span className={`text-[10.5px] tabular-nums ${isActive ? 'text-[#D9232D]/75' : 'text-slate-400'}`}>
                      {counts[name]}
                    </span>
                    {name === 'Support' && hasUnreadSupport && (
                      <span
                        aria-label="Unread support reply"
                        className="h-1.5 w-1.5 rounded-full bg-[#D9232D]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {!isGuest && (
              <button
                type="button"
                onClick={() => {
                  setUnreadOnly((current) => !current);
                  setRevealedDeleteId(null);
                }}
                aria-pressed={unreadOnly}
                className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap sm:self-auto ${
                  unreadOnly
                    ? 'border-rose-200 bg-rose-50 text-[#D9232D]'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Unread only</span>
                <span className={`text-[10.5px] tabular-nums ${unreadOnly ? 'text-[#D9232D]/80' : 'text-slate-400'}`}>
                  {categoryUnreadCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-3 pt-3 sm:px-5">

        {deleteError && (
          <p role="alert" className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
            {deleteError}
          </p>
        )}

        {loading ? (
          <NotificationsSkeleton />
        ) : loadError ? (
          <section role="alert" className="mt-4 rounded-3xl border border-rose-200 bg-white px-5 py-9 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#D9232D]">
              <BellOff className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-base font-extrabold text-slate-900">Notifications could not be loaded</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              className="banner-cta-shine mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D9232D] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:brightness-105 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Try again</span>
            </button>
          </section>
        ) : visible.length === 0 ? (
          items.length > 0 && enabledItems.length === 0 ? (
            <section className="mt-4 rounded-3xl border border-amber-200/90 bg-white px-5 py-9 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <BellOff className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-[15px] font-extrabold text-slate-900">Notifications are turned off</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-600">
                Every notification category is muted in your settings, so nothing appears here. Turn them back on to see order updates, offers and replies again.
              </p>
              <button
                type="button"
                onClick={() => (onOpenSettingsRoute ? onOpenSettingsRoute() : setShowSettings(true))}
                className="banner-cta-shine mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:brightness-105 active:scale-95"
              >
                <span>Open notification settings</span>
              </button>
            </section>
          ) : enabledItems.length > 0 ? (
            <section className="mt-4 rounded-3xl border border-slate-200/85 bg-white px-5 py-10 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-[15px] font-extrabold text-slate-900">
                {unreadOnly ? 'No unread notifications' : `No ${filter.toLowerCase()} notifications`}
              </h2>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                {unreadOnly
                  ? 'Every notification in this view has already been read.'
                  : 'Try switching categories or showing all notifications.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter('All');
                  setUnreadOnly(false);
                }}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset filters</span>
              </button>
            </section>
          ) : (
            <section className="mt-4 rounded-3xl border border-slate-200/85 bg-white px-5 py-10 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-[15px] font-extrabold text-slate-900">
                {isGuest ? 'Sign in to see your notifications' : 'You’re all caught up'}
              </h2>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                {isGuest
                  ? 'Account notifications will appear here after you sign in.'
                  : 'New updates for your account will appear here.'}
              </p>
            </section>
          )
        ) : (
          <div className="mt-4 space-y-5">
            {groupedNotifications.map((group) => (
              <section key={group.label} aria-label={`${group.label} notifications`} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    {group.label}
                  </h2>
                  <span className="text-xs font-semibold tabular-nums text-slate-400">
                    {group.items.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {group.items.map((item) => {
                    const isDeleteRevealed = revealedDeleteId === item.id;
                    const categoryLabel = getCustomerNotificationCategory(item);
                    return (
                      <article
                        key={item.id}
                        className={`relative isolate overflow-hidden rounded-2xl border transition-shadow ${
                          !item.read_at
                            ? 'border-rose-200/90 shadow-[0_6px_18px_-8px_rgba(217,35,45,0.16)]'
                            : 'border-slate-200/85 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)]'
                        }`}
                      >
                        <div
                          style={{ transform: isDeleteRevealed ? 'translateX(-76px)' : 'translateX(0)' }}
                          className={`relative z-10 flex w-full items-center transition-transform duration-200 ${getNotificationRowSurfaceClass(!item.read_at)}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleNotificationRowClick(item)}
                            onPointerDown={(event) => startNotificationGesture(event, item)}
                            onPointerMove={moveNotificationGesture}
                            onPointerUp={finishNotificationGesture}
                            onPointerCancel={finishNotificationGesture}
                            aria-label={`Open notification: ${item.title}. Press and hold or swipe left to reveal delete.`}
                            aria-expanded={isDeleteRevealed}
                            style={{ touchAction: 'pan-y' }}
                            className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3.5 text-left sm:px-4"
                          >
                            <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${toneFor(item)}`}>
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                iconFor(item)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                                <span className={!item.read_at ? 'font-bold text-[#D9232D]' : 'text-slate-600'}>
                                  {categoryLabel}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <time className="tabular-nums text-slate-400" dateTime={item.created_at}>
                                  {timeAgo(item.created_at)}
                                </time>
                                {!item.read_at && (
                                  <>
                                    <span aria-hidden="true" className="text-slate-300">·</span>
                                    <span className="font-bold text-[#D9232D]">Unread</span>
                                  </>
                                )}
                              </div>
                              <h3 className="mt-1 line-clamp-2 text-[14px] font-extrabold leading-snug tracking-tight text-slate-900">
                                {item.title}
                              </h3>
                              <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">
                                {item.body}
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-0.5 pr-2 sm:pr-2.5">
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              aria-label={`Quick delete notification: ${item.title}`}
                              title="Delete notification"
                              onClick={(event) => void handleDeleteNotification(event, item)}
                              className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-rose-100/80 hover:text-[#D9232D] active:scale-95 disabled:cursor-wait disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" aria-hidden="true" />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          aria-label={`Delete notification: ${item.title}`}
                          title="Delete notification"
                          onFocus={() => setRevealedDeleteId(item.id)}
                          onClick={(event) => void handleDeleteNotification(event, item)}
                          className={`absolute inset-y-0 right-0 z-0 flex w-[76px] flex-col items-center justify-center gap-1 bg-[#D9232D] text-white transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-wait disabled:opacity-70 ${
                            isDeleteRevealed ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                          }`}
                        >
                          <Trash2 className="h-5 w-5" />
                          <span className="text-[10px] font-extrabold">Delete</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function NotificationsSkeleton() {
  return (
    <div
      data-testid="notifications-skeleton"
      aria-busy="true"
      aria-label="Loading notifications"
      className="mt-4 space-y-3"
    >
      <div className="flex items-center justify-between px-1">
        <div className="skeleton-shimmer h-3 w-16 rounded bg-slate-200/80" />
        <div className="skeleton-shimmer h-3 w-6 rounded bg-slate-200/70" />
      </div>
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="flex items-start gap-3 rounded-2xl border border-slate-200/85 bg-white p-4 shadow-2xs"
        >
          <div className="skeleton-shimmer h-11 w-11 shrink-0 rounded-2xl bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton-shimmer h-3 w-28 rounded bg-slate-200/70" />
            <div className="skeleton-shimmer h-4 w-3/4 rounded-md bg-slate-200/85" />
            <div className="skeleton-shimmer h-3.5 w-full rounded bg-slate-100" />
          </div>
          <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function NotificationSettingsView({
  userId,
  onBack,
  onSaved,
}: {
  userId: string;
  onBack: () => void;
  onSaved: (preferences: CustomerNotificationPreferences) => void;
}) {
  const [preferences, setPreferences] = useState<CustomerNotificationPreferences>(() => readCustomerAppPreferences(userId).notifications);
  const [saved, setSaved] = useState(false);

  const rows = [
    {
      key: 'offers' as const,
      title: 'Festival Discounts & Coupons',
      description: 'Alerts about seasonal flash sales & discounts',
      icon: <Tag className="h-5 w-5 text-[#D9232D]" />,
      tone: 'bg-rose-50',
    },
    {
      key: 'orderUpdates' as const,
      title: 'Order Status & Tracking',
      description: 'Realtime updates when stitching starts or completes',
      icon: <Truck className="h-5 w-5 text-[#D9232D]" />,
      tone: 'bg-rose-50',
    },
    {
      key: 'workshopAlerts' as const,
      title: 'Support & Workshop Replies',
      description: 'Responses to your support requests',
      icon: <MessageCircle className="h-5 w-5 text-[#D9232D]" />,
      tone: 'bg-rose-50',
    },
    {
      key: 'systemUpdates' as const,
      title: 'Product & Account Updates',
      description: 'New products, profile and service notices',
      icon: <Package className="h-5 w-5 text-purple-600" />,
      tone: 'bg-purple-50',
    },
  ];

  const save = () => {
    const savedPreferences = saveCustomerAppPreferences(userId, { notifications: preferences });
    setPreferences(savedPreferences.notifications);
    setSaved(true);
    onSaved(savedPreferences.notifications);
  };

  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] pb-[max(2rem,env(safe-area-inset-bottom))] text-slate-900 font-sans">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-3 px-3 py-2 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[19px] sm:text-[21px] font-extrabold leading-tight tracking-tight text-slate-900">
              Notification Settings
            </h1>
            <p className="text-[12px] text-slate-500">Choose what appears in your in-app inbox</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-3.5 px-3 pt-4 sm:px-5">
        <section className="flex items-center gap-4 rounded-3xl border border-rose-100 bg-gradient-to-r from-[#FFF1F2] via-white to-[#FFF7F7] p-4 shadow-2xs sm:p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-100/80 text-[#D9232D]">
            <Bell className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold leading-snug text-slate-900">Stay Updated</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600">
              Get important updates about your orders, offers and more.
            </p>
          </div>
        </section>

        <section className="space-y-2.5">
          {rows.map((row) => (
            <article
              key={row.key}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/85 bg-white p-3.5 shadow-2xs sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${row.tone}`}>
                  {row.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14.5px] font-bold text-slate-900">{row.title}</h3>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{row.description}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences[row.key]}
                aria-label={`${row.title} notifications`}
                onClick={() => {
                  setSaved(false);
                  setPreferences({ ...preferences, [row.key]: !preferences[row.key] });
                }}
                className="flex min-h-11 min-w-12 shrink-0 items-center justify-end"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    preferences[row.key] ? 'bg-[#D9232D]' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                      preferences[row.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            </article>
          ))}
        </section>

        {saved && (
          <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-emerald-800">
            Notification preferences saved on this device. They control which categories appear in your in-app inbox.
          </p>
        )}

        <p className="px-1 text-[11px] leading-relaxed text-slate-500">
          These preferences filter your in-app inbox, unread badge, and push notifications. WhatsApp delivery is not affected.
        </p>

        <button
          type="button"
          onClick={save}
          className="banner-cta-shine min-h-12 w-full rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:brightness-105 hover:shadow-md active:scale-[0.98]"
        >
          Save Preferences
        </button>
      </div>
    </main>
  );
}
