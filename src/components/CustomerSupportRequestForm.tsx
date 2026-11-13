import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileText,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Package,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  createCustomerSupportRequest,
  listMySupportOrderChoices,
  validateSupportFiles,
  type SupportOrderChoice,
  type SupportRequestCategory,
} from '../lib/supabaseSupport';

const categories: SupportRequestCategory[] = [
  'Order issue',
  'Product question',
  'Payment',
  'Pickup / installation',
  'Other',
];

const QUICK_MESSAGE_PROMPTS: Record<SupportRequestCategory, string[]> = {
  'Order issue': ['Please share an update on my order status.', 'I need to adjust pickup details for this order.'],
  'Product question': ['Will this seat cover fit my bike model?', 'Do you have matching cushion thickness options?'],
  'Payment': ['My UPI payment was debited; please confirm status.', 'I need an updated invoice for my order.'],
  'Pickup / installation': ['What time can I visit for seat installation?', 'Is workshop fitting available today?'],
  'Other': ['Please call me back regarding my recent inquiry.'],
};

export const CustomerSupportRequestForm: React.FC<{
  isAuthenticated: boolean;
  expectedUserId?: string;
  initialRelatedOrderId?: string | null;
  onOpenLogin?: () => void;
  onOpenSupportRequest?: (requestId: string) => void;
  compact?: boolean;
}> = ({ isAuthenticated, expectedUserId, initialRelatedOrderId, onOpenLogin, onOpenSupportRequest, compact = false }) => {
  const [category, setCategory] = useState<SupportRequestCategory>('Order issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [orders, setOrders] = useState<SupportOrderChoice[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [requestId, setRequestId] = useState('');
  const messageLimit = compact ? 500 : 2000;
  const selectedOrder = orders.find((order) => order.id === relatedOrderId);
  const requestSubject = compact
    ? `${category === 'Order issue' ? 'Order / Pickup' : category}${selectedOrder ? ` · #${selectedOrder.order_number}` : ''}`
    : subject.trim();
  const canSubmit = compact
    ? message.trim().length >= 10
    : subject.trim().length >= 3 && message.trim().length >= 10;

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setOrdersLoading(true);
    void listMySupportOrderChoices(expectedUserId).then((result) => {
      if (!active) return;
      setOrders(result.data);
      if (initialRelatedOrderId && result.data.some((order) => order.id === initialRelatedOrderId)) {
        setRelatedOrderId(initialRelatedOrderId);
      }
      if (result.error) setError(result.error.message);
    }).catch(() => {
      if (active) setError('Your orders could not be loaded; you can still submit without linking an order.');
    }).finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [expectedUserId, initialRelatedOrderId, isAuthenticated]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setError('');
    setAttachmentError('');
    try {
      const result = await createCustomerSupportRequest({
        category,
        subject: requestSubject,
        message,
        relatedOrderId: relatedOrderId || null,
        files,
        expectedUserId,
      });
      if (result.error) {
        setError(result.error.message);
      } else if (result.id) {
        setRequestId(result.id);
        setAttachmentError(result.attachmentError?.message || '');
        setSubject('');
        setMessage('');
        setRelatedOrderId('');
        setFiles([]);
      } else {
        setError('Your request could not be confirmed. Please try again.');
      }
    } catch {
      setError('Support is temporarily unavailable. Please try again or use phone/WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFiles = (selected: FileList | null) => {
    if (!selected?.length) return;
    const next = [...files, ...Array.from(selected)];
    const validationError = validateSupportFiles(next);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFiles(next);
  };

  const applyQuickPrompt = (prompt: string) => {
    setMessage((current) => {
      const trimmed = current.trim();
      if (!trimmed) return prompt;
      const next = `${trimmed} ${prompt}`;
      return next.slice(0, messageLimit);
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40 p-5 shadow-[0_10px_28px_-14px_rgba(180,83,9,0.14)] backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 ring-1 ring-amber-200/80 shadow-2xs">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-black tracking-tight text-slate-900">Send a tracked support request</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Sign in so our team can link your message to your account and orders.
            </p>
            <button
              type="button"
              onClick={onOpenLogin}
              className="banner-cta-shine group/cta mt-3.5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-rose-600/20 transition-all hover:brightness-105 hover:shadow-md active:scale-95"
            >
              Sign in to continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (requestId) {
    return (
      <div
        className="rounded-3xl border border-emerald-200/85 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/50 p-5 shadow-[0_12px_30px_-14px_rgba(16,185,129,0.18)] backdrop-blur-md"
        role="status"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 ring-1 ring-emerald-200/80 shadow-2xs">
            <Check className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-black tracking-tight text-emerald-950">Request received</h4>
            <p className="mt-1 text-xs leading-5 text-emerald-800">
              Reference: <span className="font-mono font-bold">{requestId.slice(0, 8).toUpperCase()}</span>. Our team can now see your request in the support inbox.
            </p>
            {attachmentError && (
              <p role="alert" className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                Your request was saved, but an attachment could not be uploaded: {attachmentError}. Open the request to retry with a reply.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {onOpenSupportRequest && (
                <button
                  type="button"
                  onClick={() => onOpenSupportRequest(requestId)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-emerald-800"
                >
                  Open request
                </button>
              )}
              <button
                type="button"
                onClick={() => { setRequestId(''); setAttachmentError(''); }}
                className="min-h-10 px-2 text-xs font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
              >
                Send another request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const quickPrompts = QUICK_MESSAGE_PROMPTS[category] ?? [];

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="min-w-0 max-w-full space-y-4 overflow-hidden rounded-3xl border border-slate-200/85 bg-white/95 p-4 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(15,23,42,0.08)] sm:p-5"
    >
      {!compact && (
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-[15px] font-black tracking-tight text-slate-900">Send a support request</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            A private message to the workshop team. Please do not include card or payment details. / আপনার অনুরোধটি শুধু আপনি ও ওয়ার্কশপ টিম দেখতে পারবেন। কার্ড বা পেমেন্টের তথ্য দেবেন না।
          </p>
        </div>
      )}

      {/* Quick-Topic Selector Chips + Synchronized Accessible Select */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold tracking-wide text-slate-700">
            {compact ? 'Subject' : 'Category'}
          </span>
          <span className="text-[10.5px] font-semibold text-slate-400">Tap a topic or select below</span>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick topic selection">
          {categories.map((item) => {
            const active = category === item;
            const displayLabel = compact && item === 'Order issue' ? 'Order / Pickup' : item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`min-h-11 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#D9232D] bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white shadow-2xs'
                    : 'border-slate-200/85 bg-slate-50/90 text-slate-600 hover:border-rose-200 hover:bg-rose-50/50 hover:text-slate-900'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="sr-only">{compact ? 'Subject' : 'Category'}</span>
          <span className="relative block">
            {compact && <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
            <select
              aria-label={compact ? 'Support subject' : 'Support category'}
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportRequestCategory)}
              className={`min-h-11 w-full appearance-none rounded-xl border border-slate-200/90 bg-slate-50/80 py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-[#D9232D] focus:bg-white ${compact ? 'pl-10 pr-9 sm:text-[13px]' : 'px-3.5 pr-9 sm:text-xs'}`}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {compact && item === 'Order issue' ? 'Order / Pickup' : item}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>
      </div>

      {/* Upgraded Order Selector Card with Shimmer Loading State */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="support-order-select" className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
            <Package className="h-3.5 w-3.5 text-[#D9232D]" aria-hidden="true" />
            <span>{compact ? 'Order ID' : 'Link an order'}</span>
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          {selectedOrder && (
            <button
              type="button"
              onClick={() => setRelatedOrderId('')}
              className="text-[10.5px] font-bold text-[#D9232D] hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {ordersLoading ? (
          <div
            data-testid="support-order-picker-skeleton"
            aria-busy="true"
            className="space-y-1.5"
          >
            <div className="skeleton-shimmer h-10 w-full rounded-xl bg-slate-200/75" />
          </div>
        ) : null}

        <span className={`relative block ${ordersLoading ? 'sr-only' : ''}`}>
          {compact && <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
          <select
            id="support-order-select"
            aria-label={compact ? 'Order ID' : 'Related order'}
            value={relatedOrderId}
            onChange={(event) => setRelatedOrderId(event.target.value)}
            disabled={ordersLoading}
            className={`min-h-11 w-full appearance-none rounded-xl border border-slate-200/90 bg-white py-2.5 text-base font-semibold text-slate-900 outline-none transition-colors focus:border-[#D9232D] disabled:opacity-60 ${compact ? 'pl-10 pr-9 sm:text-[13px]' : 'px-3 pr-9 sm:text-xs'}`}
          >
            <option value="">
              {ordersLoading ? 'Loading your orders…' : compact ? 'Choose an order (optional)' : 'No order selected'}
            </option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                #{order.order_number} · {order.status.replaceAll('_', ' ')} · ₹{Number(order.total).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </span>

        {selectedOrder && !ordersLoading && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-[11px]">
            <span className="font-bold text-slate-800">
              Linked Order #{selectedOrder.order_number}
            </span>
            <span className="font-semibold text-[#D9232D] tabular-nums">
              {selectedOrder.status.replaceAll('_', ' ')} · ₹{Number(selectedOrder.total).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {!compact && (
        <label className="block space-y-1.5">
          <span className="text-[11px] font-extrabold text-slate-700">Subject</span>
          <input
            aria-label="Support subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            minLength={3}
            maxLength={120}
            required
            placeholder="What do you need help with?"
            className="min-h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-2.5 text-base sm:text-xs font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white"
          />
        </label>
      )}

      <div className="space-y-1.5">
        <label className="block space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-slate-700">Message</span>
            <span className="text-[10.5px] font-semibold text-slate-400 tabular-nums">
              {message.length}/{messageLimit}
            </span>
          </div>
          <textarea
            aria-label="Support message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={10}
            maxLength={messageLimit}
            required
            rows={4}
            placeholder={compact ? 'Tell us how we can help…' : 'Describe the issue and any helpful order details…'}
            className={`w-full resize-y rounded-2xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-3 text-base sm:text-[13px] leading-5 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white ${compact ? 'min-h-28' : ''}`}
          />
        </label>

        {quickPrompts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => applyQuickPrompt(prompt)}
                className="rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50/60 hover:text-[#D9232D]"
              >
                + {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {compact ? (
        <CompactSupportAttachments
          files={files}
          onFiles={handleFiles}
          onRemove={(index) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
        />
      ) : (
        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:border-rose-200 hover:bg-rose-50/40 hover:text-[#D9232D]">
            <Paperclip className="h-4 w-4" /> Add photos or PDF
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              aria-label="Attach photos or PDF"
            />
          </label>
          <p className="text-[10.5px] text-slate-500">Up to 3 files · 5 MB each · JPEG, PNG, WebP or PDF</p>
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/75 bg-white px-3 py-2 text-[11px] font-medium text-slate-700"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#D9232D]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {compact && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10.5px] leading-4 text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>Private message. Please don’t include payment details. / ব্যক্তিগত তথ্য বা কার্ডের বিবরণ দেবেন না।</span>
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className={`banner-cta-shine group/cta inline-flex min-h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-4 font-extrabold text-white shadow-md shadow-rose-600/25 transition-all hover:brightness-105 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'rounded-2xl py-3.5 text-[14px]' : 'rounded-2xl py-3 text-xs'}`}
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />}
        {submitting ? 'Sending…' : compact ? 'Send Message' : 'Submit request'}
      </button>
    </form>
  );
};

function CompactSupportAttachments({
  files,
  onFiles,
  onRemove,
}: {
  files: File[];
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/85 bg-slate-50/70 p-3">
      <div className="flex items-center gap-2.5 text-slate-700">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#D9232D] border border-slate-200/80">
          <ImagePlus className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11.5px] font-extrabold text-slate-800">
            Add photo or screenshot <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <p className="text-[10px] text-slate-500">JPG, PNG, WebP · up to 5 MB each</p>
        </div>
      </div>
      <div className="mt-2.5 flex max-w-full gap-2.5 overflow-x-auto pb-0.5">
        {files.length < 3 && (
          <label className="flex h-[78px] w-[78px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-rose-300 bg-white text-[#D9232D] transition-colors hover:bg-rose-50">
            <Plus className="h-5 w-5" />
            <span className="text-[9.5px] font-bold">Add Image</span>
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                onFiles(event.target.files);
                event.target.value = '';
              }}
              aria-label="Add support photos"
            />
          </label>
        )}
        {files.map((file, index) => (
          <SupportImagePreview
            key={`${file.name}-${file.lastModified}-${index}`}
            file={file}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>
    </div>
  );
}

function SupportImagePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-2xs">
      {preview ? (
        <img src={preview} alt={file.name} className="h-full w-full object-cover" />
      ) : (
        <ImagePlus className="m-auto h-6 w-6 text-slate-400" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm hover:text-[#D9232D]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
