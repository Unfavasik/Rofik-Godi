import React, { useState } from 'react';
import { Check, LoaderCircle, LockKeyhole, Send } from 'lucide-react';
import { createCustomerSupportRequest, type SupportRequestCategory } from '../lib/supabaseCustomer';

const categories: SupportRequestCategory[] = [
  'Order issue',
  'Product question',
  'Payment',
  'Pickup / installation',
  'Other',
];

export const CustomerSupportRequestForm: React.FC<{
  isAuthenticated: boolean;
  onOpenLogin?: () => void;
}> = ({ isAuthenticated, onOpenLogin }) => {
  const [category, setCategory] = useState<SupportRequestCategory>('Order issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await createCustomerSupportRequest({ category, subject, message });
      if (result.error) {
        setError(result.error.message);
      } else if (result.id) {
        setRequestId(result.id);
        setSubject('');
        setMessage('');
      } else {
        setError('Your request could not be confirmed. Please try again.');
      }
    } catch {
      setError('Support is temporarily unavailable. Please try again or use phone/WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
            <LockKeyhole className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900">Send a tracked support request</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Sign in so our team can link your message to your account and orders.
            </p>
            <button
              type="button"
              onClick={onOpenLogin}
              className="mt-3 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#B91C1C]"
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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700">
            <Check className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-emerald-900">Request received</h4>
            <p className="mt-1 text-xs leading-5 text-emerald-800">
              Reference: {requestId.slice(0, 8).toUpperCase()}. Our team can now see your message in
              the support inbox.
            </p>
            <button
              type="button"
              onClick={() => setRequestId('')}
              className="mt-3 text-xs font-bold text-emerald-800 underline"
            >
              Send another request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div>
        <h4 className="text-sm font-bold text-slate-900">Send a support request</h4>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          A private message to the workshop team. Please do not include card details.
        </p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Category</span>
        <select
          aria-label="Support category"
          value={category}
          onChange={(event) => setCategory(event.target.value as SupportRequestCategory)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#D9232D]"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Subject</span>
        <input
          aria-label="Support subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          minLength={3}
          maxLength={120}
          required
          placeholder="What do you need help with?"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#D9232D]"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">Message</span>
        <textarea
          aria-label="Support message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={10}
          maxLength={2000}
          required
          rows={4}
          placeholder="Describe the issue and any helpful order details…"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#D9232D]"
        />
        <span className="block text-right text-[10px] text-slate-400">{message.length}/2000</span>
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || subject.trim().length < 3 || message.trim().length < 10}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submitting ? 'Sending…' : 'Submit request'}
      </button>
    </form>
  );
};
