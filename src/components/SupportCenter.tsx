import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CircleHelp, Plus, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getSupportRequest,
  listMySupportRequests,
  type SupportRequestCursor,
  type SupportRequestRecord,
} from '../lib/supabaseSupport';
import { CustomerSupportRequestForm } from './CustomerSupportRequestForm';
import { SupportConversation } from './SupportConversation';
import { Skeleton } from './Skeleton';

const statusLabel = (status: string) =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  isAuthenticated: boolean;
  initialRequestId?: string | null;
  onBack: () => void;
  onOpenLogin?: () => void;
  onSelectRequest: (requestId: string) => void;
}> = ({
  currentUserId,
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

  const visibleRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests.filter(
      (request) =>
        !normalized ||
        [request.subject, request.category, request.id, request.order_number || '']
          .join(' ')
          .toLowerCase()
          .includes(normalized),
    );
  }, [query, requests]);

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
      <main className="mx-auto flex min-h-dvh w-full max-w-none flex-col justify-center px-4 py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex w-fit items-center gap-2 text-xs font-bold text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to account
        </button>
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <CircleHelp className="h-8 w-8 text-amber-600" />
          <h1 className="mt-3 text-xl font-black text-slate-900">Sign in to view support</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Support conversations are private to your account. Sign in to review your requests and reply to the workshop team. আপনার টিকিট দেখতে ও জবাব দিতে সাইন ইন করুন।
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="mt-5 rounded-xl bg-[#D9232D] px-4 py-3 text-xs font-bold text-white"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-none flex-1 flex-col bg-white px-3 pb-6 pt-3 sm:px-5 sm:pt-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to account"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Customer care</p>
            <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">My support</h1>
            <p className="mt-0.5 text-xs text-slate-500">Your requests, replies and order follow-up in one place.</p>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => void refresh(true)}
            aria-label="Refresh support requests"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 text-xs font-bold text-white hover:bg-[#B91C1C] sm:flex-none"
          >
            <Plus className="h-4 w-4" /> New request
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
          {error}
          <button type="button" onClick={() => void refresh()} className="underline">Retry</button>
        </div>
      )}

      <div className="grid min-h-[65vh] flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${selectedId || showNewRequest ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm`}>
          <div className="border-b border-slate-100 p-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search support requests"
                placeholder="Search requests…"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 space-y-0 overflow-y-auto p-0 lg:space-y-1 lg:p-2">
            {loading ? (
              <div className="p-2" role="status" aria-label="Loading requests"><Skeleton kind="list" count={4} /></div>
            ) : visibleRequests.length ? (
              visibleRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => openRequest(request.id)}
                  className={`w-full border-b border-slate-100 px-3.5 py-4 text-left transition hover:bg-slate-50 lg:rounded-xl lg:border-0 lg:p-3 ${selectedId === request.id ? 'bg-rose-50 lg:ring-1 lg:ring-rose-200' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-xs font-bold text-slate-900">{request.subject}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${request.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}>
                      {statusLabel(request.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {request.category}{request.order_number ? ` · Order #${request.order_number}` : ''}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">Updated {formatDate(request.last_message_at)}</p>
                </button>
              ))
            ) : (
              <div className="px-3 py-12 text-center">
                <CircleHelp className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-700">No support requests yet</p>
                <p className="mt-1 text-[11px] text-slate-500">Create a request and we’ll keep the conversation here.</p>
              </div>
            )}
            {!loading && hasMore && (
              <button
                type="button"
                onClick={() => void loadOlder()}
                disabled={loadingOlder}
                className="w-full rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingOlder ? 'Loading…' : 'Load older requests'}
              </button>
            )}
          </div>
        </aside>

        <section className={`${selectedId || showNewRequest ? 'flex' : 'hidden lg:flex'} min-h-[65vh] min-w-0 flex-col`}>
          {showNewRequest ? (
            <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <button type="button" onClick={() => setShowNewRequest(false)} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 lg:hidden">
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
              <button type="button" onClick={() => { setSelectedId(null); onSelectRequest(''); }} className="mb-2 inline-flex w-fit items-center gap-2 text-xs font-bold text-slate-500 lg:hidden">
                <ArrowLeft className="h-4 w-4" /> All requests
              </button>
              {selectedRequest ? (
                <SupportConversation requestId={selectedRequest.id} currentUserId={currentUserId} onChanged={() => void refresh(true)} />
              ) : loading ? (
                <div role="status" aria-label="Loading request" className="rounded-2xl border border-slate-200 bg-white p-4"><Skeleton kind="card" /><Skeleton kind="text" lines={5} className="mt-4" /></div>
              ) : (
                <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">This support request is not in your account.</div>
              )}
            </>
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center lg:flex">
              <CircleHelp className="h-9 w-9 text-slate-300" />
              <h2 className="mt-3 text-sm font-bold text-slate-800">Choose a request</h2>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Select a request from the list to see messages and reply, or create a new support request.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
