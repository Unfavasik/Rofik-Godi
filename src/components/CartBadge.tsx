import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';

export interface CartBadgeProps {
  count: number;
  className?: string;
  showZero?: boolean;
  ringColorClassName?: string;
}

export const CartBadge: React.FC<CartBadgeProps> = ({
  count,
  className = 'absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#D9232D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs tabular-nums',
  showZero = false,
  ringColorClassName = 'bg-[#D9232D]/45',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const prevCountRef = useRef(count);
  const [popSeq, setPopSeq] = useState(0);

  const isVisible = showZero || count > 0;
  const displayCount = count > 99 ? '99+' : count;

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = count;

    if (count <= prevCount) return;

    setPopSeq((seq) => seq + 1);

    if (prefersReducedMotion || !scope.current) return;
    // On 0 -> 1 when showZero is false, the mount spring already plays the pop-in bounce.
    if (!showZero && prevCount === 0) return;

    const controls = animate(
      scope.current,
      {
        scale: [1, 1.38, 0.92, 1.1, 1],
        y: [0, -2.5, 0.5, -0.5, 0],
      },
      {
        duration: 0.44,
        ease: 'easeOut',
      },
    );

    return () => {
      controls.stop();
    };
  }, [animate, count, prefersReducedMotion, scope, showZero]);

  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.span
          ref={scope}
          key="cart-badge"
          data-cart-badge="true"
          data-pop-count={popSeq}
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.35, opacity: 0, y: 2 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.14 }
              : { type: 'spring', stiffness: 540, damping: 14, mass: 0.7 }
          }
          className={`pointer-events-none select-none ${className}`}
        >
          {popSeq > 0 && !prefersReducedMotion && (
            <motion.span
              key={`cart-badge-halo-${popSeq}`}
              aria-hidden="true"
              initial={{ scale: 0.85, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className={`pointer-events-none absolute inset-0 rounded-full ${ringColorClassName}`}
            />
          )}
          <span className="relative z-10 leading-none">{displayCount}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
};
