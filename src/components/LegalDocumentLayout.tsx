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
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#FFFCF4] text-[#2B1611] select-text font-sans">
      {/* Persistent Sticky Top Header + Quick Jump Menu */}
      <header className="sticky top-0 z-30 border-b border-[#E8D8C4] bg-[#FFFCF4]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FAF4EA] text-[#2B1611] transition-colors hover:bg-[#FFF8D6] hover:text-[#6B352A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] active:scale-95"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold tracking-tight text-[#2B1611] sm:text-lg">
                {documentTitle}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-[#6B4C44]">
                <span className="text-[#6B352A]">ROFIK GODI CENTRE</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{documentSubtitle}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={`Copy ${documentTitle} link`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-[#E8D8C4] bg-white px-3.5 text-xs font-bold text-[#4A2B23] transition-colors hover:border-[#CBB8A6] hover:bg-[#FAF4EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] active:scale-95 whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-[#6B352A]" />
                <span className="text-[#6B352A]">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-[#6B4C44]" />
                <span className="hidden sm:inline">Copy link</span>
              </>
            )}
          </button>
        </div>

        {/* Persistent Quick Jump Bar */}
        <div className="border-t border-[#EFE2D2] bg-[#FAF4EA]/75">
          <nav
            aria-label="Quick Jump navigation"
            className="mx-auto flex max-w-4xl items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-1.5 sm:px-6"
          >
            <span className="inline-flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-extrabold text-[#6B4C44] whitespace-nowrap">
              <Compass className="h-3.5 w-3.5 text-[#6B352A]" />
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
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] whitespace-nowrap ${
                    isActive
                      ? 'bg-[#6B352A] text-[#FFF1A6] shadow-xs'
                      : 'bg-white text-[#4A2B23] border border-[#E8D8C4] hover:border-[#6B352A]/40 hover:text-[#6B352A]'
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
        {/* Hero Summary Card */}
        <section className="rounded-3xl border border-[#E8D8C4] bg-white p-5 shadow-[0_10px_30px_-20px_rgba(43,22,17,0.16)] sm:p-7">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#6B4C44] tabular-nums">
              <span className="font-bold text-[#6B352A]">{WORKSHOP_INFO.name}</span>
              <span aria-hidden="true">·</span>
              <span>Updated {lastUpdated}</span>
              <span aria-hidden="true">·</span>
              <span>{versionLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{sections.length} sections</span>
            </div>

            <h2 className="max-w-2xl text-2xl font-black tracking-tight text-[#2B1611] [text-wrap:balance] sm:text-3xl">
              {heroTitle}
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-[#6B4C44]">
              {heroDescription}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#EFE2D2] pt-5 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8D6] border border-[#E6CE73]/70 text-[#6B352A]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#2B1611]">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#6B4C44]">
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
          className="rounded-3xl border border-[#E8D8C4] bg-white p-4 shadow-[0_6px_22px_-18px_rgba(43,22,17,0.12)] sm:p-5"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6C63]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="min-h-11 w-full rounded-2xl border border-[#E8D8C4] bg-[#FFFCF4] pl-10 pr-11 text-sm font-medium text-[#2B1611] outline-none transition placeholder:text-[#8A6C63] focus:border-[#6B352A] focus:bg-white focus:ring-2 focus:ring-[#6B352A]/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-[#6B4C44] hover:bg-[#FAF4EA] hover:text-[#2B1611] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs font-semibold text-[#6B4C44] tabular-nums whitespace-nowrap">
                Showing {filteredSections.length} of {sections.length}
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                disabled={filteredSections.length === 0}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8D8C4] bg-white px-4 text-xs font-extrabold text-[#2B1611] transition-colors hover:border-[#6B352A]/40 hover:bg-[#FFF8D6] hover:text-[#6B352A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                {allVisibleExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>
        </section>

        {/* Clause Sections List */}
        {filteredSections.length === 0 ? (
          <section className="rounded-3xl border border-[#E8D8C4] bg-white px-5 py-10 text-center shadow-[0_6px_22px_-18px_rgba(43,22,17,0.12)]">
            <p className="text-sm font-extrabold text-[#2B1611]">
              No clauses matched "{searchQuery.trim()}"
            </p>
            <p className="mt-1 text-xs text-[#6B4C44]">
              Try a different keyword like payment, pickup, embroidery, deletion, or notification.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#6B352A] px-5 text-xs font-extrabold text-white transition-colors hover:bg-[#53271E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A]"
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
                  className="scroll-mt-32 rounded-2xl border border-[#E8D8C4] bg-white shadow-[0_4px_18px_-14px_rgba(43,22,17,0.12)] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`legal-panel-${section.id}`}
                    className="flex min-h-16 w-full items-start justify-between gap-3 rounded-2xl px-4 py-4 text-left transition-colors hover:bg-[#FAF4EA]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] sm:px-5"
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8D6] text-[#6B352A]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-xs font-black text-[#6B352A] tabular-nums">
                            {section.number}.
                          </span>
                          <h3 className="text-[15px] font-extrabold leading-snug text-[#2B1611] sm:text-base">
                            {section.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#6B4C44] sm:text-[13px]">
                          {section.summary}
                        </p>
                      </div>
                    </div>

                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#8A6C63]">
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#6B352A]' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {isExpanded && (
                    <div
                      id={`legal-panel-${section.id}`}
                      className="divide-y divide-[#EFE2D2] border-t border-[#EFE2D2] px-4 py-3 sm:px-5"
                    >
                      {section.details.map((item) => (
                        <div key={item.label} className="py-3 first:pt-1 last:pb-1">
                          <h4 className="text-[13px] font-extrabold text-[#2B1611]">
                            {item.label}
                          </h4>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#4A2B23]">
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
          className="rounded-3xl border border-[#E8D8C4] bg-white p-5 shadow-[0_6px_22px_-18px_rgba(43,22,17,0.12)] sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#6B352A]" />
                <h3 className="text-sm font-extrabold text-[#2B1611] sm:text-base">
                  {WORKSHOP_INFO.name} · Workshop &amp; Grievance Contact
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[#4A2B23] sm:text-[13px]">
                {WORKSHOP_INFO.address}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#6B4C44] tabular-nums">
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
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-[#E6CE73] bg-[#FFF8D6] px-4 text-xs font-extrabold text-[#6B352A] transition-colors hover:bg-[#FFF1A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] whitespace-nowrap"
              >
                <span>View Store Map &amp; Hours</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5 border-t border-[#EFE2D2] pt-4">
            <a
              href={formatTelHref(WORKSHOP_INFO.phone)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E8D8C4] bg-white px-4 text-xs font-bold text-[#2B1611] transition-colors hover:bg-[#FAF4EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] whitespace-nowrap"
            >
              <Phone className="h-4 w-4 text-[#6B352A]" />
              <span>Call {WORKSHOP_INFO.phone}</span>
            </a>

            <button
              type="button"
              onClick={() => void handleCopyEmail()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E8D8C4] bg-white px-4 text-xs font-bold text-[#2B1611] transition-colors hover:bg-[#FAF4EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] whitespace-nowrap"
            >
              <Mail className="h-4 w-4 text-[#6B4C44]" />
              <span>{WORKSHOP_INFO.email}</span>
              {copiedEmail ? (
                <Check className="h-3.5 w-3.5 text-[#6B352A]" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[#8A6C63]" />
              )}
            </button>

            <a
              href={formatWhatsAppHref(WORKSHOP_INFO.whatsapp, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#FF6115] px-4 text-xs font-extrabold text-[#1F0E0A] transition-colors hover:bg-[#E5520D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6115] whitespace-nowrap"
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
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8D8C4] bg-white px-4 py-3.5 text-left shadow-[0_4px_16px_-14px_rgba(43,22,17,0.12)] transition-colors hover:border-[#6B352A]/40 hover:bg-[#FFF8D6]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#2B1611]">{link.label}</p>
                  <p className="mt-0.5 text-xs text-[#6B4C44]">{link.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#6B352A]" />
              </button>
            ))}
          </section>
        )}

        {/* Primary Action Footer */}
        <section className="space-y-3 pt-1 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#6B352A] px-6 text-sm font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(107,53,42,0.55)] transition-all hover:bg-[#53271E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] active:scale-[0.99]"
          >
            <span>{primaryCtaLabel}</span>
          </button>
          <p className="text-xs leading-relaxed text-[#8A6C63]">{acceptanceNote}</p>
        </section>
      </main>
    </div>
  );
};
