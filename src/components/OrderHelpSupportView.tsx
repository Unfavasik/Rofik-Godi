import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Headset,
  Heart,
  HelpCircle,
  Info,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Package,
  PackageOpen,
  Paperclip,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { CustomerOrderRecord } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import {
  ORDER_HELP_TOPICS,
  buildOrderHelpWhatsappUrl,
  filterOrderSupportRequests,
  getOrderHelpStatusGuidance,
  getTopicResolutionGuide,
  type OrderHelpTopicId,
} from '../lib/orderHelpLogic';
import {
  createCustomerSupportRequest,
  listMySupportRequests,
  validateSupportFiles,
  type SupportRequestCategory,
  type SupportRequestRecord,
} from '../lib/supabaseSupport';

export interface OrderHelpSupportViewProps {
  order: CustomerOrderRecord;
  currentUserId?: string;
  isAuthenticated?: boolean;
  onBack: () => void;
  onOpenLiveChat: (
    orderId?: string,
    options?: {
      category?: SupportRequestCategory;
      subject?: string;
      message?: string;
    },
  ) => void;
  onOpenSupportRequest?: (requestId: string) => void;
  onOpenSupportRequests?: () => void;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
};

const statusPillTone = (tone: 'emerald' | 'blue' | 'amber' | 'rose') => {
  if (tone === 'rose') return 'border-rose-200/90 bg-rose-50/90 text-rose-700';
  if (tone === 'emerald') return 'border-emerald-200/90 bg-emerald-50/90 text-emerald-700';
  if (tone === 'blue') return 'border-blue-200/90 bg-blue-50/90 text-blue-700';
  return 'border-amber-200/90 bg-amber-50/90 text-amber-800';
};

const statusBannerTone = (tone: 'emerald' | 'blue' | 'amber' | 'rose') => {
  if (tone === 'rose') return 'border-rose-200/80 bg-rose-50/75 text-rose-900';
  if (tone === 'emerald') return 'border-emerald-200/80 bg-emerald-50/75 text-emerald-900';
  if (tone === 'blue') return 'border-blue-200/80 bg-blue-50/75 text-blue-900';
  return 'border-amber-200/80 bg-amber-50/75 text-amber-900';
};

const topicIcons: Record<
  OrderHelpTopicId,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  order_status: Package,
  payment_issue: CreditCard,
  change_order: ArrowLeftRight,
  pickup_store: Store,
  return_exchange: PackageOpen,
  other_help: HelpCircle,
};

const topicIconTone: Record<OrderHelpTopicId, string> = {
  order_status: 'border-rose-200/80 bg-rose-50 text-[#D9232D]',
  payment_issue: 'border-amber-200/80 bg-amber-50 text-amber-700',
  change_order: 'border-violet-200/80 bg-violet-50 text-violet-700',
  pickup_store: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  return_exchange: 'border-blue-200/80 bg-blue-50 text-blue-700',
  other_help: 'border-sky-200/80 bg-sky-50 text-sky-700',
};

const ticketStatusBadge = (status: SupportRequestRecord['status']) => {
  if (status === 'resolved') {
    return {
      label: 'Resolved',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (status === 'in_progress') {
    return {
      label: 'In Progress',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    };
  }
  return {
    label: 'Open',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  };
};

export function OrderHelpSupportView({
  order,
  currentUserId,
  isAuthenticated = true,
  onBack,
  onOpenLiveChat,
  onOpenSupportRequest,
  onOpenSupportRequests,
}: OrderHelpSupportViewProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<OrderHelpTopicId>('order_status');
  const [subject, setSubject] = useState(() =>
    getTopicResolutionGuide('order_status', order).defaultSubject,
  );
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [orderTickets, setOrderTickets] = useState<SupportRequestRecord[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const resolutionPanelRef = useRef<HTMLElement | null>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const items = useMemo(() => order.order_items || [], [order.order_items]);
  const firstImage = items.find((item) => item.image_url)?.image_url || null;
  const statusGuidance = useMemo(() => getOrderHelpStatusGuidance(order), [order]);
  const resolution = useMemo(
    () => getTopicResolutionGuide(selectedTopicId, order),
    [selectedTopicId, order],
  );

  const phoneHref = `tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`;
  const whatsappHref = useMemo(
    () => buildOrderHelpWhatsappUrl(WORKSHOP_INFO.whatsapp, order, selectedTopicId, message),
    [order, selectedTopicId, message],
  );
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}`;

  useEffect(() => {
    setSubject(getTopicResolutionGuide(selectedTopicId, order).defaultSubject);
  }, [selectedTopicId, order]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;
    let active = true;
    setTicketsLoading(true);
    void listMySupportRequests(currentUserId)
      .then((res) => {
        if (!active) return;
        setOrderTickets(filterOrderSupportRequests(res.data, order));
      })
      .catch(() => {
        // Non-blocking: user can still submit or open chat if ticket history fails.
      })
      .finally(() => {
        if (active) setTicketsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUserId, isAuthenticated, order, createdTicketId]);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked; the visible order ID remains available.
    }
  };

  const handleSelectTopic = (topicId: OrderHelpTopicId) => {
    setSelectedTopicId(topicId);
    setCreatedTicketId(null);
    setSubmitError('');
    const nextGuide = getTopicResolutionGuide(topicId, order);
    setSubject(nextGuide.defaultSubject);
    if (typeof window !== 'undefined' && resolutionPanelRef.current) {
      const prefersReducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      resolutionPanelRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  };

  const handlePickPrompt = (promptText: string) => {
    setMessage(promptText);
    setCreatedTicketId(null);
    setSubmitError('');
    window.setTimeout(() => {
      messageTextareaRef.current?.focus();
    }, 60);
  };

  const handleFileChange = (selected: FileList | null) => {
    if (!selected?.length) return;
    const incoming = Array.from(selected);
    const validation = validateSupportFiles(incoming, files.length);
    if (validation) {
      setFileError(validation);
      return;
    }
    setFileError('');
    setFiles((prev) => [...prev, ...incoming].slice(0, 3));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
    setFileError('');
  };

  const canSubmitInline =
    isAuthenticated && subject.trim().length >= 3 && message.trim().length >= 10 && !submitting;

  const handleInlineSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      onOpenLiveChat(order.id, {
        category: resolution.topic.supportCategory,
        subject: subject.trim(),
        message: message.trim(),
      });
      return;
    }
    if (!canSubmitInline) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await createCustomerSupportRequest({
        category: resolution.topic.supportCategory,
        subject: subject.trim(),
        message: message.trim(),
        relatedOrderId: order.id || null,
        files,
        expectedUserId: currentUserId,
      });
      if (result.error) {
        setSubmitError(result.error.message);
      } else if (result.id) {
        setCreatedTicketId(result.id);
        setMessage('');
        setFiles([]);
        if (result.attachmentError) {
          setFileError(result.attachmentError.message);
        }
      } else {
        setSubmitError('Could not confirm your support ticket. Please try again.');
      }
    } catch {
      setSubmitError('Support service is temporarily unavailable. Please try WhatsApp or Call below.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] w-full max-w-full overflow-y-auto overflow-x-hidden bg-[#F8FAFC] bg-[radial-gradient(circle_at_top_left,_rgba(217,35,45,0.085),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.075),_transparent_44%)] font-sans text-slate-800"
      role="dialog"
      aria-modal="true"
      aria-label="Help and support"
    >
      {/* Classic Glass Sticky Top Bar */}
      <header
        data-testid="order-help-topbar"
        className="classic-glass sticky top-0 z-30 border-b border-white/85 bg-gradient-to-r from-white/90 via-white/82 to-rose-50/55 px-3 py-3 shadow-[0_10px_30px_-16px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/95 bg-white/85 text-slate-800 shadow-[0_6px_16px_-6px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] backdrop-blur-md transition-all duration-200 hover:-translate-x-0.5 hover:border-rose-200/90 hover:bg-rose-50/90 hover:text-[#D9232D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.25] transition-transform duration-200 group-hover:-translate-x-0.5" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="truncate text-base font-black leading-tight tracking-tight text-slate-950 sm:text-lg">
                  Help &amp; Support
                </h1>
                <span className="inline-flex items-center rounded-lg border border-rose-200/80 bg-rose-50/90 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#D9232D] tabular-nums">
                  #{order.order_number}
                </span>
              </div>
              <p className="mt-0.5 flex items-center text-[11px] font-medium text-slate-500">
                We&apos;re here to assist you{' '}
                <Heart className="ml-1 h-3 w-3 shrink-0 fill-[#D9232D] text-[#D9232D]" />
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-white/90 bg-white/70 p-1 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
            {onOpenSupportRequests && (
              <button
                type="button"
                onClick={onOpenSupportRequests}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/90 bg-white/90 px-2.5 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:border-rose-200 hover:text-[#D9232D]"
              >
                <Ticket className="h-3.5 w-3.5 text-[#D9232D]" />
                <span className="hidden sm:inline">My Tickets</span>
                {orderTickets.length > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#D9232D] px-1 text-[9px] font-extrabold text-white tabular-nums">
                    {orderTickets.length}
                  </span>
                )}
              </button>
            )}
            <div className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-2.5 text-[11px] font-extrabold text-emerald-700">
              <Headset className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden min-[380px]:inline">Workshop Desk</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col space-y-5 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
        {/* Classic Glass Current Order Context & Status Guidance Card */}
        <section
          aria-label="Current Order Status"
          className="classic-glass overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-br from-white/95 via-white/88 to-rose-50/40 p-4 shadow-[0_16px_38px_-18px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
              <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/95 bg-slate-100 p-1 shadow-xs">
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt="Order item"
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <Package className="h-8 w-8 text-slate-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                    Order ID
                  </span>
                  <span className="font-mono text-sm font-black tracking-tight text-slate-950 tabular-nums">
                    #{order.order_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyOrderId()}
                    aria-label={copied ? 'Order ID copied' : 'Copy Order ID'}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200/85 bg-white/90 px-2 text-[10px] font-bold text-slate-600 shadow-2xs transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-[#D9232D]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-1 truncate text-xs font-extrabold text-slate-900 sm:text-sm">
                  {items.map((item) => item.product_name).join(' · ') || 'Custom Seat Cover Order'}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-slate-500 tabular-nums">
                  <span>{formatDate(order.created_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {items.length} {items.length === 1 ? 'Item' : 'Items'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-extrabold text-slate-900">
                    ₹{Number(order.total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <span
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold shadow-2xs ${statusPillTone(
                statusGuidance.tone,
              )}`}
            >
              {statusGuidance.badgeLabel}
            </span>
          </div>

          {/* Order Meta Strip: Payment + Vehicle Fitment */}
          <div className="mt-3.5 grid grid-cols-1 gap-2 border-t border-slate-200/70 pt-3 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/75 px-3 py-2">
              <CreditCard className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Payment
                </p>
                <p className="truncate text-[11px] font-extrabold text-slate-800">
                  {statusGuidance.paymentStatusLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/75 px-3 py-2">
              <Bike className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Vehicle Fitment
                </p>
                <p className="truncate text-[11px] font-extrabold text-slate-800">
                  {order.vehicle_model || 'Standard Universal Fit'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/75 px-3 py-2">
              <Store className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Fulfillment
                </p>
                <p className="truncate text-[11px] font-extrabold text-slate-800">
                  {order.pickup_store || 'Rofik Godi Centre'}
                </p>
              </div>
            </div>
          </div>

          {/* Status-Aware Guidance Callout */}
          <div
            className={`mt-3 flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs ${statusBannerTone(
              statusGuidance.tone,
            )}`}
          >
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold">{statusGuidance.headline}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                {statusGuidance.description}
              </p>
            </div>
          </div>
        </section>

        {/* Linked Support Tickets for This Order (when customer has existing threads) */}
        {(orderTickets.length > 0 || ticketsLoading) && (
          <section
            aria-label="Tracked support requests for this order"
            className="classic-glass rounded-3xl border border-white/90 bg-white/88 p-4 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.1)] sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-[#D9232D]">
                  <Ticket className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Active Support Threads for #{order.order_number}
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500">
                    Continue an existing conversation with our workshop team
                  </p>
                </div>
              </div>
              {onOpenSupportRequests && (
                <button
                  type="button"
                  onClick={onOpenSupportRequests}
                  className="text-[11px] font-extrabold text-[#D9232D] hover:underline"
                >
                  View all
                </button>
              )}
            </div>

            {ticketsLoading && orderTickets.length === 0 ? (
              <p className="mt-3 text-xs font-medium text-slate-500">
                Checking recent support threads…
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {orderTickets.slice(0, 3).map((ticket) => {
                  const badge = ticketStatusBadge(ticket.status);
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() =>
                        onOpenSupportRequest
                          ? onOpenSupportRequest(ticket.id)
                          : onOpenLiveChat(order.id)
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left transition hover:border-rose-200 hover:bg-rose-50/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-extrabold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10.5px] font-bold text-slate-400">
                            {ticket.category}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-extrabold text-slate-900">
                          {ticket.subject}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-[#D9232D]">
                        <span>Open</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* How Can We Help You — Interactive 6-Topic Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
                How can we help you?
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Select a topic for instant workshop guidance and a pre-filled support message.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-[#D9232D]">
              <Headset className="h-5 w-5" strokeWidth={2.2} />
            </div>
          </div>

          <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:grid-cols-3">
            {ORDER_HELP_TOPICS.map((topic) => {
              const TopicIcon = topicIcons[topic.id];
              const isSelected = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-testid={`order-help-topic-${topic.id}`}
                  onClick={() => handleSelectTopic(topic.id)}
                  className={`classic-glass group flex min-w-0 flex-col rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#D9232D] bg-gradient-to-br from-rose-50/90 via-white to-white ring-2 ring-rose-200/75 shadow-md'
                      : 'border-white/90 bg-white/90 shadow-2xs hover:border-rose-200 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${topicIconTone[topic.id]}`}
                    >
                      <TopicIcon className="h-4.5 w-4.5" />
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-[#D9232D] text-white'
                          : 'text-slate-300 group-hover:text-[#D9232D]'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </span>
                  </span>
                  <span className="mt-3 block break-words text-xs font-extrabold leading-tight text-slate-900">
                    {topic.title}
                  </span>
                  <span className="mt-1 block break-words text-[10.5px] leading-snug text-slate-500">
                    {topic.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Interactive Topic Resolution & Inline Tracked Ticket Composer */}
        <section
          ref={resolutionPanelRef}
          data-testid="order-help-resolution-panel"
          aria-label={`${resolution.topic.title} resolution and support form`}
          className="classic-glass overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-br from-white/95 via-white/90 to-rose-50/45 p-4 shadow-[0_18px_42px_-20px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.96)] sm:p-5"
        >
          {/* Resolution Guidance Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/75 pb-4">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#D9232D] ring-1 ring-inset ring-rose-200/70">
                <Sparkles className="h-3 w-3" />
                {resolution.topic.title} · {resolution.topic.supportCategory}
              </span>
              <h3 className="mt-2 text-sm font-black tracking-tight text-slate-950 sm:text-base">
                {resolution.heading}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{resolution.summary}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenLiveChat(order.id, {
                  category: resolution.topic.supportCategory,
                  subject,
                  message,
                })
              }
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-[#D9232D] shadow-2xs transition hover:bg-rose-50"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Full Support Studio</span>
            </button>
          </div>

          {/* Instant Policy / Guidance Bullets */}
          <ul className="mt-3.5 space-y-2 rounded-2xl border border-slate-200/75 bg-white/85 p-3.5 text-xs text-slate-700">
            {resolution.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="leading-snug">{bullet}</span>
              </li>
            ))}
          </ul>

          {/* 1-Tap Quick Prompts */}
          <div className="mt-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Tap a quick message for #{order.order_number}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {resolution.quickPrompts.map((prompt) => {
                const isPicked = message === prompt;
                return (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePickPrompt(prompt)}
                    className={`rounded-xl border px-3 py-2 text-left text-[11px] font-bold leading-snug transition active:scale-[0.99] ${
                      isPicked
                        ? 'border-[#D9232D] bg-rose-50 text-[#D9232D]'
                        : 'border-slate-200/90 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50/40'
                    }`}
                  >
                    {prompt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inline Ticket Submission or Confirmation */}
          {createdTicketId ? (
            <div
              role="status"
              data-testid="order-help-ticket-created"
              className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-950"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-emerald-950">
                    Support request sent for Order #{order.order_number}
                  </h4>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-800">
                    Our Berhampore workshop team has received your message and linked it to{' '}
                    <strong>#{order.order_number}</strong>.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {onOpenSupportRequest && (
                      <button
                        type="button"
                        onClick={() => onOpenSupportRequest(createdTicketId)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-emerald-800"
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        <span>Open Conversation</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCreatedTicketId(null)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <span>Send another message</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInlineSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-extrabold text-slate-700">
                    Subject
                  </span>
                  <input
                    type="text"
                    value={subject}
                    maxLength={140}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder={`Help with order #${order.order_number}`}
                    className="min-h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-base font-semibold text-slate-900 outline-none transition focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100 sm:text-xs"
                  />
                </label>

                <div>
                  <span className="mb-1 block text-[11px] font-extrabold text-slate-700">
                    Attach photo or receipt <span className="font-normal text-slate-400">(optional, max 3)</span>
                  </span>
                  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-[#D9232D] hover:bg-rose-50/30 hover:text-[#D9232D]">
                    <span className="flex items-center gap-2 truncate">
                      <Paperclip className="h-4 w-4 shrink-0 text-[#D9232D]" />
                      <span className="truncate">
                        {files.length > 0
                          ? `${files.length} file${files.length === 1 ? '' : 's'} attached`
                          : 'Add bike/seat photo or PDF'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-700">
                      Browse
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(event) => {
                        handleFileChange(event.target.files);
                        event.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <span
                      key={`${file.name}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        aria-label={`Remove ${file.name}`}
                        className="rounded-md p-0.5 text-slate-400 hover:bg-rose-50 hover:text-[#D9232D]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label
                    htmlFor="order-help-message-input"
                    className="text-[11px] font-extrabold text-slate-700"
                  >
                    Your message to Workshop Desk
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    {message.trim().length}/1000 (min 10 chars)
                  </span>
                </div>
                <textarea
                  ref={messageTextareaRef}
                  id="order-help-message-input"
                  rows={3}
                  maxLength={1000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={`Write how we can help with Order #${order.order_number} (${resolution.topic.title})…`}
                  className="w-full resize-y rounded-2xl border border-slate-200/90 bg-white p-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100 sm:text-xs"
                />
              </div>

              {(fileError || submitError) && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                >
                  {submitError || fileError}
                </p>
              )}

              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={!canSubmitInline}
                  className="banner-cta-shine group/cta flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-rose-600/20 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>Sending Tracked Ticket…</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                      <span>Send Tracked Support Request</span>
                    </>
                  )}
                </button>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-emerald-600/90 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-50 active:scale-[0.98]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp with Order Details</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </form>
          )}
        </section>

        {/* Direct Contact Channels */}
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              Contact Us Directly
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Talk to our support team for immediate pickup or installation help.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="classic-glass flex min-w-0 flex-col justify-between rounded-2xl border border-rose-200/80 bg-gradient-to-br from-[#FFF4F5] via-white to-white p-4 shadow-2xs">
              <div>
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100/80 text-[#D9232D]">
                  <MessageCircle className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900">Live Message</h4>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  Open our support studio linked to #{order.order_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onOpenLiveChat(order.id, {
                    category: resolution.topic.supportCategory,
                    subject,
                    message,
                  })
                }
                className="banner-cta-shine group/cta mt-3.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3 py-2 text-xs font-extrabold text-white shadow-sm shadow-rose-600/20 transition-all hover:brightness-105 hover:shadow-md active:scale-95"
              >
                <MessageCircle className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                <span>Start Chat</span>
              </button>
            </div>

            <div className="classic-glass flex min-w-0 flex-col justify-between rounded-2xl border border-white/90 bg-white/95 p-4 shadow-2xs">
              <div>
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900">Call Us</h4>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  Speak directly with our store
                </p>
                <div className="mt-2 space-y-0.5 text-[11px] font-bold text-slate-700 tabular-nums">
                  <p>{WORKSHOP_INFO.phone}</p>
                  <p>{WORKSHOP_INFO.phoneAlt}</p>
                </div>
              </div>
              <a
                href={phoneHref}
                className="mt-3.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D9232D] bg-white px-3 py-2 text-xs font-extrabold text-[#D9232D] transition-colors hover:bg-rose-50 active:scale-95"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call Now</span>
              </a>
            </div>

            <div className="classic-glass flex min-w-0 flex-col justify-between rounded-2xl border border-white/90 bg-white/95 p-4 shadow-2xs">
              <div>
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MessageCircle className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900">WhatsApp</h4>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  Share bike photos or pickup updates on WhatsApp
                </p>
              </div>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3 py-2 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-50 active:scale-95"
              >
                <span>Open WhatsApp</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </section>

        {/* Store Working Hours & Maps */}
        <section className="classic-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white/95 p-4 shadow-2xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-[#D9232D]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Store Working Hours</h4>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {WORKSHOP_INFO.workingHours}
              </p>
            </div>
          </div>
          <a
            href={mapHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-[#D9232D] transition-colors hover:bg-rose-100"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Open in Maps</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-blue-200/75 bg-blue-50/75 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Info className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900">Before contacting</h4>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
              Please keep your Order ID <strong>#{order.order_number}</strong> ready for faster
              workshop support.
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
