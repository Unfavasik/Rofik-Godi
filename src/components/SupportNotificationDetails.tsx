import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, CalendarDays, CheckCircle2, ChevronRight, CircleHelp, FileText, Headphones, LoaderCircle, MessageCircle, Package } from 'lucide-react';
import { getSupportRequest, listSupportMessages, type SupportMessageRecord, type SupportRequestRecord } from '../lib/supabaseSupport';

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

const statusLabel = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
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

export function SupportNotificationDetails({ requestId, userId, isAuthenticated, notificationBody, notificationCreatedAt, isUnread, onBack, onViewConversation, onContactSupport }: SupportNotificationDetailsProps) {
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
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated, requestId, userId]);

  const statusTone = request?.status === 'resolved' || latestMessageIsWorkshopReply ? 'bg-emerald-50 text-emerald-700' : request?.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800';
  const ticketStatus = request?.status === 'resolved' ? 'Resolved' : latestMessageIsWorkshopReply ? 'Replied' : request ? statusLabel(request.status) : '';
  const replyText = latestReply?.message?.trim() || notificationBody || 'The workshop team has sent a new update.';
  const replyTime = latestReply?.created_at || notificationCreatedAt;

  return <main className="min-h-dvh w-full bg-white font-sans text-slate-900">
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-100 bg-white px-4">
      <button type="button" onClick={onBack} aria-label="Back to notifications" className="-ml-1 rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
      <h1 className="min-w-0 flex-1 truncate text-[19px] font-extrabold tracking-tight">Notification Details</h1>
      <button type="button" onClick={onContactSupport} aria-label="Contact support" className="rounded-full p-1.5 text-slate-700"><Headphones className="h-5 w-5" /></button>
    </header>

    <div className="mx-auto max-w-xl space-y-3 px-3 pb-8 pt-3 sm:px-4">
      <section className="rounded-[22px] bg-gradient-to-br from-rose-50 via-rose-50 to-pink-50 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-[#D9232D]"><Bell className="h-6 w-6" /></div>
          {isUnread && <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-700">New reply</span>}
        </div>
        <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#D9232D]">Support update <span className="mx-1 text-rose-300">·</span> {relativeTime(replyTime)}</p>
        <h2 className="mt-2 text-[20px] font-extrabold leading-[1.15] tracking-tight sm:text-[22px]">Workshop replied to your support request</h2>
        <p className="mt-2 text-[13px] leading-[1.55] text-slate-600">{notificationBody || 'The workshop team has replied to your request.'}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-4">
        <div className="flex items-center gap-2 text-[#D9232D]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50"><FileText className="h-4 w-4" /></span><h3 className="text-[13px] font-extrabold text-slate-900">Support request information</h3></div>
        {loading ? <div role="status" className="flex items-center gap-2 px-2 py-5 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading ticket details…</div> : !isAuthenticated ? (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Sign in to view your private support request details.</div>
        ) : request ? <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl border border-slate-200 p-3">
          <div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" /><div className="min-w-0"><p className="text-[10px] text-slate-500">Ticket ID</p><p className="truncate text-[12px] font-bold">#{request.id.slice(0, 8).toUpperCase()}</p></div></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" /><div className="min-w-0"><p className="text-[10px] text-slate-500">Status</p><span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone}`}>{ticketStatus}</span></div></div>
          <div className="flex items-start gap-2"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" /><div className="min-w-0"><p className="text-[10px] text-slate-500">Category</p><p className="truncate text-[12px] font-semibold">{request.category}</p></div></div>
          {request.order_number && <div className="flex items-start gap-2"><Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" /><div className="min-w-0"><p className="text-[10px] text-slate-500">Related order</p><p className="truncate text-[12px] font-semibold">#{request.order_number}</p></div></div>}
          <div className="col-span-2 flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" /><div className="min-w-0"><p className="text-[10px] text-slate-500">Submitted on</p><p className="text-[12px] font-semibold">{formatDate(request.created_at)}</p></div></div>
        </div> : <div role={error ? 'alert' : 'status'} className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{error || 'Ticket details are not available for this notification.'}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-4">
        <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-[#D9232D]"><MessageCircle className="h-4 w-4" /></span><h3 className="text-[13px] font-extrabold">Latest reply <span className="font-medium text-slate-500">(preview)</span></h3></div>
        <div className="mt-3 rounded-xl bg-sky-50 px-3 py-3 text-[12px] leading-[1.55] text-slate-700">{replyText}</div>
        <p className="mt-1.5 text-right text-[10px] text-slate-400">{relativeTime(replyTime)}</p>
      </section>

      <div className="space-y-2 pt-1">
        <button type="button" disabled={!requestId} onClick={() => requestId && onViewConversation(requestId)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E51E2B] text-sm font-extrabold text-white shadow-sm hover:bg-[#c91925] disabled:opacity-50"><MessageCircle className="h-4 w-4" />View Conversation<ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={onContactSupport} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 hover:bg-slate-100"><Headphones className="h-4 w-4" />Contact Support</button>
      </div>
    </div>
  </main>;
}
