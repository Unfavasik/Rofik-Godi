import React from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const PAGE_TWO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC_oW4eR7B4al3-wR_MmImyCt_4z2WVTaqJLMWiDAULee-eRrHp1AxEqJeHTRr4BBGyAWIJVPvIhh4eqoM7EMOI3xVLBhO2tjGn13FBYkLWUfE9jdb-OfHmoAHBWHdNadOT2VoQi9lWJ3PyJ0dn4kh-GJritYrnR645y9aURbQmrIfFp6wv4HS2Xh8MsConzr55Ouw8H7sq6jcCi4TzFvOYs10TaXPmEWNBLoNIUHM02ar99ApZh6XnOw';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900 select-none">
    <main className="relative flex h-[100dvh] w-full max-w-[414px] flex-col overflow-hidden bg-white sm:h-[896px] sm:rounded-[44px] sm:shadow-2xl" data-purpose="splash-screen">
      <section className="relative h-[58%] w-full shrink-0 overflow-hidden" data-purpose="illustration-wrapper">
        <img
          src={PAGE_TWO_IMAGE}
          alt="Ergonomic breathable bike seat cover tested by an animated character"
          className="h-full w-full object-cover object-top"
          draggable={false}
        />
      </section>
      <section className="relative z-10 -mt-20 flex flex-1 flex-col justify-between bg-white px-8 pb-10 pt-16 [clip-path:ellipse(115%_100%_at_20%_100%)]" data-purpose="bottom-sheet">
        <div className="space-y-3.5 pr-4" data-purpose="text-content">
          <h1 className="text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[36px]"><span className="block text-[#0E1E38]">Ergonomic &amp;</span><span className="block text-[#FA0030]">Breathable Comfort</span></h1>
          <p className="max-w-[280px] text-[17px] font-medium leading-[1.38] text-[#5D6B82]">Designed with advanced airflow mesh and waterproof materials for long, fatigue-free rides.</p>
        </div>
        <div className="flex items-center justify-center gap-2 py-4" data-purpose="carousel-pagination"><span className="h-2.5 w-2.5 rounded-full bg-[#D8DEE7]" /><span className="h-2.5 w-6 rounded-full bg-[#FA0030]" /><span className="h-2.5 w-2.5 rounded-full bg-[#D8DEE7]" /></div>
        <footer className="flex items-center justify-between pt-2" data-purpose="footer-controls"><button className="px-2 py-3 text-[17px] font-semibold tracking-wide text-[#5D6B82]" onClick={onFinish} type="button">Skip</button><button className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#FA0030] py-4 pl-8 pr-6 text-[17px] font-semibold text-white shadow-lg shadow-red-500/25" onClick={onFinish} type="button"><span>Next</span><svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="m13.5 4.5 7.5 7.5m0 0-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg></button></footer>
      </section>
    </main>
  </div>
);
