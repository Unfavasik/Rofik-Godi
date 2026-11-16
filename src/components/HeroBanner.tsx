import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getBannerFontClass,
  getBannerTitleSizeClass,
  isBannerCurrentlyActive,
  loadActiveStorefrontBanners,
  type StorefrontBanner,
} from '../lib/supabaseBanners';

interface HeroBannerProps {
  onExploreClick: () => void;
  onBannerClick: (url: string) => void;
}

const SLIDE_DURATION_MS = 6000;

const DEFAULT_SHOWCASE_BANNERS: StorefrontBanner[] = [
  {
    id: 'default-showcase-1',
    title: 'Custom Seat Covers & Precision Fitment',
    subtitle:
      'Weather-resistant, double-stitched seat covers crafted for bikes, scooters & totos.',
    imageUrl: '/images/premium-seat-cover-hero.webp',
    linkUrl: '/shop',
    buttonLabel: 'Explore Catalog',
    fontStyle: 'outfit',
  },
  {
    id: 'default-showcase-2',
    title: 'Built for All-Day Riding Comfort',
    subtitle:
      'High-density cushioning, custom colour piping & workshop-grade fitting tailored to your model.',
    imageUrl: '/images/premium-seat-gallery-02.webp',
    linkUrl: '/shop',
    buttonLabel: 'Shop Seat Covers',
    fontStyle: 'syne',
  },
];

function formatPromoEndLabel(endsAt?: string): string | null {
  if (!endsAt) return null;
  const parsed = new Date(endsAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = parsed.getTime() - Date.now();
  if (diffMs <= 0) return null;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) {
    return diffHours <= 1 ? 'Ends in 1h' : `Ends in ${diffHours}h`;
  }
  const diffDays = Math.ceil(diffHours / 24);
  if (diffDays <= 7) {
    return `Ends in ${diffDays}d`;
  }
  return `Until ${parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreClick, onBannerClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<StorefrontBanner[]>([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, boolean>>({});
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [scheduleNow, setScheduleNow] = useState(() => new Date());
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const markImageLoaded = useCallback((url?: string, naturalWidth?: number, naturalHeight?: number) => {
    if (!url) return;
    setLoadedImageUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
    if (naturalWidth && naturalHeight && naturalHeight > 0) {
      const ratio = naturalWidth / naturalHeight;
      setImageAspectRatios((prev) => (prev[url] === ratio ? prev : { ...prev, [url]: ratio }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const refreshBanners = () => {
      void loadActiveStorefrontBanners().then(({ data }) => {
        if (active) {
          setSlides(data);
          setBannersLoaded(true);
        }
      });
    };
    refreshBanners();
    const poll = setInterval(() => {
      setScheduleNow(new Date());
      refreshBanners();
    }, 60_000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, []);

  const liveCustomSlides = useMemo(
    () => slides.filter((item) => isBannerCurrentlyActive(item, scheduleNow)),
    [slides, scheduleNow],
  );
  const activeSlides = liveCustomSlides.length > 0 ? liveCustomSlides : DEFAULT_SHOWCASE_BANNERS;
  const currentIndex = currentSlide % activeSlides.length;
  const slide = activeSlides[currentIndex];

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  // Auto-advance with pause-on-hover/touch support.
  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [activeSlides.length, currentIndex, isPaused]);

  // Preload neighbouring slides so transitions never pop in blank.
  useEffect(() => {
    for (const offset of [1, activeSlides.length - 1]) {
      const neighbour = activeSlides[(currentIndex + offset) % activeSlides.length];
      if (neighbour?.imageUrl) {
        const img = new Image();
        const url = neighbour.imageUrl;
        img.onload = () => markImageLoaded(url, img.naturalWidth, img.naturalHeight);
        img.src = url;
      }
    }
  }, [currentIndex, activeSlides, markImageLoaded]);

  // Reset broken image state when the active slide image changes.
  useEffect(() => {
    setImageFailed(false);
  }, [slide?.imageUrl]);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
    setIsPaused(true);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    setIsPaused(false);
    if (start === null || activeSlides.length <= 1) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    touchDeltaX.current = delta;
    if (Math.abs(delta) < 42) return;
    if (delta < 0) goToNext();
    else goToPrev();
  };

  const handleActivateSlideLink = () => {
    if (Math.abs(touchDeltaX.current) >= 42) {
      touchDeltaX.current = 0;
      return;
    }
    if (slide.linkUrl.trim()) {
      onBannerClick(slide.linkUrl.trim());
    } else {
      onExploreClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (activeSlides.length <= 1) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPrev();
    }
  };

  // Shimmer-effect skeleton loader in Classic Glass Gradient style while banner records fetch.
  if (!bannersLoaded) {
    return (
      <section
        className="mb-5 px-4 sm:px-5"
        data-purpose="promotional-banner"
        aria-busy="true"
        aria-label="Loading promotions"
      >
        <div
          data-testid="hero-banner-skeleton"
          className="classic-glass overflow-hidden rounded-[24px] bg-gradient-to-br from-white/95 via-rose-50/45 to-slate-100/90 shadow-[0_16px_40px_-14px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.06] sm:rounded-[28px]"
        >
          {/* Poster Stage Shimmer */}
          <div className="skeleton-shimmer relative aspect-[16/9] w-full bg-gradient-to-br from-slate-100 via-rose-50/50 to-slate-200/70 sm:aspect-[2/1]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#D9232D]/10 blur-3xl"
            />
            <div className="absolute bottom-3 right-3.5 flex items-center gap-1.5 rounded-full bg-slate-900/35 px-2.5 py-1.5 ring-1 ring-white/50 backdrop-blur-md">
              <span className="h-1.5 w-6 rounded-full bg-white/60" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Classic Glass Caption Bar Shimmer */}
          <div className="flex flex-col gap-2.5 border-t border-white/80 bg-gradient-to-r from-white/90 via-rose-50/45 to-white/90 px-4 py-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton-shimmer h-4 w-56 max-w-[88%] rounded-md bg-slate-200/85 sm:h-5 sm:w-72" />
              <div className="skeleton-shimmer h-3 w-64 max-w-[78%] rounded bg-slate-200/65 sm:h-3.5 sm:w-80" />
            </div>
            <div className="skeleton-shimmer flex h-8 w-28 shrink-0 items-center justify-end rounded-full bg-rose-200/70 pr-1.5 sm:h-9 sm:w-32">
              <span className="h-5 w-5 rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const hasImage = !imageFailed && Boolean(slide.imageUrl);
  const isImageLoading = hasImage && !loadedImageUrls[slide.imageUrl];
  const imageAspect = slide.imageUrl ? imageAspectRatios[slide.imageUrl] : undefined;
  // Wide landscape banners (>= 1.68) fill edge-to-edge; portrait/square/product photos (< 1.68) use object-contain so 100% of the product is visible without cropping.
  const isWideBannerImage = imageAspect !== undefined && imageAspect >= 1.68;
  const hasTitle = Boolean(slide.title.trim());
  const hasSubtitle = Boolean(slide.subtitle.trim());
  const hasCopy = hasTitle || hasSubtitle;
  const promoEndLabel = formatPromoEndLabel(slide.endsAt);
  const titleFontClass = getBannerFontClass(slide.fontStyle);
  const titleSizeClass = getBannerTitleSizeClass(slide.title, 'hero');

  return (
    <section
      className="mb-5 px-4 sm:px-5"
      data-purpose="promotional-banner"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-roledescription="slide"
        aria-busy={isImageLoading}
        aria-label={`Slide ${currentIndex + 1} of ${activeSlides.length}${hasTitle ? `: ${slide.title}` : ''}`}
        className="group relative focus:outline-none"
      >
        {/* Gradient + Classic Glass Effect Card */}
        <div className="classic-glass relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white/95 via-rose-50/45 to-slate-100/90 shadow-[0_16px_42px_-14px_rgba(15,23,42,0.13),0_6px_20px_-6px_rgba(217,35,45,0.09)] ring-1 ring-slate-900/[0.07] transition-all duration-500 hover:shadow-[0_22px_50px_-14px_rgba(217,35,45,0.18)] sm:rounded-[28px]">
          {/* Specular Inner Frosted Glass Rim */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 rounded-[24px] ring-1 ring-inset ring-white/80 sm:rounded-[28px]"
          />

          {/* Top Stage: Smart Uncropped Image Showcase with Gradient & Ambient Glass Aura */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-b from-white via-[#FAFBFD] to-rose-50/40 sm:aspect-[2/1]">
            {/* Ambient Gradient Orbs */}
            <div
              aria-hidden="true"
              className="banner-ambient-pulse pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-rose-400/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl"
            />

            {/* Shimmer Skeleton Backdrop while the active banner image is downloading */}
            {isImageLoading && (
              <div
                aria-hidden="true"
                data-testid="hero-banner-image-shimmer"
                className="skeleton-shimmer pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-slate-100 via-rose-50/50 to-slate-200/70"
              />
            )}

            {/* Poster / Product Artwork or Classic Glass Gradient Fallback */}
            {!hasImage ? (
              <div
                onClick={handleActivateSlideLink}
                role="presentation"
                className="absolute inset-0 flex cursor-pointer flex-col justify-end bg-gradient-to-br from-rose-100/80 via-white to-amber-50/70 p-4 sm:p-6"
              >
                <div
                  aria-hidden="true"
                  className="banner-ambient-pulse pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#D9232D]/15 blur-3xl"
                />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  onClick={handleActivateSlideLink}
                  className="absolute inset-0 cursor-pointer overflow-hidden"
                >
                  {/* Soft Frosted Glass Color-Matched Ambient Backdrop when displaying portrait/square product images */}
                  {!isWideBannerImage && (
                    <img
                      src={slide.imageUrl}
                      alt=""
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-2xl saturate-150"
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-white/20"
                  />

                  {/* Main Crisp Uncropped Banner / Product Image */}
                  <motion.img
                    ref={(node) => {
                      if (node?.complete && node.naturalWidth > 0) {
                        markImageLoaded(slide.imageUrl, node.naturalWidth, node.naturalHeight);
                      }
                    }}
                    src={slide.imageUrl}
                    alt={slide.title || 'Promotional banner'}
                    referrerPolicy="no-referrer"
                    fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                    loading={currentIndex === 0 ? 'eager' : 'lazy'}
                    initial={{ scale: 1.04 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 5.4, ease: 'easeOut' }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      markImageLoaded(slide.imageUrl, img.naturalWidth, img.naturalHeight);
                    }}
                    onError={() => setImageFailed(true)}
                    className={`relative z-10 h-full w-full transition-transform duration-700 group-hover:scale-[1.02] ${
                      isWideBannerImage
                        ? 'object-cover object-center'
                        : 'object-contain object-center p-1.5 sm:p-2.5 drop-shadow-[0_10px_24px_rgba(15,23,42,0.12)]'
                    } ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Desktop/Tablet Previous & Next Frosted Glass Arrows */}
            {activeSlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  aria-label="Previous banner slide"
                  className="hidden sm:flex absolute left-3.5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-slate-900/40 hover:bg-slate-900/65 text-white ring-1 ring-white/50 backdrop-blur-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all active:scale-95"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  aria-label="Next banner slide"
                  className="hidden sm:flex absolute right-3.5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-slate-900/40 hover:bg-slate-900/65 text-white ring-1 ring-white/50 backdrop-blur-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all active:scale-95"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </>
            )}

            {/* Poster Corner Controls: Frosted Semi-Transparent Carousel Dot Indicators (+ CTA if Poster-Only) */}
            <div className="pointer-events-none absolute inset-x-3 bottom-2.5 z-20 flex items-center justify-between gap-2 sm:inset-x-4 sm:bottom-3">
              {!hasCopy ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivateSlideLink();
                  }}
                  className="banner-cta-shine pointer-events-auto group/cta font-banner-outfit shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] pl-3.5 pr-1.5 py-1.5 text-[11px] font-extrabold tracking-[-0.01em] text-white shadow-[0_8px_20px_-4px_rgba(217,35,45,0.45)] ring-1 ring-white/40 backdrop-blur-md transition-all active:scale-95 sm:pl-4 sm:pr-1.5 sm:py-1.5 sm:text-[12px]"
                >
                  <span>{slide.buttonLabel || 'Shop now'}</span>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/30 transition-transform duration-200 group-hover/cta:translate-x-0.5">
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </motion.button>
              ) : (
                <span />
              )}

              {activeSlides.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Choose banner slide"
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-slate-900/45 px-2.5 py-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.2)] ring-1 ring-white/55 backdrop-blur-md"
                >
                  {activeSlides.map((s, idx) => {
                    const isActive = currentIndex === idx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlide(idx);
                        }}
                        aria-label={`Slide ${idx + 1}`}
                        aria-selected={isActive}
                        aria-current={isActive}
                        className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                          isActive
                            ? 'w-7 bg-white/35'
                            : 'w-1.5 bg-white/65 hover:bg-white/95'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            key={`${s.id}-${isPaused ? 'paused' : 'playing'}`}
                            initial={{ width: '0%' }}
                            animate={{ width: isPaused ? '45%' : '100%' }}
                            transition={{
                              duration: isPaused ? 0.2 : SLIDE_DURATION_MS / 1000,
                              ease: 'linear',
                            }}
                            className="absolute inset-y-0 left-0 rounded-full bg-[#FF4D58]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Stage: Gradient + Classic Glass Effect Editorial Panel (Full Title & Subtitle + Shimmer CTA) */}
          {hasCopy && (
            <div
              onClick={handleActivateSlideLink}
              role="presentation"
              className="relative z-20 flex cursor-pointer flex-col gap-2.5 border-t border-white/90 bg-gradient-to-br from-white/92 via-rose-50/65 to-slate-100/90 px-4 py-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4"
            >
              {/* Delicate Classic Glass Gradient Shimmer Line */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D9232D]/35 to-transparent"
              />
              {/* Soft Frosted Glass Ambient Glow Orbs */}
              <div
                aria-hidden="true"
                className="banner-ambient-pulse pointer-events-none absolute -left-8 -top-4 h-24 w-44 rounded-full bg-rose-400/15 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 bottom-0 h-20 w-36 rounded-full bg-amber-300/15 blur-2xl"
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="relative min-w-0 flex-1"
                >
                  {promoEndLabel && (
                    <motion.p
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24, delay: 0.04 }}
                      className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-rose-500/12 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#D9232D] ring-1 ring-rose-500/25 backdrop-blur-xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D9232D] animate-pulse" />
                      <span>Limited Offer</span>
                      <span aria-hidden="true" className="text-rose-400">
                        ·
                      </span>
                      <span>{promoEndLabel}</span>
                    </motion.p>
                  )}
                  {hasTitle && (
                    <motion.h2
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className={`break-words text-balance text-slate-900 ${titleFontClass} ${titleSizeClass}`}
                    >
                      {slide.title}
                    </motion.h2>
                  )}
                  {hasSubtitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                      className="font-banner-subtitle mt-1 break-words text-[12px] font-medium leading-[1.42] text-slate-600 sm:text-[13.5px]"
                    >
                      {slide.subtitle}
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="relative flex items-center justify-end sm:shrink-0">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivateSlideLink();
                  }}
                  className="banner-cta-shine group/cta relative font-banner-outfit shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] pl-4 pr-1.5 py-1.5 text-[11.5px] font-extrabold tracking-[-0.01em] text-white shadow-[0_8px_20px_-4px_rgba(217,35,45,0.42)] ring-1 ring-white/40 transition-all hover:shadow-[0_10px_24px_-4px_rgba(217,35,45,0.55)] active:scale-95 sm:pl-4.5 sm:pr-1.5 sm:py-1.5 sm:text-[12.5px]"
                >
                  <span>{slide.buttonLabel || 'Shop now'}</span>
                  <span className="grid h-5 w-5 sm:h-5.5 sm:w-5.5 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/35 backdrop-blur-xs transition-transform duration-200 group-hover/cta:translate-x-0.5">
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
