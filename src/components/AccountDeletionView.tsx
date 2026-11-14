import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BellOff,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  HelpCircle,
  Loader2,
  Mail,
  Package,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  cancelAccountDeletion,
  getMyAccountDeletionRequest,
  requestAccountDeletion,
  sendAccountDeletionEmail,
  type AccountDeletionRequest,
} from '../lib/supabaseAccountDeletion';

export interface AccountDeletionViewProps {
  onBack: () => void;
  isAuthenticated: boolean;
  onOpenContactSupport?: () => void;
  onOpenNotificationSettings?: () => void;
  onOpenPrivacyPage?: () => void;
  onOpenOrders?: () => void;
}

const DELETION_REASONS = [
  {
    id: 'I no longer use the app',
    label: 'I no longer use the app',
    hint: 'Finished shopping or switched bikes',
  },
  {
    id: 'Too many notifications',
    label: 'Too many notifications',
    hint: 'Offers or inbox alerts feel noisy',
  },
  {
    id: 'Privacy concerns',
    label: 'Privacy concerns',
    hint: 'Want tighter control over account data',
  },
  {
    id: 'I found another service',
    label: 'I found another service',
    hint: 'Using a different store or workshop',
  },
  {
    id: 'Other',
    label: 'Other reason',
    hint: 'Share details in feedback below',
  },
] as const;

const GRACE_PERIOD_DAYS = 7;

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(typeof value === 'string' ? new Date(value) : value);

export const AccountDeletionView: React.FC<AccountDeletionViewProps> = ({
  onBack,
  isAuthenticated,
  onOpenContactSupport,
  onOpenNotificationSettings,
  onOpenPrivacyPage,
  onOpenOrders,
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

  const projectedDeletionDate = useMemo(
    () => formatDate(new Date(Date.now() + GRACE_PERIOD_DAYS * 86_400_000)),
    [],
  );

  const daysRemaining = useMemo(() => {
    if (!request) return GRACE_PERIOD_DAYS;
    return Math.max(
      0,
      Math.ceil((new Date(request.scheduled_for).getTime() - Date.now()) / 86_400_000),
    );
  }, [request]);

  const graceProgressPercent = useMemo(() => {
    if (!request) return 0;
    const elapsed = Math.min(GRACE_PERIOD_DAYS, Math.max(0, GRACE_PERIOD_DAYS - daysRemaining));
    return Math.round((elapsed / GRACE_PERIOD_DAYS) * 100);
  }, [daysRemaining, request]);

  const handleRequest = async () => {
    if (!understood) {
      setError('Confirm the checkbox above before scheduling account deletion.');
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
        'Deletion request scheduled. Your account remains active and you can cancel any time over the next 7 days.',
      );
      const emailResult = await sendAccountDeletionEmail('scheduled');
      if (!emailResult.sent) setError(emailResult.error);
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
      setNotice('Deletion request cancelled. Your account and saved items remain active.');
      const emailResult = await sendAccountDeletionEmail('cancelled');
      if (!emailResult.sent) setError(emailResult.error);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-full w-full max-w-full flex-1 overflow-x-hidden bg-[#F8FAFC] font-sans text-slate-900">
      {/* Sticky Sub-Page Header */}
      <header
        data-purpose="page-header"
        className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md"
      >
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to settings"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-800 transition-colors hover:bg-rose-50 hover:text-[#D9232D] active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9232D]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D9232D]">
              Account &amp; Privacy
            </p>
            <h1 className="truncate text-lg sm:text-xl font-black tracking-tight text-slate-900">
              Delete account
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-[max(2.75rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-7">
        {/* Status & Validation Feedback */}
        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-semibold leading-relaxed text-emerald-900"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm font-semibold leading-relaxed text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <span>{error}</span>
          </div>
        )}

        {!isAuthenticated ? (
          <section className="mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
              <UserRound className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">
              Sign in to manage account deletion
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Self-serve account deletion is available once you sign in to your customer profile.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-5 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-100 cursor-pointer"
            >
              Back to settings
            </button>
          </section>
        ) : loading ? (
          <div
            role="status"
            aria-label="Loading account deletion status"
            className="grid grid-cols-1 gap-5 lg:grid-cols-12"
          >
            <div className="space-y-4 lg:col-span-5">
              <div className="skeleton-shimmer h-40 rounded-2xl border border-slate-200/70 bg-white" />
              <div className="skeleton-shimmer h-56 rounded-2xl border border-slate-200/70 bg-white" />
            </div>
            <div className="space-y-4 lg:col-span-7">
              <div className="skeleton-shimmer h-80 rounded-2xl border border-slate-200/70 bg-white" />
            </div>
          </div>
        ) : request ? (
          /* ===================== SCHEDULED GRACE PERIOD STATE ===================== */
          <div className="mx-auto max-w-2xl space-y-5">
            <section className="rounded-2xl border border-rose-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3.5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
                    <Clock3 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D9232D]">
                      Grace period active
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 tabular-nums">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left before permanent removal
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      Nothing has been deleted yet. Your account is scheduled for permanent removal on{' '}
                      <strong className="font-bold text-slate-900 tabular-nums">
                        {formatDate(request.scheduled_for)}
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              </div>

              {/* 7-Day Grace Progress Track */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2 tabular-nums">
                  <span>Requested {formatDate(request.requested_at)}</span>
                  <span>Deletes {formatDate(request.scheduled_for)}</span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-2 w-full overflow-hidden rounded-full bg-rose-100"
                >
                  <div
                    className="h-full rounded-full bg-[#D9232D] transition-all duration-300"
                    style={{ width: `${Math.max(8, graceProgressPercent)}%` }}
                  />
                </div>

                {request.reason && (
                  <p className="mt-3 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Selected reason:</span>{' '}
                    {request.reason}
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#D9232D]" />
                <span>
                  Cancel anytime before {formatDate(request.scheduled_for)} to keep your orders,
                  wishlist, and profile intact.
                </span>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={onBack}
                className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Back to settings
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleCancel()}
                className="min-h-12 flex-[1.4] flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Restoring account…' : 'Keep my account & cancel deletion'}
              </button>
            </div>
          </div>
        ) : (
          /* ===================== REQUEST DELETION FLOW ===================== */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Clear Consequence Summary & 7-Day Timeline */}
            <div className="space-y-4 lg:col-span-5">
              {/* Calm Introductory Hero Card */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <div className="flex items-start gap-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#D9232D]">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black tracking-tight text-slate-950">
                      Before you delete your account
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600">
                      Submitting this starts a{' '}
                      <strong className="font-bold text-slate-900">7-day grace period</strong>.
                      Your data stays intact until{' '}
                      <strong className="font-bold text-slate-900 tabular-nums">
                        {projectedDeletionDate}
                      </strong>
                      .
                    </p>
                  </div>
                </div>

                {/* 3-Step Timeline */}
                <ol
                  aria-label="Account deletion timeline"
                  className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs"
                >
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-50 font-extrabold text-[#D9232D] tabular-nums">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">Request scheduled today</p>
                      <p className="text-slate-600">
                        You receive an email confirmation with your cancellation link.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-extrabold text-slate-700 tabular-nums">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">7-day grace window</p>
                      <p className="text-slate-600">
                        Your account remains active and you can cancel with one tap.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-extrabold text-slate-700 tabular-nums">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">
                        Permanent removal ({projectedDeletionDate})
                      </p>
                      <p className="text-slate-600">
                        Profile and saved personal data are permanently erased.
                      </p>
                    </div>
                  </li>
                </ol>
              </section>

              {/* Transparent Data Impact Breakdown */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                <h3 className="text-sm font-extrabold text-slate-900">
                  What happens to your data
                </h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {[
                    {
                      icon: UserRound,
                      tone: 'bg-rose-50 text-[#D9232D]',
                      label: 'Profile & phone removed',
                      detail: 'Name, mobile number, and sign-in credentials',
                    },
                    {
                      icon: Heart,
                      tone: 'bg-rose-50 text-[#D9232D]',
                      label: 'Wishlist & stock alerts cleared',
                      detail: 'Saved covers, preferences, and alert subscriptions',
                    },
                    {
                      icon: Mail,
                      tone: 'bg-rose-50 text-[#D9232D]',
                      label: 'Inbox & support threads removed',
                      detail: 'Notifications and chat conversations',
                    },
                    {
                      icon: Package,
                      tone: 'bg-slate-100 text-slate-700',
                      label: 'Order records anonymized',
                      detail: 'Retained without your name or contact info for billing records',
                    },
                  ].map(({ icon: Icon, tone, label, detail }) => (
                    <div key={label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tone}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{label}</p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-slate-600">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Alternatives Before Deleting */}
              {(onOpenNotificationSettings || onOpenContactSupport || onOpenPrivacyPage || onOpenOrders) && (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Try these quick fixes instead
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Solve common issues without losing your saved orders or wishlist.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {onOpenNotificationSettings && (
                      <button
                        type="button"
                        onClick={onOpenNotificationSettings}
                        className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 transition-colors hover:border-rose-200 hover:bg-rose-50/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <BellOff className="h-4 w-4 text-[#D9232D]" />
                          Mute promotional notifications
                        </span>
                        <span className="text-[11px] font-semibold text-[#D9232D]">Manage</span>
                      </button>
                    )}
                    {onOpenOrders && (
                      <button
                        type="button"
                        onClick={onOpenOrders}
                        className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 transition-colors hover:border-rose-200 hover:bg-rose-50/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Package className="h-4 w-4 text-slate-700" />
                          Check open order status
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">View</span>
                      </button>
                    )}
                    {onOpenContactSupport && (
                      <button
                        type="button"
                        onClick={onOpenContactSupport}
                        className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 transition-colors hover:border-rose-200 hover:bg-rose-50/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <HelpCircle className="h-4 w-4 text-slate-700" />
                          Talk to workshop support
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">Contact</span>
                      </button>
                    )}
                    {onOpenPrivacyPage && (
                      <button
                        type="button"
                        onClick={onOpenPrivacyPage}
                        className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs font-bold text-slate-800 transition-colors hover:border-rose-200 hover:bg-rose-50/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          Review our privacy policy
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">Read</span>
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Interactive Feedback & Explicit Confirmation */}
            <div className="space-y-4 lg:col-span-7">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 space-y-5">
                {/* Reason Selection */}
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Why are you leaving?
                    </h2>
                    <span className="text-[11px] font-medium text-slate-500">Optional</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Your response helps us improve seat fitment, orders, and alerts.
                  </p>

                  <div
                    role="radiogroup"
                    aria-label="Reason for leaving"
                    className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    {DELETION_REASONS.map((item) => {
                      const isSelected = reason === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setReason(isSelected ? '' : item.id)}
                          className={`min-h-11 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#D9232D] bg-rose-50/60 text-slate-900'
                              : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-800'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-[#D9232D] bg-[#D9232D]'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-bold leading-snug">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">
                              {item.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Contextual Shortcut Based on Selected Reason */}
                  {reason === 'Too many notifications' && onOpenNotificationSettings && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-slate-800">
                        You can turn off promotional alerts without deleting your account.
                      </span>
                      <button
                        type="button"
                        onClick={onOpenNotificationSettings}
                        className="font-extrabold text-[#D9232D] underline underline-offset-2 cursor-pointer"
                      >
                        Adjust notification settings
                      </button>
                    </div>
                  )}

                  {reason === 'Privacy concerns' && onOpenPrivacyPage && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-slate-800">
                        Review exactly what Rofik Godi Centre stores and why.
                      </span>
                      <button
                        type="button"
                        onClick={onOpenPrivacyPage}
                        className="font-extrabold text-[#D9232D] underline underline-offset-2 cursor-pointer"
                      >
                        Open privacy policy
                      </button>
                    </div>
                  )}
                </div>

                {/* Additional Feedback */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      htmlFor="delete-account-feedback"
                      className="text-xs font-extrabold text-slate-900"
                    >
                      Additional feedback
                    </label>
                    <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                      Optional · {feedback.length}/300
                    </span>
                  </div>
                  <textarea
                    id="delete-account-feedback"
                    value={feedback}
                    maxLength={300}
                    onChange={(event) => setFeedback(event.target.value)}
                    rows={3}
                    placeholder="Tell us what could have made your experience better"
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-base sm:text-sm font-medium text-slate-800 outline-hidden transition placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                {/* Explicit Acknowledgement & Dual Actions */}
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition-colors hover:border-rose-200">
                    <input
                      type="checkbox"
                      checked={understood}
                      onChange={(event) => {
                        setUnderstood(event.target.checked);
                        if (event.target.checked && error) setError('');
                      }}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#D9232D] text-[#D9232D] focus:ring-[#D9232D]"
                    />
                    <span className="text-xs leading-relaxed text-slate-700">
                      I understand that this schedules my account for permanent deletion on{' '}
                      <strong className="font-bold text-slate-900 tabular-nums">
                        {projectedDeletionDate}
                      </strong>
                      , and I can cancel any time within 7 days.
                    </span>
                  </label>

                  <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                    <button
                      type="button"
                      onClick={onBack}
                      className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
                    >
                      Keep my account
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleRequest()}
                      className={`min-h-12 flex-[1.3] flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                        understood
                          ? 'bg-[#D9232D] text-white shadow-[0_10px_22px_-12px_rgba(217,35,45,0.75)] hover:bg-[#B91822]'
                          : 'bg-rose-100 text-[#B91822] hover:bg-rose-200/80'
                      }`}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {saving ? 'Scheduling deletion…' : 'Schedule account deletion'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
