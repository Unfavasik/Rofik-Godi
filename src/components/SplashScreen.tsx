import React, { useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCYHR54t-7iMiqUXIS18XHWacB1LYLv4I5yZ6JyUt6ri3akNjWo2GjYNQnx7wlpFALw_ggwgoW7BkCh3XuHGYSyqCs0WazrrLm9RKDe__Q_QEUzO3mMcUlQmT8oHL_COw0aeB4tVLzxY6s9PPa1ulJwMUsp_CDg6eck1JDQIXKkTM3yQwreV86bszg_KtrTt7SK8Xec-kdwUVqCeg0KMz-btO_nJM4O9JQhbc4SqmypayuD_sd1Emy3vkWDaKb6-cXz9SU';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [step, setStep] = useState(1);
  const slides = [
    {
      image: HERO_IMAGE,
      alt: 'Young man finding a premium motorcycle seat cover',
      title: 'Find the Perfect',
      accent: 'Seat Cover',
      description: 'Explore premium seat covers for bikes and totos with ease.',
    },
    {
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7L5-TNZ84jec6E8GES7-jP7U6VZMRZ3OhVNT2bVlu033jPeRRReBxCIjfW4djByeme8QvlqF1o6iRKlCfqdJL5aBp7ggXz4dKw0uyUBibGbifNvbPwoMsxrcGj41ioaxMPshXXNMYVoVxaCpVS4EEmAjBo_c1ijgRiCFnhCy0dxIKcuvLApmBA-yUSoBS1179DfdBciLtHXzjCk2KKLj64729LJcNGGC9_2MjwxpXxnyAZDVTPtSvQpmxT7p7zN77jsI',
      alt: 'Young man viewing different seat cover designs',
      title: 'View Different',
      accent: 'Designs',
      description: 'Check various seat cover designs, colors and materials.',
    },
    {
      image: HERO_IMAGE,
      alt: 'Young man enjoying a reliable motorcycle seat cover',
      title: 'Reliable Quality',
      accent: '& Service',
      description: 'Get durable seat covers with the best quality and support.',
    },
  ];
  const currentSlide = slides[step - 1];
  const isLastStep = step === slides.length;

  const goNext = () => {
    if (isLastStep) onFinish();
    else setStep((current) => current + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white select-none"
      data-purpose="splash-screen"
      role="img"
      aria-label="Premium Bike Seat Covers onboarding"
    >
      <main className="relative flex h-[100dvh] w-full max-w-[390px] flex-col justify-between overflow-hidden bg-white sm:h-[min(844px,100dvh)] sm:rounded-[32px] sm:shadow-[0_18px_60px_rgba(20,35,60,0.16)]">
        {/* Hero Section */}
        <section className="relative w-full flex-shrink-0 overflow-hidden" style={{ height: '55%' }} data-purpose="hero-illustration">
          <img
            src={currentSlide.image}
            alt={currentSlide.alt}
            className="h-full w-full object-cover object-top"
            draggable={false}
          />
          {/* Wave Divider */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0">
            <svg preserveAspectRatio="none" viewBox="0 0 500 120" className="w-full h-24" style={{ display: 'block' }}>
              <path d="M0,45 C150,115 350,10 500,85 L500,120 L0,120 Z" fill="#ffffff" />
            </svg>
          </div>
        </section>

        {/* Content Section */}
        <section className="relative flex flex-1 flex-col justify-between bg-white px-8 pt-1 pb-9 z-10" data-purpose="onboarding-text-content">
          {/* Text Content */}
          <div className="space-y-3">
            <h1 className="text-[34px] leading-[1.12] tracking-tight font-black">
              <span className="text-[#0b1b36] block">{currentSlide.title}</span>
              <span className="text-[#f50b2b] block">{currentSlide.accent}</span>
            </h1>
            <p className="text-[#60728c] text-[17px] font-medium leading-[1.38] pr-4">
              {currentSlide.description}
            </p>
          </div>

          {/* Pagination Indicators */}
          <div aria-label="Slide Indicator" className="flex items-center justify-center gap-2 pt-2" data-purpose="carousel-dots">
            {slides.map((slide, index) => (
              <span
                key={slide.title}
                aria-current={step === index + 1}
                className={`h-2.5 rounded-full transition-all ${step === index + 1 ? 'w-[18px] bg-[#f50b2b]' : 'w-2.5 bg-[#dbe0ea]'}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <footer className="flex items-center justify-between pt-2 pb-1" data-purpose="footer-controls">
            <button
              className="text-[#60728c] hover:text-[#0b1b36] font-semibold text-[17px] px-2 py-3 transition-colors active:opacity-70 focus:outline-none"
              onClick={onFinish}
              type="button"
            >
              Skip
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 bg-[#f50b2b] hover:bg-[#e00824] active:scale-95 text-white font-semibold text-[17px] pl-8 pr-6 py-4 rounded-full shadow-[0_8px_20px_rgba(245,11,43,0.35)] transition-all duration-150 focus:outline-none"
              onClick={goNext}
              type="button"
            >
              <span>{isLastStep ? 'Start Now' : step === 1 ? 'Get Started' : 'Next'}</span>
              <svg
                aria-hidden="true"
                className="w-5 h-5 ml-0.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="5" x2="19" y1="12" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </footer>
        </section>
      </main>
    </div>
  );
};
