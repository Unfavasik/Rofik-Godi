import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { loadActiveStorefrontBanners, type StorefrontBanner } from '../lib/supabaseBanners';

interface HeroBannerProps {
  onExploreClick: () => void;
  onBannerClick: (url: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExploreClick, onBannerClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<StorefrontBanner[]>([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    void loadActiveStorefrontBanners().then(({ data }) => {
      if (active) {
        setSlides(data);
        setBannersLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const currentIndex = currentSlide % slides.length;
  const slide = slides[currentIndex];

  // Auto-advance with a fresh timer per slide so manual navigation restarts the countdown.
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length, currentIndex]);

  // Preload neighbouring slides so transitions never pop in blank.
  useEffect(() => {
    for (const offset of [1, slides.length - 1]) {
      const neighbour = slides[(currentIndex + offset) % slides.length];
      if (neighbour?.imageUrl) {
        const img = new Image();
        img.src = neighbour.imageUrl;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, slides.length]);

  // A broken banner image falls back to a text card; reset when the slide changes.
  useEffect(() => {
    setImageFailed(false);
  }, [slide?.imageUrl]);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null || slides.length <= 1) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 48) return;
    setCurrentSlide((prev) =>
      delta < 0 ? (prev + 1) % slides.length : (prev - 1 + slides.length) % slides.length,
    );
  };

  // Skeleton while the banner list loads.
  if (!bannersLoaded) {
    return (
      <section
        className="px-5 mb-6"
        data-purpose="promotional-banner"
        aria-busy="true"
        aria-label="Loading promotions"
      >
        <div className="aspect-[3/2] w-full animate-pulse rounded-[26px] bg-slate-200/80 sm:aspect-[16/9]" />
      </section>
    );
  }

  // No admin banners set — the home page simply has no banner section.
  if (slides.length === 0) return null;

  return (
    <section className="px-5 mb-6" data-purpose="promotional-banner" aria-roledescription="carousel">
      {/* Admin banner: the uploaded image fills the whole card. A soft bottom scrim keeps
          the CTA readable on any artwork without covering the image itself. */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="group"
        aria-roledescription="slide"
        aria-label={`Slide ${currentIndex + 1} of ${slides.length}`}
      >
        <div className="relative overflow-hidden rounded-[26px] bg-[#0E0F12] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
          <div className="relative aspect-[3/2] w-full sm:aspect-[16/9]">
            {imageFailed ? (
              /* Graceful fallback when the banner image cannot load. */
              <div className="absolute inset-0 flex flex-col items-start justify-end gap-1 bg-gradient-to-br from-[#1A1B1F] to-[#0B0C0E] p-5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF8A8F]">
                  ROFIK GODI CENTRE
                </span>
                <h2 className="text-xl font-black leading-tight text-white">{slide.title}</h2>
                {slide.subtitle && (
                  <p className="text-[11.5px] leading-relaxed text-gray-300">{slide.subtitle}</p>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.img
                  key={slide.id}
                  src={slide.imageUrl}
                  alt={slide.title}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  onError={() => setImageFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
            )}

            {/* Legibility scrim — bottom edge only */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

            {/* Brand chip */}
            <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white ring-1 ring-white/15 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-[#FF8A8F]" />
              <span>ROFIK GODI CENTRE</span>
            </div>

            {/* CTA */}
            <div className="absolute bottom-3 left-3 z-10">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() =>
                  slide.linkUrl.trim() ? onBannerClick(slide.linkUrl.trim()) : onExploreClick()
                }
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-3.5 py-2 text-[11px] font-bold text-gray-900 shadow-lg backdrop-blur transition-all hover:bg-white active:scale-95 sm:text-[12px]"
              >
                <span>{slide.buttonLabel || 'Shop now'}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#D9232D]" />
              </motion.button>
            </div>

            {/* Carousel indicators — inside the card, bottom-right */}
            <div className="absolute bottom-4 right-3 z-10 flex items-center gap-1.5">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  aria-current={currentIndex === idx}
                  className={`h-1.5 rounded-full transition-all ${
                    currentIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
