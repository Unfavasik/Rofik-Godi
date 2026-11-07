import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Heart,
  Loader2,
  Mail,
  Package,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  cancelAccountDeletion,
  getMyAccountDeletionRequest,
  requestAccountDeletion,
  type AccountDeletionRequest,
} from '../lib/supabaseAccountDeletion';

interface AccountDeletionViewProps {
  onBack: () => void;
  isAuthenticated: boolean;
}

const REASONS = [
  'I no longer use the app',
  'I found another service',
  'Privacy concerns',
  'Too many notifications',
  'Other',
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

export const AccountDeletionView: React.FC<AccountDeletionViewProps> = ({
  onBack,
  isAuthenticated,
}) => {
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void getMyAccountDeletionRequest()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setRequest(data?.status === 'scheduled' ? data : null);
        setError(loadError);
      })
      .catch(() => {
        if (active) setError('We could not load your account status. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const daysRemaining = useMemo(() => {
    if (!request) return 7;
    return Math.max(
      0,
      Math.ceil((new Date(request.scheduled_for).getTime() - Date.now()) / 86_400_000),
    );
  }, [request]);

  const handleRequest = async () => {
    if (!understood) {
      setError('Please confirm that you understand the seven-day deletion period.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const result = await requestAccountDeletion(reason, feedback);
    if (result.error) {
      setError(result.error);
    } else if (result.scheduledFor) {
      setRequest({
        user_id: '',
        status: 'scheduled',
        requested_at: new Date().toISOString(),
        scheduled_for: result.scheduledFor,
        cancelled_at: null,
        reason: reason || null,
        feedback: feedback || null,
      });
      setNotice(
        'Your account deletion request is scheduled. You can cancel it any time during the next 7 days.',
      );
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    setSaving(true);
    setError('');
    const result = await cancelAccountDeletion();
    if (result.error || !result.cancelled) {
      setError(result.error || 'We could not cancel the request. Please try again.');
    } else {
      setRequest(null);
      setUnderstood(false);
      setNotice('Your deletion request was cancelled. Your account is safe.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-full flex-1 bg-[#FBFCFE] font-sans text-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to settings"
          className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-800 transition hover:bg-slate-100 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D9232D]">
            Account settings
          </p>
          <h1 className="text-lg font-black tracking-tight">Delete account</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[520px] space-y-4 px-4 pb-10 pt-5">
        {!isAuthenticated ? (
          <section className="rounded-[26px] border border-slate-100 bg-white p-6 text-center shadow-[0_8px_30px_-20px_rgba(15,23,42,0.3)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
              <UserRound className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-black">Sign in to manage your account</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Account deletion is available after you sign in.
            </p>
          </section>
        ) : loading ? (
          <div className="grid min-h-[360px] place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#D9232D]" />
          </div>
        ) : request ? (
          <>
            <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFF5F5] via-white to-[#FFF9F6] p-5 shadow-[0_12px_35px_-22px_rgba(217,35,45,0.35)] ring-1 ring-rose-100">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-100 text-[#D9232D]">
                  <Clock3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D9232D]">
                    Deletion scheduled
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight">
                    You have {daysRemaining} days to change your mind
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Your account is scheduled to be deleted on{' '}
                    <strong className="text-slate-900">{formatDate(request.scheduled_for)}</strong>.
                    Nothing is deleted while the grace period is active.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-3 text-xs font-semibold text-slate-600 ring-1 ring-rose-100">
                <CalendarDays className="h-4 w-4 text-[#D9232D]" /> Cancel before the date above to
                keep your account.
              </div>
            </section>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleCancel()}
              className="w-full rounded-2xl border border-[#D9232D] bg-white py-3.5 text-sm font-extrabold text-[#D9232D] transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Cancelling…' : 'Cancel deletion request'}
            </button>
          </>
        ) : (
          <>
            <section className="pt-2 text-center">
              <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-[30px] bg-gradient-to-br from-rose-100 to-rose-50 text-[#D9232D] shadow-[0_14px_30px_-18px_rgba(217,35,45,0.45)]">
                <Trash2 className="h-11 w-11" strokeWidth={1.8} />
                <span className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-white shadow-sm ring-1 ring-rose-100" />
              </div>
              <h2 className="mt-5 text-[27px] font-black tracking-[-0.03em] text-slate-950">
                Delete your account
              </h2>
              <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-slate-500">
                We’ll give you 7 days to change your mind before anything is permanently removed.
              </p>
            </section>

            <section className="rounded-[24px] border border-rose-100 bg-rose-50/70 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D9232D]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#B91C1C]">
                    This starts a 7-day grace period
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-rose-900/70">
                    Your account stays active during this period. You can cancel the request from
                    this page at any time.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]">
              <h3 className="text-base font-black">What will be removed?</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {[
                  {
                    icon: UserRound,
                    label: 'Profile information',
                    detail: 'Name, phone number and account details',
                  },
                  {
                    icon: Heart,
                    label: 'Saved items',
                    detail: 'Wishlist, preferences and saved alerts',
                  },
                  {
                    icon: Mail,
                    label: 'Messages and support',
                    detail: 'Notifications and support conversations',
                  },
                  {
                    icon: Package,
                    label: 'Order identity',
                    detail: 'Past orders stay only as anonymized records',
                  },
                ].map(({ icon: Icon, label, detail }) => (
                  <div key={label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#D9232D]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-800">
                Why are you leaving? <span className="font-medium text-slate-400">(optional)</span>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">Select a reason</option>
                  {REASONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-extrabold text-slate-800">
                <span className="font-medium text-slate-400">Additional feedback (optional)</span>
                <textarea
                  value={feedback}
                  maxLength={300}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={3}
                  placeholder="Tell us how we can improve"
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100"
                />
                <span className="mt-1 block text-right text-[10px] font-medium text-slate-400">
                  {feedback.length}/300
                </span>
              </label>
            </section>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <input
                type="checkbox"
                checked={understood}
                onChange={(event) => setUnderstood(event.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-[#D9232D] focus:ring-[#D9232D]"
              />
              <span className="text-xs leading-relaxed text-slate-600">
                I understand that this will schedule my account for deletion after 7 days.
              </span>
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleRequest()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D9232D] py-3.5 text-sm font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(217,35,45,0.75)] transition hover:bg-[#b91c27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {saving ? 'Scheduling…' : 'Schedule account deletion'}
            </button>
          </>
        )}
        {notice && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-3.5 py-3 text-xs font-semibold leading-relaxed text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-amber-50 px-3.5 py-3 text-xs font-semibold leading-relaxed text-amber-900"
          >
            {error}
          </p>
        )}
        <p className="px-3 text-center text-[10px] leading-relaxed text-slate-400">
          Need help before deciding? Contact the Rofik Godi Centre team from Account settings.
        </p>
      </main>
    </div>
  );
};
