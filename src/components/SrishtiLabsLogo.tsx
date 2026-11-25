import { useEffect, useRef, useState } from 'react';
import {
  computeDotLuminance,
  sampleHalftoneGrid,
  type DotMatrixSurfaceTone,
  type HalftoneDot,
} from '../utils/dotMatrixLogo';

export interface SrishtiLabsLogoProps {
  /** Toggle transparent background (`true`) vs solid matte dark charcoal (`false`). */
  transparent?: boolean;
  /** Solid matte dark charcoal color used when `transparent` is `false`. */
  backgroundColor?: '#181818' | '#141416';
  /** Surface tone: `'dark'` renders luminous silver-white LED dots, `'light'` renders crisp dark obsidian-graphite dots for light backgrounds. */
  tone?: DotMatrixSurfaceTone;
  /** Spacing between circular micro-LED dots in logical pixels (default: 6.2). */
  dotPitch?: number;
  /** Horizontal alignment inside the canvas (`'center'` for hero/specimen, `'left'` for nav/footer). */
  align?: 'center' | 'left';
  /** Tighter crop & bolder stroke fit for smaller navbar, footer, and inline placements. */
  compact?: boolean;
  /** Enables the smooth diagonal metallic light-shimmer sweep animation (default: true). */
  animated?: boolean;
  /** Enables gentle brightness & bloom boost on hover (default: true). */
  interactive?: boolean;
  /** Optional wrapper layout classes (width, margin, etc.). */
  className?: string;
}

const LOGICAL_WIDTH = 980;
const LOGO_TEXT = 'Srishti Labs';

function buildSampledDots(
  dotPitch: number,
  align: 'center' | 'left',
  compact: boolean,
): HalftoneDot[] {
  const logicalHeight = compact ? 172 : 200;
  const offscreen = document.createElement('canvas');
  offscreen.width = LOGICAL_WIDTH;
  offscreen.height = logicalHeight;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.clearRect(0, 0, LOGICAL_WIDTH, logicalHeight);
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';

  let fontSize = compact ? 152 : 132;
  const fontFamily =
    '"Plus Jakarta Sans", "Manrope", "DM Sans", system-ui, -apple-system, sans-serif';
  ctx.font = `800 ${fontSize}px ${fontFamily}`;

  const measured = ctx.measureText(LOGO_TEXT).width;
  const maxTextWidth = LOGICAL_WIDTH * (compact ? 0.94 : 0.84);
  if (measured > maxTextWidth && measured > 0) {
    fontSize = Math.floor((fontSize * maxTextWidth) / measured);
    ctx.font = `800 ${fontSize}px ${fontFamily}`;
  }

  if (align === 'left') {
    ctx.textAlign = 'left';
    ctx.fillText(LOGO_TEXT, compact ? 14 : 32, logicalHeight / 2 + 4);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(LOGO_TEXT, LOGICAL_WIDTH / 2, logicalHeight / 2 + 4);
  }

  const imageData = ctx.getImageData(0, 0, LOGICAL_WIDTH, logicalHeight);
  return sampleHalftoneGrid(imageData.data, LOGICAL_WIDTH, logicalHeight, dotPitch, 44);
}

/**
 * Standalone, reusable typographic logo rendering ONLY the exact text "Srishti Labs"
 * on a single horizontal line in a glowing halftone LED dot-matrix pixel style.
 * Zero icons, stars, borders, circles, subtitles, or background shapes.
 */
export function SrishtiLabsLogo({
  transparent = false,
  backgroundColor = '#181818',
  tone = 'dark',
  dotPitch = 6.2,
  align = 'center',
  compact = false,
  animated = true,
  interactive = true,
  className = '',
}: SrishtiLabsLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverTargetRef = useRef(0);
  const hoverCurrentRef = useRef(0);
  const visibleRef = useRef(true);
  const [hovered, setHovered] = useState(false);

  const logicalHeight = compact ? 172 : 200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let rafId = 0;
    let dots: HalftoneDot[] = [];
    let bloomCanvas: HTMLCanvasElement | null = null;

    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(LOGICAL_WIDTH * dpr);
    canvas.height = Math.round(logicalHeight * dpr);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const effectivePitch = Math.min(dotPitch, 7.6);
    const shouldAnimate = animated && !prefersReducedMotion;
    const maxRadius = effectivePitch * (compact ? 0.44 : 0.415);
    const startTime = performance.now();
    let lastDrawTime = 0;

    const buildBloomCache = (sourceDots: HalftoneDot[]): HTMLCanvasElement | null => {
      const off = document.createElement('canvas');
      off.width = LOGICAL_WIDTH;
      off.height = logicalHeight;
      const bctx = off.getContext('2d');
      if (!bctx) return null;
      bctx.clearRect(0, 0, LOGICAL_WIDTH, logicalHeight);
      if (tone === 'light') {
        bctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
        bctx.shadowBlur = compact ? 6 : 8;
        bctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      } else {
        bctx.shadowColor = 'rgba(255, 255, 255, 0.56)';
        bctx.shadowBlur = compact ? 14 : 16;
        bctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      }
      bctx.beginPath();
      for (let i = 0; i < sourceDots.length; i += 1) {
        const d = sourceDots[i];
        const r = maxRadius * (0.5 + 0.5 * d.coverage);
        bctx.moveTo(d.x + r, d.y);
        bctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
      bctx.fill();
      return off;
    };

    const drawFrame = (now: number) => {
      if (cancelled) return;

      const targetHover = interactive ? hoverTargetRef.current : 0;
      hoverCurrentRef.current += (targetHover - hoverCurrentRef.current) * 0.14;
      const hoverVal = hoverCurrentRef.current;

      const elapsedSec = (now - startTime) * 0.001;
      const sweepPhase = shouldAnimate ? (elapsedSec / 4.6) % 1 : 0.36;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, LOGICAL_WIDTH, logicalHeight);

      if (dots.length > 0) {
        // Pass 1: Diffused outer bloom from cached offscreen pass
        if (bloomCanvas) {
          ctx.save();
          ctx.globalAlpha = 0.8 + hoverVal * 0.2;
          ctx.drawImage(bloomCanvas, 0, 0, LOGICAL_WIDTH, logicalHeight);
          ctx.restore();
        }

        // Pass 2: Individual circular micro-LED dots with diagonal metallic shimmer
        for (let i = 0; i < dots.length; i += 1) {
          const d = dots[i];
          const lum = computeDotLuminance(d.nx, d.ny, sweepPhase, hoverVal, tone);
          const radius =
            maxRadius *
            (0.46 + 0.54 * d.coverage) *
            (1 + lum.sweepBoost * 0.09 + hoverVal * 0.045);

          ctx.fillStyle = `rgb(${lum.r}, ${lum.g}, ${lum.b})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      if (cancelled || !visibleRef.current) {
        rafId = 0;
        return;
      }
      if (now - lastDrawTime >= 32) {
        lastDrawTime = now;
        drawFrame(now);
      }
      const hoverSettled = Math.abs(hoverTargetRef.current - hoverCurrentRef.current) < 0.004;
      if (shouldAnimate || !hoverSettled) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const startLoop = () => {
      if (!rafId && visibleRef.current && shouldAnimate && !cancelled) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const isVisible = entries[0]?.isIntersecting ?? true;
              visibleRef.current = isVisible;
              if (isVisible) {
                if (dots.length > 0) drawFrame(performance.now());
                startLoop();
              } else if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = 0;
              }
            },
            { threshold: 0.01 },
          )
        : null;

    observer?.observe(canvas);

    const init = async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch {
        // Proceed with system geometric sans fallback if font promise rejects
      }
      if (cancelled) return;
      dots = buildSampledDots(effectivePitch, align, compact);
      bloomCanvas = buildBloomCache(dots);
      drawFrame(performance.now());
      startLoop();
    };

    void init();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [dotPitch, align, compact, logicalHeight, animated, interactive, tone]);

  const handlePointerEnter = () => {
    if (!interactive) return;
    hoverTargetRef.current = 1;
    setHovered(true);
  };

  const handlePointerLeave = () => {
    if (!interactive) return;
    hoverTargetRef.current = 0;
    setHovered(false);
  };

  const bgClass = transparent
    ? 'bg-transparent'
    : backgroundColor === '#141416'
      ? 'bg-[#141416]'
      : 'bg-[#181818]';

  const bloomClass =
    tone === 'light'
      ? hovered && interactive
        ? 'drop-shadow-[0_1px_4px_rgba(15,23,42,0.18)]'
        : 'drop-shadow-[0_1px_1px_rgba(15,23,42,0.08)]'
      : compact
        ? hovered && interactive
          ? 'drop-shadow-[0_0_14px_rgba(255,255,255,0.65)] brightness-110'
          : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]'
        : hovered && interactive
          ? 'drop-shadow-[0_0_24px_rgba(255,255,255,0.65)] brightness-110'
          : 'drop-shadow-[0_0_18px_rgba(255,255,255,0.45)]';

  const aspectClass = compact ? 'aspect-[980/172]' : 'aspect-[49/10]';

  return (
    <span
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`inline-block select-none leading-none ${bgClass} ${className}`.trim()}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={LOGO_TEXT}
        data-testid="srishti-halftone-logo-canvas"
        data-transparent={transparent ? 'true' : 'false'}
        data-tone={tone}
        className={`block h-auto w-full ${aspectClass} transition-[filter] duration-300 ${bloomClass}`}
      />
    </span>
  );
}
