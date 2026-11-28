export interface ViewportPoint {
  x: number;
  y: number;
}

export type CubicBezierEasing = readonly [number, number, number, number];

export interface ArcTrajectory {
  x: number[];
  y: number[];
  scaleX: number[];
  scaleY: number[];
  rotate: number[];
  opacity: number[];
  times: number[];
  controlPoint: ViewportPoint;
  controlPoint1: ViewportPoint;
  controlPoint2: ViewportPoint;
  svgPath: string;
  lateralBend: number;
  durationSec: number;
  easing: CubicBezierEasing;
}

export interface CartArcFlight {
  id: string;
  image?: string;
  title: string;
  start: ViewportPoint;
  end: ViewportPoint;
  trajectory: ArcTrajectory;
}

export type SupportSendPhase = 'idle' | 'windup' | 'launch' | 'sending';

export const SUPPORT_SEND_WINDUP_MS = 180;
export const SUPPORT_SEND_LAUNCH_MS = 220;
export const CART_ARC_DURATION_SEC = 0.68;
export const CART_ARC_EASING: CubicBezierEasing = [0.4, 0, 0.2, 1];
export const CART_STAGING_FOCUS_MS = 760;
export const CART_ARC_LANDED_EVENT = 'rg:cart-arc-landed';

export const SQUASH_STRETCH_SPRING = {
  type: 'spring' as const,
  stiffness: 560,
  damping: 20,
  mass: 0.65,
};

export const CART_CATCH_KEYFRAMES = {
  scaleX: [1, 1.24, 0.88, 1.08, 1],
  scaleY: [1, 0.81, 1.15, 0.95, 1],
  y: [0, 3, -3, 0.5, 0],
};

/**
 * Returns volume-preserving squash-and-stretch Framer Motion interaction props
 * for tactile buttons while respecting reduced-motion preferences.
 */
export function getSquashStretchMotionProps(
  prefersReducedMotion: boolean | null | undefined,
  options: { disabled?: boolean; intensity?: 'subtle' | 'standard' | 'playful' } = {},
) {
  const { disabled = false, intensity = 'standard' } = options;
  if (prefersReducedMotion || disabled) {
    return {
      whileHover: undefined,
      whileTap: undefined,
      transition: { duration: 0.01 },
    };
  }

  if (intensity === 'subtle') {
    return {
      whileHover: { scaleX: 1.02, scaleY: 0.99 },
      whileTap: { scaleX: 1.05, scaleY: 0.93 },
      transition: SQUASH_STRETCH_SPRING,
    };
  }

  if (intensity === 'playful') {
    return {
      whileHover: { scaleX: 1.04, scaleY: 0.97, y: -1 },
      whileTap: { scaleX: 1.12, scaleY: 0.87, y: 1 },
      transition: SQUASH_STRETCH_SPRING,
    };
  }

  return {
    whileHover: { scaleX: 1.025, scaleY: 0.985 },
    whileTap: { scaleX: 1.075, scaleY: 0.91 },
    transition: SQUASH_STRETCH_SPRING,
  };
}

/**
 * Evaluates a standard CSS cubic-bezier(x1, y1, x2, y2) timing function at
 * normalized time `t` in [0, 1] using Newton-Raphson with bisection fallback.
 */
export function evaluateCubicBezierEasing(
  t: number,
  easing: CubicBezierEasing = CART_ARC_EASING,
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const [x1, y1, x2, y2] = easing;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleDerivativeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;

  let s = t;
  for (let i = 0; i < 6; i += 1) {
    const err = sampleX(s) - t;
    if (Math.abs(err) < 1e-6) break;
    const slope = sampleDerivativeX(s);
    if (Math.abs(slope) < 1e-6) break;
    s = Math.min(1, Math.max(0, s - err / slope));
  }

  if (Math.abs(sampleX(s) - t) > 1e-5) {
    let lo = 0;
    let hi = 1;
    s = t;
    for (let i = 0; i < 16; i += 1) {
      const x = sampleX(s);
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) {
        lo = s;
      } else {
        hi = s;
      }
      s = (lo + hi) / 2;
    }
  }

  return Math.min(1, Math.max(0, sampleY(s)));
}

/**
 * Computes a graceful cubic Bezier arc between `start` and `end` with:
 * - Guaranteed lateral bow so even nearly-vertical throws sweep in a clear arc
 * - Custom cubic-bezier timing ([0.4, 0, 0.2, 1] by default) for fluid acceleration & settling
 * - Tangent-coupled banking rotation and aerodynamic squash-and-stretch
 * - Precomputed SVG cubic path for the stitched arc guide
 */
export function computeParabolicArcTrajectory(
  start: ViewportPoint,
  end: ViewportPoint,
  options: {
    steps?: number;
    minLift?: number;
    maxLift?: number;
    easing?: CubicBezierEasing;
  } = {},
): ArcTrajectory {
  const steps = Math.max(12, options.steps ?? 24);
  const minLift = options.minLift ?? 78;
  const maxLift = options.maxLift ?? 195;
  const easing = options.easing ?? CART_ARC_EASING;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);

  const arcLift = Math.min(maxLift, Math.max(minLift, distance * 0.32));

  // Ensure unmistakable sweeping curvature even when a card sits directly below the cart icon.
  let lateralBend: number;
  if (Math.abs(dx) < 135) {
    // Bow boldly toward the viewport interior so right-column cards sweep across cleanly.
    const bowDirection = start.x > 180 ? -1 : 1;
    lateralBend = bowDirection * Math.min(142, Math.max(96, distance * 0.24));
  } else {
    lateralBend = -Math.sign(dx) * Math.min(82, Math.max(48, Math.abs(dx) * 0.26));
  }

  const topY = Math.min(start.y, end.y);
  const controlPoint1: ViewportPoint = {
    x: Math.round((start.x + dx * 0.12 + lateralBend) * 100) / 100,
    y: Math.round(
      Math.max(24, start.y - Math.max(arcLift * 0.62, Math.abs(dy) * 0.4)) * 100,
    ) / 100,
  };
  const controlPoint2: ViewportPoint = {
    x: Math.round((start.x + dx * 0.52 + lateralBend * 0.62) * 100) / 100,
    y: Math.round((topY - Math.min(arcLift * 0.36, 36)) * 100) / 100,
  };

  const x: number[] = [];
  const y: number[] = [];
  const scaleX: number[] = [];
  const scaleY: number[] = [];
  const rotate: number[] = [];
  const opacity: number[] = [];
  const times: number[] = [];

  const directionSign = dx >= 0 ? 1 : -1;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    // Custom cubic-bezier easing ([0.4, 0, 0.2, 1]) for smooth, fluid acceleration and settling.
    const u = evaluateCubicBezierEasing(t, easing);
    const inv = 1 - u;

    // Cubic Bezier position B(u)
    const px =
      inv * inv * inv * start.x +
      3 * inv * inv * u * controlPoint1.x +
      3 * inv * u * u * controlPoint2.x +
      u * u * u * end.x;
    const py =
      inv * inv * inv * start.y +
      3 * inv * inv * u * controlPoint1.y +
      3 * inv * u * u * controlPoint2.y +
      u * u * u * end.y;

    // First derivative B'(u) for subtle natural banking tilt along the curve
    const tx =
      3 * inv * inv * (controlPoint1.x - start.x) +
      6 * inv * u * (controlPoint2.x - controlPoint1.x) +
      3 * u * u * (end.x - controlPoint2.x);
    const ty =
      3 * inv * inv * (controlPoint1.y - start.y) +
      6 * inv * u * (controlPoint2.y - controlPoint1.y) +
      3 * u * u * (end.y - controlPoint2.y);

    const tangentDeg = (Math.atan2(ty, tx) * 180) / Math.PI;
    const bankAngle =
      directionSign * 10 * Math.sin(u * Math.PI) +
      Math.max(-22, Math.min(22, (tangentDeg + 90) * 0.22));

    x.push(Math.round(px * 100) / 100);
    y.push(Math.round(py * 100) / 100);
    times.push(Math.round(t * 1000) / 1000);

    // Pop slightly larger near apex for crisp readability, then tuck neatly into the cart badge.
    const apexLiftScale = Math.sin(u * Math.PI) * 0.14;
    const baseScale = 1.02 + apexLiftScale - 0.62 * Math.pow(u, 1.65);

    // Volume-preserving squash at launch -> aerodynamic stretch through flight -> compact tuck.
    const launchSquash = Math.exp(-u * 11) * 0.14;
    const flightStretch = Math.sin(u * Math.PI) * 0.11;
    const sx = baseScale * (1 + launchSquash - flightStretch * 0.65);
    const sy = baseScale * (1 - launchSquash * 0.85 + flightStretch);

    scaleX.push(Math.round(sx * 1000) / 1000);
    scaleY.push(Math.round(sy * 1000) / 1000);
    rotate.push(Math.round(bankAngle * 100) / 100);
    opacity.push(
      u < 0.86 ? 1 : Math.round(Math.max(0.18, 1 - (u - 0.86) / 0.14) * 1000) / 1000,
    );
  }

  const durationSec =
    Math.round(Math.min(0.76, Math.max(0.58, 0.56 + distance / 2400)) * 100) / 100;

  const svgPath = `M ${Math.round(start.x * 10) / 10} ${Math.round(start.y * 10) / 10} C ${Math.round(controlPoint1.x * 10) / 10} ${Math.round(controlPoint1.y * 10) / 10}, ${Math.round(controlPoint2.x * 10) / 10} ${Math.round(controlPoint2.y * 10) / 10}, ${Math.round(end.x * 10) / 10} ${Math.round(end.y * 10) / 10}`;

  return {
    x,
    y,
    scaleX,
    scaleY,
    rotate,
    opacity,
    times,
    controlPoint: controlPoint2,
    controlPoint1,
    controlPoint2,
    svgPath,
    lateralBend: Math.round(lateralBend * 100) / 100,
    durationSec,
    easing,
  };
}

/**
 * Selects the best visible cart target coordinates in the current viewport.
 * Prefers modal/overlay cart buttons (highest z-layer / last in DOM) when visible.
 */
export function selectBestCartTargetPoint(
  candidates: Array<{ rect: { left: number; top: number; width: number; height: number } }>,
  viewport: { width: number; height: number },
): ViewportPoint | null {
  let scrolledHeaderFallback: ViewportPoint | null = null;

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const { rect } = candidates[i];
    if (rect.width <= 0 || rect.height <= 0) continue;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (cx >= 0 && cx <= viewport.width && cy >= 0 && cy <= viewport.height) {
      return { x: cx, y: cy };
    }
    if (
      scrolledHeaderFallback === null &&
      cx >= 0 &&
      cx <= viewport.width &&
      cy < 0
    ) {
      scrolledHeaderFallback = {
        x: Math.min(Math.max(cx, 24), Math.max(24, viewport.width - 24)),
        y: 26,
      };
    }
  }
  return scrolledHeaderFallback;
}

export function findVisibleCartTargetPoint(): ViewportPoint | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target="true"]'));
  const candidates = nodes
    .filter((node) => {
      const style = window.getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    })
    .map((node) => ({ rect: node.getBoundingClientRect() }));

  return selectBestCartTargetPoint(candidates, {
    width: window.innerWidth,
    height: window.innerHeight,
  });
}

export function getOriginPointFromEvent(
  event?: { currentTarget?: EventTarget | null; clientX?: number; clientY?: number },
): ViewportPoint | null {
  if (!event) return null;
  if (event.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }
  if (
    typeof event.clientX === 'number' &&
    typeof event.clientY === 'number' &&
    (event.clientX > 0 || event.clientY > 0)
  ) {
    return { x: event.clientX, y: event.clientY };
  }
  return null;
}

export function dispatchCartArcLandedEvent(productId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(CART_ARC_LANDED_EVENT, {
      detail: { productId, timestamp: Date.now() },
    }),
  );
}

/**
 * Returns Framer Motion animation targets for the Contact Support message send
 * Anticipation (wind-up) -> Launch -> Follow-through choreography.
 */
export function getSupportSendAnticipationTargets(
  phase: SupportSendPhase,
  prefersReducedMotion: boolean | null | undefined,
) {
  if (prefersReducedMotion) {
    return {
      button: { scaleX: 1, scaleY: 1, x: 0 },
      icon: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
      buttonTransition: { duration: 0.01 },
      iconTransition: { duration: 0.01 },
    };
  }

  switch (phase) {
    case 'windup':
      return {
        button: { scaleX: 0.94, scaleY: 0.96, x: -3 },
        icon: { x: -6, y: 4, rotate: -22, scale: 0.88, opacity: 1 },
        buttonTransition: { duration: SUPPORT_SEND_WINDUP_MS / 1000, ease: [0.4, 0, 0.2, 1] as const },
        iconTransition: { duration: SUPPORT_SEND_WINDUP_MS / 1000, ease: [0.4, 0, 0.2, 1] as const },
      };
    case 'launch':
      return {
        button: { scaleX: 1.035, scaleY: 0.97, x: 2 },
        icon: { x: 20, y: -16, rotate: 14, scale: 1.12, opacity: 0 },
        buttonTransition: { duration: SUPPORT_SEND_LAUNCH_MS / 1000, ease: [0.16, 1, 0.3, 1] as const },
        iconTransition: { duration: SUPPORT_SEND_LAUNCH_MS / 1000, ease: [0.16, 1, 0.3, 1] as const },
      };
    case 'sending':
      return {
        button: { scaleX: 1, scaleY: 1, x: 0 },
        icon: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
        buttonTransition: { type: 'spring' as const, stiffness: 420, damping: 24 },
        iconTransition: { duration: 0.18 },
      };
    case 'idle':
    default:
      return {
        button: { scaleX: 1, scaleY: 1, x: 0 },
        icon: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
        buttonTransition: SQUASH_STRETCH_SPRING,
        iconTransition: SQUASH_STRETCH_SPRING,
      };
  }
}
