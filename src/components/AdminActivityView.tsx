import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  LoaderCircle,
  Megaphone,
  MessageSquareText,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Tag,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SupportConversation } from './SupportConversation';
import { AdminSupportReplyPreview } from './AdminSupportReplyPreview';
import {
  loadAdminActivityEvents,
  markAdminActivityRead,
  markAllAdminActivityRead,
  updateAdminSupportRequestStatus,
  type AdminActivityEvent,
  type SupportRequestStatus,
} from '../lib/supabaseAdminActivity';

type FeedFilter = 'all' | 'orders' | 'support' | 'reviews' | 'customers' | 'products' | 'coupons' | 'campaigns';
type FeedCategory = Exclude<FeedFilter, 'all'>;

const filterOptions: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'All activity' },
  { id: 'orders', label: 'Orders' },
  { id: 'support', label: 'Support' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'customers', label: 'Customers' },
  { id: 'products', label: 'Products' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'campaigns', label: 'Campaigns' },
];

const eventCategory = (event: AdminActivityEvent): FeedCategory => {
  if (event.event_type.startsWith('coupon_')) return 'coupons';
  if (event.entity_type === 'coupon') return 'coupons';
  if (event.entity_type === 'product') return 'products';
  if (event.entity_type === 'campaign') return 'campaigns';
  if (event.entity_type === 'support_request') return 'support';
  if (event.entity_type === 'review') return 'reviews';
  if (event.entity_type === 'customer') return 'customers';
  return 'orders';
};

const categoryPresentation: Record<
  FeedCategory,
  { label: string; color: string; icon: typeof ShoppingBag }
> = {
  orders: { label: 'Order', color: 'bg-blue-50 text-blue-700 ring-blue-100', icon: ShoppingBag },
  support: {
    label: 'Support',
    color: 'bg-amber-50 text-amber-800 ring-amber-100',
    icon: MessageSquareText,
  },
  reviews: { label: 'Review', color: 'bg-violet-50 text-violet-700 ring-violet-100', icon: Star },
  customers: {
    label: 'Customer',
    color: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    icon: UserRoundPlus,
  },
  products: { label: 'Product', color: 'bg-indigo-50 text-indigo-700 ring-indigo-100', icon: Package },
  coupons: { label: 'Coupon', color: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100', icon: Tag },
  campaigns: { label: 'Campaign', color: 'bg-cyan-50 text-cyan-700 ring-cyan-100', icon: Megaphone },
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatMoney = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
};

const textValue = (value: unknown, fallback = '') =>
  value === null || value === undefined || value === '' ? fallback : String(value);

const statusLabel = (value: unknown) => {
  const status = textValue(value, 'open');
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const eventDescription = (event: AdminActivityEvent) => {
  const details = event.details;
  switch (event.event_type) {
    case 'order_created':
      return `New order #${textValue(details.order_number, event.entity_id.slice(0, 8))} from ${event.customer_name}`;
    case 'order_status_changed':
      return `Order #${textValue(details.order_number)} changed from ${statusLabel(details.old_status)} to ${statusLabel(details.status)}`;
    case 'order_payment_changed':
      return `Payment for order #${textValue(details.order_number)} changed from ${statusLabel(details.old_payment_status)} to ${statusLabel(details.payment_status)}`;
    case 'coupon_redeemed':
      return `Coupon ${textValue(details.coupon_code, 'offer')} used on order #${textValue(details.order_number)}`;
    case 'review_created':
      return `${event.customer_name} left a ${textValue(details.rating, 'new')}-star review for ${textValue(details.product_name, 'a product')}`;
    case 'customer_registered':
      return `${event.customer_name} created a customer account`;
    case 'support_request_created':
      return `${event.customer_name} sent a ${textValue(details.category, 'support')} request`;
    case 'support_request_status_changed':
      return `Support request status changed to ${statusLabel(details.status)}`;
    case 'support_request_message_received':
      return `${event.customer_name} replied to “${textValue(details.subject, 'a support request')}”`;
    case 'support_reply_sent':
      return `The workshop team replied to “${textValue(details.subject, 'a support request')}”`;
    case 'customer_profile_updated':
      return `${event.customer_name} updated account details`;
    case 'product_created':
    case 'product_updated':
    case 'product_deleted':
      return `Product “${textValue(details.name, 'Catalog item')}” ${event.event_type.replace('product_', '')}`;
    case 'coupon_created':
    case 'coupon_updated':
    case 'coupon_deleted':
      return `Coupon “${textValue(details.code, 'Offer')}” ${event.event_type.replace('coupon_', '')}`;
    case 'notification_campaign_sent':
      return `“${textValue(details.campaign_title, event.title)}” sent to ${textValue(details.recipient_count, '0')} customers`;
    default:
      return event.body || event.title;
  }
};

const searchText = (event: AdminActivityEvent) =>
  [
    event.title,
    event.body,
    event.actor_name,
    event.actor_email,
    event.customer_name,
    event.customer_email,
    event.customer_phone,
    event.entity_id,
    ...Object.values(event.details).filter(
      (value) => typeof value === 'string' || typeof value === 'number',
    ),
  ]
    .join(' ')
    .toLowerCase();

const mergeEventRows = (current: AdminActivityEvent[], incoming: AdminActivityEvent[]) => {
  const byId = new Map(current.map((event) => [event.id, event]));
  incoming.forEach((event) => byId.set(event.id, event));
  return [...byId.values()].sort((left, right) =>
    right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id),
  );
};

export const AdminActivityView: React.FC<{
  onViewOrder: (event: AdminActivityEvent) => void | Promise<void>;
  onViewReview: (event: AdminActivityEvent) => void;
  onViewCustomer: (event: AdminActivityEvent) => void;
  onViewProduct: (event: AdminActivityEvent) => void;
  onViewCoupon: (event: AdminActivityEvent) => void;
  onViewCampaign: (event: AdminActivityEvent) => void;
  adminUserId: string;
  notify: (message: string) => void;
  supportOnly?: boolean;
  initialSupportRequestId?: string | null;
}> = ({ onViewOrder, onViewReview, onViewCustomer, onViewProduct, onViewCoupon, onViewCampaign, adminUserId, notify, supportOnly = false, initialSupportRequestId = null }) => {
  const [events, setEvents] = useState<AdminActivityEvent[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [query, setQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedSupport, setSelectedSupport] = useState<AdminActivityEvent | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await loadAdminActivityEvents(200);
      if (result.error) setError(result.error.message);
      else {
        setEvents((current) => mergeEventRows(current, result.data));
        setHasMore(result.data.length === 200);
      }
    } catch {
      setError('Activity could not be loaded. Check your connection and try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadOlder = async () => {
    const oldest = events[events.length - 1];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    setError('');
    try {
      const result = await loadAdminActivityEvents(200, { createdAt: oldest.created_at, id: oldest.id });
      if (result.error) setError(result.error.message);
      else {
        setEvents((current) => mergeEventRows(current, result.data));
        setHasMore(result.data.length === 200);
      }
    } catch {
      setError('Older activity could not be loaded. Please try again.');
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!initialSupportRequestId || selectedSupport || !events.length) return;
    const matchingEvent = events.find(
      (event) => event.entity_type === 'support_request' && event.entity_id === initialSupportRequestId,
    );
    if (matchingEvent) {
      setFilter('support');
      setSelectedSupport(matchingEvent);
      void markAdminActivityRead(matchingEvent.id);
    }
  }, [events, initialSupportRequestId, selectedSupport]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('admin-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_activity_events',
        },
        () => {
          void refresh(true);
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refresh]);

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      if (supportOnly && eventCategory(event) !== 'support') return false;
      if (!supportOnly && filter !== 'all' && eventCategory(event) !== filter) return false;
      if (unreadOnly && event.read_at) return false;
      return !normalizedQuery || searchText(event).includes(normalizedQuery);
    });
  }, [events, filter, query, unreadOnly, supportOnly]);
  const unreadCount = events.filter((event) => !event.read_at).length;
  const counts = useMemo(
    () => ({
      all: events.length,
      orders: events.filter((event) => eventCategory(event) === 'orders').length,
      support: events.filter((event) => eventCategory(event) === 'support').length,
      reviews: events.filter((event) => eventCategory(event) === 'reviews').length,
      customers: events.filter((event) => eventCategory(event) === 'customers').length,
      products: events.filter((event) => eventCategory(event) === 'products').length,
      coupons: events.filter((event) => eventCategory(event) === 'coupons').length,
      campaigns: events.filter((event) => eventCategory(event) === 'campaigns').length,
    }),
    [events],
  );

  const markRead = async (eventId: string) => {
    const result = await markAdminActivityRead(eventId);
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    const timestamp = new Date().toISOString();
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, read_at: event.read_at || timestamp } : event,
      ),
    );
    setSelectedSupport((current) =>
      current?.id === eventId ? { ...current, read_at: current.read_at || timestamp } : current,
    );
    return true;
  };

  const handleMarkAllRead = async () => {
    setBusy(true);
    const result = await markAllAdminActivityRead();
    if (result.error) setError(result.error.message);
    else {
      const timestamp = new Date().toISOString();
      setEvents((current) =>
        current.map((event) => ({ ...event, read_at: event.read_at || timestamp })),
      );
    }
    setBusy(false);
  };

  const handleView = async (event: AdminActivityEvent) => {
    await markRead(event.id);
    if (event.entity_type === 'order') {
      await onViewOrder(event);
    } else if (event.entity_type === 'review') {
      onViewReview(event);
    } else if (event.entity_type === 'customer') {
      onViewCustomer(event);
    } else if (event.entity_type === 'product') {
      onViewProduct(event);
    } else if (event.entity_type === 'coupon') {
      onViewCoupon(event);
    } else if (event.entity_type === 'campaign') {
      onViewCampaign(event);
    } else if (event.entity_type === 'support_request') {
      setSelectedSupport(event);
    }
  };

  const handleSupportStatusChange = async (status: SupportRequestStatus) => {
    if (!selectedSupport) return;
    setBusy(true);
    const result = await updateAdminSupportRequestStatus(selectedSupport.entity_id, status);
    if (result.error) {
      setError(result.error.message);
      notify(result.error.message);
    } else {
      setSelectedSupport((current) =>
        current ? { ...current, details: { ...current.details, status } } : null,
      );
      notify('Support request status updated.');
      await refresh(true);
    }
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-[1180px] pb-12">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
            <Activity className="h-4 w-4" /> {supportOnly ? 'Admin support' : 'Admin activity'}
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            {supportOnly ? 'Support conversations' : 'All notifications'}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {supportOnly ? 'Open a customer conversation, reply, attach images and update its status.' : 'Orders, product and coupon changes, customer support, reviews and campaigns in one place.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#C51F2A]">
            {unreadCount} unread
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            aria-label="Refresh activity"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={busy || unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        </div>
      </header>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter activity type">
            {!supportOnly && filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${filter === option.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                {option.label}
                <span
                  className={`ml-2 ${filter === option.id ? 'text-white/70' : 'text-slate-400'}`}
                >
                  {counts[option.id]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:w-64 sm:flex-none">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search activity…"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
                aria-label="Search activity"
              />
            </label>
            <button
              type="button"
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly((value) => !value)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${unreadOnly ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Unread
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          {error}
          <button type="button" onClick={() => void refresh()} className="shrink-0 underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Loading activity…
        </div>
      ) : visibleEvents.length ? (
        <div className="space-y-3">
          {visibleEvents.map((event) => {
            const category = categoryPresentation[eventCategory(event)];
            const Icon = category.icon;
            const items = Array.isArray(event.details.items)
              ? (event.details.items as Array<Record<string, unknown>>)
              : [];
            const reviewText = textValue(event.details.review_text);
            const supportSubject = textValue(event.details.subject);
            const isSupport = event.entity_type === 'support_request';
            const isOrder = event.entity_type === 'order';
            const isReview = event.entity_type === 'review';
            const isCustomer = event.entity_type === 'customer';
            const isProduct = event.entity_type === 'product';
            const isCoupon = event.entity_type === 'coupon';
            const isCampaign = event.entity_type === 'campaign';
            return (
              <article
                key={event.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${event.read_at ? 'border-slate-200' : 'border-rose-200 ring-1 ring-rose-100'}`}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${category.color.split(' ')[0]} ${category.color.split(' ')[1]}`}
                  >
                    <Icon className="h-5 w-5" />
                    {!event.read_at && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#D9232D]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${category.color}`}
                      >
                        {category.label}
                      </span>
                      {!event.read_at && (
                        <span className="text-[10px] font-black uppercase tracking-wide text-[#D9232D]">
                          New
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-black text-slate-900 sm:text-base">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {eventDescription(event)}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700">{event.actor_name}</span>
                      {event.actor_email && <span> · {event.actor_email}</span>}
                      {event.customer_name && event.actor_user_id !== event.subject_user_id && (
                        <span> · for {event.customer_name}</span>
                      )}
                    </p>
                    {isSupport && event.event_type === 'support_request_message_received' && <AdminSupportReplyPreview details={event.details} />}

                    {isOrder && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-800">
                            <Package className="h-4 w-4 text-slate-500" /> Order #
                            {textValue(event.details.order_number, '—')}
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {formatMoney(event.details.total)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span>
                            Order:{' '}
                            <b className="text-slate-700">{statusLabel(event.details.status)}</b>
                          </span>
                          <span>
                            Payment:{' '}
                            <b className="text-slate-700">
                              {statusLabel(event.details.payment_status)}
                            </b>
                          </span>
                          {textValue(event.details.payment_method) && (
                            <span>
                              Method: {textValue(event.details.payment_method).replaceAll('_', ' ')}
                            </span>
                          )}
                        </div>
                        {items.length > 0 && (
                          <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-5 text-slate-600">
                            {items
                              .map(
                                (item) =>
                                  `${textValue(item.product_name, 'Product')} × ${textValue(item.quantity, '1')}`,
                              )
                              .join(' · ')}
                          </p>
                        )}
                        {textValue(event.details.coupon_code) && (
                          <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                            Coupon {textValue(event.details.coupon_code)} · saved{' '}
                            {formatMoney(event.details.discount)}
                          </p>
                        )}
                      </div>
                    )}

                    {isReview && (
                      <div className="mt-3 rounded-xl bg-violet-50/70 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-violet-900">
                          <span>{textValue(event.details.product_name, 'Product review')}</span>
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {textValue(event.details.rating)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${event.details.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}
                          >
                            {event.details.is_published ? 'Published' : 'Pending'}
                          </span>
                        </div>
                        {reviewText && (
                          <blockquote className="mt-2 border-l-2 border-violet-200 pl-3 text-xs italic leading-5 text-slate-600">
                            “{reviewText}”
                          </blockquote>
                        )}
                      </div>
                    )}

                    {isSupport && (
                      <div className="mt-3 rounded-xl bg-amber-50/70 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-800">
                          <CircleHelp className="h-4 w-4 text-amber-700" />
                          {supportSubject || 'Support request'}
                          <span className="ml-auto rounded-full bg-white px-2 py-1 text-[10px] font-bold text-amber-800">
                            {statusLabel(event.details.status)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {textValue(
                            event.event_type === 'support_request_message_received' ? event.body : event.details.message,
                            event.body,
                          )}
                        </p>
                        <p className="mt-2 break-all text-[10px] text-slate-500">
                          {event.customer_email}
                          {event.customer_phone ? ` · ${event.customer_phone}` : ''}
                        </p>
                      </div>
                    )}

                    {isCustomer && (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                        <UserRoundPlus className="h-4 w-4" />
                        {event.customer_email || 'New customer account'}
                        {event.customer_phone ? ` · ${event.customer_phone}` : ''}
                      </p>
                    )}

                    {isProduct && (
                      <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900">
                        {textValue(event.details.name, 'Product')}
                        {event.details.price !== undefined && ` · ${formatMoney(event.details.price)}`}
                        {textValue(event.details.category) && ` · ${textValue(event.details.category)}`}
                        {Array.isArray(event.details.changed_fields) && event.details.changed_fields.length > 0 && ` · Updated: ${(event.details.changed_fields as string[]).join(', ')}`}
                      </p>
                    )}

                    {isCoupon && (
                      <p className="mt-3 rounded-xl bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-900">
                        {textValue(event.details.code, 'Coupon')}
                        {event.details.discount_value !== undefined && ` · ${textValue(event.details.discount_value)} ${textValue(event.details.discount_type)}`}
                        {event.details.is_enabled !== undefined && ` · ${event.details.is_enabled ? 'Enabled' : 'Disabled'}`}
                        {Array.isArray(event.details.changed_fields) && event.details.changed_fields.length > 0 && ` · Updated: ${(event.details.changed_fields as string[]).join(', ')}`}
                      </p>
                    )}

                    {isCampaign && (
                      <p className="mt-3 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900">
                        {textValue(event.details.campaign_title, event.title)} · {textValue(event.details.recipient_count, '0')} recipients
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => void handleView(event)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#D9232D] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#B91C1C]"
                      >
                        {isOrder
                          ? 'View order'
                          : isReview
                            ? 'View review'
                            : isSupport
                              ? 'View request'
                              : isProduct
                                ? 'View product'
                                : isCoupon
                                  ? 'View coupon'
                                  : isCampaign
                                    ? 'View campaign'
                                    : 'View customer'}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                      {!event.read_at && (
                        <button
                          type="button"
                          onClick={() => void markRead(event.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Check className="h-4 w-4" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          <p className="pt-2 text-center text-[11px] text-slate-400">
            Showing the latest {events.length} activity events.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <BellRing className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">No activity matches this view</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try another filter or check back when a customer places an order or sends a request.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="mt-5 flex flex-col items-center gap-2">
          {hasMore ? (
            <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
              {loadingOlder && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loadingOlder ? 'Loading older activity…' : 'Load older activity'}
            </button>
          ) : (
            <p className="text-[11px] text-slate-400">All available activity loaded · {events.length} events</p>
          )}
          {query.trim() && <p className="text-[10px] text-slate-400">Search covers the activity currently loaded. Load older activity to search further back.</p>}
        </div>
      )}

      {selectedSupport && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedSupport(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-detail-title"
            className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
                  Customer support · {formatDate(selectedSupport.created_at)}
                </p>
                <h2 id="support-detail-title" className="mt-1 text-xl font-black text-slate-900">
                  {textValue(selectedSupport.details.subject, 'Support request')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupport(null)}
                aria-label="Close support request"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Customer
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedSupport.customer_name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Category
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {textValue(selectedSupport.details.category)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-700">
                    {selectedSupport.customer_email || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Phone
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedSupport.customer_phone || '—'}
                  </p>
                </div>
              </div>
              <div className="min-h-[360px]">
                <SupportConversation
                  requestId={selectedSupport.entity_id}
                  currentUserId={adminUserId}
                  customerName={selectedSupport.customer_name}
                  isAdmin
                  onChanged={() => void refresh(true)}
                />
              </div>
              <label className="block max-w-sm space-y-2">
                <span className="text-xs font-bold text-slate-700">Request status</span>
                <span className="relative block">
                  <select
                    disabled={busy}
                    value={textValue(selectedSupport.details.status, 'open')}
                    onChange={(event) =>
                      void handleSupportStatusChange(event.target.value as SupportRequestStatus)
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-[#D9232D] disabled:opacity-50"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                </span>
              </label>
              <p className="text-[11px] leading-5 text-slate-400">
                Replies appear in the customer’s private support thread and inbox. Status changes also send an in-app update and are recorded in this activity feed.
              </p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};
