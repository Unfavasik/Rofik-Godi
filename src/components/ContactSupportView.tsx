import React from 'react';
import { ArrowLeft, Bell, Clock3, ExternalLink, Headphones, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';
import { CustomerSupportRequestForm } from './CustomerSupportRequestForm';

export function ContactSupportView({ currentUserId, isAuthenticated, onBack, onOpenLogin, onOpenSupportRequest }: {
  currentUserId: string;
  isAuthenticated: boolean;
  onBack: () => void;
  onOpenLogin?: () => void;
  onOpenSupportRequest?: (requestId: string) => void;
}) {
  const whatsappNumber = WORKSHOP_INFO.whatsapp.replace(/\D/g, '');

  return (
    <main className="min-h-dvh w-full bg-[#F5F6F8] font-sans text-slate-900">
      <div className="mx-auto min-h-dvh w-full max-w-6xl bg-white shadow-[0_8px_36px_rgba(15,23,42,0.08)]">
        <header className="flex min-h-[68px] items-center gap-3 bg-[#E51E2B] px-4 py-3 text-white sm:px-7">
          <button type="button" onClick={onBack} aria-label="Back" className="-ml-1 rounded-full p-2 transition hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Headphones className="h-5 w-5" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Contact Support</h1>
            <p className="text-xs text-white/80">Rofik Godi Centre customer care</p>
          </div>
        </header>

        <div className="grid gap-6 px-4 py-5 sm:px-7 sm:py-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-8 lg:px-9 lg:py-9">
          <section className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-5 sm:p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#D9232D] shadow-sm">
                <Headphones className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-extrabold tracking-tight">We’re here to help</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                Questions about an order, pickup, installation, or a product? Choose a direct contact option or send our workshop team a tracked support request.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="px-1 text-sm font-bold text-slate-800">Get in touch</h2>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">WhatsApp chat</span><span className="mt-0.5 block text-xs text-slate-500">Chat with our support team</span></span>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
              <a href={`tel:${WORKSHOP_INFO.phone.replace(/\s/g, '')}`} className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Phone className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Call the workshop</span><span className="mt-0.5 block text-xs text-slate-500">{WORKSHOP_INFO.phone}</span></span>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
              <a href={`mailto:${WORKSHOP_INFO.email}`} className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Mail className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Email support</span><span className="mt-0.5 block truncate text-xs text-slate-500">{WORKSHOP_INFO.email}</span></span>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div><h3 className="text-xs font-bold">Workshop hours</h3><p className="mt-1 text-xs leading-5 text-slate-600">{WORKSHOP_INFO.workingHours}</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div><h3 className="text-xs font-bold">Visit the workshop</h3><p className="mt-1 text-xs leading-5 text-slate-600">{WORKSHOP_INFO.address}</p></div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <CustomerSupportRequestForm
              isAuthenticated={isAuthenticated}
              expectedUserId={currentUserId}
              onOpenLogin={onOpenLogin}
              onOpenSupportRequest={onOpenSupportRequest}
            />
            <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3.5 text-xs leading-5 text-slate-600">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#D9232D]" />
              <p>You’ll get a notification when we reply. Please don’t include card or payment details in your message.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
