import React, { useEffect, useState } from 'react';
import { Check, FileText, LoaderCircle, LockKeyhole, Paperclip, Send, X } from 'lucide-react';
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

export const CustomerSupportRequestForm: React.FC<{
  isAuthenticated: boolean;
  expectedUserId?: string;
  onOpenLogin?: () => void;
  onOpenSupportRequest?: (requestId: string) => void;
}> = ({ isAuthenticated, expectedUserId, onOpenLogin, onOpenSupportRequest }) => {
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

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setOrdersLoading(true);
    void listMySupportOrderChoices(expectedUserId).then((result) => {
      if (!active) return;
      setOrders(result.data);
      if (result.error) setError(result.error.message);
    }).catch(() => {
      if (active) setError('Your orders could not be loaded; you can still submit without linking an order.');
    }).finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [expectedUserId, isAuthenticated]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setAttachmentError('');
    try {
      const result = await createCustomerSupportRequest({
        category,
        subject,
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

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700"><LockKeyhole className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900">Send a tracked support request</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600">Sign in so our team can link your message to your account and orders.</p>
            <button type="button" onClick={onOpenLogin} className="mt-3 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#B91C1C]">Sign in to continue</button>
          </div>
        </div>
      </div>
    );
  }

  if (requestId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700"><Check className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-emerald-900">Request received</h4>
            <p className="mt-1 text-xs leading-5 text-emerald-800">Reference: {requestId.slice(0, 8).toUpperCase()}. Our team can now see your request in the support inbox.</p>
            {attachmentError && <p role="alert" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">Your request was saved, but an attachment could not be uploaded: {attachmentError}. Open the request to retry with a reply.</p>}
            {onOpenSupportRequest && <button type="button" onClick={() => onOpenSupportRequest(requestId)} className="mt-3 rounded-xl bg-emerald-800 px-3.5 py-2.5 text-xs font-bold text-white">Open request</button>}
            <button type="button" onClick={() => { setRequestId(''); setAttachmentError(''); }} className="ml-3 mt-3 text-xs font-bold text-emerald-800 underline">Send another request</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Send a support request</h4>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">A private message to the workshop team. Please do not include card or payment details. / আপনার অনুরোধটি শুধু আপনি ও ওয়ার্কশপ টিম দেখতে পারবেন। কার্ড বা পেমেন্টের তথ্য দেবেন না।</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Category</span>
        <select aria-label="Support category" value={category} onChange={(event) => setCategory(event.target.value as SupportRequestCategory)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#D9232D]">
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Link an order <span className="font-normal text-slate-400">(optional)</span></span>
        <select aria-label="Related order" value={relatedOrderId} onChange={(event) => setRelatedOrderId(event.target.value)} disabled={ordersLoading} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#D9232D] disabled:opacity-60">
          <option value="">{ordersLoading ? 'Loading your orders…' : 'No order selected'}</option>
          {orders.map((order) => <option key={order.id} value={order.id}>#{order.order_number} · {order.status.replaceAll('_', ' ')} · ₹{Number(order.total).toLocaleString('en-IN')}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Subject</span>
        <input aria-label="Support subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={120} required placeholder="What do you need help with?" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#D9232D]" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Message</span>
        <textarea aria-label="Support message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={2000} required rows={4} placeholder="Describe the issue and any helpful order details…" className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#D9232D]" />
        <span className="block text-right text-[10px] text-slate-400">{message.length}/2000</span>
      </label>
      <div className="space-y-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <Paperclip className="h-4 w-4" /> Add photos or PDF
          <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(event) => handleFiles(event.target.files)} aria-label="Attach photos or PDF" />
        </label>
        <p className="text-[10px] text-slate-400">Up to 3 files · 5 MB each · JPEG, PNG, WebP or PDF</p>
        {files.length > 0 && <ul className="space-y-1">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[10px] text-slate-600"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><X className="h-3.5 w-3.5" /></button></li>)}</ul>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      <button type="submit" disabled={submitting || subject.trim().length < 3 || message.trim().length < 10} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Sending…' : 'Submit request'}
      </button>
    </form>
  );
};
