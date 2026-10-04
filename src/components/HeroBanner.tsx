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

  const defaultSlides = [
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
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#121213] via-[#0E0F12] to-[#08080A] text-white p-5 pt-6 shadow-xl border border-neutral-800/60 min-h-[220px]">
        {/* Ambient red glow background effect */}
        <div className="absolute -right-8 -top-10 w-56 h-56 bg-[#D9232D]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-0 w-44 h-44 bg-[#D9232D]/35 rounded-full blur-2xl pointer-events-none" />

        {/* Dynamic Image with animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1.1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute right-[-14px] -top-2 bottom-[-8px] w-1/2 flex items-center justify-end pointer-events-none z-0"
          >
            {slide.image && (
              <img
                src={slide.image}
                alt={slide.badge}
                className="object-cover h-[115%] w-full rotate-[14deg] drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] filter contrast-125 brightness-105"
              />
            )}
            {/* Dark gradient overlay for seamless blending */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E0F12] via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Banner Content */}
        <div className="relative z-10 w-2/3 pr-2 flex flex-col justify-between h-full">
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
            <h2 className="text-[25px] font-black leading-[1.08] tracking-tight mb-2 text-white">
              {slide.headline}
            </h2>

            {/* Subtext description */}
            <p className="text-[11.5px] leading-relaxed text-gray-300 font-normal mb-4 max-w-[200px]">
              {slide.subtext}
            </p>
          </div>

          {/* Explore Button CTA */}
          <div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={slide.ctaAction}
              className="inline-flex items-center space-x-1.5 bg-[#D9232D] hover:bg-[#BF1B24] text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-md transition-all active:scale-95"
            >
              <span>{slide.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Carousel Indicators Dots */}
        <div className="relative z-10 flex items-center justify-center space-x-1.5 mt-5">
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
    </section>
  );
};
