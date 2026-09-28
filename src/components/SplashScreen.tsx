import React from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const LOADING_PAGE_IMAGE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_000000004d6881f6b589604c1b2295e6-x0eL5JcqS9gFBM1sbvxNDi8TJsMD6F.png';

export const SplashScreen: React.FC<SplashScreenProps> = () => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f7d5df] select-none"
    data-purpose="splash-screen"
    role="img"
    aria-label="Premium bike seat covers onboarding preview"
  >
    <img
      src={LOADING_PAGE_IMAGE}
      alt="Three premium bike seat cover onboarding screens"
      className="block"
      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
      draggable={false}
    />
  </div>
);
