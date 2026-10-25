import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, LoaderCircle, MessageCircle, Paperclip, Send, X } from 'lucide-react';
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

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const statusLabel = (status: string) =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

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

  if (loading) {
    return <div role="status" className="flex min-h-52 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading conversation…</div>;
  }
  if (!request) {
    return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error || 'Support request not found.'}</div>;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#D9232D]">{request.category} · Ref {request.id.slice(0, 8).toUpperCase()}</p>
            <h3 className="mt-1 truncate text-sm font-black text-slate-900">{request.subject}</h3>
            {request.order_number && <p className="mt-1 text-[11px] font-semibold text-slate-500">Order #{request.order_number}</p>}
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${request.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabel(request.status)}</span>
        </div>
      </header>

      {error && <p role="alert" className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 sm:mx-5">{error}</p>}

      <div ref={messageScrollRef} onScroll={(event) => { const node = event.currentTarget; wasNearBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }} className="min-h-48 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-5" aria-label="Support conversation">
        {hasOlder && (
          <div className="flex justify-center">
            <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 disabled:opacity-50">
              {loadingOlder && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              {loadingOlder ? 'Loading older replies…' : 'Load older replies'}
            </button>
          </div>
        )}
        {messages.map((message) => {
          const mine = isAdmin ? message.sender_role === 'admin' : message.sender_role === 'customer';
          return (
            <article key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[92%] rounded-2xl px-3.5 py-3 shadow-sm sm:max-w-[82%] ${mine ? 'rounded-br-md bg-[#D9232D] text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}>
                <div className="mb-1 flex items-center justify-between gap-4 text-[10px] font-bold opacity-75">
                  <span>{message.sender_role === 'admin' ? 'Workshop team' : customerName?.trim() || 'Customer'}</span>
                  <time dateTime={message.created_at}>{formatDate(message.created_at)}</time>
                </div>
                {message.message && <p className="whitespace-pre-wrap break-words text-xs leading-5">{message.message}</p>}
                {message.attachments.length > 0 && (
                  <div className={`${message.message ? 'mt-2' : ''} space-y-1.5`}>
                    {message.attachments.map((attachment) => (
                      attachment.mime_type.startsWith('image/') ? (
                        <div key={attachment.path} className={`overflow-hidden rounded-xl ${mine ? 'bg-white/15' : 'bg-slate-50'}`}>
                          {attachment.signed_url ? (
                            <button type="button" onClick={() => isAdmin && setPreviewAttachment(attachment)} disabled={!isAdmin} className={`block w-full text-left ${isAdmin ? 'cursor-zoom-in' : 'cursor-default'}`} aria-label={isAdmin ? `Open ${attachment.name} full screen` : attachment.name}>
                              <img src={attachment.signed_url} alt={attachment.name} className="max-h-56 w-full object-contain bg-black/5" loading="lazy" />
                              <span className={`flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold ${mine ? 'text-white' : 'text-slate-700'}`}><ImageIcon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{attachment.name}</span><span className="shrink-0 opacity-70">{isAdmin ? 'Tap to view' : 'Image'}</span></span>
                            </button>
                          ) : <span className="flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold opacity-60"><ImageIcon className="h-4 w-4 shrink-0" />Image unavailable</span>}
                        </div>
                      ) : (
                        <a key={attachment.path} href={attachment.signed_url || undefined} target="_blank" rel="noreferrer" className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold ${mine ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-700'} ${attachment.signed_url ? 'hover:underline' : 'pointer-events-none opacity-60'}`}>
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                          <span className="shrink-0 opacity-70">{(attachment.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
        <div aria-live="polite" className="sr-only">{messages.length} loaded messages</div>
      </div>

      <form onSubmit={(event) => void handleSend(event)} className="border-t border-slate-100 bg-white p-3 sm:p-4">
        {files.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-[10px] font-semibold text-slate-600"><span className="max-w-48 truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-800"><X className="h-3 w-3" /></button></span>)}</div>}
        <div className="flex items-end gap-2">
          <label className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 ${attachmentCount + files.length >= 3 ? 'pointer-events-none opacity-40' : ''}`} title="Attach a file">
            <Paperclip className="h-4 w-4" />
            <input ref={fileInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" multiple disabled={attachmentCount + files.length >= 3} onChange={(event) => handleFiles(event.target.files)} aria-label="Attach files" />
          </label>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder={isAdmin ? 'Write a reply to the customer…' : 'Write a reply…'} className="min-h-10 max-h-28 min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#D9232D]" aria-label="Reply message" />
          <button type="submit" disabled={sending || (!draft.trim() && files.length === 0) || attachmentCount + files.length > 3} className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#D9232D] px-3 text-xs font-bold text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send reply">
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}<span className="hidden sm:inline">{sending ? 'Sending' : 'Send'}</span>
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><MessageCircle className="h-3 w-3" /> Private conversation · up to 3 files total, 5 MB each</p>
      </form>
      {isAdmin && previewAttachment?.signed_url && (
        <div role="dialog" aria-modal="true" aria-label={`Preview ${previewAttachment.name}`} className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 p-3 text-white sm:p-6" onClick={() => setPreviewAttachment(null)}>
          <div className="flex items-center justify-between gap-3 pb-3" onClick={(event) => event.stopPropagation()}>
            <p className="min-w-0 truncate text-xs font-bold">{previewAttachment.name}</p>
            <div className="flex shrink-0 items-center gap-2">
              <a href={previewAttachment.signed_url} download={previewAttachment.name} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-slate-900"><Download className="h-4 w-4" />Download</a>
              <button type="button" onClick={() => setPreviewAttachment(null)} aria-label="Close image preview" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img src={previewAttachment.signed_url} alt={previewAttachment.name} className="max-h-full max-w-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </section>
  );
};
