import React from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const ONBOARDING_REFERENCE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_000000004d6881f6b589604c1b2295e6-o2PvkXQbVyaGeu43hsA2p7yAo2LKQ0.png';

export const SplashScreen: React.FC<SplashScreenProps> = () => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f6d3df] select-none"
    data-purpose="splash-screen"
    role="img"
    aria-label="Rofik Godi Centre three-screen bike seat cover onboarding"
  >
    <img
      src={ONBOARDING_REFERENCE}
      alt="Three premium mobile onboarding screens for bike and toto seat covers"
      className="block h-full w-full object-contain"
      draggable={false}
    />
  </div>
);

