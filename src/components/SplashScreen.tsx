import React from 'react';

export const SplashScreen: React.FC = () => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#B0182A] select-none"
    data-purpose="splash-screen"
    aria-label="Loading Rofik Godi Center"
    role="status"
    aria-live="polite"
  >
    <img
      src="/icon-192.png"
      alt=""
      width={112}
      height={112}
      loading="eager"
      decoding="async"
      className="h-28 w-28 object-contain"
      draggable={false}
    />
  </div>
);
