import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { getEmptyCartMotionConfig } from '../lib/emptyCartMotion';

interface EmptyCartStateProps {
  title: string;
  body: string;
  ctaLabel: string;
  onShopNow: () => void;
}

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({
  title,
  body,
  ctaLabel,
  onShopNow,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const motionConfig = getEmptyCartMotionConfig(prefersReducedMotion);

  const gentleFloat = motionConfig.enabled
    ? { y: [0, -3.5, 0] }
    : { y: 0 };

  return (
    <motion.div
      data-testid="cart-empty-state"
      initial={motionConfig.cardInitial}
      animate={motionConfig.cardAnimate}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-[370px] flex flex-col items-center justify-center text-center py-11 px-6 rounded-[26px] bg-white border border-black/[0.05] shadow-[0_10px_30px_-20px_rgba(15,23,42,0.18)]"
    >
      {/* iOS Native Frosted Squircle Bag Emblem */}
      <div
        data-testid="empty-cart-ios-emblem"
        className="relative mb-6 flex h-[104px] w-[104px] items-center justify-center select-none"
        aria-hidden="true"
      >
        {/* Subtle frosted back-plate card giving authentic iOS Wallet / Sheet depth */}
        <motion.div
          animate={
            motionConfig.enabled
              ? { y: [0, -1.5, 0], rotate: [-6, -5.2, -6] }
              : { y: 0, rotate: -6 }
          }
          transition={
            motionConfig.enabled
              ? { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0 }
          }
          className="absolute h-[70px] w-[70px] -translate-x-2.5 translate-y-1 rounded-[20px] border border-black/[0.045] bg-[#F2F2F7]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        />

        {/* Primary iOS Squircle Tile */}
        <motion.div
          animate={gentleFloat}
          transition={
            motionConfig.enabled
              ? { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0 }
          }
          className="relative z-10 flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-black/[0.06] bg-gradient-to-b from-[#FFFFFF] via-[#F9F9FB] to-[#F1F1F5] shadow-[inset_0_1.5px_0_rgba(255,255,255,1),0_14px_28px_-14px_rgba(15,23,42,0.22),0_3px_8px_-3px_rgba(15,23,42,0.08)]"
        >
          {/* Specular top sheen strip (classic iOS glass tile refraction) */}
          <span className="pointer-events-none absolute inset-x-3 top-[1px] h-[1px] rounded-full bg-white" />

          {/* Precision SF-Symbols-inspired Shopping Bag Glyph */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            className="h-[34px] w-[34px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="iosBagBodyFill" x1="20" y1="13" x2="20" y2="33" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1D1D1F" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#1D1D1F" stopOpacity="0.14" />
              </linearGradient>
            </defs>
            {/* Continuous semicircular bag handle */}
            <motion.path
              d="M14.5 14.5V12C14.5 8.96243 16.9624 6.5 20 6.5C23.0376 6.5 25.5 8.96243 25.5 12V14.5"
              stroke="#1D1D1F"
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={motionConfig.enabled ? { pathLength: 0.35, opacity: 0.65 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Minimal monolithic bag silhouette */}
            <path
              d="M10.2 15.8C10.35 14.5 11.45 13.5 12.76 13.5H27.24C28.55 13.5 29.65 14.5 29.8 15.8L31.25 29.45C31.44 31.22 30.05 32.75 28.27 32.75H11.73C9.95 32.75 8.56 31.22 8.75 29.45L10.2 15.8Z"
              fill="url(#iosBagBodyFill)"
              stroke="#1D1D1F"
              strokeWidth="2.1"
              strokeLinejoin="round"
            />
            {/* Subtle recessed handle anchor rivets */}
            <circle cx="14.5" cy="17.8" r="1.15" fill="#1D1D1F" fillOpacity="0.72" />
            <circle cx="25.5" cy="17.8" r="1.15" fill="#1D1D1F" fillOpacity="0.72" />
          </svg>

          {/* Native iOS recessed 0-item counter badge */}
          <span className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-[#E5E5EA] px-1 text-[11px] font-bold leading-none text-[#636366] shadow-[0_2px_6px_rgba(15,23,42,0.12)] tabular-nums">
            0
          </span>
        </motion.div>

        {/* Grounded contact shadow — crisp, minimal, realistic */}
        <motion.div
          animate={motionConfig.shadowAnimate}
          transition={
            motionConfig.enabled
              ? { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0 }
          }
          className="absolute bottom-1.5 h-2 w-12 rounded-full bg-slate-900/14 blur-[4px]"
        />
      </div>

      <motion.h4
        initial={motionConfig.enabled ? { opacity: 0, y: 5 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="text-[18px] font-bold tracking-[-0.02em] text-[#1D1D1F] mb-1.5 text-balance"
      >
        {title}
      </motion.h4>

      <motion.p
        initial={motionConfig.enabled ? { opacity: 0, y: 5 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="text-[13px] leading-[1.48] text-[#6E6E73] max-w-[248px] mb-6 text-balance"
      >
        {body}
      </motion.p>

      <motion.button
        type="button"
        data-testid="cart-empty-shop-now"
        onClick={onShopNow}
        initial={motionConfig.ctaInitial}
        animate={motionConfig.ctaAnimate}
        transition={{
          delay: 0.14,
          type: 'spring',
          stiffness: 340,
          damping: 26,
        }}
        whileHover={motionConfig.ctaHover}
        whileTap={motionConfig.ctaTap}
        className="btn-squash-stretch banner-cta-shine group/cta inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#D9232D] px-7 py-2.5 text-[13.5px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-6px_rgba(15,23,42,0.28)] hover:bg-[#C31D27] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_20px_-6px_rgba(15,23,42,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] focus-visible:ring-offset-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
      >
        <ShoppingBag className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:-rotate-6" aria-hidden="true" />
        <span>{ctaLabel}</span>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-1" aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
};
