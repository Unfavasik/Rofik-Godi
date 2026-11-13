import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getSupportRequest,
  listSupportMessages,
  sendSupportMessage,
  validateSupportFiles,
  type SupportMessageCursor,
  type SupportMessageRecord,
  type SupportRequestRecord,
} from '../lib/supabaseSupport';
import { SupportConversationSkeleton } from './AccountPageSkeleton';

const QUICK_REPLIES = [
  'Any update on this?',
  'Can I pick up today?',
  'Thanks, that helps!',
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const statusLabel = (status: string) =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusToneClass = (status: string) => {
  if (status === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
  if (status === 'in_progress') return 'bg-blue-50 text-blue-700 border-blue-200/70';
  return 'bg-amber-50 text-amber-800 border-amber-200/70';
};

const mergeMessages = (current: SupportMessageRecord[], incoming: SupportMessageRecord[]) => {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort(
    (left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id),
  );
};

export const SupportConversation: React.FC<{
  requestId: string;
  currentUserId: string;
  customerName?: string;
  isAdmin?: boolean;
  onChanged?: () => void;
}> = ({ requestId, currentUserId, customerName, isAdmin = false, onChanged }) => {
  const [request, setRequest] = useState<SupportRequestRecord | null>(null);
  const [messages, setMessages] = useState<SupportMessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<SupportMessageRecord['attachments'][number] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef<{ height: number; top: number } | null>(null);
  const previousMessageCountRef = useRef(0);
  const wasNearBottomRef = useRef(true);
  const attachmentCount = request?.attachment_count ?? 0;
  const customerReplyLocked = !isAdmin && request?.status === 'resolved';

  useEffect(() => {
    setRequest(null);
    setMessages([]);
    setPreviewAttachment(null);
    setHasOlder(false);
    pendingScrollRef.current = null;
    previousMessageCountRef.current = 0;
    wasNearBottomRef.current = true;
  }, [requestId]);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [requestResult, messageResult] = await Promise.all([
        getSupportRequest(requestId, currentUserId),
        listSupportMessages(requestId, currentUserId),
      ]);
      if (requestResult.error) throw requestResult.error;
      if (messageResult.error) throw messageResult.error;
      setRequest(requestResult.data);
      setHasOlder(messageResult.hasMore);
      setMessages((current) => mergeMessages(silent ? current : [], messageResult.data));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Conversation could not be loaded.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentUserId, requestId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const container = messageScrollRef.current;
    if (!container) return;
    if (pendingScrollRef.current) {
      const previous = pendingScrollRef.current;
      container.scrollTop = previous.top + container.scrollHeight - previous.height;
      pendingScrollRef.current = null;
    } else if (messages.length > previousMessageCountRef.current && wasNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
    previousMessageCountRef.current = messages.length;
    wasNearBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  }, [messages]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`support-thread-${requestId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customer_support_messages',
        filter: `request_id=eq.${requestId}`,
      }, () => void refresh(true))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'customer_support_requests',
        filter: `id=eq.${requestId}`,
      }, () => void refresh(true))
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [refresh, requestId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const loadOlder = async () => {
    const oldest = messages[0];
    const cursor: SupportMessageCursor | null = oldest
      ? { createdAt: oldest.created_at, id: oldest.id }
      : null;
    if (!cursor || loadingOlder) return;
    const container = messageScrollRef.current;
    if (container) pendingScrollRef.current = { height: container.scrollHeight, top: container.scrollTop };
    setLoadingOlder(true);
    setError('');
    try {
      const result = await listSupportMessages(requestId, currentUserId, cursor);
      if (result.error) throw result.error;
      setMessages((current) => mergeMessages(current, result.data));
      setHasOlder(result.hasMore);
    } catch (loadError) {
      pendingScrollRef.current = null;
      setError(loadError instanceof Error ? loadError.message : 'Older replies could not be loaded.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleFiles = (selected: FileList | null) => {
    if (!selected?.length) return;
    const next = [...files, ...Array.from(selected)];
    const validationError = validateSupportFiles(next, attachmentCount);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setError('');
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (customerReplyLocked) return;
    if (sending || (!draft.trim() && files.length === 0)) return;
    setSending(true);
    setError('');
    const result = await sendSupportMessage({
      requestId,
      message: draft,
      files,
      expectedUserId: currentUserId,
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      setDraft('');
      setFiles([]);
      await refresh(true);
      onChanged?.();
    }
    setSending(false);
  };

  const appendQuickReply = (chip: string) => {
    setDraft((current) => {
      const trimmed = current.trim();
      if (!trimmed) return chip;
      return `${trimmed} ${chip}`.slice(0, 2000);
    });
  };

  if (loading) {
    return <SupportConversationSkeleton />;
  }
  if (!request) {
    return (
      <div
        role="alert"
        className="rounded-3xl border border-rose-200 bg-rose-50/90 p-5 text-sm font-semibold text-rose-800 shadow-2xs"
      >
        {error || 'Support request not found.'}
      </div>
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/85 bg-white/95 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(15,23,42,0.08)]">
      <header className="border-b border-slate-100 bg-white/90 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#D9232D]">
              {request.category} · Ref {request.id.slice(0, 8).toUpperCase()}
              {request.order_number ? ` · Order #${request.order_number}` : ''}
            </p>
            <h3 className="mt-1 truncate text-[15px] font-black tracking-tight text-slate-900">
              {request.subject}
            </h3>
          </div>
          <span
            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10.5px] font-bold ${statusToneClass(request.status)}`}
          >
            {statusLabel(request.status)}
          </span>
        </div>
      </header>

      {error && (
        <p role="alert" className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 sm:mx-5">
          {error}
        </p>
      )}

      <div
        ref={messageScrollRef}
        onScroll={(event) => {
          const node = event.currentTarget;
          wasNearBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
        }}
        className="min-h-56 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50/80 to-rose-50/20 p-4 sm:p-5"
        aria-label="Support conversation"
      >
        {hasOlder && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingOlder && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              {loadingOlder ? 'Loading older replies…' : 'Load older replies'}
            </button>
          </div>
        )}
        {messages.map((message) => {
          const mine = isAdmin ? message.sender_role === 'admin' : message.sender_role === 'customer';
          return (
            <article key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[82%] ${
                  mine
                    ? 'rounded-br-md bg-gradient-to-br from-[#D9232D] to-[#B91822] text-white shadow-sm shadow-rose-900/10'
                    : 'rounded-bl-md border border-slate-200/90 bg-white text-slate-800 shadow-2xs'
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-bold opacity-80">
                  <span>{message.sender_role === 'admin' ? 'Workshop team' : customerName?.trim() || 'Customer'}</span>
                  <time dateTime={message.created_at} className="tabular-nums">
                    {formatDate(message.created_at)}
                  </time>
                </div>
                {message.message && (
                  <p className="whitespace-pre-wrap break-words text-[12.5px] leading-5">{message.message}</p>
                )}
                {message.attachments.length > 0 && (
                  <div className={`${message.message ? 'mt-2.5' : ''} space-y-2`}>
                    {message.attachments.map((attachment) =>
                      attachment.mime_type.startsWith('image/') ? (
                        <div
                          key={attachment.path}
                          className={`overflow-hidden rounded-xl border ${mine ? 'border-white/20 bg-white/15' : 'border-slate-200/75 bg-slate-50'}`}
                        >
                          {attachment.signed_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(attachment)}
                              className="block w-full cursor-zoom-in text-left"
                              aria-label={`Open ${attachment.name} full screen`}
                            >
                              <img
                                src={attachment.signed_url}
                                alt={attachment.name}
                                className="max-h-56 w-full bg-black/5 object-contain"
                                loading="lazy"
                              />
                              <span
                                className={`flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold ${mine ? 'text-white' : 'text-slate-700'}`}
                              >
                                <ImageIcon className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                                <span className="shrink-0 opacity-75">Tap to view</span>
                              </span>
                            </button>
                          ) : (
                            <span className="flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold opacity-60">
                              <ImageIcon className="h-4 w-4 shrink-0" />
                              Image unavailable
                            </span>
                          )}
                        </div>
                      ) : (
                        <a
                          key={attachment.path}
                          href={attachment.signed_url || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold ${mine ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-700'} ${attachment.signed_url ? 'hover:underline' : 'pointer-events-none opacity-60'}`}
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                          <span className="shrink-0 opacity-70 tabular-nums">
                            {(attachment.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </a>
                      ),
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
        <div aria-live="polite" className="sr-only">
          {messages.length} loaded messages
        </div>
      </div>

      <form onSubmit={(event) => void handleSend(event)} className="border-t border-slate-100 bg-white p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:p-4">
        {!customerReplyLocked && !isAdmin && (
          <div className="mb-2.5 flex flex-wrap gap-1.5" aria-label="Quick reply suggestions">
            {QUICK_REPLIES.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => appendQuickReply(chip)}
                className="min-h-9 rounded-lg border border-slate-200/85 bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50/70 hover:text-[#D9232D]"
              >
                + {chip}
              </button>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 text-[10.5px] font-semibold text-slate-700"
              >
                <span className="max-w-[160px] sm:max-w-48 truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-[#D9232D]"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <label
            className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50/50 hover:text-[#D9232D] ${customerReplyLocked || attachmentCount + files.length >= 3 ? 'pointer-events-none opacity-40' : ''}`}
            title={customerReplyLocked ? 'This request is resolved' : 'Attach a file'}
          >
            <Paperclip className="h-4 w-4" />
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              disabled={customerReplyLocked || attachmentCount + files.length >= 3}
              onChange={(event) => handleFiles(event.target.files)}
              aria-label="Attach a file"
            />
          </label>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={customerReplyLocked}
            maxLength={2000}
            rows={2}
            placeholder={
              customerReplyLocked
                ? 'This request is resolved. You cannot reply.'
                : isAdmin
                  ? 'Write a reply to the customer…'
                  : 'Write a reply…'
            }
            className="min-h-11 max-h-28 min-w-0 flex-1 resize-y rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-base sm:text-xs leading-5 text-slate-900 outline-none transition-colors focus:border-[#D9232D] focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            aria-label="Reply message"
          />
          <button
            type="submit"
            disabled={customerReplyLocked || sending || (!draft.trim() && files.length === 0) || attachmentCount + files.length > 3}
            className="banner-cta-shine group/cta flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 text-xs font-extrabold text-white shadow-sm shadow-rose-600/20 transition-all hover:brightness-105 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send reply"
          >
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />}
            <span className="hidden sm:inline">{customerReplyLocked ? 'Resolved' : sending ? 'Sending' : 'Send'}</span>
          </button>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>
            {customerReplyLocked
              ? 'This conversation is closed by the workshop.'
              : 'Private conversation · up to 3 files total, 5 MB each'}
          </span>
        </p>
      </form>

      {previewAttachment?.signed_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewAttachment.name}`}
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 p-3 text-white sm:p-6"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="flex items-center justify-between gap-3 pb-3" onClick={(event) => event.stopPropagation()}>
            <p className="min-w-0 truncate text-xs font-bold">{previewAttachment.name}</p>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={previewAttachment.signed_url}
                download={previewAttachment.name}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-slate-900"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                aria-label="Close image preview"
                className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img
              src={previewAttachment.signed_url}
              alt={previewAttachment.name}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
};
