import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, Droplets, ArrowRight } from 'lucide-react';
import { loadActiveStorefrontBanners, type StorefrontBanner } from '../lib/supabaseBanners';

interface HeroBannerProps {
  onExploreClick: () => void;
  onCustomClick: () => void;
  onBannerClick: (url: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreClick,
  onCustomClick,
  onBannerClick,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [managedBanners, setManagedBanners] = useState<StorefrontBanner[]>([]);

  useEffect(() => {
    let active = true;
    void loadActiveStorefrontBanners().then(({ data }) => {
      if (active) setManagedBanners(data);
    });
    return () => {
      active = false;
    };
  }, []);

  type HeroSlide = {
    id: number;
    badge: string;
    headline: React.ReactNode;
    subtext: string;
    ctaText: string;
    ctaAction: () => void;
    image: string;
    badgeIcon: React.ReactNode;
    tagColor: string;
    fullBleed?: boolean;
  };

  const defaultSlides: HeroSlide[] = [
    {
      id: 0,
      badge: 'PREMIUM SEAT COVERS',
      headline: (
        <>
          Comfort
          <br />
          for every ride.
        </>
      ),
      subtext: 'Durable seat covers and accessories for bike, toto and more.',
      ctaText: 'Explore collection',
      ctaAction: onExploreClick,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDAjFNhnvx67fMNCi-wjG2VkzCG3eepkjtic7Nj24eji8Rrrv0Rhnq4KFU9wJHdrwp7784pw1GNs5VE2iGlugNVQrtIGk6nwTTvowkjY8kHDM2zCE8YTqybFSfNuN2izIuwMxn4TtVGcqv_KUOPTwarQZiJ2iyHkDx3puw-I78co_S8s6ediLq7o6imwneOjXgAJewkt8GehwmI63owlK3TU42a6TYoxu5FsZF_ndPdymgD2dZEzyG4',
      badgeIcon: <ShieldCheck className="w-3 h-3 text-[#D9232D]" />,
      tagColor: '#D9232D',
    },
    {
      id: 1,
      badge: 'TOTO / E-RICKSHAW SPECIAL',
      headline: (
        <>
          Heavy Duty
          <br />
          Toto Cushions.
        </>
      ),
      subtext: 'Driver lumbar godi & passenger sets for 12+ hour daily rides.',
      ctaText: 'View Toto Range',
      ctaAction: onExploreClick,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCzTHkKzZX3hEhUBbabXIUneCj4SbDLyVsoF5AC3mdG30c9fCfPXqTgtBkXXWSD-RQBMK9hGQ7z84-5HlSRv8pNH-4-nhZsrWMMJUF69Mc1C6yg3hIwq74HgmiQK54CCZs4pxtjnZHbNYGDr2Fr3XmUg5eQWe2mID_3rZrHE3_63rpzsGPmT3YgGkE0N8MSSMBr0lyBJaJ31aqCyTuF8-Gp68q6FO8TI5qD0duMd8hT-Do-pGwNJO4E',
      badgeIcon: <Droplets className="w-3 h-3 text-emerald-400" />,
      tagColor: '#059669',
    },
    {
      id: 2,
      badge: 'CUSTOM GODI STUDIO',
      headline: (
        <>
          Your Name
          <br />
          Stitched Custom.
        </>
      ),
      subtext: 'Choose your foam thickness, diamond quilting, and name embroidery.',
      ctaText: 'Design My Seat',
      ctaAction: onCustomClick,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDb5u48v7PwFdzn4_BDUM6odmmk6dQ6EEFTBHcMU2Vvqmj-mj8_HCSFiKFjFHFE28XP0BEf29q0dNjhDNJWeg1YF6PXBX_ZDE4cNO5vnZNt8sXT1Gg1clWlo0JhPzMC6b8SW0xe55pAzGblTlmIYLFNO42qMW1tZll0FORMuLzrSyCzfeKOTsViJYDp698zO-5g-hSJWj67NhZWKkiMtBiEXY3ANGfMGU7GBpKmeFflSdXYihz2Tf9g',
      badgeIcon: <Sparkles className="w-3 h-3 text-amber-400" />,
      tagColor: '#D97706',
    },
  ];

  const slides = managedBanners.length
    ? managedBanners.map((banner) => ({
        id: banner.id,
        badge: 'ROFIK GODI CENTRE',
        headline: banner.title,
        subtext: banner.subtitle,
        ctaText: banner.buttonLabel || 'Shop now',
        ctaAction: () =>
          banner.linkUrl.trim() ? onBannerClick(banner.linkUrl.trim()) : onExploreClick(),
        image: banner.imageUrl,
        badgeIcon: <Sparkles className="w-3 h-3 text-[#D9232D]" />,
        tagColor: '#D9232D',
        // Admin banners are full-bleed photos; default slides are product cutouts.
        fullBleed: true,
      }))
    : defaultSlides;

  // Auto-advance banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const currentIndex = currentSlide % slides.length;
  const slide = slides[currentIndex];

  return (
    <section className="px-5 mb-6" data-purpose="promotional-banner">
      {slide.fullBleed ? (
        /* Admin banner: the uploaded image IS the banner — full width, uncropped, no overlay. */
        <div>
          <div className="relative overflow-hidden rounded-[26px] bg-[#0E0F12] shadow-xl border border-neutral-800/60">
            <AnimatePresence mode="wait">
              <motion.img
                key={slide.id}
                src={slide.image}
                alt={typeof slide.headline === 'string' ? slide.headline : slide.badge}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="block min-h-[160px] w-full h-auto object-cover"
              />
            </AnimatePresence>
            {slide.ctaText && (
              <div className="absolute bottom-4 left-4 z-10">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={slide.ctaAction}
                  className="inline-flex items-center space-x-1.5 whitespace-nowrap rounded-full bg-[#D9232D] px-3 py-2 text-[11px] font-bold text-white shadow-lg transition-all hover:bg-[#BF1B24] active:scale-95 sm:px-4 sm:text-[12px]"
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            )}
          </div>
          {/* Carousel Indicators Dots */}
          <div className="mt-3 flex items-center justify-center space-x-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`transition-all ${
                  currentIndex === idx
                    ? 'w-5 h-1.5 bg-[#D9232D] rounded-full'
                    : 'w-1.5 h-1.5 bg-gray-400/70 rounded-full hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
      <div className="relative min-h-[260px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#121213] via-[#0E0F12] to-[#08080A] p-5 pt-6 text-white shadow-xl border border-neutral-800/60">
        {/* Ambient red glow background effect */}
        <div className="absolute -right-8 -top-10 w-56 h-56 bg-[#D9232D]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-0 w-44 h-44 bg-[#D9232D]/35 rounded-full blur-2xl pointer-events-none" />

        {/* Dynamic Image with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`${
              slide.fullBleed
                ? 'absolute inset-0'
                : 'absolute right-0 top-16 bottom-10 w-[40%] flex items-center justify-center'
            } pointer-events-none z-0`}
          >
            {slide.image && (
              <img
                src={slide.image}
                alt={slide.badge}
                className={`h-full w-full ${
                  slide.fullBleed
                    ? 'object-cover object-center'
                    : 'object-contain object-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]'
                }`}
              />
            )}
            {/* Dark gradient overlay for seamless blending */}
            <div
              className={`absolute inset-0 bg-gradient-to-r ${
                slide.fullBleed
                  ? 'from-[#0E0F12] via-[#0E0F12]/60 to-transparent'
                  : 'from-[#0E0F12] via-[#0E0F12]/20 to-transparent'
              }`}
            />
          </motion.div>
        </AnimatePresence>

        {/* Banner Content */}
        <div className="relative z-10 flex min-h-[204px] w-[58%] flex-col justify-between pr-1">
          <div>
            {/* Overline Tag */}
            <div className="flex items-center space-x-1.5 mb-1.5">
              <span className="w-3.5 h-[2px] bg-[#D9232D] rounded-full" />
              <span
                className="text-[10px] tracking-wider font-extrabold uppercase flex items-center gap-1"
                style={{ color: slide.tagColor }}
              >
                {slide.badge}
              </span>
            </div>

            {/* Headline */}
            <h2 className="mb-2 text-[clamp(22px,7vw,28px)] font-black leading-[1.08] tracking-tight text-white">
              {slide.headline}
            </h2>

            {/* Subtext description */}
            <p className="mb-4 max-w-full text-[11.5px] font-normal leading-relaxed text-gray-300">
              {slide.subtext}
            </p>
          </div>

          {/* Explore Button CTA */}
          <div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={slide.ctaAction}
              className="inline-flex max-w-full items-center space-x-1.5 whitespace-nowrap rounded-full bg-[#D9232D] px-3 py-2 text-[11px] font-bold text-white shadow-md transition-all hover:bg-[#BF1B24] active:scale-95 sm:px-4 sm:text-[12px]"
            >
              <span>{slide.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Carousel Indicators Dots */}
        <div className="relative z-10 mt-5 flex items-center justify-center space-x-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`transition-all ${
                currentIndex === idx
                  ? 'w-5 h-1.5 bg-[#D9232D] rounded-full'
                  : 'w-1.5 h-1.5 bg-gray-500/70 rounded-full hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
      )}
    </section>
  );
};
