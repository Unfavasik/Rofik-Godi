import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  FileText,
  Headphones,
  MessageCircle,
  Package,
} from 'lucide-react';
import {
  getSupportRequest,
  listSupportMessages,
  type SupportMessageRecord,
  type SupportRequestRecord,
} from '../lib/supabaseSupport';

type SupportNotificationDetailsProps = {
  requestId: string | null;
  userId: string;
  isAuthenticated: boolean;
  notificationBody: string;
  notificationCreatedAt: string;
  isUnread: boolean;
  onBack: () => void;
  onViewConversation: (requestId: string) => void;
  onContactSupport: () => void;
};

const statusLabel = (status: string) =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
};

const relativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} hr${hours === 1 ? '' : 's'} ago` : `${Math.floor(hours / 24)} days ago`;
};

export function SupportNotificationDetails({
  requestId,
  userId,
  isAuthenticated,
  notificationBody,
  notificationCreatedAt,
  isUnread,
  onBack,
  onViewConversation,
  onContactSupport,
}: SupportNotificationDetailsProps) {
  const [request, setRequest] = useState<SupportRequestRecord | null>(null);
  const [latestReply, setLatestReply] = useState<SupportMessageRecord | null>(null);
  const [latestMessageIsWorkshopReply, setLatestMessageIsWorkshopReply] = useState(false);
  const [loading, setLoading] = useState(Boolean(requestId && isAuthenticated));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!requestId || !isAuthenticated || !userId) {
      setRequest(null);
      setLatestReply(null);
      setLatestMessageIsWorkshopReply(false);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError('');
    setRequest(null);
    setLatestReply(null);
    setLatestMessageIsWorkshopReply(false);
    void Promise.all([getSupportRequest(requestId, userId), listSupportMessages(requestId, userId)])
      .then(([requestResult, messageResult]) => {
        if (!active) return;
        if (requestResult.error) throw requestResult.error;
        if (messageResult.error) throw messageResult.error;
        setRequest(requestResult.data);
        const thread = messageResult.data;
        setLatestMessageIsWorkshopReply(thread.at(-1)?.sender_role === 'admin');
        setLatestReply([...thread].reverse().find((message) => message.sender_role === 'admin') || null);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Support ticket details could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isAuthenticated, requestId, userId]);

  const statusTone =
    request?.status === 'resolved' || latestMessageIsWorkshopReply
      ? 'text-emerald-700'
      : request?.status === 'in_progress'
        ? 'text-blue-700'
        : 'text-amber-700';
  const ticketStatus =
    request?.status === 'resolved'
      ? 'Resolved'
      : latestMessageIsWorkshopReply
        ? 'Replied'
        : request
          ? statusLabel(request.status)
          : '';
  const replyText = latestReply?.message?.trim() || notificationBody || 'The workshop team has sent a new update.';
  const replyTime = latestReply?.created_at || notificationCreatedAt;

  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] pb-[max(2rem,env(safe-area-inset-bottom))] font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-3 px-3 py-2 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to notifications"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[19px] sm:text-[21px] font-extrabold tracking-tight text-slate-900">
            Notification Details
          </h1>
          <button
            type="button"
            onClick={onContactSupport}
            aria-label="Contact support"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200/85 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
          >
            <Headphones className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-3.5 px-3 pt-4 sm:px-5 sm:pt-5">
        <section className="rounded-3xl border border-rose-100/90 bg-gradient-to-br from-[#FFF1F2] via-white to-[#FFF8F8] p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#D9232D] shadow-2xs ring-1 ring-rose-100">
              <Bell className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="text-[#D9232D]">Support update</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="tabular-nums">{relativeTime(replyTime)}</span>
              {isUnread && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-emerald-700">New reply</span>
                </>
              )}
            </div>
          </div>
          <h2 className="mt-3.5 text-[20px] font-extrabold leading-[1.18] tracking-tight text-slate-900 sm:text-[22px]">
            Workshop replied to your support request
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
            {notificationBody || 'The workshop team has replied to your request.'}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-center gap-2.5 text-[#D9232D]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50">
              <FileText className="h-4 w-4" />
            </span>
            <h3 className="text-[14px] font-extrabold text-slate-900">Support request information</h3>
          </div>
          {loading ? (
            <div role="status" aria-label="Loading ticket details" className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
              {[0, 1, 2, 3].map((slot) => (
                <div key={slot} className="space-y-1.5">
                  <div className="skeleton-shimmer h-2.5 w-16 rounded bg-slate-200/75" />
                  <div className="skeleton-shimmer h-4 w-24 rounded bg-slate-200/90" />
                </div>
              ))}
            </div>
          ) : !isAuthenticated ? (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3.5 text-xs leading-5 text-slate-600">
              Sign in to view your private support request details.
            </div>
          ) : request ? (
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 rounded-2xl border border-slate-200/75 bg-slate-50/60 p-3.5">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">Ticket ID</p>
                  <p className="truncate font-mono text-[12.5px] font-bold tabular-nums text-slate-900">
                    #{request.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">Status</p>
                  <p className={`mt-0.5 text-[12.5px] font-extrabold ${statusTone}`}>{ticketStatus}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">Category</p>
                  <p className="truncate text-[12.5px] font-semibold text-slate-900">{request.category}</p>
                </div>
              </div>
              {request.order_number && (
                <div className="flex items-start gap-2">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Related order</p>
                    <p className="truncate font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
                      #{request.order_number}
                    </p>
                  </div>
                </div>
              )}
              <div className="col-span-2 flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">Submitted on</p>
                  <p className="text-[12.5px] font-semibold tabular-nums text-slate-900">
                    {formatDate(request.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div role={error ? 'alert' : 'status'} className="mt-3 rounded-2xl bg-slate-50 p-3.5 text-xs leading-5 text-slate-600">
              {error || 'Ticket details are not available for this notification.'}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-[#D9232D]">
                <MessageCircle className="h-4 w-4" />
              </span>
              <h3 className="text-[14px] font-extrabold text-slate-900">
                Latest reply <span className="font-medium text-slate-500">(preview)</span>
              </h3>
            </div>
            <span className="text-[11px] font-medium tabular-nums text-slate-400">{relativeTime(replyTime)}</span>
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200/70 bg-slate-50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700">
            {replyText}
          </div>
        </section>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={!requestId}
            onClick={() => requestId && onViewConversation(requestId)}
            className="banner-cta-shine group/cta flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-5 text-sm font-extrabold text-white shadow-sm transition-all hover:brightness-105 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            <span>View Conversation</span>
            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={onContactSupport}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.99]"
          >
            <Headphones className="h-4 w-4" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </main>
  );
}
