import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Headphones,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getSupportRequest,
  listMySupportRequests,
  type SupportRequestCursor,
  type SupportRequestRecord,
} from '../lib/supabaseSupport';
import { CustomerSupportRequestForm } from './CustomerSupportRequestForm';
import { SupportConversation } from './SupportConversation';
import { SupportTicketListSkeleton } from './AccountPageSkeleton';

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

const statusLabel = (status: string) =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusToneClass = (status: string) => {
  if (status === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
  if (status === 'in_progress') return 'bg-blue-50 text-blue-700 border-blue-200/70';
  return 'bg-amber-50 text-amber-800 border-amber-200/70';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const mergeRequests = (current: SupportRequestRecord[], incoming: SupportRequestRecord[]) => {
  const byId = new Map(current.map((request) => [request.id, request]));
  incoming.forEach((request) => byId.set(request.id, request));
  return [...byId.values()].sort(
    (left, right) =>
      right.last_message_at.localeCompare(left.last_message_at) || right.id.localeCompare(left.id),
  );
};

export const SupportCenter: React.FC<{
  currentUserId: string;
  customerName?: string;
  isAuthenticated: boolean;
  initialRequestId?: string | null;
  onBack: () => void;
  onOpenLogin?: () => void;
  onSelectRequest: (requestId: string) => void;
}> = ({
  currentUserId,
  customerName,
  isAuthenticated,
  initialRequestId = null,
  onBack,
  onOpenLogin,
  onSelectRequest,
}) => {
  const [requests, setRequests] = useState<SupportRequestRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialRequestId);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<SupportRequestCursor | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const routedRequestRef = useRef<string | null>(null);

  useEffect(() => setSelectedId(initialRequestId), [initialRequestId]);

  const refresh = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await listMySupportRequests(currentUserId);
        if (result.error) throw result.error;
        setRequests((current) => mergeRequests(current, result.data));
        setHasMore(result.hasMore);
        setCursor(result.cursor);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Your support requests could not be loaded.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!initialRequestId) {
      routedRequestRef.current = null;
      return;
    }
    if (!isAuthenticated || !currentUserId || routedRequestRef.current === initialRequestId) return;
    routedRequestRef.current = initialRequestId;
    void getSupportRequest(initialRequestId, currentUserId)
      .then((result) => {
        if (result.data) setRequests((current) => mergeRequests(current, [result.data!]));
        else if (result.error) setError(result.error.message);
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'The requested support ticket could not be loaded.',
        ),
      );
  }, [currentUserId, initialRequestId, isAuthenticated]);

  useEffect(() => {
    if (!supabase || !currentUserId || !isAuthenticated) return;
    const client = supabase;
    const channel = client
      .channel(`my-support-list-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_support_requests',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void refresh(true),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [currentUserId, isAuthenticated, refresh]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: requests.length,
      open: 0,
      in_progress: 0,
      resolved: 0,
    };
    for (const request of requests) {
      if (request.status === 'resolved') counts.resolved += 1;
      else if (request.status === 'in_progress') counts.in_progress += 1;
      else counts.open += 1;
    }
    return counts;
  }, [requests]);

  const visibleRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests.filter((request) => {
      const normalizedStatus =
        request.status === 'resolved'
          ? 'resolved'
          : request.status === 'in_progress'
            ? 'in_progress'
            : 'open';
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) return false;
      if (!normalized) return true;
      return [request.subject, request.category, request.id, request.order_number || '']
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, requests, statusFilter]);

  const loadOlder = async () => {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    setError('');
    try {
      const result = await listMySupportRequests(currentUserId, cursor);
      if (result.error) throw result.error;
      setRequests((current) => mergeRequests(current, result.data));
      setHasMore(result.hasMore);
      setCursor(result.cursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Older support requests could not be loaded.',
      );
    } finally {
      setLoadingOlder(false);
    }
  };

  const openRequest = (requestId: string) => {
    setShowNewRequest(false);
    setSelectedId(requestId);
    onSelectRequest(requestId);
  };

  const handleRequestCreated = async (requestId: string) => {
    setShowNewRequest(false);
    await refresh(true);
    openRequest(requestId);
  };

  const selectedRequest = requests.find((request) => request.id === selectedId) || null;

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-dvh w-full flex-col justify-center bg-gradient-to-br from-[#F8FAFC] via-[#F4F6FB] to-[#FFF5F6] px-4 py-8">
        <div className="mx-auto w-full max-w-lg">
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-slate-200/85 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-rose-50 hover:text-[#D9232D]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to account
          </button>
          <div className="rounded-3xl border border-amber-200/80 bg-white/95 p-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.08)] backdrop-blur-md sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/70">
              <CircleHelp className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-xl font-black tracking-tight text-slate-900">Sign in to view support</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Support conversations are private to your account. Sign in to review your requests and reply to the workshop team. আপনার টিকিট দেখতে ও জবাব দিতে সাইন ইন করুন।
            </p>
            <button
              type="button"
              onClick={onOpenLogin}
              className="banner-cta-shine group/cta mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-5 py-3 text-xs font-extrabold text-white shadow-sm shadow-rose-600/20 transition-all hover:brightness-105 hover:shadow-md active:scale-95"
            >
              Sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-full flex-1 flex-col overflow-x-hidden bg-gradient-to-br from-[#F8FAFC] via-[#F4F6FB] to-[#FFF5F6] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Frosted Glass Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-3 py-3.5 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(15,23,42,0.06)] sm:px-5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to account"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/85 bg-slate-50/90 text-slate-700 shadow-2xs transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-[#D9232D] active:scale-95"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE4E6] to-[#FECDD3] text-[#D9232D] ring-1 ring-inset ring-rose-200/70 sm:flex">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#D9232D]">Customer care</p>
              <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl text-balance">
                My support
              </h1>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                Your requests, replies and order follow-up in one place.
              </p>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => void refresh(true)}
              aria-label="Refresh support requests"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-extrabold text-slate-700 shadow-2xs transition-colors hover:border-rose-200 hover:bg-rose-50/50 hover:text-[#D9232D] whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setShowNewRequest((value) => !value);
              }}
              className="banner-cta-shine group/cta inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-4 text-xs font-extrabold text-white shadow-sm shadow-rose-600/25 transition-all hover:brightness-105 hover:shadow-md active:scale-95 sm:flex-none whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 transition-transform duration-200 group-hover/cta:scale-110" /> New request
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col space-y-4 px-3 pt-4 sm:px-5">
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
          >
            <span>{error}</span>
            <button type="button" onClick={() => void refresh()} className="font-extrabold underline">
              Retry
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
          role="tablist"
          aria-label="Filter support requests by status"
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            const count = statusCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#D9232D] bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white shadow-sm shadow-rose-600/15'
                    : 'border-slate-200/85 bg-white/95 text-slate-600 hover:border-rose-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`tabular-nums text-[11px] ${active ? 'text-white/90' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 min-h-0 lg:min-h-[65vh] flex-1 gap-4 lg:grid-cols-[350px_minmax(0,1fr)]">
          {/* Left Ticket List Panel */}
          <aside
            className={`${selectedId || showNewRequest ? 'hidden lg:flex' : 'flex'} min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/85 bg-white/95 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(15,23,42,0.08)]`}
          >
            <div className="border-b border-slate-100 p-3">
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 focus-within:border-[#D9232D] focus-within:bg-white transition-colors">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search support requests"
                  placeholder="Search requests, orders, topics…"
                  className="min-w-0 flex-1 bg-transparent text-base sm:text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && requests.length === 0 ? (
                <SupportTicketListSkeleton />
              ) : visibleRequests.length ? (
                <div className="space-y-1.5 p-2.5">
                  {visibleRequests.map((request) => {
                    const selected = selectedId === request.id;
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => openRequest(request.id)}
                        className={`group w-full rounded-2xl border p-3.5 text-left transition-all ${
                          selected
                            ? 'border-rose-200 bg-rose-50/80 shadow-2xs'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-1 text-[13px] font-extrabold text-slate-900">
                            {request.subject}
                          </span>
                          <span
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusToneClass(request.status)}`}
                          >
                            {statusLabel(request.status)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                          {request.category}
                          {request.order_number ? ` · Order #${request.order_number}` : ''}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10.5px] text-slate-400 tabular-nums">
                          <span>Updated {formatDate(request.last_message_at)}</span>
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${selected ? 'text-[#D9232D] translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <CircleHelp className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-xs font-extrabold text-slate-800">
                    {requests.length > 0 ? 'No matching requests' : 'No support requests yet'}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    {requests.length > 0
                      ? 'Try clearing your search or switching status filters.'
                      : 'Create a request and we’ll keep the conversation here.'}
                  </p>
                  {requests.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setStatusFilter('all');
                      }}
                      className="mt-3 min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Reset filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        setShowNewRequest(true);
                      }}
                      className="banner-cta-shine mt-3 min-h-11 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-95"
                    >
                      New request
                    </button>
                  )}
                </div>
              )}

              {!loading && hasMore && (
                <div className="p-2.5 pt-0">
                  <button
                    type="button"
                    onClick={() => void loadOlder()}
                    disabled={loadingOlder}
                    className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {loadingOlder ? 'Loading…' : 'Load older requests'}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Right Conversation / New Request Pane */}
          <section
            className={`${selectedId || showNewRequest ? 'flex' : 'hidden lg:flex'} min-h-0 lg:min-h-[65vh] min-w-0 flex-col`}
          >
            {showNewRequest ? (
              <div className="mx-auto w-full max-w-2xl">
                <button
                  type="button"
                  onClick={() => setShowNewRequest(false)}
                  className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200/85 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-2xs lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" /> Requests
                </button>
                <CustomerSupportRequestForm
                  isAuthenticated
                  onOpenLogin={onOpenLogin}
                  expectedUserId={currentUserId}
                  onOpenSupportRequest={(id) => void handleRequestCreated(id)}
                />
              </div>
            ) : selectedId ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    onSelectRequest('');
                  }}
                  className="mb-3 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-slate-200/85 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-2xs lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" /> All requests
                </button>
                {selectedRequest ? (
                  <SupportConversation
                    requestId={selectedRequest.id}
                    currentUserId={currentUserId}
                    customerName={customerName}
                    onChanged={() => void refresh(true)}
                  />
                ) : loading ? (
                  <SupportTicketListSkeleton />
                ) : (
                  <div
                    role="alert"
                    className="rounded-3xl border border-slate-200/85 bg-white/95 p-6 text-sm font-medium text-slate-600 shadow-2xs"
                  >
                    This support request is not in your account.
                  </div>
                )}
              </>
            ) : (
              <div className="hidden flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/90 bg-white/80 p-8 text-center backdrop-blur-md lg:flex">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#D9232D]">
                  <CircleHelp className="h-7 w-7" />
                </span>
                <h2 className="mt-3.5 text-base font-black tracking-tight text-slate-900">Choose a request</h2>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  Select a request from the list to review messages and reply, or start a new support conversation.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewRequest(true)}
                  className="banner-cta-shine group/cta mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-rose-600/20 hover:brightness-105 hover:shadow-md active:scale-95"
                >
                  <Plus className="h-4 w-4 transition-transform duration-200 group-hover/cta:scale-110" /> Start new request
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};
