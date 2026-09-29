import React, { useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const ONBOARDING_REFERENCE =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_000000004d6881f6b589604c1b2295e6-o2PvkXQbVyaGeu43hsA2p7yAo2LKQ0.png';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [page, setPage] = useState<1 | 2 | 3>(1);
  const nextPage = () => page === 3 ? onFinish() : setPage((current) => (current + 1) as 1 | 2 | 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f6d3df] select-none"
      data-purpose="splash-screen"
      role="application"
      aria-label={`Rofik Godi Centre onboarding page ${page} of 3`}
    >
      <main className="relative h-full w-full max-w-[450px] overflow-hidden bg-[#f6d3df] sm:h-[min(100dvh,844px)] sm:rounded-[34px] sm:shadow-2xl">
        <img
          src={ONBOARDING_REFERENCE}
          alt={`Rofik Godi Centre onboarding page ${page}`}
          className="absolute inset-y-0 h-full w-[300%] max-w-none object-fill transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${page === 1 ? '0%' : page === 2 ? '-50%' : '-117%'})` }}
          draggable={false}
        />
        <button
          type="button"
          aria-label="Skip onboarding"
          onClick={onFinish}
          className="absolute left-0 top-0 h-[88%] w-1/2 cursor-pointer bg-transparent"
        />
        <button
          type="button"
          aria-label={page === 3 ? 'Start now' : page === 1 ? 'Get started' : 'Next page'}
          onClick={nextPage}
          className="absolute bottom-0 right-0 h-[24%] w-[78%] cursor-pointer bg-transparent"
        />
      </main>
    </div>
  );
};

