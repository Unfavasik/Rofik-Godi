import React from 'react';
import { Bell, Headphones, MessageCircle, Phone, X } from 'lucide-react';
import { CustomerSupportRequestForm } from './CustomerSupportRequestForm';
import { WORKSHOP_INFO } from '../data/products';

export function ContactSupportView({ currentUserId, isAuthenticated, onBack, onOpenLogin, onOpenSupportRequest, onOpenSupportRequests }: {
  currentUserId: string;
  isAuthenticated: boolean;
  onBack: () => void;
  onOpenLogin?: () => void;
  onOpenSupportRequest?: (requestId: string) => void;
  onOpenSupportRequests?: () => void;
}) {
  return <main className="min-h-dvh w-full bg-[#F5F6F8] font-sans text-slate-900">
    <div className="mx-auto min-h-dvh w-full max-w-xl bg-white shadow-[0_8px_36px_rgba(15,23,42,0.08)]">
      <header className="flex min-h-[60px] items-center gap-3 bg-[#E51E2B] px-4 py-3 text-white">
        <button type="button" onClick={onBack} aria-label="Close" className="-ml-1 rounded-full p-1.5 hover:bg-white/10"><X className="h-5 w-5" /></button>
        <Headphones className="h-5 w-5" />
        <div className="min-w-0">
          <h1 className="text-[18px] font-extrabold tracking-tight">Contact Workshop Team</h1>
          <p className="text-[10px] font-medium text-white/80">{WORKSHOP_INFO.workingHours}</p>
        </div>
      </header>

      <div className="space-y-3 px-3 pb-5 pt-3 sm:px-4">
        <section className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[#D9232D]"><Headphones className="h-6 w-6" /></span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold tracking-tight">We’re here to help</h2>
            <p className="mt-1 text-[12px] leading-[1.5] text-slate-600">Have a question about your order, pickup, installation or anything else? Send us a message and we’ll get back to you soon.</p>
          </div>
        </section>

        <CustomerSupportRequestForm
          isAuthenticated={isAuthenticated}
          expectedUserId={currentUserId}
          onOpenLogin={onOpenLogin}
          onOpenSupportRequest={onOpenSupportRequest}
          compact
        />

        {onOpenSupportRequests && (
          <button type="button" onClick={onOpenSupportRequests} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            View my support requests
          </button>
        )}

        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          <span className="h-px flex-1 bg-slate-100" />
          Or contact us directly
          <span className="h-px flex-1 bg-slate-100" />
        </div>

        <div className="space-y-2.5">
          <a href={`tel:${WORKSHOP_INFO.phone.replace(/\s/g, '')}`} className="flex items-center justify-between rounded-2xl bg-[#EBF5FF] p-3.5 text-xs font-bold text-[#2563EB]">
            <span className="flex items-center gap-2.5"><Phone className="h-5 w-5" />Call {WORKSHOP_INFO.phone}</span>
            <span>Dial →</span>
          </a>
          <a href={`https://wa.me/${WORKSHOP_INFO.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-[#E8F8F0] p-3.5 text-xs font-bold text-[#10B981]">
            <span className="flex items-center gap-2.5"><MessageCircle className="h-5 w-5" />WhatsApp Direct Support</span>
            <span>Chat →</span>
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-3 text-[11px] font-medium text-slate-600"><Bell className="h-4 w-4 shrink-0 text-slate-500" />You’ll get a notification when we reply.</div>
      </div>
    </div>
  </main>;
}
