import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';

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
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    sections.length > 0 ? [sections[0].id] : [],
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(() => sections[0]?.id ?? '');
  const [readingProgress, setReadingProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const quickJumpButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const estimatedMinutes = useMemo(() => {
    const wordCount = sections.reduce((total, section) => {
      const sectionWords = `${section.title} ${section.summary} ${section.details
        .map((d) => `${d.label} ${d.text}`)
        .join(' ')}`.split(/\s+/).length;
      return total + sectionWords;
    }, 0);
    return Math.max(2, Math.round(wordCount / 190));
  }, [sections]);

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

  // Track reading progress across either an overlay scroll container or the document window.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollParent = rootRef.current?.closest('.overflow-y-auto') as HTMLElement | null;

    const updateProgress = () => {
      if (scrollParent) {
        const scrollable = scrollParent.scrollHeight - scrollParent.clientHeight;
        setReadingProgress(scrollable > 0 ? Math.min(1, Math.max(0, scrollParent.scrollTop / scrollable)) : 0);
      } else {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        setReadingProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
      }
    };

    updateProgress();
    const target: EventTarget = scrollParent || window;
    target.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    return () => {
      target.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [expandedIds.length, filteredSections.length]);

  // Track the currently visible section while scrolling so the persistent Quick Jump stays synced.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined' ||
      filteredSections.length === 0
    ) {
      return;
    }

    const scrollParent = rootRef.current?.closest('.overflow-y-auto') as HTMLElement | null;

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
        root: scrollParent || null,
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
    <div
      ref={rootRef}
      className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] bg-gradient-to-b from-[#F8FAFC] via-[#F5F7FB] to-[#FFF6F7] text-slate-900 select-text font-sans"
    >
      {/* Persistent Sticky Edge-to-Edge Vignette Top Header + Quick Jump Menu */}
      <header className="sticky top-0 z-30">
        <div className="relative isolate overflow-hidden bg-[#090808] pt-[env(safe-area-inset-top)]">
          <VignetteBarBackdrop variant="top" />
          <div className="relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition-all hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
              >
                <ArrowLeft className="h-4.5 w-4.5 stroke-[2.2]" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-[16px] font-black tracking-tight text-white sm:text-[17px]">
                  {documentTitle}
                </h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-white/70">
                  <span className="font-bold text-rose-300">{WORKSHOP_INFO.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{documentSubtitle}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleShare()}
              aria-label={`Copy ${documentTitle} link`}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/18 bg-white/14 px-3 text-[11.5px] font-bold text-white backdrop-blur-md transition-colors hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 whitespace-nowrap"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="text-emerald-200">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-white/90" />
                  <span className="hidden sm:inline">Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Persistent Quick Jump Bar */}
        <div className="border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <nav
            aria-label="Quick Jump navigation"
            className="mx-auto flex max-w-3xl items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-2 sm:px-6"
          >
            <span className="inline-flex shrink-0 items-center gap-1.5 pr-1.5 text-[11px] font-bold text-slate-500 whitespace-nowrap">
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
                  className={`inline-flex min-h-8.5 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap ${
                    isActive
                      ? 'bg-[#D9232D] text-white shadow-[0_6px_14px_-6px_rgba(217,35,45,0.65)]'
                      : 'border border-slate-200/80 bg-white/95 text-slate-700 hover:border-rose-200 hover:text-[#D9232D]'
                  }`}
                >
                  <span className="tabular-nums opacity-80">{section.number}</span>
                  <span>{section.shortTitle || section.title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Hairline Scroll Reading Progress Bar */}
        <div className="h-[2px] w-full bg-slate-100/90 overflow-hidden" aria-hidden="true">
          <div
            className="h-full origin-left bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#F43F5E] transition-transform duration-150 ease-out will-change-transform"
            style={{ transform: `scaleX(${readingProgress})` }}
          />
        </div>
      </header>

      <div className="relative -mt-px">
        <VignettePageCurtain className="h-[190px] sm:h-[220px]" />
        <main className="relative z-10 mx-auto max-w-3xl space-y-4 px-4 pb-[max(4.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5">
        {/* Editorial Hero Summary Card */}
        <section className="rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold text-slate-500 tabular-nums">
              <span className="font-bold text-[#D9232D]">{WORKSHOP_INFO.name}</span>
              <span aria-hidden="true">·</span>
              <span>Updated {lastUpdated}</span>
              <span aria-hidden="true">·</span>
              <span>{versionLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{sections.length} sections</span>
              <span aria-hidden="true">·</span>
              <span>{estimatedMinutes} min read</span>
            </div>

            <h2 className="max-w-2xl text-[19px] font-black leading-[1.25] tracking-tight text-slate-950 [text-wrap:balance] sm:text-[22px]">
              {heroTitle}
            </h2>
            <p className="max-w-2xl text-[13px] leading-relaxed text-slate-600 sm:text-[13.5px]">
              {heroDescription}
            </p>
          </div>

          <div className="relative mt-4 grid grid-cols-1 gap-3 border-t border-slate-200/70 pt-4 sm:grid-cols-3 sm:gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50/90 text-[#D9232D] ring-1 ring-inset ring-rose-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-extrabold leading-snug text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
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
          className="rounded-2xl border border-slate-200/80 bg-white/92 p-3 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md sm:p-3.5"
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
                className="min-h-10.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/75 pl-10 pr-10 text-base sm:text-[13px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-rose-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-[11.5px] font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                Showing {filteredSections.length} of {sections.length}
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                disabled={filteredSections.length === 0}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-extrabold text-slate-800 transition-colors hover:border-rose-200 hover:bg-rose-50/60 hover:text-[#D9232D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                {allVisibleExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>
        </section>

        {/* Clause Sections List */}
        {filteredSections.length === 0 ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-9 text-center shadow-[0_8px_22px_-18px_rgba(15,23,42,0.12)]">
            <p className="text-[14px] font-extrabold text-slate-900">
              No clauses matched "{searchQuery.trim()}"
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              Try a different keyword like payment, pickup, embroidery, deletion, or notification.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#D9232D] px-4 text-[12px] font-extrabold text-white transition-colors hover:bg-[#B91822] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
            >
              Reset search
            </button>
          </section>
        ) : (
          <div className="space-y-2.5">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              const isExpanded = Boolean(normalizedQuery) || expandedIds.includes(section.id);

              return (
                <article
                  key={section.id}
                  id={`legal-section-${section.id}`}
                  className={`scroll-mt-32 overflow-hidden rounded-2xl border bg-white/95 backdrop-blur-sm transition-colors ${
                    isExpanded
                      ? 'border-rose-200/90 shadow-[0_10px_26px_-18px_rgba(217,35,45,0.18)]'
                      : 'border-slate-200/80 shadow-[0_4px_14px_-12px_rgba(15,23,42,0.1)] hover:border-slate-300/90'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`legal-panel-${section.id}`}
                    className="flex min-h-14 w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D9232D] sm:px-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isExpanded
                            ? 'bg-[#D9232D] text-white shadow-[0_6px_14px_-6px_rgba(217,35,45,0.6)]'
                            : 'bg-rose-50 text-[#D9232D] ring-1 ring-inset ring-rose-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="text-[12px] font-black text-[#D9232D] tabular-nums">
                            {section.number}.
                          </span>
                          <h3 className="text-[14px] font-extrabold leading-snug text-slate-950 sm:text-[15px]">
                            {section.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-500 sm:text-[12.5px]">
                          {section.summary}
                        </p>
                      </div>
                    </div>

                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#D9232D]' : ''
                        }`}
                      />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        id={`legal-panel-${section.id}`}
                        initial={shouldReduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/45 px-4 py-2 sm:px-5"
                      >
                        {section.details.map((item) => (
                          <div key={item.label} className="py-3 first:pt-2 last:pb-2">
                            <h4 className="text-[12.5px] font-extrabold text-slate-900 sm:text-[13px]">
                              {item.label}
                            </h4>
                            <p className="mt-1 text-[12.5px] leading-[1.65] text-slate-600 sm:text-[13px]">
                              {item.text}
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        )}

        {/* Workshop & Grievance Officer Contact Block */}
        <section
          aria-label="Workshop and grievance contact details"
          className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md sm:p-5"
        >
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#D9232D]" />
                <h3 className="text-[14px] font-extrabold text-slate-950 sm:text-[15px]">
                  {WORKSHOP_INFO.name} · Workshop &amp; Grievance Contact
                </h3>
              </div>
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                {WORKSHOP_INFO.address}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-medium text-slate-500 tabular-nums">
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
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50/75 px-3.5 text-[11.5px] font-extrabold text-[#D9232D] transition-colors hover:bg-rose-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
              >
                <span>View Store Map &amp; Hours</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-100 pt-3.5">
            <a
              href={formatTelHref(WORKSHOP_INFO.phone)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
            >
              <Phone className="h-3.5 w-3.5 text-[#D9232D]" />
              <span>Call {WORKSHOP_INFO.phone}</span>
            </a>

            <button
              type="button"
              onClick={() => void handleCopyEmail()}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
            >
              <Mail className="h-3.5 w-3.5 text-slate-600" />
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
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1F9D55] px-3.5 text-[12px] font-extrabold text-white transition-colors hover:bg-[#178245] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F9D55] whitespace-nowrap"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp Support</span>
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>
          </div>
        </section>

        {/* Cross-Navigation Links */}
        {crossLinks.length > 0 && (
          <section
            aria-label="Related policy and account links"
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          >
            {crossLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={link.onClick}
                className="group flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 text-left shadow-[0_6px_18px_-14px_rgba(15,23,42,0.12)] transition-all hover:border-rose-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-slate-900 group-hover:text-[#D9232D] transition-colors">
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                    {link.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#D9232D] transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </section>
        )}

        {/* Primary Action Footer */}
        <section className="space-y-2.5 pt-1 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-5 text-[13px] font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(217,35,45,0.68)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-[0.99]"
          >
            <span>{primaryCtaLabel}</span>
          </button>
          <p className="text-[11.5px] leading-relaxed text-slate-500">{acceptanceNote}</p>
        </section>
      </main>
      </div>
    </div>
  );
};
