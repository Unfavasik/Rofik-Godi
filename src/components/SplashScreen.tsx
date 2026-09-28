import React, { useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const HERO_IMAGE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_00000000ce1c8230bbb8589ad313ce8f-qEIC90FZFHoWi3eClxq67wFU944CLU.png';
const EXPLORE_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCK4EfbZqNa5_9Ahgfo7ph4ZC-JCoByDu4aI1oerKGGgHhl__kyEkQO2n0i9wsiur_P_ad_QuLY4DXSqZ--wUHyltkGbjDydEwDWUKzAlm0I1URyTDvkqMg-oCmg6F8sbMe17dv4cK9RyNVRa2mj7M_fBA_rxkS6HTomOcUi0bqVCcpZ-ObpkIuFE_3j-B6k-6GJRjL9KpuV1BbF0gpa7pAVXPMBZL59RjPp7kRwu_Ejg6aBzTGa9wAVKdXvtbQBaYLxA';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [slide, setSlide] = useState<1 | 2>(1);
  const isExploreSlide = slide === 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#fee5eb_0%,#fcd5de_100%)] select-none font-sans"
      data-purpose="splash-screen"
      role="img"
      aria-label="Premium Bike Seat Covers onboarding"
    >
      <main className="relative flex h-[100dvh] w-full max-w-[412px] flex-col justify-between overflow-hidden bg-white sm:h-[844px] sm:rounded-[48px] sm:border-[6px] sm:border-white/60 sm:shadow-[0_25px_60px_-15px_rgba(220,100,120,0.35)]">
        <section className="relative flex h-[58%] w-full flex-col overflow-hidden" data-purpose="hero-illustration">
          <img
            src={isExploreSlide ? EXPLORE_IMAGE : HERO_IMAGE}
            alt={isExploreSlide ? '3D boy illustration with bike seat options showcase' : 'Young boy presenting a custom bike seat cover'}
            className={`absolute top-0 transition-[left] duration-300 ${isExploreSlide ? 'left-[-100%] h-auto w-[300%] max-w-none' : 'left-0 h-full w-[300%] max-w-none object-cover object-left'}`}
            style={{ left: isExploreSlide ? '-100%' : '0%' }}
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-white via-white/80 to-transparent" aria-hidden="true" />
        </section>

        <section className="relative z-10 -mt-14 flex flex-1 flex-col justify-between rounded-t-[38px] bg-white px-8 pb-9 pt-8 shadow-[0_-10px_30px_rgba(255,255,255,0.9)]" data-purpose="onboarding-text-content">
          <div className="space-y-3 pt-2">
            <h1 className="text-[32px] font-extrabold leading-[1.12] tracking-tight sm:text-[34px]"><span className="block text-[#0b1e38]">{isExploreSlide ? 'Explore' : 'Premium Bike'}</span><span className="block text-[#ee0925]">{isExploreSlide ? 'Different Designs' : 'Seat Covers'}</span></h1>
            <p className="max-w-[270px] text-[15px] font-medium leading-relaxed text-[#627084] sm:text-[16px]">{isExploreSlide ? 'Choose from various bike seat cover designs, colors and materials to match your style.' : 'High quality bike seat covers for a more comfortable and stylish ride.'}</p>
          </div>
          <nav aria-label="Onboarding Progress" className="flex items-center justify-center py-2"><ul className="flex items-center space-x-2"><li><span aria-current={!isExploreSlide ? 'page' : undefined} aria-label="Slide 1" className={`block h-2 rounded-full ${isExploreSlide ? 'w-2.5 bg-[#d9dfe8]' : 'w-4 bg-[#ee0925]'}`} /></li><li><span aria-current={isExploreSlide ? 'page' : undefined} aria-label="Slide 2" className={`block h-2 rounded-full ${isExploreSlide ? 'w-6 bg-[#ee0925]' : 'w-2.5 bg-[#d9dfe8]'}`} /></li><li><span aria-label="Slide 3" className="block h-2 w-2.5 rounded-full bg-[#d9dfe8]" /></li></ul></nav>
          <footer className="flex items-center justify-between pt-1"><button className="rounded-lg px-2 py-3 text-[16px] font-bold text-[#627084]" onClick={onFinish} type="button">Skip</button><button className="flex items-center space-x-2.5 rounded-full bg-[#ee0925] py-3.5 pl-7 pr-6 text-[16px] font-bold text-white shadow-[0_10px_24px_-4px_rgba(238,9,37,0.45)]" onClick={() => isExploreSlide ? onFinish() : setSlide(2)} type="button"><span>{isExploreSlide ? 'Get Started' : 'Next'}</span><span aria-hidden="true" className="text-2xl font-normal leading-none">→</span></button></footer>
        </section>
      </main>
    </div>
  );
};
