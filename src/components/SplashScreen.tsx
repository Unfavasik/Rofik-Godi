import React from 'react';

interface SplashScreenProps {
  onFinish: (mode?: 'signup' | 'login') => void;
}

const WELCOME_IMAGE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_000000000628821191103c9d96178cc2-nOY3IKKReKcFxU2mJ45b4VXCibGzdr.png';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f7dfe5] select-none" data-purpose="splash-screen" role="dialog" aria-label="Welcome to Rofik Godi Centre">
    <main className="relative h-full w-full max-w-none overflow-hidden bg-[#6b0a1a] sm:h-[896px] sm:rounded-[42px] sm:shadow-2xl">
      <img src={WELCOME_IMAGE} alt="Young man using a phone on a red premium background" className="absolute inset-0 h-full w-full scale-[1.18] object-cover object-top" draggable={false} />
      <div className="absolute inset-x-0 bottom-0 h-[43%] bg-gradient-to-t from-[#6b0a1a] via-[#6b0a1a]/80 to-transparent" aria-hidden="true" />
      <section className="absolute inset-x-0 bottom-0 z-10 px-6 pb-[calc(env(safe-area-inset-bottom)+14px)] text-center text-white sm:px-8">
        <h1 className="text-[clamp(30px,9vw,38px)] font-bold leading-none tracking-[-0.5px] [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">Welcome <span className="text-[#ff8a96]">Back!</span></h1>
        <p className="mt-1.5 text-base leading-6 text-white/90">Explore premium products<br />for bikes and totos.</p>
        <div className="my-3.5 flex items-center justify-center gap-2"><span className="h-[9px] w-[22px] rounded-full bg-white" /><span className="h-[9px] w-[9px] rounded-full bg-[#e0182d]" /><span className="h-[9px] w-[9px] rounded-full bg-[#e0182d]" /></div>
        <div className="flex gap-3.5"><button type="button" onClick={() => onFinish('login')} className="h-[58px] flex-1 rounded-[20px] bg-[#1c060a] text-[18px] font-semibold text-white transition-transform active:scale-[0.97] cursor-pointer">Sign in</button><button type="button" onClick={() => onFinish('signup')} className="h-[58px] flex-1 rounded-[20px] bg-white text-[18px] font-semibold text-[#e0182d] transition-transform active:scale-[0.97] cursor-pointer">Sign up</button></div>
        <div className="mx-auto mt-3.5 h-[5px] w-[130px] rounded-full bg-white" aria-hidden="true" />
      </section>
    </main>
  </div>
);

