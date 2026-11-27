export interface EmptyCartMotionConfig {
  enabled: boolean;
  cardInitial: { opacity: number; y: number; scale: number } | false;
  cardAnimate: { opacity: number; y: number; scale: number };
  floatAnimate: { y: number[]; rotate: number[] } | { y: number; rotate: number };
  shadowAnimate: { scaleX: number[]; opacity: number[] } | { scaleX: number; opacity: number };
  ringAnimate: { scale: number[]; opacity: number[] } | { scale: number; opacity: number };
  ctaInitial: { opacity: number; y: number; scale: number } | false;
  ctaAnimate: { opacity: number; y: number; scale: number };
  ctaHover: { scale: number; y: number } | undefined;
  ctaTap: { scale: number } | undefined;
}

export function getEmptyCartMotionConfig(prefersReducedMotion: boolean): EmptyCartMotionConfig {
  if (prefersReducedMotion) {
    return {
      enabled: false,
      cardInitial: false,
      cardAnimate: { opacity: 1, y: 0, scale: 1 },
      floatAnimate: { y: 0, rotate: 0 },
      shadowAnimate: { scaleX: 1, opacity: 0.14 },
      ringAnimate: { scale: 1, opacity: 0.7 },
      ctaInitial: false,
      ctaAnimate: { opacity: 1, y: 0, scale: 1 },
      ctaHover: undefined,
      ctaTap: undefined,
    };
  }

  return {
    enabled: true,
    cardInitial: { opacity: 0, y: 10, scale: 0.985 },
    cardAnimate: { opacity: 1, y: 0, scale: 1 },
    floatAnimate: { y: [0, -6, 0], rotate: [-1.5, 1.5, -1.5] },
    shadowAnimate: { scaleX: [1, 0.82, 1], opacity: [0.18, 0.08, 0.18] },
    ringAnimate: { scale: [0.96, 1.05, 0.96], opacity: [0.45, 0.85, 0.45] },
    ctaInitial: { opacity: 0, y: 8, scale: 0.96 },
    ctaAnimate: { opacity: 1, y: 0, scale: 1 },
    ctaHover: { scale: 1.03, y: -1 },
    ctaTap: { scale: 0.97 },
  };
}
