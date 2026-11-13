import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Share2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';

export interface LegalClauseItem {
  label: string;
  text: string;
}

export interface LegalClauseSection {
  id: string;
  number: string;
  icon: LucideIcon;
  title: string;
  shortTitle?: string;
  summary: string;
  keywords?: string[];
  details: LegalClauseItem[];
}

export interface LegalHighlightItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface LegalCrossLinkItem {
  label: string;
  description: string;
  onClick: () => void;
}

interface LegalDocumentLayoutProps {
  documentTitle: string;
  documentSubtitle: string;
  heroTitle: string;
  heroDescription: string;
  lastUpdated: string;
  versionLabel: string;
  highlights: LegalHighlightItem[];
  sections: LegalClauseSection[];
  searchPlaceholder: string;
  whatsappMessage: string;
  primaryCtaLabel: string;
  acceptanceNote: string;
  onBack: () => void;
  onOpenStoreInfo?: () => void;
  crossLinks?: LegalCrossLinkItem[];
}

const formatTelHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;
const formatWhatsAppHref = (phone: string, message: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LegalDocumentLayout: React.FC<LegalDocumentLayoutProps> = ({
  documentTitle,
  documentSubtitle,
  heroTitle,
  heroDescription,
  lastUpdated,
  versionLabel,
  highlights,
  sections,
  searchPlaceholder,
  whatsappMessage,
  primaryCtaLabel,
  acceptanceNote,
  onBack,
  onOpenStoreInfo,
  crossLinks = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    sections.length > 0 ? [sections[0].id] : [],
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(() => sections[0]?.id ?? '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const quickJumpButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return sections;
    return sections.filter((section) => {
      const haystack = [
        section.number,
        section.title,
        section.shortTitle || '',
        section.summary,
        ...(section.keywords || []),
        ...section.details.flatMap((detail) => [detail.label, detail.text]),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, sections]);

  const allVisibleExpanded =
    filteredSections.length > 0 &&
    filteredSections.every((section) => expandedIds.includes(section.id));

  // Track the currently visible section while scrolling so the persistent Quick Jump stays synced.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined' ||
      filteredSections.length === 0
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const targetId = visible[0].target.id.replace('legal-section-', '');
          if (targetId) {
            setActiveSectionId(targetId);
          }
        }
      },
      {
        rootMargin: '-120px 0px -65% 0px',
        threshold: 0,
      },
    );

    filteredSections.forEach((section) => {
      const el = document.getElementById(`legal-section-${section.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredSections]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const toggleSection = (id: string) => {
    setActiveSectionId(id);
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleAll = () => {
    if (allVisibleExpanded) {
      setExpandedIds([]);
    } else {
      setExpandedIds(filteredSections.map((section) => section.id));
    }
  };

  const handleQuickJump = (id: string) => {
    if (normalizedQuery) {
      setSearchQuery('');
    }
    setActiveSectionId(id);
    setExpandedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    const scrollBehavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';

    const jumpBtn = quickJumpButtonRefs.current[id];
    if (jumpBtn && typeof jumpBtn.scrollIntoView === 'function') {
      jumpBtn.scrollIntoView({ behavior: scrollBehavior, inline: 'center', block: 'nearest' });
    }

    if (typeof document !== 'undefined') {
      isProgrammaticScrollRef.current = true;
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
      window.setTimeout(() => {
        const element = document.getElementById(`legal-section-${id}`);
        if (element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        }
        scrollTimerRef.current = window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 650);
      }, 45);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        window.setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Clipboard access can be denied in restricted webviews.
    }
  };

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(WORKSHOP_INFO.email);
        setCopiedEmail(true);
        window.setTimeout(() => setCopiedEmail(false), 2000);
      }
    } catch {
      // Clipboard access can be denied in restricted webviews.
    }
  };

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 select-text font-sans">
      {/* Persistent Sticky Top Header + Quick Jump Menu */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 transition-colors hover:bg-rose-50 hover:text-[#D9232D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                {documentTitle}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-slate-500">
                <span className="text-[#D9232D]">ROFIK GODI CENTRE</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{documentSubtitle}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={`Copy ${documentTitle} link`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-95 whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-slate-600" />
                <span className="hidden sm:inline">Copy link</span>
              </>
            )}
          </button>
        </div>

        {/* Persistent Quick Jump Bar */}
        <div className="border-t border-slate-100 bg-slate-50/75">
          <nav
            aria-label="Quick Jump navigation"
            className="mx-auto flex max-w-4xl items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-1.5 sm:px-6"
          >
            <span className="inline-flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-extrabold text-slate-500 whitespace-nowrap">
              <Compass className="h-3.5 w-3.5 text-[#D9232D]" />
              <span>Quick Jump</span>
            </span>

            {sections.map((section) => {
              const isActive = !normalizedQuery && activeSectionId === section.id;
              return (
                <button
                  key={section.id}
                  ref={(node) => {
                    quickJumpButtonRefs.current[section.id] = node;
                  }}
                  type="button"
                  onClick={() => handleQuickJump(section.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D9232D] text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200/80 hover:border-rose-200 hover:text-[#D9232D]'
                  }`}
                >
                  <span className="tabular-nums opacity-85">{section.number}</span>
                  <span>{section.shortTitle || section.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
        {/* Clean Light Slate & Crimson Hero Summary Card */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)] sm:p-7">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500 tabular-nums">
              <span className="font-bold text-[#D9232D]">{WORKSHOP_INFO.name}</span>
              <span aria-hidden="true">·</span>
              <span>Updated {lastUpdated}</span>
              <span aria-hidden="true">·</span>
              <span>{versionLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{sections.length} sections</span>
            </div>

            <h2 className="max-w-2xl text-2xl font-black tracking-tight text-slate-900 [text-wrap:balance] sm:text-3xl">
              {heroTitle}
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              {heroDescription}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#D9232D]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Search, Count & Expand All Controls */}
        <section
          aria-label="Document search and reading controls"
          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.14)] sm:p-5"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-11 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                Showing {filteredSections.length} of {sections.length}
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                disabled={filteredSections.length === 0}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-800 transition-colors hover:border-rose-200 hover:bg-rose-50/60 hover:text-[#D9232D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                {allVisibleExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>
        </section>

        {/* Clause Sections List */}
        {filteredSections.length === 0 ? (
          <section className="rounded-3xl border border-slate-200/80 bg-white px-5 py-10 text-center shadow-[0_6px_22px_-18px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-extrabold text-slate-900">
              No clauses matched "{searchQuery.trim()}"
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try a different keyword like payment, pickup, embroidery, deletion, or notification.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#D9232D] px-5 text-xs font-extrabold text-white transition-colors hover:bg-[#B91822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
            >
              Reset search
            </button>
          </section>
        ) : (
          <div className="space-y-3">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              const isExpanded = Boolean(normalizedQuery) || expandedIds.includes(section.id);

              return (
                <article
                  key={section.id}
                  id={`legal-section-${section.id}`}
                  className="scroll-mt-32 rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_-14px_rgba(15,23,42,0.14)] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`legal-panel-${section.id}`}
                    className="flex min-h-16 w-full items-start justify-between gap-3 rounded-2xl px-4 py-4 text-left transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] sm:px-5"
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#D9232D]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-xs font-black text-[#D9232D] tabular-nums">
                            {section.number}.
                          </span>
                          <h3 className="text-[15px] font-extrabold leading-snug text-slate-900 sm:text-base">
                            {section.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[13px]">
                          {section.summary}
                        </p>
                      </div>
                    </div>

                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400">
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#D9232D]' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {isExpanded && (
                    <div
                      id={`legal-panel-${section.id}`}
                      className="divide-y divide-slate-100 border-t border-slate-100 px-4 py-3 sm:px-5"
                    >
                      {section.details.map((item) => (
                        <div key={item.label} className="py-3 first:pt-1 last:pb-1">
                          <h4 className="text-[13px] font-extrabold text-slate-900">
                            {item.label}
                          </h4>
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Workshop & Grievance Officer Contact Block */}
        <section
          aria-label="Workshop and grievance contact details"
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_22px_-18px_rgba(15,23,42,0.14)] sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#D9232D]" />
                <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">
                  {WORKSHOP_INFO.name} · Workshop &amp; Grievance Contact
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                {WORKSHOP_INFO.address}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 tabular-nums">
                <span>{WORKSHOP_INFO.workingHours}</span>
                <span aria-hidden="true">·</span>
                <span>{WORKSHOP_INFO.phone}</span>
                <span aria-hidden="true">·</span>
                <span>{WORKSHOP_INFO.phoneAlt}</span>
              </div>
            </div>

            {onOpenStoreInfo && (
              <button
                type="button"
                onClick={onOpenStoreInfo}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 text-xs font-extrabold text-[#D9232D] transition-colors hover:bg-rose-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
              >
                <span>View Store Map &amp; Hours</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5 border-t border-slate-100 pt-4">
            <a
              href={formatTelHref(WORKSHOP_INFO.phone)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
            >
              <Phone className="h-4 w-4 text-[#D9232D]" />
              <span>Call {WORKSHOP_INFO.phone}</span>
            </a>

            <button
              type="button"
              onClick={() => void handleCopyEmail()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
            >
              <Mail className="h-4 w-4 text-slate-600" />
              <span>{WORKSHOP_INFO.email}</span>
              {copiedEmail ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            <a
              href={formatWhatsAppHref(WORKSHOP_INFO.whatsapp, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1F9D55] px-4 text-xs font-extrabold text-white transition-colors hover:bg-[#178245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F9D55] whitespace-nowrap"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp Support</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </div>
        </section>

        {/* Cross-Navigation Links */}
        {crossLinks.length > 0 && (
          <section
            aria-label="Related policy and account links"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {crossLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={link.onClick}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-[0_4px_16px_-14px_rgba(15,23,42,0.12)] transition-colors hover:border-rose-200 hover:bg-rose-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900">{link.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{link.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#D9232D]" />
              </button>
            ))}
          </section>
        )}

        {/* Primary Action Footer */}
        <section className="space-y-3 pt-1 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#D9232D] px-6 text-sm font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(217,35,45,0.65)] transition-all hover:bg-[#B91822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-[0.99]"
          >
            <span>{primaryCtaLabel}</span>
          </button>
          <p className="text-xs leading-relaxed text-slate-500">{acceptanceNote}</p>
        </section>
      </main>
    </div>
  );
};
