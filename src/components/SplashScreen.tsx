import React, { useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const PAGE_TWO_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_oW4eR7B4al3-wR_MmImyCt_4z2WVTaqJLMWiDAULee-eRrHp1AxEqJeHTRr4BBGyAWIJVPvIhh4eqoM7EMOI3xVLBhO2tjGn13FBYkLWUfE9jdb-OfHmoAHBWHdNadOT2VoQi9lWJ3PyJ0dn4kh-GJritYrnR645y9aURbQmrIfFp6wv4HS2Xh8MsConzr55Ouw8H7sq6jcCi4TzFvOYs10TaXPmEWNBLoNIUHM02ar99ApZh6XnOw';
const PAGE_ONE_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_000000004d6881f6b589604c1b2295e6-x0eL5JcqS9gFBM1sbvxNDi8TJsMD6F.png';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [page, setPage] = useState<1 | 2 | 3>(1);
  const content = page === 1
    ? ['Find the Perfect', 'Seat Cover', 'Explore premium seat covers for bikes and totos with ease.']
    : page === 2
      ? ['Ergonomic &', 'Breathable Comfort', 'Designed with advanced airflow mesh and waterproof materials for long, fatigue-free rides.']
      : ['Reliable Quality', '& Service', 'Get durable seat covers with the best quality and support.'];
  const image = page === 2 ? PAGE_TWO_IMAGE : PAGE_ONE_IMAGE;
  const next = () => page === 3 ? onFinish() : setPage((value) => (value + 1) as 1 | 2 | 3);

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f7d5df] select-none">
    <main className="relative flex h-[100dvh] w-full max-w-[414px] flex-col overflow-hidden bg-white sm:h-[896px] sm:rounded-[44px] sm:shadow-2xl" data-purpose="splash-screen">
      <section className="relative h-[58%] w-full shrink-0 overflow-hidden" data-purpose="illustration-wrapper">
        <img src={image} alt="Premium bike seat cover onboarding" className={`h-full object-cover object-top ${page === 2 ? 'w-full' : 'w-[300%] max-w-none'}`} style={page === 3 ? { transform: 'translateX(-66.6667%)' } : undefined} draggable={false} />
      </section>
      <section className="relative z-10 -mt-20 flex flex-1 flex-col justify-between bg-white px-8 pb-10 pt-16 [clip-path:ellipse(115%_100%_at_20%_100%)]" data-purpose="bottom-sheet">
        <div className="space-y-3.5 pr-4" data-purpose="text-content"><h1 className="text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[36px]"><span className="block text-[#0E1E38]">{content[0]}</span><span className="block text-[#FA0030]">{content[1]}</span></h1><p className="max-w-[280px] text-[17px] font-medium leading-[1.38] text-[#5D6B82]">{content[2]}</p></div>
        <div className="flex items-center justify-center gap-2 py-4">{[1, 2, 3].map((dot) => <span key={dot} className={`h-2.5 rounded-full ${page === dot ? 'w-6 bg-[#FA0030]' : 'w-2.5 bg-[#D8DEE7]'}`} />)}</div>
        <footer className="flex items-center justify-between pt-2"><button className="px-2 py-3 text-[17px] font-semibold tracking-wide text-[#5D6B82]" onClick={onFinish} type="button">Skip</button><button className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#FA0030] py-4 pl-8 pr-6 text-[17px] font-semibold text-white shadow-lg shadow-red-500/25" onClick={next} type="button"><span>{page === 1 ? 'Get Started' : page === 2 ? 'Next' : 'Start Now'}</span><span aria-hidden="true" className="text-2xl">→</span></button></footer>
      </section>
    </main>
  </div>;
};
