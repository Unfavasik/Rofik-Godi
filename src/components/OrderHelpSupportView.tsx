import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Headset,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  MessageCircle,
  Package,
  PackageOpen,
  Phone,
  Store,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { CustomerOrderRecord } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import { getOrderStatusLabel, isOrderComplete } from '../lib/orderPresentation';

interface OrderHelpSupportViewProps {
  order: CustomerOrderRecord;
  onBack: () => void;
  onOpenLiveChat: (orderId?: string) => void;
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

const statusPillTone = (status: string) => {
  if (status === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-200/80';
  if (isOrderComplete(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  if (status === 'READY_FOR_PICKUP') return 'bg-blue-50 text-blue-700 border-blue-200/80';
  return 'bg-rose-50 text-rose-700 border-rose-200/80';
};

type HelpTopic = {
  title: string;
  hint: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  blue?: boolean;
};

const helpTopics: HelpTopic[] = [
  { title: 'Order Status', hint: 'Check or update your order', icon: Package },
  { title: 'Payment Issue', hint: 'Failed payment, refund or UPI issue', icon: CreditCard },
  { title: 'Change Order', hint: 'Modify or cancel items before pickup', icon: ArrowLeftRight },
  { title: 'Pickup & Store', hint: 'Pickup time, store location or other help', icon: Store },
  { title: 'Return / Exchange', hint: 'Product issue or replacement', icon: PackageOpen },
  { title: 'Other Help', hint: 'Anything else? Ask us here', icon: HelpCircle, blue: true },
];

export function OrderHelpSupportView({ order, onBack, onOpenLiveChat }: OrderHelpSupportViewProps) {
  const [copied, setCopied] = useState(false);
  const items = order.order_items || [];
  const firstImage = items.find((item) => item.image_url)?.image_url || null;
  const phoneHref = `tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`;
  const whatsappHref = `https://wa.me/${WORKSHOP_INFO.whatsapp.replace(/\D/g, '')}`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}`;

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked; the visible order ID remains available.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] w-full max-w-full overflow-y-auto overflow-x-hidden bg-gradient-to-br from-[#F8FAFC] via-[#F4F6FB] to-[#FFF5F6] font-sans text-slate-800"
      role="dialog"
      aria-modal="true"
      aria-label="Help and support"
    >
      {/* Frosted Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100/90 text-slate-700 transition-all hover:bg-rose-50 hover:text-[#D9232D] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl">
                Help &amp; Support
              </h1>
              <p className="mt-0.5 flex items-center text-xs font-medium text-slate-500">
                We&apos;re here to assist you <Heart className="ml-1 h-3 w-3 fill-[#D9232D] text-[#D9232D]" />
              </p>
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <Headset className="h-3.5 w-3.5" />
            <span>Workshop Desk</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col space-y-5 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5">
        {/* Glassmorphic Current Order Summary Card */}
        <section
          aria-label="Current Order Status"
          className="rounded-3xl border border-slate-200/85 bg-white/95 p-4 backdrop-blur-md shadow-[0_12px_30px_-16px_rgba(15,23,42,0.08)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 p-1">
                {firstImage ? (
                  <img src={firstImage} alt="Order item" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <Package className="h-8 w-8 text-slate-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-slate-400">Order ID</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="truncate text-sm font-black tracking-tight text-slate-900 tabular-nums">
                    #{order.order_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyOrderId()}
                    aria-label={copied ? 'Order ID copied' : 'Copy Order ID'}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-500 transition-colors hover:bg-rose-50 hover:text-[#D9232D]"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-500 tabular-nums">
                  {formatDate(order.created_at)} · {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </div>
              </div>
            </div>

            <span className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-bold ${statusPillTone(order.status)}`}>
              {getOrderStatusLabel(order.status)}
            </span>
          </div>
        </section>

        {/* How Can We Help You — Topic Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">How can we help you?</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Choose a topic to start a tracked support message linked to this order.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#D9232D] ring-1 ring-rose-100">
              <Headset className="h-5 w-5" strokeWidth={2.2} />
            </div>
          </div>

          <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:grid-cols-3">
            {helpTopics.map((topic) => {
              const TopicIcon = topic.icon;
              return (
                <button
                  key={topic.title}
                  type="button"
                  onClick={() => onOpenLiveChat(order.id)}
                  className="group flex min-w-0 flex-col rounded-2xl border border-slate-200/85 bg-white/95 p-3.5 text-left shadow-2xs backdrop-blur-md transition-all hover:border-rose-200 hover:shadow-md active:scale-[0.98]"
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        topic.blue
                          ? 'border-sky-200 bg-sky-50 text-sky-600'
                          : 'border-rose-100 bg-rose-50 text-[#D9232D]'
                      }`}
                    >
                      <TopicIcon className="h-4.5 w-4.5" />
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#D9232D]" />
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

        {/* Direct Contact Channels */}
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">Contact Us Directly</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Talk to our support team for immediate pickup or installation help.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-rose-200/80 bg-gradient-to-br from-[#FFF4F5] via-white to-white p-4 shadow-2xs">
              <div>
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100/80 text-[#D9232D]">
                  <MessageCircle className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900">Live Message</h4>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  Send a tracked message linked to #{order.order_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenLiveChat(order.id)}
                className="banner-cta-shine group/cta mt-3.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3 py-2 text-xs font-extrabold text-white shadow-sm shadow-rose-600/20 transition-all hover:brightness-105 hover:shadow-md active:scale-95"
              >
                <MessageCircle className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                <span>Start Chat</span>
              </button>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/85 bg-white/95 p-4 shadow-2xs">
              <div>
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900">Call Us</h4>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">Speak directly with our store</p>
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

            <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/85 bg-white/95 p-4 shadow-2xs">
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
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/85 bg-white/95 p-4 shadow-2xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-[#D9232D]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Store Working Hours</h4>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{WORKSHOP_INFO.workingHours}</p>
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
              Please keep your Order ID ready for faster support.
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
