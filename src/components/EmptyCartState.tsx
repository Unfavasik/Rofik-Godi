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

  return (
    <motion.div
      data-testid="cart-empty-state"
      initial={motionConfig.cardInitial}
      animate={motionConfig.cardAnimate}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-[360px] flex flex-col items-center justify-center text-center py-10 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_12px_28px_-16px_rgba(9,8,8,0.22)] px-5"
    >
      {/* Animated Bag Stage */}
      <div className="relative mb-4 flex h-28 w-28 items-center justify-center" aria-hidden="true">
        <motion.div
          animate={motionConfig.ringAnimate}
          transition={
            motionConfig.enabled
              ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0 }
          }
          className="absolute inset-1 rounded-full border border-rose-200/75 bg-gradient-to-b from-rose-50/70 via-white to-slate-50/60"
        />
        <div className="absolute inset-3.5 rounded-full border border-dashed border-slate-200/90" />

        {/* Floating Vector Bag Medallion */}
        <motion.div
          animate={motionConfig.floatAnimate}
          transition={
            motionConfig.enabled
              ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0 }
          }
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-white shadow-[0_10px_22px_-12px_rgba(217,35,45,0.35)]"
        >
          <svg
            viewBox="0 0 48 48"
            fill="none"
            className="h-9 w-9"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Bag Handle */}
            <motion.path
              d="M17.5 18V15C17.5 11.4101 20.4101 8.5 24 8.5C27.5899 8.5 30.5 11.4101 30.5 15V18"
              stroke="#D9232D"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={motionConfig.enabled ? { pathLength: 0.25, opacity: 0.7 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Bag Body */}
            <path
              d="M12.5 18.5C12.5 17.3954 13.3954 16.5 14.5 16.5H33.5C34.6046 16.5 35.5 17.3954 35.5 18.5L37.2 35.7C37.376 37.4791 35.9788 39 34.1909 39H13.8091C12.0212 39 10.624 37.4791 10.8 35.7L12.5 18.5Z"
              fill="#FFF5F5"
              stroke="#11141A"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            {/* Crafted Stitch Accent Line */}
            <motion.path
              d="M18 26.5H30"
              stroke="#D9232D"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="2.5 3.5"
              animate={motionConfig.enabled ? { opacity: [0.55, 1, 0.55] } : { opacity: 0.9 }}
              transition={
                motionConfig.enabled
                  ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0 }
              }
            />
            <circle cx="19.5" cy="21" r="1.25" fill="#11141A" />
            <circle cx="28.5" cy="21" r="1.25" fill="#11141A" />
          </svg>
        </motion.div>

        {/* Grounding Shadow Synchronized with Float */}
        <motion.div
          animate={motionConfig.shadowAnimate}
          transition={
            motionConfig.enabled
              ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0 }
          }
          className="absolute bottom-2.5 h-1.5 w-10 rounded-full bg-slate-900/20 blur-[1px]"
        />
      </div>

      <motion.h4
        initial={motionConfig.enabled ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="text-[16px] font-black tracking-tight text-slate-900 mb-1.5"
      >
        {title}
      </motion.h4>

      <motion.p
        initial={motionConfig.enabled ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="text-[12px] leading-relaxed text-slate-500 max-w-[235px] mb-5"
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
          delay: 0.16,
          type: 'spring',
          stiffness: 360,
          damping: 24,
        }}
        whileHover={motionConfig.ctaHover}
        whileTap={motionConfig.ctaTap}
        className="banner-cta-shine group/cta inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] px-6 py-2.5 text-[12.5px] font-extrabold text-white shadow-[0_10px_22px_-6px_rgba(217,35,45,0.48)] hover:brightness-105 hover:shadow-[0_14px_26px_-6px_rgba(217,35,45,0.58)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] focus-visible:ring-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <ShoppingBag className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/cta:-rotate-6" aria-hidden="true" />
        <span>{ctaLabel}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-1" aria-hidden="true" />
      </motion.button>
    </motion.div>
  );
};
