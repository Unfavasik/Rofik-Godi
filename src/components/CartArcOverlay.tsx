import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import type { CartArcFlight } from '../lib/motionChoreography';

interface CartArcOverlayProps {
  flights: CartArcFlight[];
  onFlightComplete: (flightId: string) => void;
}

const GHOST_ECHOES = [
  { delay: 0.042, size: 32, opacity: 0.28 },
  { delay: 0.084, size: 22, opacity: 0.16 },
] as const;

export const CartArcOverlay: React.FC<CartArcOverlayProps> = ({
  flights,
  onFlightComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || flights.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="cart-arc-overlay"
      className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
    >
      <AnimatePresence>
        {flights.map((flight) => {
          const { trajectory } = flight;
          const arrivalDelay = Math.max(0.16, trajectory.durationSec * 0.88);
          const maskId = `cart-arc-stitch-mask-${flight.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

          return (
            <React.Fragment key={flight.id}>
              {/* Signature tailor-stitched curved arc guide — crisp neutral ink, zero neon glow */}
              <svg
                data-testid="cart-arc-ribbon"
                className="fixed inset-0 h-full w-full overflow-visible"
              >
                <defs>
                  <mask id={maskId}>
                    <motion.path
                      d={trajectory.svgPath}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="6"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, pathOffset: 0 }}
                      animate={{
                        pathLength: [0, 0.28, 0.18, 0],
                        pathOffset: [0, 0.24, 0.78, 1],
                      }}
                      transition={{
                        duration: trajectory.durationSec,
                        times: [0, 0.35, 0.8, 1],
                        ease: trajectory.easing,
                      }}
                    />
                  </mask>
                </defs>
                <motion.path
                  d={trajectory.svgPath}
                  fill="none"
                  stroke="#1D1D1F"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="3 5"
                  mask={`url(#${maskId})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.26, 0.18, 0] }}
                  transition={{
                    duration: trajectory.durationSec,
                    times: [0, 0.3, 0.82, 1],
                    ease: trajectory.easing,
                  }}
                />
              </svg>

              {/* Quiet neutral launch ring where the swatch lifts off the product card */}
              <motion.span
                initial={{
                  x: flight.start.x - 16,
                  y: flight.start.y - 16,
                  scale: 0.65,
                  opacity: 0.32,
                }}
                animate={{
                  scale: 1.55,
                  opacity: 0,
                }}
                transition={{ duration: 0.28, ease: trajectory.easing }}
                className="fixed left-0 top-0 h-8 w-8 rounded-[10px] border border-slate-900/20 will-change-transform"
              />

              {/* Subtle neutral frosted swatch echoes conveying pure arc velocity without glow */}
              {GHOST_ECHOES.map((echo, idx) => {
                const half = echo.size / 2;
                return (
                  <motion.span
                    key={`${flight.id}-trail-${idx}`}
                    data-testid="cart-arc-trail"
                    initial={{
                      x: flight.start.x - half,
                      y: flight.start.y - half,
                      scale: 0.9,
                      opacity: 0,
                    }}
                    animate={{
                      x: trajectory.x.map((value) => value - half),
                      y: trajectory.y.map((value) => value - half),
                      scale: trajectory.scaleY.map((s) => Math.max(0.32, s * 0.88)),
                      rotate: trajectory.rotate,
                      opacity: trajectory.opacity.map((o, i) =>
                        i === 0 ? 0 : Math.round(o * echo.opacity * 100) / 100,
                      ),
                    }}
                    transition={{
                      delay: echo.delay,
                      duration: Math.max(0.32, trajectory.durationSec - echo.delay * 0.72),
                      times: trajectory.times,
                      ease: 'linear',
                    }}
                    style={{ width: echo.size, height: echo.size }}
                    className="fixed left-0 top-0 rounded-[10px] border border-black/[0.08] bg-white/85 shadow-[0_6px_14px_-6px_rgba(15,23,42,0.16)] will-change-transform"
                  />
                );
              })}

              {/* Physical product swatch tile flying along the cubic Bezier arc */}
              <motion.div
                data-testid="cart-arc-projectile"
                initial={{
                  x: flight.start.x - 24,
                  y: flight.start.y - 24,
                  scaleX: 1.12,
                  scaleY: 0.88,
                  rotate: -10,
                  opacity: 1,
                }}
                animate={{
                  x: trajectory.x.map((value) => value - 24),
                  y: trajectory.y.map((value) => value - 24),
                  scaleX: trajectory.scaleX,
                  scaleY: trajectory.scaleY,
                  rotate: trajectory.rotate,
                  opacity: trajectory.opacity,
                }}
                exit={{ opacity: 0, scale: 0.35 }}
                transition={{
                  duration: trajectory.durationSec,
                  times: trajectory.times,
                  ease: 'linear',
                }}
                onAnimationComplete={() => onFlightComplete(flight.id)}
                className="fixed left-0 top-0 h-12 w-12 will-change-transform"
              >
                <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[14px] border border-black/[0.08] bg-white p-0.5 shadow-[0_14px_28px_-8px_rgba(15,23,42,0.28),0_4px_10px_-4px_rgba(15,23,42,0.14)]">
                  {flight.image ? (
                    <img
                      src={flight.image}
                      alt=""
                      className="h-full w-full rounded-[11px] object-cover"
                      decoding="async"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-[11px] bg-[#1D1D1F] text-white">
                      <ShoppingBag className="h-5 w-5" />
                    </span>
                  )}
                </span>
                <span className="absolute -right-1.5 -top-1.5 flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-[#D9232D] px-1 text-[10px] font-semibold leading-none text-white shadow-[0_2px_6px_rgba(15,23,42,0.18)] tabular-nums">
                  +1
                </span>
              </motion.div>

              {/* Clean hairline landing ripple bridging smoothly into the Cart icon catch */}
              <motion.span
                initial={{
                  x: flight.end.x - 18,
                  y: flight.end.y - 18,
                  scale: 0.55,
                  opacity: 0,
                }}
                animate={{
                  scale: [0.55, 1.35, 1.65],
                  opacity: [0, 0.45, 0],
                }}
                transition={{
                  delay: arrivalDelay,
                  duration: 0.3,
                  times: [0, 0.35, 1],
                  ease: trajectory.easing,
                }}
                className="fixed left-0 top-0 h-9 w-9 rounded-full border border-white/75 will-change-transform"
              />
            </React.Fragment>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
