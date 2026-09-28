import React, { useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const ONBOARDING_IMAGE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_00000000ce1c8230bbb8589ad313ce8f-qEIC90FZFHoWi3eClxq67wFU944CLU.png';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timeout = window.setTimeout(onFinish, 4500);
    return () => window.clearTimeout(timeout);
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f8d6d8] select-none"
      data-purpose="splash-screen"
      role="img"
      aria-label="Rofik Godi bike seat covers onboarding"
    >
      <img
        src={ONBOARDING_IMAGE}
        alt="Premium bike seat covers onboarding"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
};
