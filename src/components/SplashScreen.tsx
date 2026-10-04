import React from 'react';

// Keep this local and optimized so startup does not wait on a remote image.
const WELCOME_IMAGE = '/images/rofiq-splash.webp';
const APP_ICON = '/icon-foreground.png';

export const SplashScreen: React.FC = () => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#D9232D] select-none"
    data-purpose="splash-screen"
    aria-label="Loading Rofik Godi Centre"
    role="status"
    aria-live="polite"
  >
    <img
      src={WELCOME_IMAGE}
      alt=""
      loading="eager"
      decoding="async"
      fetchPriority="high"
      className="absolute inset-0 h-full w-full scale-[1.18] object-cover object-top opacity-80"
      draggable={false}
    />
    <div className="absolute inset-0 bg-[#6b0a1a]/45" aria-hidden="true" />
    <div className="relative z-10 text-center text-white">
      <img
        src={APP_ICON}
        alt=""
        width={112}
        height={112}
        loading="eager"
        decoding="async"
        className="mx-auto mb-4 h-28 w-28 object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.28)]"
        draggable={false}
      />
      <p className="text-sm font-semibold tracking-[0.24em]">ROFIK GODI</p>
      <p className="mt-1 text-xs text-white/75">Loading your ride essentials</p>
    </div>
  </div>
);
