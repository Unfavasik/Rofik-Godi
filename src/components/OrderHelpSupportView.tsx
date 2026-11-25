import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Headset,
  HelpCircle,
  Info,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Package,
  PackageOpen,
  Paperclip,
  Phone,
  Printer,
  Send,
  ShieldCheck,
  Store,
  Ticket,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { CustomerOrderRecord, Product } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import { isOrderComplete } from '../lib/orderPresentation';
import { GuaranteeTerms } from './GuaranteeTerms';
import { InvoiceTemplate } from './InvoiceTemplate';
import { StoreLocationView } from './StoreLocationView';
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';
import {
  ORDER_HELP_TOPICS,
  buildOrderHelpWhatsappUrl,
  filterOrderSupportRequests,
  getOrderHelpStatusGuidance,
  getOrderStepProgress,
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
import { useUploadProgress } from '../lib/useUploadProgress';
import { UploadProgressBar } from './UploadProgressBar';
import { readSwrCache, writeSwrCache } from '../lib/swrCache';

export interface OrderHelpSupportViewProps {
  order?: CustomerOrderRecord | null;
  products?: Product[];
  loading?: boolean;
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
  onOpenStoreMap?: () => void;
}

const FALLBACK_SKELETON_ORDER: CustomerOrderRecord = {
  id: '',
  order_number: 'RGC-LOADING',
  order_slug: '',
  customer_name: '',
  customer_phone: '',
  payment_method: 'PAY_AT_STORE',
  payment_status: 'PENDING',
  status: 'NEW',
  subtotal: 0,
  discount: 0,
  total: 0,
  vehicle_model: '',
  fulfillment_method: 'STORE_PICKUP',
  pickup_store: 'Rofik Godi Centre',
  created_at: new Date(0).toISOString(),
  order_items: [],
};

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
  if (tone === 'rose') return 'border-rose-200/90 bg-rose-50/95 text-rose-700';
  if (tone === 'emerald') return 'border-emerald-200/90 bg-emerald-50/95 text-emerald-700';
  if (tone === 'blue') return 'border-blue-200/90 bg-blue-50/95 text-blue-700';
  return 'border-amber-200/90 bg-amber-50/95 text-amber-800';
};

const statusBannerTone = (tone: 'emerald' | 'blue' | 'amber' | 'rose') => {
  if (tone === 'rose') return 'border-rose-200/80 bg-gradient-to-r from-rose-50/90 to-white/90 text-rose-950';
  if (tone === 'emerald') return 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-white/90 text-emerald-950';
  if (tone === 'blue') return 'border-blue-200/80 bg-gradient-to-r from-blue-50/90 to-white/90 text-blue-950';
  return 'border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white/90 text-amber-950';
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
  payment_issue: 'border-slate-200/80 bg-slate-100 text-slate-700',
  change_order: 'border-slate-200/80 bg-slate-100 text-slate-700',
  pickup_store: 'border-slate-200/80 bg-slate-100 text-slate-700',
  return_exchange: 'border-slate-200/80 bg-slate-100 text-slate-700',
  other_help: 'border-slate-200/80 bg-slate-100 text-slate-700',
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
  products = [],
  loading = false,
  currentUserId,
  isAuthenticated = true,
  onBack,
  onOpenLiveChat,
  onOpenSupportRequest,
  onOpenSupportRequests,
  onOpenStoreMap,
}: OrderHelpSupportViewProps) {
  const safeOrder = order ?? FALLBACK_SKELETON_ORDER;
  const isSkeleton = loading || !order;

  const [copied, setCopied] = useState(false);
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<OrderHelpTopicId>('order_status');
  const [subject, setSubject] = useState(() =>
    getTopicResolutionGuide('order_status', safeOrder).defaultSubject,
  );
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const ticketCacheKey = currentUserId && order?.id ? `user:${currentUserId}:order-help-tickets:${order.id}` : '';
  const [orderTickets, setOrderTickets] = useState<SupportRequestRecord[]>(
    () => (ticketCacheKey ? readSwrCache<SupportRequestRecord[]>(ticketCacheKey) ?? [] : []),
  );
  const [ticketsLoading, setTicketsLoading] = useState(
    () => Boolean(ticketCacheKey && readSwrCache(ticketCacheKey) === undefined),
  );
  const [isInternalStoreMapOpen, setIsInternalStoreMapOpen] = useState(false);
  const [isInternalInvoiceOpen, setIsInternalInvoiceOpen] = useState(false);
  const attachmentUploadProgress = useUploadProgress('attachments');

  const resolutionPanelRef = useRef<HTMLElement | null>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const items = useMemo(() => safeOrder.order_items || [], [safeOrder.order_items]);
  const firstImage = items.find((item) => item.image_url)?.image_url || null;
  const statusGuidance = useMemo(() => getOrderHelpStatusGuidance(safeOrder), [safeOrder]);
  const canViewInvoice = useMemo(
    () => isOrderComplete(safeOrder.status) || statusGuidance.isPaid,
    [safeOrder.status, statusGuidance.isPaid],
  );
  const guaranteeTarget = useMemo(() => {
    for (const item of items) {
      const matched = products.find(
        (p) =>
          (item.product_id && (p.id === item.product_id || p.slug === item.product_id)) ||
          String(p.title || '').trim().toLowerCase() ===
            String(item.product_name || '').trim().toLowerCase(),
      );
      if (matched?.guaranteeValidUntil || matched?.id || item.product_id) {
        return {
          productId: matched?.id || item.product_id || null,
          productSlug: matched?.slug || null,
          guaranteeDate: matched?.guaranteeValidUntil || null,
        };
      }
    }
    return null;
  }, [items, products]);
  const progressSteps = useMemo(() => getOrderStepProgress(safeOrder.status), [safeOrder.status]);
  const resolution = useMemo(
    () => getTopicResolutionGuide(selectedTopicId, safeOrder),
    [selectedTopicId, safeOrder],
  );

  const phoneHref = `tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`;
  const phoneAltHref = `tel:${WORKSHOP_INFO.phoneAlt.replace(/[^+\d]/g, '')}`;
  const whatsappHref = useMemo(
    () => buildOrderHelpWhatsappUrl(WORKSHOP_INFO.whatsapp, safeOrder, selectedTopicId, message),
    [safeOrder, selectedTopicId, message],
  );

  const handleOpenStoreMap = () => {
    if (onOpenStoreMap) {
      onOpenStoreMap();
      return;
    }
    setIsInternalStoreMapOpen(true);
  };

  useEffect(() => {
    if (!order) return;
    setSubject(getTopicResolutionGuide(selectedTopicId, order).defaultSubject);
  }, [selectedTopicId, order]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || !order) return;
    let active = true;
    const cached = ticketCacheKey ? readSwrCache<SupportRequestRecord[]>(ticketCacheKey) : undefined;
    if (cached !== undefined) {
      setOrderTickets(cached);
      setTicketsLoading(false);
    } else {
      setTicketsLoading(true);
    }
    void listMySupportRequests(currentUserId)
      .then((res) => {
        if (!active) return;
        const filtered = filterOrderSupportRequests(res.data, order);
        setOrderTickets(filtered);
        if (ticketCacheKey) writeSwrCache(ticketCacheKey, filtered);
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
  }, [currentUserId, isAuthenticated, order, createdTicketId, ticketCacheKey]);

  const copyOrderId = async () => {
    if (!order) return;
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
    const nextGuide = getTopicResolutionGuide(topicId, safeOrder);
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
    !isSkeleton &&
    isAuthenticated &&
    subject.trim().length >= 3 &&
    message.trim().length >= 10 &&
    !submitting;

  const handleInlineSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
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
    if (files.length > 0) {
      attachmentUploadProgress.startUpload(files[0].name, {
        totalCount: files.length,
        baseLabel: files.length === 1 ? 'attachment' : 'attachments',
      });
    }
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
        attachmentUploadProgress.resetUpload();
        setSubmitError(result.error.message);
      } else if (result.id) {
        if (files.length > 0) {
          attachmentUploadProgress.finishUpload(
            result.attachmentError ? 'Ticket saved (attachment retry available)' : 'Attachments uploaded',
          );
        }
        setCreatedTicketId(result.id);
        setMessage('');
        setFiles([]);
        if (result.attachmentError) {
          setFileError(result.attachmentError.message);
        }
      } else {
        attachmentUploadProgress.resetUpload();
        setSubmitError('Could not confirm your support ticket. Please try again.');
      }
    } catch {
      attachmentUploadProgress.resetUpload();
      setSubmitError(
        'Support service is temporarily unavailable. Please try WhatsApp or Call below.',
      );
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
      className="fixed inset-0 z-[80] w-full max-w-full overflow-y-auto overflow-x-hidden bg-[#F8FAFC] bg-[radial-gradient(circle_at_top_left,_rgba(217,35,45,0.09),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_45%)] font-sans text-slate-800"
      role="dialog"
      aria-modal="true"
      aria-label="Help and support"
      aria-busy={isSkeleton}
    >
      {/* Edge-to-Edge Vignette Sticky Top Bar */}
      <header
        data-testid="order-help-topbar"
        className="sticky top-0 z-30 relative isolate overflow-hidden bg-[#090808] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-5 sm:pb-2.5"
      >
        <VignetteBarBackdrop variant="top" />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-2">
          {/* Left: Frosted Back Button + Order Help Identity Capsule */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition-all duration-200 hover:-translate-x-0.5 hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.25] transition-transform duration-200 group-hover:-translate-x-0.5" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/10 py-1 pl-2 pr-2.5 backdrop-blur-md sm:flex-initial sm:pr-3.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/14 text-[#FF4D58] ring-1 ring-white/15">
                <Headset className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xs font-black leading-tight text-white sm:text-[13px]">
                  Help &amp; Support
                </h1>
                {isSkeleton ? (
                  <div className="skeleton-shimmer mt-0.5 h-3 w-20 rounded-md bg-white/20" />
                ) : (
                  <p className="truncate font-mono text-[10px] font-extrabold leading-tight text-rose-300 tabular-nums">
                    #{safeOrder.order_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Frosted Action Dock */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md">
            {onOpenSupportRequests && (
              <button
                type="button"
                onClick={onOpenSupportRequests}
                aria-label="My support tickets"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/18 bg-white/14 px-2.5 text-[11px] font-extrabold text-white transition hover:bg-white/22"
              >
                <Ticket className="h-3.5 w-3.5 text-rose-300" />
                <span className="hidden sm:inline">My Tickets</span>
                {orderTickets.length > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#D9232D] px-1 text-[9px] font-extrabold text-white tabular-nums">
                    {orderTickets.length}
                  </span>
                )}
              </button>
            )}
            <a
              href={phoneHref}
              aria-label="Call workshop support desk"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/20 px-2.5 text-[11px] font-extrabold text-emerald-100 transition hover:bg-emerald-500/30"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline">Workshop Desk</span>
              <Phone className="h-3.5 w-3.5 sm:hidden" />
            </a>
          </div>
        </div>
      </header>

      <div className="relative -mt-px">
        <VignettePageCurtain className="h-[220px] sm:h-[250px]" />
        <div className="relative z-10">
      {isSkeleton ? (
        <div
          data-testid="order-help-skeleton"
          role="status"
          aria-label="Loading order help details"
          className="mx-auto w-full max-w-5xl space-y-3.5 px-3.5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-5 sm:pt-4"
        >
          {/* Skeleton Hero Order Snapshot Card */}
          <section className="classic-glass overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-br from-white/95 via-white/88 to-rose-50/45 p-3.5 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.96)] sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="skeleton-shimmer h-3.5 w-14 rounded-md bg-slate-200/85" />
                <div className="skeleton-shimmer h-5 w-28 rounded-lg bg-slate-200/90" />
                <div className="skeleton-shimmer h-6 w-12 rounded-lg bg-slate-200/75" />
              </div>
              <div className="flex items-center gap-2">
                <div className="skeleton-shimmer h-6 w-22 rounded-xl bg-rose-100/85" />
                <div className="skeleton-shimmer h-6 w-20 rounded-xl bg-slate-200/75" />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="skeleton-shimmer h-13 w-13 shrink-0 rounded-xl bg-slate-200/85 sm:h-15 sm:w-18" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="skeleton-shimmer h-4 w-4/5 rounded-lg bg-slate-200/90" />
                <div className="skeleton-shimmer h-3.5 w-3/5 rounded-md bg-slate-200/75" />
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/90 bg-white/80 px-3 py-2.5 shadow-2xs">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((stepIdx) => (
                  <div key={stepIdx} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="skeleton-shimmer h-4.5 w-4.5 shrink-0 rounded-full bg-slate-200/90" />
                      <div className="skeleton-shimmer h-1.5 flex-1 rounded-full bg-slate-200/75" />
                    </div>
                    <div className="skeleton-shimmer h-3 w-18 rounded-md bg-slate-200/80" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((tileIdx) => (
                <div
                  key={tileIdx}
                  className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-3 py-2 shadow-2xs"
                >
                  <div className="skeleton-shimmer h-7 w-7 shrink-0 rounded-lg bg-slate-200/85" />
                  <div className="flex-1 space-y-1">
                    <div className="skeleton-shimmer h-2.5 w-14 rounded-md bg-slate-200/75" />
                    <div className="skeleton-shimmer h-3 w-24 rounded-md bg-slate-200/90" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-100/80 bg-white/85 px-3 py-2.5">
              <div className="skeleton-shimmer mt-0.5 h-4 w-4 shrink-0 rounded-full bg-rose-200/80" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton-shimmer h-3.5 w-44 rounded-md bg-slate-200/90" />
                <div className="skeleton-shimmer h-3 w-full rounded-md bg-slate-200/75" />
              </div>
            </div>
          </section>

          {/* Skeleton 12-Column Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <div className="min-w-0 space-y-4 lg:col-span-7">
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="space-y-1">
                    <div className="skeleton-shimmer h-3 w-24 rounded-md bg-rose-200/75" />
                    <div className="skeleton-shimmer h-4.5 w-40 rounded-lg bg-slate-200/90" />
                  </div>
                  <div className="skeleton-shimmer h-5.5 w-14 rounded-xl bg-slate-200/75" />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((topicIdx) => (
                    <div
                      key={topicIdx}
                      className="classic-glass flex flex-col justify-between rounded-xl border border-white/90 bg-white/90 p-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="skeleton-shimmer h-8 w-8 rounded-lg bg-slate-200/85" />
                        <div className="skeleton-shimmer h-4 w-10 rounded-full bg-slate-200/75" />
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <div className="skeleton-shimmer h-3.5 w-22 rounded-md bg-slate-200/90" />
                        <div className="skeleton-shimmer h-2.5 w-full rounded-md bg-slate-200/75" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="classic-glass overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-br from-white/95 via-white/90 to-rose-50/45 p-3.5 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.14)] sm:p-4">
                <div className="space-y-1.5 border-b border-slate-200/75 pb-3">
                  <div className="skeleton-shimmer h-4.5 w-44 rounded-full bg-rose-100/90" />
                  <div className="skeleton-shimmer h-4.5 w-3/4 rounded-lg bg-slate-200/90" />
                  <div className="skeleton-shimmer h-3 w-full rounded-md bg-slate-200/75" />
                </div>
                <div className="mt-3 space-y-1.5 rounded-xl border border-slate-200/75 bg-white/90 p-3">
                  <div className="skeleton-shimmer h-3 w-11/12 rounded-md bg-slate-200/80" />
                  <div className="skeleton-shimmer h-3 w-4/5 rounded-md bg-slate-200/80" />
                  <div className="skeleton-shimmer h-3 w-5/6 rounded-md bg-slate-200/80" />
                </div>
                <div className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="skeleton-shimmer h-10 w-full rounded-xl bg-slate-200/80" />
                    <div className="skeleton-shimmer h-10 w-full rounded-xl bg-slate-200/80" />
                  </div>
                  <div className="skeleton-shimmer h-20 w-full rounded-xl bg-slate-200/80" />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="skeleton-shimmer h-10 flex-1 rounded-xl bg-rose-200/80" />
                    <div className="skeleton-shimmer h-10 w-full rounded-xl bg-emerald-100/80 sm:w-48" />
                  </div>
                </div>
              </section>
            </div>

            <aside className="min-w-0 space-y-3.5 lg:col-span-5">
              <section className="classic-glass rounded-2xl border border-white/90 bg-white/92 p-3.5 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.12)] sm:p-4">
                <div className="space-y-1.5">
                  <div className="skeleton-shimmer h-3 w-22 rounded-md bg-rose-200/75" />
                  <div className="skeleton-shimmer h-4.5 w-36 rounded-lg bg-slate-200/90" />
                  <div className="skeleton-shimmer h-3 w-4/5 rounded-md bg-slate-200/75" />
                </div>
                <div className="mt-3 space-y-2">
                  {[0, 1, 2].map((channelIdx) => (
                    <div
                      key={channelIdx}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-xl bg-slate-200/85" />
                        <div className="space-y-1">
                          <div className="skeleton-shimmer h-3.5 w-22 rounded-md bg-slate-200/90" />
                          <div className="skeleton-shimmer h-2.5 w-32 rounded-md bg-slate-200/75" />
                        </div>
                      </div>
                      <div className="skeleton-shimmer h-8 w-20 shrink-0 rounded-xl bg-slate-200/85" />
                    </div>
                  ))}
                </div>
              </section>

              <section className="classic-glass rounded-2xl border border-white/90 bg-white/92 p-3.5 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.12)] sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-xl bg-rose-100/85" />
                  <div className="flex-1 space-y-1">
                    <div className="skeleton-shimmer h-3.5 w-32 rounded-md bg-slate-200/90" />
                    <div className="skeleton-shimmer h-3.5 w-40 rounded-md bg-slate-200/80" />
                    <div className="skeleton-shimmer h-3 w-full rounded-md bg-slate-200/75" />
                  </div>
                </div>
                <div className="skeleton-shimmer mt-3 h-10 w-full rounded-xl bg-rose-100/80" />
              </section>
            </aside>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-5xl space-y-3.5 px-3.5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-5 sm:pt-4">
          {/* Top Hero: Classic Glass Order Snapshot + 4-Step Milestone Tracker */}
          <section
            aria-label="Current Order Status"
            className="classic-glass overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-br from-white/95 via-white/88 to-rose-50/45 p-3.5 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.96)] sm:p-4"
          >
            {/* Row 1: Order ID + Copy on Left, Status Pill + Item Specs Toggle on Right */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Order ID
                </span>
                <span className="font-mono text-xs font-black tracking-tight text-slate-950 tabular-nums sm:text-sm">
                  #{safeOrder.order_number}
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

              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded-xl border px-2.5 py-1 text-[11px] font-extrabold shadow-2xs sm:px-3 sm:py-1.5 sm:text-xs ${statusPillTone(
                    statusGuidance.tone,
                  )}`}
                >
                  {statusGuidance.badgeLabel}
                </span>
                {canViewInvoice && (
                  <button
                    type="button"
                    data-testid="order-help-view-invoice"
                    onClick={() => setIsInternalInvoiceOpen(true)}
                    className="inline-flex h-7 items-center gap-1 rounded-xl border border-rose-200/85 bg-rose-50/90 px-2.5 text-[11px] font-extrabold text-[#D9232D] transition hover:bg-rose-100/80 sm:h-8"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Invoice</span>
                  </button>
                )}

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItemsExpanded((open) => !open)}
                    className="inline-flex h-7 items-center gap-1 rounded-xl border border-slate-200/85 bg-white/90 px-2.5 text-[11px] font-bold text-slate-700 transition hover:border-rose-200 hover:text-[#D9232D] sm:h-8"
                  >
                    <span>{itemsExpanded ? 'Hide items' : 'Item specs'}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        itemsExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Thumbnail + Full-Width Order Product Summary */}
            <div className="mt-3 flex items-center gap-3">
              <div className="relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/95 bg-slate-100 p-1 shadow-xs sm:h-15 sm:w-18">
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt="Order item"
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <Package className="h-6 w-6 text-slate-600" />
                )}
                {items.length > 1 && (
                  <span className="absolute bottom-1 right-1 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-extrabold text-white tabular-nums">
                    +{items.length - 1}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 text-[13.5px] font-black leading-snug tracking-tight text-slate-950 sm:text-[15px]">
                  {items.map((item) => item.product_name).join(' · ') || 'Custom Seat Cover Order'}
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold text-slate-500 tabular-nums">
                  <span className="whitespace-nowrap">{formatDate(safeOrder.created_at)}</span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span aria-hidden="true">·</span>
                    <span>
                      {items.length} {items.length === 1 ? 'Item' : 'Items'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-black text-slate-950">
                      ₹{Number(safeOrder.total || 0).toLocaleString('en-IN')}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Step Visual Milestone Bar (2x2 on narrow phones, 4 cols on sm+) */}
            <div className="mt-3 rounded-xl border border-white/90 bg-white/80 px-3 py-2.5 shadow-2xs">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-2">
                {progressSteps.map((step, index) => {
                  const isDone = step.state === 'done';
                  const isCurrent = step.state === 'current';
                  const isCancelled = step.state === 'cancelled';
                  return (
                    <div key={step.key} className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                            isCancelled
                              ? 'bg-rose-600 text-white'
                              : isDone
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                  ? 'bg-[#D9232D] text-white ring-4 ring-rose-100'
                                  : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? <Check className="h-3 w-3" /> : index + 1}
                        </span>
                        <div
                          className={`h-1 flex-1 rounded-full ${
                            isCancelled
                              ? 'bg-rose-200'
                              : isDone
                                ? 'bg-emerald-500'
                                : isCurrent
                                  ? 'bg-rose-300'
                                  : 'bg-slate-200/80'
                          }`}
                        />
                      </div>
                      <p
                        className={`mt-1.5 text-[11px] font-extrabold leading-tight ${
                          isCancelled
                            ? 'text-rose-700'
                            : isDone || isCurrent
                              ? 'text-slate-900'
                              : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expandable Line Item Specifications */}
            {itemsExpanded && items.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200/75 bg-white/90 px-3.5 py-1">
                {items.map((item, idx) => (
                  <div
                    key={`${item.product_id || idx}-${idx}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-slate-900">
                        {item.product_name} × {item.quantity}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {[
                          item.color && `Colour: ${item.color}`,
                          item.selected_thickness && `Foam: ${item.selected_thickness}`,
                          item.selected_stitch && `Stitch: ${item.selected_stitch}`,
                          item.custom_embroidery_text &&
                            `Embroidery: “${item.custom_embroidery_text}”`,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Standard workshop configuration'}
                      </p>
                    </div>
                    <span className="shrink-0 font-black text-slate-900 tabular-nums">
                      ₹{(Number(item.unit_price || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Order Meta Strip: Payment + Vehicle Fitment + Fulfillment */}
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-3 py-2 shadow-2xs">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-[#D9232D]">
                  <CreditCard className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                    Payment
                  </p>
                  <p className="truncate text-[11px] font-extrabold text-slate-800">
                    {statusGuidance.paymentStatusLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-3 py-2 shadow-2xs">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Bike className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                    Vehicle Fitment
                  </p>
                  <p className="truncate text-[11px] font-extrabold text-slate-800">
                    {safeOrder.vehicle_model || 'Standard Universal Fit'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-3 py-2 shadow-2xs">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Store className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                    Fulfillment
                  </p>
                  <p className="truncate text-[11px] font-extrabold text-slate-800">
                    {safeOrder.pickup_store || 'Rofik Godi Centre'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status-Aware Guidance Callout */}
            <div
              className={`mt-2.5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${statusBannerTone(
                statusGuidance.tone,
              )}`}
            >
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#D9232D]" />
              <div className="min-w-0">
                <p className="font-extrabold">{statusGuidance.headline}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                  {statusGuidance.description}
                </p>
              </div>
            </div>
          </section>

          {guaranteeTarget && (
            <GuaranteeTerms
              variant="compact"
              productId={guaranteeTarget.productId}
              productSlug={guaranteeTarget.productSlug}
              guaranteeDate={guaranteeTarget.guaranteeDate}
            />
          )}

          {/* Responsive 12-Column Support Studio Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            {/* Primary Left Column (7 cols): Interactive Topic Grid + Resolution Studio */}
            <div className="min-w-0 space-y-4 lg:col-span-7">
              {/* Step 1: Interactive 6-Topic Selector */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
                      Step 1 · Choose Topic
                    </span>
                    <h2 className="mt-0.5 text-[15px] font-black tracking-tight text-slate-950 sm:text-base">
                      How can we help you?
                    </h2>
                  </div>
                  <span className="rounded-lg border border-white/90 bg-white/80 px-2 py-0.5 text-[10.5px] font-bold text-slate-500 shadow-2xs">
                    6 topics
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                        className={`classic-glass group flex min-w-0 flex-col justify-between rounded-xl border p-2.5 text-left transition-all duration-150 active:scale-[0.98] ${
                          isSelected
                            ? 'border-[#D9232D] bg-gradient-to-br from-rose-50/95 via-white to-white ring-2 ring-rose-200/80 shadow-[0_8px_20px_-14px_rgba(217,35,45,0.28)]'
                            : 'border-white/90 bg-white/90 shadow-2xs hover:border-rose-200 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <span className="flex w-full items-center justify-between gap-1.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${topicIconTone[topic.id]}`}
                          >
                            <TopicIcon className="h-4 w-4" />
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold ${
                              isSelected
                                ? 'bg-[#D9232D] text-white'
                                : 'text-slate-300 group-hover:text-[#D9232D]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-2.5 w-2.5" />
                                <span>Active</span>
                              </>
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            )}
                          </span>
                        </span>

                        <div className="mt-2.5">
                          <span className="block break-words text-[11.5px] font-extrabold leading-tight text-slate-900">
                            {topic.title}
                          </span>
                          <span className="mt-0.5 block break-words text-[10px] leading-snug text-slate-500">
                            {topic.hint}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 2: Interactive Topic Resolution & Inline Tracked Ticket Composer */}
              <section
                ref={resolutionPanelRef}
                data-testid="order-help-resolution-panel"
                aria-label={`${resolution.topic.title} resolution and support form`}
                className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-4"
              >
                {/* Resolution Guidance Header */}
                <div className="flex flex-col gap-3 border-b border-slate-200/75 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#D9232D] truncate">
                      Step 2 · {resolution.topic.title} ({resolution.topic.supportCategory})
                    </p>
                    <h3 className="mt-2 text-sm font-black tracking-tight text-slate-950 sm:text-base">
                      {resolution.heading}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {resolution.summary}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onOpenLiveChat(safeOrder.id, {
                        category: resolution.topic.supportCategory,
                        subject,
                        message,
                      })
                    }
                    className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-[#D9232D] shadow-2xs transition hover:bg-rose-50 sm:w-auto"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Full Support Studio</span>
                  </button>
                </div>

                {/* Instant Policy / Guidance Bullets */}
                <ul className="mt-3.5 space-y-2 rounded-2xl border border-slate-200/75 bg-white/90 p-3.5 text-xs text-slate-700">
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
                    1-Tap Quick Prompts for #{safeOrder.order_number}
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
                              ? 'border-[#D9232D] bg-rose-50 text-[#D9232D] shadow-2xs'
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
                          Support request sent for Order #{safeOrder.order_number}
                        </h4>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-800">
                          Our Berhampore workshop team has received your message and linked it to{' '}
                          <strong>#{safeOrder.order_number}</strong>.
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
                          placeholder={`Help with order #${safeOrder.order_number}`}
                          className="min-h-11 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-base font-semibold text-slate-900 outline-none transition focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100 sm:text-xs"
                        />
                      </label>

                      <div>
                        <span className="mb-1 block text-[11px] font-extrabold text-slate-700">
                          Attach photo or receipt{' '}
                          <span className="font-normal text-slate-400">(optional, max 3)</span>
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
                        placeholder={`Write how we can help with Order #${safeOrder.order_number} (${resolution.topic.title})…`}
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

                    <UploadProgressBar state={attachmentUploadProgress.state} compact />

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
            </div>

            {/* Right Sticky Column (5 cols): Active Order Threads + Direct Workshop Concierge + Maps */}
            <aside className="min-w-0 space-y-3.5 lg:sticky lg:top-20 lg:col-span-5">
              {/* Active Support Threads for This Order */}
              {(orderTickets.length > 0 || ticketsLoading) && (
                <section
                  aria-label="Tracked support requests for this order"
                  className="classic-glass rounded-2xl border border-white/90 bg-white/90 p-3.5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.12)] sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#D9232D]">
                        <Ticket className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-[11.5px] font-black uppercase tracking-wider text-slate-900">
                          Active Threads · #{safeOrder.order_number}
                        </h2>
                        <p className="text-[10.5px] font-medium text-slate-500">
                          Continue an existing support conversation
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
                    <div
                      data-testid="order-help-threads-skeleton"
                      className="mt-2.5 space-y-2"
                      aria-label="Loading active support threads"
                    >
                      {[0, 1].map((idx) => (
                        <div
                          key={idx}
                          className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <div className="skeleton-shimmer h-3.5 w-14 rounded-md bg-slate-200/85" />
                              <div className="skeleton-shimmer h-3 w-20 rounded-md bg-slate-200/75" />
                            </div>
                            <div className="skeleton-shimmer h-3.5 w-3/4 rounded-md bg-slate-200/90" />
                          </div>
                          <div className="skeleton-shimmer h-4 w-10 shrink-0 rounded-md bg-rose-100/85" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2.5 space-y-1.5">
                      {orderTickets.slice(0, 3).map((ticket) => {
                        const badge = ticketStatusBadge(ticket.status);
                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() =>
                              onOpenSupportRequest
                                ? onOpenSupportRequest(ticket.id)
                                : onOpenLiveChat(safeOrder.id)
                            }
                            className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left transition hover:border-rose-200 hover:bg-rose-50/40"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-extrabold ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {ticket.category}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs font-extrabold text-slate-900">
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

              {/* Direct Workshop Channels Card */}
              <section className="classic-glass rounded-2xl border border-white/90 bg-white/92 p-3.5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.12)] sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
                      Instant Support
                    </span>
                    <h2 className="mt-0.5 text-[15px] font-black tracking-tight text-slate-950">
                      Contact Us Directly
                    </h2>
                    <p className="mt-0.5 text-[11.5px] font-medium text-slate-500">
                      Immediate pickup, fitting, or billing assistance from our Berhampore team.
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {/* 1. Live Message Studio */}
                  <div className="rounded-xl border border-rose-200/80 bg-gradient-to-br from-[#FFF4F5] via-white to-white p-3">
                    <div className="flex flex-col gap-2.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100/85 text-[#D9232D]">
                          <MessageCircle className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-extrabold text-slate-900">Live Message</h4>
                          <p className="truncate text-[10.5px] text-slate-500">
                            Tracked chat linked to #{safeOrder.order_number}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenLiveChat(safeOrder.id, {
                            category: resolution.topic.supportCategory,
                            subject,
                            message,
                          })
                        }
                        className="banner-cta-shine inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:brightness-105 active:scale-95"
                      >
                        Start Chat
                      </button>
                    </div>
                  </div>

                  {/* 2. Call Us */}
                  <div className="rounded-xl border border-slate-200/85 bg-white/95 p-3">
                    <div className="flex flex-col gap-2.5 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                          <Phone className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-extrabold text-slate-900">Call Us</h4>
                          <p className="text-[10.5px] text-slate-500">
                            Speak directly with our workshop counter
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-extrabold text-slate-700 tabular-nums">
                            <a href={phoneHref} className="hover:text-[#D9232D]">
                              {WORKSHOP_INFO.phone}
                            </a>
                            <span className="text-slate-300">·</span>
                            <a href={phoneAltHref} className="hover:text-[#D9232D]">
                              {WORKSHOP_INFO.phoneAlt}
                            </a>
                          </div>
                        </div>
                      </div>
                      <a
                        href={phoneHref}
                        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-[#D9232D] bg-white px-3 py-1.5 text-xs font-extrabold text-[#D9232D] transition-colors hover:bg-rose-50 active:scale-95"
                      >
                        Call Now
                      </a>
                    </div>
                  </div>

                  {/* 3. WhatsApp Desk */}
                  <div className="rounded-xl border border-slate-200/85 bg-white/95 p-3">
                    <div className="flex flex-col gap-2.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <MessageCircle className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-extrabold text-slate-900">WhatsApp</h4>
                          <p className="truncate text-[10.5px] text-slate-500">
                            Share bike photos or pickup updates
                          </p>
                        </div>
                      </div>
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-emerald-600 bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-50 active:scale-95"
                      >
                        <span>Open WhatsApp</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* Store Working Hours & Maps Card */}
              <section className="classic-glass rounded-2xl border border-white/90 bg-white/92 p-3.5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.12)] sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-[#D9232D]">
                    <Store className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-extrabold text-slate-900">Store Working Hours</h4>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-700">
                      {WORKSHOP_INFO.workingHours}
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
                      {WORKSHOP_INFO.address}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="order-help-open-store-map"
                  onClick={handleOpenStoreMap}
                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-[#D9232D] transition-colors hover:bg-rose-100 active:scale-[0.99]"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Open in Maps</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </section>

              {/* Helpful Tip */}
              <section className="flex items-start gap-2.5 rounded-xl border border-blue-200/75 bg-blue-50/80 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Info className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Before contacting</h4>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-slate-600">
                    Your Order ID <strong>#{safeOrder.order_number}</strong> is automatically attached
                    to live chats and WhatsApp messages from this page.
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
        </div>
      </div>
      {isInternalStoreMapOpen && (
        <StoreLocationView onClose={() => setIsInternalStoreMapOpen(false)} />
      )}
      {isInternalInvoiceOpen && order && (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-[#EEF2F6]">
          <InvoiceTemplate
            order={order}
            products={products}
            onClose={() => setIsInternalInvoiceOpen(false)}
          />
        </div>
      )}
    </motion.div>
  );
}


