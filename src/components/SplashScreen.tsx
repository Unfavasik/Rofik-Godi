import React from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const WELCOME_IMAGE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_000000000628821191103c9d96178cc2-nOY3IKKReKcFxU2mJ45b4VXCibGzdr.png';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f7dfe5] select-none"
    data-purpose="splash-screen"
    role="dialog"
    aria-label="Welcome to Rofik Godi Centre"
  >
    <main className="relative h-full w-full max-w-[414px] overflow-hidden bg-[#7a0018] sm:h-[896px] sm:rounded-[42px] sm:shadow-[0_24px_80px_rgba(72,0,20,0.28)]">
      <img
        src={WELCOME_IMAGE}
        alt="Friendly young man in a red hoodie using a phone on a soft red background"
        className="absolute inset-0 h-full w-full object-cover object-top"
        draggable={false}
      />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#730016] via-[#8f001f]/90 to-transparent" aria-hidden="true" />
      <section className="absolute inset-x-0 bottom-0 z-10 px-7 pb-9 text-center text-white sm:px-8">
        <h1 className="text-[39px] font-extrabold leading-none tracking-tight sm:text-[42px]">
          <span className="block">Welcome</span>
          <span className="block text-[#ff9dac]">Back!</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[285px] text-[17px] font-medium leading-[1.35] text-white/90">
          Explore premium products<br />for bikes and totos.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2" aria-label="Welcome page indicator">
          <span className="h-2.5 w-6 rounded-full bg-white" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ed2443]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ed2443]" />
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3.5">
          <button type="button" onClick={onFinish} className="h-14 rounded-full bg-[#190005] text-[18px] font-bold text-white shadow-lg transition-transform active:scale-95">Sign in</button>
          <button type="button" onClick={onFinish} className="h-14 rounded-full bg-white text-[18px] font-bold text-[#ef1535] shadow-lg transition-transform active:scale-95">Sign up</button>
        </div>
      </section>
    </main>
  </div>
);

