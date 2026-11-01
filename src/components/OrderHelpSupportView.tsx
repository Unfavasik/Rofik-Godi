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
  if (status === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-100';
  if (isOrderComplete(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'READY_FOR_PICKUP') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-rose-50 text-rose-700 border-rose-100';
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
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#F8FAFC] font-sans text-slate-800"
      role="dialog"
      aria-modal="true"
      aria-label="Help and support"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col space-y-4 px-4 pb-10 pt-3">
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100/80 text-slate-700 transition-transform hover:bg-slate-200/80 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <div>
              <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900">Help &amp; Support</h1>
              <p className="mt-0.5 flex items-center text-xs font-medium text-slate-500">
                We&apos;re here to assist you <Heart className="ml-1 h-3 w-3 fill-red-500 text-red-500" />
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 rounded-full border border-[#DCF5E7] bg-[#EBF9F1] px-3 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#10B981]" />
            <span className="text-xs font-semibold tracking-wide text-[#10B981]">Live Support</span>
          </div>
        </header>

        <section aria-label="Current Order Status" className="relative rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex h-[68px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 p-1">
              {firstImage ? (
                <img src={firstImage} alt="Order item" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <Package className="h-14 w-14 text-slate-800" />
              )}
            </div>
            <div className="ml-3 min-w-0 flex-1 pr-2">
              <div className="text-[11px] font-medium leading-none text-slate-400">Order ID</div>
              <div className="mt-0.5 flex items-center space-x-1.5">
                <span className="truncate text-[13px] font-black tracking-tight text-slate-900">#{order.order_number}</span>
                <button
                  type="button"
                  onClick={() => void copyOrderId()}
                  aria-label={copied ? 'Order ID copied' : 'Copy Order ID'}
                  className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-400">
                {formatDate(order.created_at)} <span className="mx-0.5">•</span> {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </div>
            </div>
            <div className="flex shrink-0 items-center space-x-1">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillTone(order.status)}`}>
                {getOrderStatusLabel(order.status)}
              </span>
              <ChevronRight className="ml-0.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </section>

        <section className="relative pt-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">How can we help you?</h2>
              <p className="mt-0.5 text-xs font-normal text-slate-500">Choose a topic or get in touch with our support team.</p>
            </div>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <span className="absolute -top-1 right-0 z-10 flex h-4 w-5 items-center justify-center rounded-full rounded-br-none bg-[#FDA4AF] text-[8px] font-black leading-none text-white">•••</span>
              <Headset className="h-10 w-10 text-[#E11D48]" strokeWidth={2.4} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {helpTopics.map((topic) => {
              const TopicIcon = topic.icon;
              return (
                <button
                  key={topic.title}
                  type="button"
                  onClick={() => onOpenLiveChat(order.id)}
                  className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)] transition hover:border-rose-200 active:scale-[0.98]"
                >
                  <span className="flex items-center justify-between">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${topic.blue ? 'border-sky-200 bg-sky-50 text-sky-600' : 'border-rose-100 bg-rose-50 text-rose-600'}`}>
                      <TopicIcon className="h-5 w-5" />
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </span>
                  <span className="mt-2.5 block text-xs font-bold leading-tight text-slate-800">{topic.title}</span>
                  <span className="mt-1 block text-[10px] leading-snug text-slate-400">{topic.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Contact Us Directly</h2>
              <p className="mt-0.5 text-xs font-normal text-slate-500">Talk to our support team for quick assistance.</p>
            </div>
            <MessageCircle className="mr-2 h-5 w-5 text-[#F43F5E]" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="flex min-h-[160px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-2.5 text-left shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)]">
              <div>
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><MessageCircle className="h-4 w-4" /></div>
                <h4 className="text-xs font-bold leading-tight text-slate-900">Live Chat</h4>
                <p className="mt-0.5 text-[9.5px] leading-snug text-slate-400">Chat with our team in real-time</p>
                <div className="mt-1.5 flex items-center space-x-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] font-semibold text-emerald-500">Online now</span></div>
              </div>
              <button type="button" onClick={() => onOpenLiveChat(order.id)} className="mt-2.5 flex w-full items-center justify-center space-x-1 rounded-xl bg-[#E11D48] px-1 py-1.5 text-[10px] font-bold text-white shadow-sm shadow-rose-200 transition-all hover:bg-[#BE123C] active:scale-95"><MessageCircle className="h-3 w-3" /><span>Start Chat</span></button>
            </div>

            <div className="flex min-h-[160px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-2.5 text-left shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)]">
              <div>
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Phone className="h-4 w-4" /></div>
                <h4 className="text-xs font-bold leading-tight text-slate-900">Call Us</h4>
                <p className="mt-0.5 text-[9.5px] leading-snug text-slate-400">Speak directly with our store</p>
                <div className="mt-1.5 inline-block rounded-md bg-rose-50 px-1.5 py-0.5"><span className="whitespace-nowrap text-[8.5px] font-bold tracking-tight text-rose-600">{WORKSHOP_INFO.phone}</span></div>
              </div>
              <a href={phoneHref} className="mt-2.5 flex w-full items-center justify-center space-x-1 rounded-xl border border-[#E11D48] bg-white px-1 py-1.5 text-[10px] font-bold text-[#E11D48] transition-all hover:bg-rose-50 active:scale-95"><Phone className="h-3 w-3" /><span>Call Now</span></a>
            </div>

            <div className="flex min-h-[160px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-2.5 text-left shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)]">
              <div>
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-green-500"><MessageCircle className="h-4 w-4" /></div>
                <h4 className="text-xs font-bold leading-tight text-slate-900">WhatsApp</h4>
                <p className="mt-0.5 text-[9.5px] leading-snug text-slate-400">Chat with us on WhatsApp</p>
              </div>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-2.5 flex w-full items-center justify-center space-x-1 rounded-xl border border-green-500 bg-white px-0.5 py-1.5 text-[9.5px] font-bold text-green-600 transition-all hover:bg-emerald-50 active:scale-95"><span>Open WhatsApp</span><ExternalLink className="h-2.5 w-2.5" /></a>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600"><Store className="h-5 w-5" /></div>
            <div><h4 className="text-xs font-bold leading-tight text-rose-600">Store Working Hours</h4><p className="mt-0.5 text-[11px] font-medium text-slate-500">{WORKSHOP_INFO.workingHours}</p></div>
          </div>
          <a href={mapHref} target="_blank" rel="noreferrer" className="flex items-center space-x-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"><MapPin className="h-3.5 w-3.5" /><span>Open in Maps</span><ChevronRight className="h-3 w-3" /></a>
        </section>

        <section className="flex items-start space-x-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white"><Info className="h-5 w-5" /></div>
          <div><h4 className="text-xs font-bold leading-tight text-slate-900">Before contacting</h4><p className="mt-0.5 text-[11px] leading-snug text-slate-500">Please keep your Order ID ready for faster support.</p></div>
        </section>
      </div>
    </motion.div>
  );
}
