import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bell, ChevronRight, Package, Settings, Star, Tag, Truck, Volume2, Moon, Smartphone, Megaphone, TrendingDown, Trash2, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteMyNotification, listMyNotifications, markNotificationRead } from '../lib/supabaseCustomer';
import { getNotificationOrderNumber } from '../lib/orderPresentation';
import { listMyOrders } from '../lib/supabaseOrders';
import type { CustomerOrderRecord } from '../types';
import { OrderNotificationDetails } from './OrderNotificationDetails';
import { CouponDetailsView } from './CouponDetailsView';
import { loadCustomerCouponOffers, type CustomerCouponOffer } from '../lib/supabaseCoupons';
import { getCouponOfferForNotification, isCouponNotification } from '../lib/couponDisplay';
import type { Product } from '../types';
import { NewProductNotificationDetails } from './NewProductNotificationDetails';
import { SupportNotificationDetails } from './SupportNotificationDetails';
import { getCustomerNotificationCategory, getSupportRequestIdFromNotification, matchesCustomerNotificationFilter, getNotificationRowSurfaceClass, isSupportNotification, type CustomerNotificationFilter } from '../lib/notificationCategory';
import { isNotificationEnabledByPreferences, readCustomerAppPreferences } from '../lib/customerPreferences';
import { Skeleton } from './Skeleton';

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  action_url: string | null;
  image_url?: string | null;
  orderNumber?: string | null;
  orderRecord?: CustomerOrderRecord | null;
  read_at: string | null;
  created_at: string;
};

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

const iconFor = (item: NotificationItem) => {
  if (isSupportNotification(item)) return <MessageCircle className="h-5 w-5" />;
  const value = item.kind.toLowerCase();
  if (value.includes('order') || value.includes('pickup')) return <Truck className="h-6 w-6" />;
  if (value.includes('offer') || value.includes('promo') || value.includes('coupon')) return <Tag className="h-6 w-6" />;
  if (value.includes('review')) return <Star className="h-6 w-6" />;
  if (value.includes('arrival') || value.includes('product')) return <Package className="h-6 w-6" />;
  return <Bell className="h-6 w-6" />;
};

const toneFor = (item: NotificationItem) => {
  if (isSupportNotification(item)) return 'bg-rose-50 text-[#D9232D]';
  const value = item.kind.toLowerCase();
  if (value.includes('order') || value.includes('pickup')) return 'bg-red-50 text-red-500';
  if (value.includes('offer') || value.includes('promo') || value.includes('coupon')) return 'bg-rose-50 text-rose-500';
  if (value.includes('review')) return 'bg-amber-50 text-amber-500';
  if (value.includes('arrival') || value.includes('product')) return 'bg-purple-50 text-purple-600';
  return 'bg-blue-50 text-blue-500';
};

export function NotificationsView({ userId, isGuest, onBack, onNotificationsChanged, onOpenShop, onOpenProduct, products = [], onOpenMyOrders, onOpenSupportRequest, onOpenContactSupport }: { userId: string; isGuest: boolean; onBack: () => void; onNotificationsChanged?: () => void; onOpenShop?: () => void; onOpenProduct?: (product: Product) => void; products?: Product[]; onOpenMyOrders?: (orderSlug?: string) => void; onOpenSupportRequest?: (requestId: string) => void; onOpenContactSupport?: () => void }) {
  const [filter, setFilter] = useState<NotificationFilter>('All');
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [couponOffer, setCouponOffer] = useState<CustomerCouponOffer | null>(null);
  const [couponDetailsLoading, setCouponDetailsLoading] = useState(false);
  const [couponDetailsError, setCouponDetailsError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(() => readCustomerAppPreferences(userId).notifications);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(!isGuest);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealedDeleteId, setRevealedDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const pointerGestureRef = useRef<NotificationPointerGesture | null>(null);
  const suppressRowClickRef = useRef(false);

  useEffect(() => {
    setSelectedNotification(null);
    setFilter('All');
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
    if (isGuest || !userId) {
      setItems([]);
      setLoadError('');
      setLoading(false);
      return () => { active = false; };
    }
    setItems([]);
    setLoadError('');
    setLoading(true);
    void Promise.all([listMyNotifications(userId), listMyOrders(userId)]).then(([rows, orders]) => {
      if (!active) return;
      const ordersByNumber = new Map(orders.map((order) => [order.order_number.toUpperCase(), order]));
      const enrichedRows = (rows as NotificationItem[]).map((item) => {
        const orderNumber = getNotificationOrderNumber(`${item.title} ${item.body} ${item.action_url || ''}`);
        const orderRecord = orderNumber ? ordersByNumber.get(orderNumber.toUpperCase()) || null : null;
        const firstProductImage = orderRecord?.order_items.find((orderItem) => orderItem.image_url)?.image_url;
        return { ...item, orderNumber, orderRecord, image_url: item.image_url || firstProductImage || null };
      });
      setItems(enrichedRows);
    }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Your notifications could not be loaded.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
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
      }, () => {
        setLoadAttempt((attempt) => attempt + 1);
      })
      .subscribe();
    return () => { void notificationClient.removeChannel(channel); };
  }, [userId, isGuest]);

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
  const visible = useMemo(() => enabledItems.filter((item) => matchesCustomerNotificationFilter(item, filter)), [enabledItems, filter]);
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
  const hasUnreadSupport = enabledItems.some((item) => !item.read_at && getCustomerNotificationCategory(item) === 'Support');

  const openNotification = (item: NotificationItem) => {
    setSelectedNotification(item);
    if (!item.read_at && !isGuest) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: readAt } : entry));
      void markNotificationRead(item.id, userId).then(() => onNotificationsChanged?.());
    }
  };

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
      if (result.error) {
        setDeleteError('Could not delete this notification. Please try again.');
        return;
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setRevealedDeleteId(null);
      onNotificationsChanged?.();
    } catch {
      setDeleteError('Could not delete this notification. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (showSettings) return <NotificationSettingsView onBack={() => setShowSettings(false)} />;

  if (selectedNotification) {
    if (isSupportNotification(selectedNotification)) return <SupportNotificationDetails
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
    />;
    if (selectedNotification.orderNumber) return <OrderNotificationDetails
      key={selectedNotification.orderNumber}
      userId={userId}
      orderNumber={selectedNotification.orderNumber}
      initialOrder={selectedNotification.orderRecord}
      notificationTitle={selectedNotification.title}
      notificationBody={selectedNotification.body}
      onBack={() => setSelectedNotification(null)}
      onOpenMyOrders={(orderSlug) => {
        setSelectedNotification(null);
        onOpenMyOrders?.(orderSlug);
      }}
    />;
    if (isCouponNotification(selectedNotification)) {
      if (couponOffer) return <CouponDetailsView
        key={couponOffer.code}
        offer={couponOffer}
        onBack={() => setSelectedNotification(null)}
        onShopNow={() => {
          setSelectedNotification(null);
          onOpenShop?.();
        }}
      />;
      return <main className="min-h-screen w-full bg-white font-sans text-slate-800">
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <button onClick={() => setSelectedNotification(null)} aria-label="Back to notifications" className="rounded-full p-1"><ArrowLeft className="h-6 w-6" /></button>
          <h1 className="text-[22px] font-extrabold tracking-tight">Coupon Details</h1>
        </header>
        <section className="mx-auto max-w-xl px-5 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-[#E51E35]"><Tag className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-extrabold text-slate-900">{couponDetailsLoading ? 'Loading offer details…' : 'Offer details unavailable'}</h2>
          {!couponDetailsLoading && <p role="status" className="mt-2 text-sm leading-relaxed text-slate-600">{couponDetailsError || 'This coupon is no longer active.'}</p>}
          {!couponDetailsLoading && <button type="button" onClick={() => onOpenShop?.()} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#E51E35] px-6 py-3.5 text-sm font-extrabold text-white">Shop Now <ChevronRight className="h-4 w-4" /></button>}
        </section>
      </main>;
    }
    if (announcedProduct) return <NewProductNotificationDetails
      product={announcedProduct}
      createdAt={selectedNotification.created_at}
      onBack={() => setSelectedNotification(null)}
      onViewProduct={(product) => onOpenProduct?.(product)}
    />;
    return <main className="min-h-screen w-full bg-white font-sans text-slate-800">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button onClick={() => setSelectedNotification(null)} aria-label="Back to notifications" className="rounded-full p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-[19px] font-extrabold tracking-tight">Notification Details</h1>
      </header>
      <div className="px-4 py-3">
        <section className="rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 p-4">
          {selectedNotification.image_url && <img src={selectedNotification.image_url} alt="" className="mb-3 max-h-[230px] w-full rounded-xl object-cover" />}
          <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${toneFor(selectedNotification)}`}>{iconFor(selectedNotification)}</div>
          <p className="mb-1.5 text-[10px] font-bold text-[#E51E2B]">{timeAgo(selectedNotification.created_at)}</p>
          <h2 className="text-[20px] font-extrabold leading-tight text-slate-900">{selectedNotification.title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{selectedNotification.body}</p>
        </section>
        {selectedNotification.action_url && <a href={selectedNotification.action_url} className="mt-3 flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-[#E51E2B] text-sm font-extrabold text-white">View details <ChevronRight className="ml-2 inline h-4 w-4" /></a>}
      </div>
    </main>;
  }

  return <main className="min-h-screen w-full overflow-x-hidden bg-[#F5F6F8] text-slate-800 font-sans">
    <header className="flex min-h-[62px] items-center gap-3 bg-[#D9232D] px-4 py-3 text-white shadow-sm">
      <button onClick={onBack} aria-label="Go back" className="-ml-1 rounded-full p-1.5 hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
      <div className="min-w-0 flex-1"><h1 className="text-[20px] font-extrabold tracking-tight leading-snug">Notifications</h1></div>
      <button onClick={() => setShowSettings(true)} aria-label="Notification settings" className="rounded-full p-1.5 text-white hover:bg-white/10"><Settings className="h-5 w-5" /></button>
    </header>
    <nav aria-label="Notification categories" className="no-scrollbar flex gap-2 overflow-x-auto bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {(['All', 'Orders', 'Offers', 'Support', 'System'] as NotificationFilter[]).map((name) => <button key={name} onClick={() => { setFilter(name); setRevealedDeleteId(null); }} className={`relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-colors ${filter === name ? 'border-rose-100 bg-rose-100 text-[#D9232D]' : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>{name}<span className={`text-[9px] ${filter === name ? 'text-[#D9232D]/65' : 'text-slate-400'}`}>{counts[name]}</span>{name === 'Support' && hasUnreadSupport && <span aria-label="Unread support reply" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#E51E2B]" />}</button>)}
    </nav>
    {deleteError && <p role="alert" className="mx-4 mt-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">{deleteError}</p>}
    {loading ? <div className="px-4 py-5"><Skeleton kind="list" count={5} /></div> : loadError ? (
      <section role="alert" className="mx-4 mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <h2 className="text-base font-bold text-rose-800">Notifications could not be loaded</h2>
        <p className="mt-1 text-sm text-rose-700">{loadError}</p>
        <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-4 rounded-full bg-rose-700 px-4 py-2 text-xs font-extrabold text-white">Try again</button>
      </section>
    ) : visible.length === 0 ? (
      <section className="mx-4 mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-9 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Bell className="h-5 w-5" /></div>
        <h2 className="mt-3 text-[14px] font-bold text-slate-800">{isGuest ? 'Sign in to see your notifications' : 'You’re all caught up'}</h2>
        <p className="mt-1 text-[12px] text-slate-500">{isGuest ? 'Account notifications will appear here after you sign in.' : 'New updates for your account will appear here.'}</p>
      </section>
    ) : <section className="mx-auto mt-0 w-full max-w-xl space-y-0 bg-white pb-5">
      {visible.map((item) => {
        const isDeleteRevealed = revealedDeleteId === item.id;
        return <article key={item.id} className="relative isolate overflow-hidden border-b border-slate-100">
          <button
            type="button"
            onClick={() => handleNotificationRowClick(item)}
            onPointerDown={(event) => startNotificationGesture(event, item)}
            onPointerMove={moveNotificationGesture}
            onPointerUp={finishNotificationGesture}
            onPointerCancel={finishNotificationGesture}
            aria-label={`Open notification: ${item.title}. Press and hold or swipe left to reveal delete.`}
            aria-expanded={isDeleteRevealed}
            style={{ transform: isDeleteRevealed ? 'translateX(-76px)' : 'translateX(0)', touchAction: 'pan-y' }}
            className={`relative z-10 flex w-full items-center gap-3 px-4 py-4 text-left transition-transform duration-200 ${getNotificationRowSurfaceClass(!item.read_at)}`}
          >
            <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${toneFor(item)}`}>{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : iconFor(item)}{!item.read_at && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#E51E2B]" />}</div>
            <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="line-clamp-2 text-[13px] font-extrabold leading-[1.35] tracking-tight text-slate-900">{item.title}</h2>{!item.read_at && <span aria-label="Unread" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#E51E2B]" />}</div><p className="mt-1 line-clamp-2 text-[11px] leading-[1.45] text-slate-600">{item.body}</p><time className="mt-1.5 block text-[10px] text-slate-400" dateTime={item.created_at}>{timeAgo(item.created_at)}</time></div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
          <button
            type="button"
            disabled={deletingId === item.id}
            aria-label={`Delete notification: ${item.title}`}
            title="Delete notification"
            onFocus={() => setRevealedDeleteId(item.id)}
            onClick={(event) => void handleDeleteNotification(event, item)}
            className={`absolute inset-y-0 right-0 z-0 flex w-[76px] flex-col items-center justify-center gap-1 bg-[#E51E2B] text-white transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-wait disabled:opacity-70 ${isDeleteRevealed ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
          ><Trash2 className="h-5 w-5" /><span className="text-[10px] font-extrabold">Delete</span></button>
        </article>;
      })}
    </section>}
  </main>;
}

function NotificationSettingsView({ onBack }: { onBack: () => void }) {
  const [preferences, setPreferences] = useState({ order: true, offers: true, arrivals: true, priceDrops: true, reviews: false, appUpdates: true, promotions: false, quietHours: false });
  const toggle = (key: keyof typeof preferences) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  const rows = [
    { key: 'order' as const, title: 'Pickup Order Updates', description: 'Confirmation, preparation and pickup status', icon: <Truck className="h-5 w-5 text-[#E51E2B]" />, tone: 'bg-rose-50' },
    { key: 'offers' as const, title: 'Offers & Discounts', description: 'Special offers, coupons, deals', icon: <Tag className="h-5 w-5 fill-current text-[#E51E2B]" />, tone: 'bg-red-50' },
    { key: 'arrivals' as const, title: 'New Arrivals', description: 'Latest products and collections', icon: <Package className="h-5 w-5 text-purple-600" />, tone: 'bg-purple-50' },
    { key: 'priceDrops' as const, title: 'Price Drop Alerts', description: 'Get notified when prices drop', icon: <TrendingDown className="h-5 w-5 text-[#E51E2B]" />, tone: 'bg-rose-50' },
    { key: 'reviews' as const, title: 'Review Reminders', description: 'Remind me to review my purchases', icon: <Star className="h-5 w-5 fill-current text-amber-500" />, tone: 'bg-amber-50' },
    { key: 'appUpdates' as const, title: 'App Updates', description: 'New features and improvements', icon: <Smartphone className="h-5 w-5 text-blue-600" />, tone: 'bg-blue-50' },
    { key: 'promotions' as const, title: 'Promotional Messages', description: 'Marketing and promotional content', icon: <Megaphone className="h-5 w-5 fill-current text-[#E51E2B]" />, tone: 'bg-red-50' },
  ];
  return <main className="min-h-screen w-full bg-[#FCFCFD] text-slate-800 font-sans">
    <header className="flex items-start gap-3 bg-white px-5 pb-4 pt-4"><button onClick={onBack} aria-label="Go back" className="mt-1 -ml-1 rounded-full p-1"><ArrowLeft className="h-6 w-6" /></button><div><h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">Notification Settings</h1><p className="mt-0.5 text-[13px] text-slate-500">Manage what notifications you receive</p></div></header>
    <div className="space-y-3 overflow-y-auto bg-[#FCFCFD] px-4 pb-8 pt-3"><section className="flex items-center gap-4 rounded-2xl border border-rose-100/60 bg-gradient-to-r from-[#FFF2F2] to-[#FFF5F5] p-4 shadow-sm"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-rose-100"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-200/70"><Bell className="h-6 w-6 fill-current text-[#E51E2B]" /></div></div><div><h2 className="text-base font-bold leading-snug text-slate-900">Stay Updated</h2><p className="mt-0.5 text-[12.5px] leading-normal text-slate-500">Get important updates about your orders, offers and more.</p></div></section>
      <section className="space-y-2.5">{rows.map((row) => <article key={row.key} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"><div className="flex min-w-0 items-center gap-3.5"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${row.tone}`}>{row.icon}</div><div className="min-w-0"><h3 className="text-[14.5px] font-bold text-slate-900">{row.title}</h3><p className="mt-0.5 text-[12px] leading-tight text-slate-500">{row.description}</p></div></div><button type="button" role="switch" aria-checked={preferences[row.key]} aria-label={`${row.title} notifications`} onClick={() => toggle(row.key)} className={`relative ml-3 h-6 w-12 shrink-0 rounded-full transition-colors ${preferences[row.key] ? 'bg-[#E51E2B]' : 'bg-slate-200'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${preferences[row.key] ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></article>)}</section>
      <section className="space-y-2.5 pt-1"><div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center gap-3.5"><Volume2 className="h-5 w-5 text-slate-700" /><span className="text-[14.5px] font-bold text-slate-900">Notification Sound</span></div><div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">Default<ChevronRight className="h-4 w-4" /></div></div><article className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"><div className="flex items-center gap-3.5"><Moon className="h-5 w-5 text-slate-700" /><div><h3 className="text-[14.5px] font-bold text-slate-900">Quiet Hours</h3><p className="mt-0.5 text-[12px] leading-tight text-slate-500">Pause notifications during specific hours</p></div></div><button type="button" role="switch" aria-checked={preferences.quietHours} aria-label="Quiet Hours" onClick={() => toggle('quietHours')} className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${preferences.quietHours ? 'bg-[#E51E2B]' : 'bg-slate-200'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${preferences.quietHours ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></article></section>
    </div>
  </main>;
}
