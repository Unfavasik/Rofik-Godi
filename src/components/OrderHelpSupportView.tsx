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
  Heart,
  Headset,
  HelpCircle,
  Info,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  PackageOpen,
  Phone,
  Store,
} from 'lucide-react';
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
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};

const statusPillTone = (status: string) => {
  if (status === 'CANCELLED') return 'bg-rose-100 text-rose-700';
  if (isOrderComplete(status)) return 'bg-emerald-100 text-emerald-700';
  if (status === 'READY_FOR_PICKUP') return 'bg-blue-100 text-blue-700';
  return 'bg-[#FDE8EA] text-[#D9232D]';
};

const helpTopics = [
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
      // Clipboard access can be blocked; the ID stays visible either way.
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#F7F7FA] font-sans text-slate-900"
      role="dialog"
      aria-modal="true"
      aria-label="Help and support"
    >
      <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-4 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to order"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECECF1] text-slate-700 transition hover:bg-[#e2e2e9] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[26px] font-black leading-tight tracking-tight">Help &amp; Support</h1>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
                We&apos;re here to assist you
                <Heart className="h-3.5 w-3.5 fill-[#D9232D] text-[#D9232D]" aria-hidden="true" />
              </p>
            </div>
          </div>
          <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#E3F6EB] px-3 py-1.5 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live Support
          </span>
        </header>

        <section className="relative mt-5 rounded-[22px] border border-rose-100 bg-gradient-to-r from-[#FFF0F2] to-[#FFF8F8] p-4 pr-10 shadow-sm">
          <span className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${statusPillTone(order.status)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {getOrderStatusLabel(order.status)}
          </span>
          <div className="flex items-center gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm">
              {firstImage ? (
                <img src={firstImage} alt="Order item" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-6 w-6 text-[#D9232D]" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-slate-500">Order ID</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="truncate text-[14px] font-black tracking-tight text-slate-900">#{order.order_number}</p>
                <button
                  type="button"
                  onClick={() => void copyOrderId()}
                  aria-label={copied ? 'Order ID copied' : 'Copy order ID'}
                  className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {formatDate(order.created_at)} <span className="px-0.5">·</span> {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              aria-label="View order details"
              className="absolute bottom-1/2 right-3 flex h-8 w-8 shrink-0 translate-y-1/2 items-center justify-center rounded-full text-slate-700 transition hover:bg-white/70"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="mt-7 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-black tracking-tight">How can we help you?</h2>
            <p className="mt-1 text-[12px] text-slate-500">Choose a topic or get in touch with our support team.</p>
          </div>
          <span className="relative hidden h-14 w-14 shrink-0 items-center justify-center sm:flex" aria-hidden="true">
            <span className="absolute inset-0 rounded-full bg-[#FDE8EA]" />
            <Headset className="relative h-7 w-7 text-[#D9232D]" strokeWidth={1.8} />
          </span>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {helpTopics.map((topic) => (
            <button
              key={topic.title}
              type="button"
              onClick={() => onOpenLiveChat(order.id)}
              className="group flex items-start gap-3 rounded-[18px] border border-slate-100 bg-white p-3.5 text-left shadow-[0_3px_12px_rgba(20,20,20,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(20,20,20,0.07)]"
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${topic.blue ? 'bg-[#EBF3FF] text-[#2563EB]' : 'bg-[#FDECE9] text-[#D9232D]'}`}>
                <topic.icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-1">
                  <span className="truncate text-[13px] font-extrabold tracking-tight text-slate-900">{topic.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#D9232D]" />
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{topic.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <section className="mt-7">
          <h2 className="text-[22px] font-black tracking-tight">Contact Us Directly</h2>
          <p className="mt-1 text-[12px] text-slate-500">Talk to our support team for quick assistance.</p>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col rounded-[18px] bg-[#FFF0F2] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#D9232D] shadow-sm">
              <MessageCircle className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <h3 className="mt-3 text-[15px] font-black tracking-tight">Live Chat</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">Chat with our team in real-time</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online now
            </p>
            <button
              type="button"
              onClick={() => onOpenLiveChat(order.id)}
              className="mt-3 inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#D9232D] px-3 text-[11px] font-extrabold text-white shadow-[0_5px_14px_rgba(217,35,45,0.22)] transition hover:bg-[#c91d2a] active:scale-[0.98]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Start Chat
            </button>
          </div>

          <div className="flex flex-col rounded-[18px] bg-[#F0F6FF] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#2563EB] shadow-sm">
              <Phone className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <h3 className="mt-3 text-[15px] font-black tracking-tight">Call Us</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">Speak directly with our store</p>
            <p className="mt-2 inline-flex w-fit items-center rounded-full bg-[#FDE8EA] px-2.5 py-1 text-[10px] font-extrabold text-[#D9232D]">{WORKSHOP_INFO.phone}</p>
            <a
              href={phoneHref}
              className="mt-3 inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#D9232D]/60 bg-white/60 px-3 text-[11px] font-extrabold text-[#D9232D] transition hover:bg-[#D9232D] hover:text-white active:scale-[0.98]"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Now
            </a>
          </div>

          <div className="flex flex-col rounded-[18px] bg-[#EBF8F0] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#1FA855] shadow-sm">
              <MessageCircle className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <h3 className="mt-3 text-[15px] font-black tracking-tight">WhatsApp</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-600">Chat with us on WhatsApp</p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#1FA855]/60 bg-white/70 px-3 pt-2.5 text-[11px] font-extrabold text-[#1FA855] transition hover:bg-[#1FA855] hover:text-white active:scale-[0.98]"
            >
              Open WhatsApp
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <section className="mt-4 flex flex-col gap-3 rounded-[18px] bg-[#FFF0F2] p-4 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#D9232D] shadow-sm">
            <Store className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-black text-[#D9232D]">Store Working Hours</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-600">{WORKSHOP_INFO.workingHours}</p>
          </div>
          <a
            href={mapHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#D9232D] px-4 text-[11px] font-extrabold text-white shadow-[0_5px_14px_rgba(217,35,45,0.22)] transition hover:bg-[#c91d2a] active:scale-[0.98]"
          >
            <MapPin className="h-3.5 w-3.5" />
            Open in Maps
            <Navigation className="h-3 w-3" aria-hidden="true" />
          </a>
        </section>

        <section className="mt-3 flex items-start gap-3 rounded-[18px] bg-[#EBF3FF] p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#2563EB] text-white">
            <Info className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-[13px] font-black tracking-tight">Before contacting</h3>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-600">Please keep your Order ID ready for faster support.</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
