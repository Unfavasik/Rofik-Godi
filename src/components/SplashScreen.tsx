import React, { useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const HERO_IMAGE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_00000000ce1c8230bbb8589ad313ce8f-qEIC90FZFHoWi3eClxq67wFU944CLU.png';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timeout = window.setTimeout(onFinish, 4500);
    return () => window.clearTimeout(timeout);
  }, [onFinish]);

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
            src={HERO_IMAGE}
            alt="Young boy presenting a custom bike seat cover"
            className="absolute inset-0 h-full w-[300%] max-w-none object-cover object-left"
            draggable={false}
          />
          <header className="relative z-20 flex items-center justify-between px-8 pt-3 text-[#0b1e38]" data-purpose="ios-status-bar">
            <span className="font-sans text-[15px] font-bold tracking-tight">9:41</span>
            <div className="flex items-center space-x-2" aria-hidden="true">
              <span className="flex h-3.5 w-4 items-end gap-0.5">
                <i className="h-1 w-[3px] bg-current" /><i className="h-1.5 w-[3px] bg-current" /><i className="h-2.5 w-[3px] bg-current" /><i className="h-3.5 w-[3px] bg-current" />
              </span>
              <span className="relative h-3.5 w-4"><span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current" /><span className="absolute bottom-0 left-1/2 h-2.5 w-3 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-current" /></span>
              <span className="flex items-center"><span className="h-3 w-[22px] rounded-[3.5px] border-[1.5px] border-current p-[1.5px]"><span className="block h-full w-full rounded-[1.5px] bg-current" /></span><span className="h-1 w-[1.5px] rounded-r bg-current" /></span>
            </div>
          </header>
          <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-white via-white/80 to-transparent" aria-hidden="true" />
        </section>

        <section className="relative z-10 -mt-14 flex flex-1 flex-col justify-between rounded-t-[38px] bg-white px-8 pb-9 pt-8 shadow-[0_-10px_30px_rgba(255,255,255,0.9)]" data-purpose="onboarding-text-content">
          <div className="space-y-3 pt-2">
            <h1 className="text-[32px] font-extrabold leading-[1.12] tracking-tight sm:text-[34px]"><span className="block text-[#0b1e38]">Premium Bike</span><span className="block text-[#ee0925]">Seat Covers</span></h1>
            <p className="max-w-[270px] text-[15px] font-medium leading-relaxed text-[#627084] sm:text-[16px]">High quality bike seat covers for a more comfortable and stylish ride.</p>
          </div>
          <nav aria-label="Onboarding Progress" className="flex items-center justify-center py-2"><ul className="flex items-center space-x-2"><li><span aria-current="page" aria-label="Slide 1" className="block h-2 w-4 rounded-full bg-[#ee0925]" /></li><li><span aria-label="Slide 2" className="block h-2 w-2.5 rounded-full bg-[#d9dfe8]" /></li><li><span aria-label="Slide 3" className="block h-2 w-2.5 rounded-full bg-[#d9dfe8]" /></li></ul></nav>
          <footer className="flex items-center justify-between pt-1"><button className="rounded-lg px-2 py-3 text-[16px] font-bold text-[#627084]" type="button">Skip</button><button className="flex items-center space-x-2.5 rounded-full bg-[#ee0925] py-3.5 pl-7 pr-6 text-[16px] font-bold text-white shadow-[0_10px_24px_-4px_rgba(238,9,37,0.45)]" type="button"><span>Next</span><span aria-hidden="true" className="text-2xl font-normal leading-none">→</span></button></footer>
        </section>
      </main>
    </div>
  );
};
