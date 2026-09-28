import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bike, Shield, Sparkles, Layers } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 300);
          return 100;
        }
        return prev + 4;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0E0D11] text-white select-none overflow-hidden cursor-pointer"
      data-purpose="splash-screen"
    >
      {/* Background Image / Ambient Leather Texture */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img
          src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80"
          alt="Luxury Bike Seat Leather Texture"
          className="w-full h-full object-cover filter contrast-125 brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0D11]/90 via-[#0E0D11]/60 to-[#0E0D11]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,35,45,0.18)_0%,transparent_70%)]" />
      </div>

      {/* Top Status Space */}
      <div className="relative z-10 pt-8 px-6 flex justify-between items-center">
        <span className="text-[11px] font-mono tracking-widest text-white/40 uppercase">ROFIK GODI OFFICIAL</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFinish();
          }}
          className="text-xs font-semibold text-white/60 hover:text-white bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm active:scale-95 transition-all"
        >
          Skip
        </button>
      </div>

      {/* Center Branding (Matches Image 1) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 -mt-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 15 }}
          className="w-24 h-24 mb-6 relative flex items-center justify-center"
        >
          {/* Stylized Red & White R Logo */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E22B36] to-[#99151D] p-0.5 shadow-[0_0_40px_rgba(226,43,54,0.45)] border border-red-400/30 flex items-center justify-center transform -rotate-3">
            <div className="w-full h-full bg-[#121115] rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/20 blur-sm rounded-full" />
              <svg viewBox="0 0 100 100" className="w-12 h-12">
                {/* Stylized R */}
                <path
                  d="M25 20 L55 20 C68 20 78 28 78 40 C78 52 68 60 55 60 L38 60 L38 82 L25 82 Z M38 32 L38 48 L53 48 C60 48 65 44 65 40 C65 36 60 32 53 32 Z"
                  fill="#FFFFFF"
                />
                <path
                  d="M52 52 L78 82 L63 82 L42 56 Z"
                  fill="#E22B36"
                />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Brand Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase font-sans">
            ROFIK GODI
          </h1>
          <div className="tracking-[0.35em] text-[11px] font-bold text-red-500 mt-1 uppercase">
            CENTRE
          </div>
          <p className="text-[10px] tracking-[0.25em] text-white/50 uppercase mt-2 font-medium">
            COMFORT FOR EVERY RIDE
          </p>
        </motion.div>
      </div>

      {/* Bottom Category Icons & Progress Bar (Matching Image 1) */}
      <div className="relative z-10 px-6 pb-10 space-y-6">
        {/* Category Icons Row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            {
              label: 'Bike Covers',
              icon: (
                <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="6" cy="16" r="3" />
                  <circle cx="18" cy="16" r="3" />
                  <path d="M6 16l4-7h5l3 7M10 9l2-4h3" />
                </svg>
              ),
            },
            {
              label: 'Toto Covers',
              icon: (
                <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="4" y="4" width="16" height="12" rx="2" />
                  <circle cx="8" cy="18" r="2" />
                  <circle cx="16" cy="18" r="2" />
                  <path d="M4 10h16M9 4v6M15 4v6" />
                </svg>
              ),
            },
            {
              label: 'Cushions',
              icon: (
                <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="4" y="5" width="16" height="14" rx="3" />
                  <path d="M4 12h16M12 5v14" />
                </svg>
              ),
            },
            {
              label: 'Accessories',
              icon: (
                <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              ),
            },
          ].map((cat, idx) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.08 }}
              className="flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 mb-1.5 backdrop-blur-xs">
                {cat.icon}
              </div>
              <span className="text-[10px] text-white/60 font-medium tracking-tight">
                {cat.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Loading progress bar (Matching Image 1) */}
        <div className="space-y-2 pt-2">
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#D9232D] to-[#FF4D58] rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-center text-white/40 font-medium">
            Loading your experience...
          </p>
        </div>
      </div>
    </div>
  );
};
