import React from 'react';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Clock,
  Headphones,
  MapPin,
  MessageCircle,
  Phone,
  Ticket,
} from 'lucide-react';
import { CustomerSupportRequestForm } from './CustomerSupportRequestForm';
import { WORKSHOP_INFO } from '../data/products';

export function ContactSupportView({
  currentUserId,
  isAuthenticated,
  initialOrderId,
  onBack,
  onOpenLogin,
  onOpenSupportRequest,
  onOpenSupportRequests,
}: {
  currentUserId: string;
  isAuthenticated: boolean;
  initialOrderId?: string | null;
  onBack: () => void;
  onOpenLogin?: () => void;
  onOpenSupportRequest?: (requestId: string) => void;
  onOpenSupportRequests?: () => void;
}) {
  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-gradient-to-br from-[#F8FAFC] via-[#F4F6FB] to-[#FFF5F6] font-sans text-slate-900">
      {/* Frosted Glass Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Close"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100/90 text-slate-700 transition-all hover:bg-rose-50 hover:text-[#D9232D] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE4E6] to-[#FECDD3] text-[#D9232D] ring-1 ring-inset ring-rose-200/70 sm:flex">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-black tracking-tight text-slate-900 sm:text-[19px]">
                Contact Workshop Team
              </h1>
              <p className="truncate text-[11px] font-medium text-slate-500">
                {WORKSHOP_INFO.workingHours}
              </p>
            </div>
          </div>

          {onOpenSupportRequests && (
            <button
              type="button"
              onClick={onOpenSupportRequests}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-2xs transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-[#D9232D] whitespace-nowrap"
            >
              <Ticket className="h-3.5 w-3.5 text-[#D9232D]" />
              <span className="hidden sm:inline">My requests</span>
              <span className="sm:hidden">Tickets</span>
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] lg:items-start">
        {/* Left / Primary Column: Welcome Hero + Structured Composer */}
        <div className="min-w-0 space-y-4">
          <section className="relative overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-br from-[#FFF4F5] via-white to-[#FCECEF] p-4 sm:p-5 shadow-[0_12px_30px_-16px_rgba(217,35,45,0.14)]">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#D9232D] ring-1 ring-rose-200/80 shadow-xs">
                <Headphones className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-black tracking-tight text-slate-900">
                  We’re here to help
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Have a question about your order, pickup timing, seat cover fitment, or custom installation? Send our workshop team a message below.
                </p>
              </div>
            </div>
          </section>

          <CustomerSupportRequestForm
            isAuthenticated={isAuthenticated}
            expectedUserId={currentUserId}
            initialRelatedOrderId={initialOrderId}
            onOpenLogin={onOpenLogin}
            onOpenSupportRequest={onOpenSupportRequest}
            compact
          />

          {onOpenSupportRequests && (
            <button
              type="button"
              onClick={onOpenSupportRequests}
              className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-slate-200/85 bg-white/95 px-4 py-3 text-xs font-extrabold text-slate-700 shadow-2xs backdrop-blur-md transition-all hover:border-rose-200 hover:bg-rose-50/40 hover:text-[#D9232D]"
            >
              <span className="flex items-center gap-2.5">
                <Ticket className="h-4 w-4 text-[#D9232D]" />
                <span>View my support requests</span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Right / Secondary Column: Direct Workshop Channels & Info */}
        <aside className="min-w-0 space-y-4">
          <div className="flex items-center gap-3 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
            <span className="h-px flex-1 bg-slate-200/80" />
            Or contact us directly
            <span className="h-px flex-1 bg-slate-200/80" />
          </div>

          <section className="rounded-3xl border border-slate-200/85 bg-white/95 p-4 sm:p-5 backdrop-blur-md shadow-[0_12px_30px_-16px_rgba(15,23,42,0.08)] space-y-3">
            <div>
              <h3 className="text-sm font-black tracking-tight text-slate-900">Direct workshop channels</h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Reach Rofik Godi Centre immediately by call or WhatsApp.
              </p>
            </div>

            <div className="space-y-2.5">
              <a
                href={`tel:${WORKSHOP_INFO.phone.replace(/\s/g, '')}`}
                className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-[#EFF6FF] to-white p-3.5 text-xs font-bold text-[#1D4ED8] transition-all hover:border-blue-300 hover:shadow-2xs active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-2xs ring-1 ring-blue-100">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold text-slate-900 tabular-nums">
                      Call {WORKSHOP_INFO.phone}
                    </span>
                    <span className="block text-[10.5px] font-medium text-slate-500">Primary workshop desk</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#2563EB] ring-1 ring-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Dial →
                </span>
              </a>

              <a
                href={`tel:${WORKSHOP_INFO.phoneAlt.replace(/\s/g, '')}`}
                className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-[#EFF6FF] to-white p-3.5 text-xs font-bold text-[#1D4ED8] transition-all hover:border-blue-300 hover:shadow-2xs active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-2xs ring-1 ring-blue-100">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold text-slate-900 tabular-nums">
                      Call {WORKSHOP_INFO.phoneAlt}
                    </span>
                    <span className="block text-[10.5px] font-medium text-slate-500">Alternate support line</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#2563EB] ring-1 ring-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Dial →
                </span>
              </a>

              <a
                href={`https://wa.me/${WORKSHOP_INFO.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-[#ECFDF5] to-white p-3.5 text-xs font-bold text-[#15803D] transition-all hover:border-emerald-300 hover:shadow-2xs active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#10B981] shadow-2xs ring-1 ring-emerald-100">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold text-slate-900">WhatsApp Direct Support</span>
                    <span className="block text-[10.5px] font-medium text-slate-500">Quick photos &amp; voice notes</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#15803D] ring-1 ring-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  Chat →
                </span>
              </a>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/85 bg-white/95 p-4 backdrop-blur-md shadow-2xs space-y-2.5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#D9232D]">
                <Clock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900">Workshop Hours</p>
                <p className="mt-0.5 break-words text-[11px] font-medium text-slate-500">{WORKSHOP_INFO.workingHours}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border-t border-slate-100 pt-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900">{WORKSHOP_INFO.name}</p>
                <p className="mt-0.5 break-words text-[11px] leading-relaxed text-slate-500">{WORKSHOP_INFO.address}</p>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-[11.5px] font-semibold text-slate-700">
            <Bell className="h-4 w-4 shrink-0 text-[#D9232D]" />
            <span>You’ll get a notification when we reply.</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
