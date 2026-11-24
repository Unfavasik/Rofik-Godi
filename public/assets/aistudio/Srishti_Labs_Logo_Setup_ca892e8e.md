# Srishti Labs Logo Setup

এই package-এ GitHub-এর `Srishti-Labs` repository থেকে copy করা logo implementation-এর দুইটি source file আছে:

- `SrishtiLabsLogo.tsx` — মূল React canvas logo component
- `dotMatrixLogo.ts` — halftone dot sampling, metallic shimmer এবং luminance calculation utility

## 1. Required dependencies

এটি React + TypeScript project-এর জন্য তৈরি। Project-এ নিচের packages থাকতে হবে:

```bash
npm install react react-dom
npm install -D typescript @types/react @types/react-dom
```

যদি Vite ব্যবহার করো:

```bash
npm install -D vite @vitejs/plugin-react
```

## 2. File placement

দুটি file এই structure অনুযায়ী রাখো:

```text
src/
├── components/
│   └── SrishtiLabsLogo.tsx
└── utils/
    └── dotMatrixLogo.ts
```

`SrishtiLabsLogo.tsx`-এর import path পরিবর্তন করার দরকার নেই, কারণ component-এর মধ্যে utility import করা আছে:

```ts
import {
  computeDotLuminance,
  sampleHalftoneGrid,
  type HalftoneDot,
} from '../utils/dotMatrixLogo';
```

## 3. Component ব্যবহার

যে component-এ logo দেখাতে চাও সেখানে import করো:

```tsx
import { SrishtiLabsLogo } from './components/SrishtiLabsLogo';
```

তারপর render করো:

```tsx
<SrishtiLabsLogo
  transparent
  compact
  align="left"
  dotPitch={7.4}
  className="w-[146px]"
/>
```

## 4. Main logo / hero usage

বড় logo preview-এর জন্য:

```tsx
<SrishtiLabsLogo
  backgroundColor="#141416"
  dotPitch={6.2}
  align="center"
  animated
  interactive
  className="w-full max-w-[980px]"
/>
```

## 5. Props

| Prop | কাজ |
|---|---|
| `transparent` | background transparent করবে |
| `backgroundColor` | solid background: `#181818` অথবা `#141416` |
| `dotPitch` | LED dot-এর spacing; ছোট value হলে dots ঘন হবে |
| `align` | `center` অথবা `left` alignment |
| `compact` | navbar বা ছোট জায়গার জন্য tighter logo |
| `animated` | diagonal metallic shimmer চালু/বন্ধ |
| `interactive` | hover করলে brightness/bloom boost |
| `className` | wrapper-এর width/layout class |

## 6. Important notes

- Component browser canvas API ব্যবহার করে; browser environment ছাড়া render করবে না।
- `SrishtiLabsLogo.tsx`-এর default font হলো `Space Grotesk`, এরপর `Inter` এবং system fallback।
- `animated={false}` দিলে animation বন্ধ হবে।
- Accessibility-এর জন্য component canvas-এ `aria-label="Srishti Labs"` দেওয়া আছে।
- Original implementation-এর visual effect পেতে wrapper-এর width নির্ধারণ করো, যেমন `w-[146px]`, `w-full` বা CSS `width: 980px`।

## 7. Run করার উদাহরণ

```bash
npm run dev
```

তারপর Vite-এর local URL খুলে logo দেখো।

এই package-এর source files GitHub repository-এর implementation থেকে copy করা:

- https://github.com/Unfavasik/Srishti-Labs/blob/main/src/components/SrishtiLabsLogo.tsx
- https://github.com/Unfavasik/Srishti-Labs/blob/main/src/utils/dotMatrixLogo.ts


---

# Complete Source Code

## `SrishtiLabsLogo.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import {
  computeDotLuminance,
  sampleHalftoneGrid,
  type HalftoneDot,
} from '../utils/dotMatrixLogo';

export interface SrishtiLabsLogoProps {
  /** Toggle transparent background (`true`) vs solid matte dark charcoal (`false`). */
  transparent?: boolean;
  /** Solid matte dark charcoal color used when `transparent` is `false`. */
  backgroundColor?: '#181818' | '#141416';
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
    '"Space Grotesk", "Inter", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
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
      bctx.shadowColor = 'rgba(255, 255, 255, 0.56)';
      bctx.shadowBlur = compact ? 14 : 16;
      bctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
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
        // Pass 1: Diffused pure white volumetric outer bloom from cached offscreen pass
        if (bloomCanvas) {
          ctx.save();
          ctx.globalAlpha = 0.8 + hoverVal * 0.2;
          ctx.drawImage(bloomCanvas, 0, 0, LOGICAL_WIDTH, logicalHeight);
          ctx.restore();
        }

        // Pass 2: Individual circular micro-LED dots with diagonal metallic shimmer
        for (let i = 0; i < dots.length; i += 1) {
          const d = dots[i];
          const lum = computeDotLuminance(d.nx, d.ny, sweepPhase, hoverVal);
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
  }, [dotPitch, align, compact, logicalHeight, animated, interactive]);

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

  const bloomClass = compact
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
        className={`block h-auto w-full ${aspectClass} transition-[filter] duration-300 ${bloomClass}`}
      />
    </span>
  );
}

```

## `dotMatrixLogo.ts`

```ts
export interface HalftoneDot {
  x: number;
  y: number;
  nx: number;
  ny: number;
  coverage: number;
}

export interface DotLuminance {
  r: number;
  g: number;
  b: number;
  intensity: number;
  sweepBoost: number;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * Samples an offscreen RGBA image buffer onto a dense circular micro-LED dot grid.
 * Uses a 3x3 neighborhood average around each grid center for clean anti-aliased edges.
 */
export function sampleHalftoneGrid(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number,
  dotPitch: number,
  alphaThreshold = 42,
): HalftoneDot[] {
  if (width <= 0 || height <= 0 || dotPitch <= 0) return [];

  const rawDots: Array<{ x: number; y: number; coverage: number }> = [];
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  const halfPitch = dotPitch * 0.5;
  const sampleRadius = Math.max(1, Math.floor(dotPitch * 0.3));

  for (let y = halfPitch; y < height - halfPitch * 0.5; y += dotPitch) {
    const cy = Math.round(y);
    for (let x = halfPitch; x < width - halfPitch * 0.5; x += dotPitch) {
      const cx = Math.round(x);

      let alphaSum = 0;
      let count = 0;
      for (let oy = -sampleRadius; oy <= sampleRadius; oy += sampleRadius) {
        const py = cy + oy;
        if (py < 0 || py >= height) continue;
        for (let ox = -sampleRadius; ox <= sampleRadius; ox += sampleRadius) {
          const px = cx + ox;
          if (px < 0 || px >= width) continue;
          const idx = (py * width + px) * 4 + 3;
          alphaSum += rgbaData[idx] ?? 0;
          count += 1;
        }
      }

      const avgAlpha = count > 0 ? alphaSum / count : 0;
      if (avgAlpha >= alphaThreshold) {
        const coverage = clamp01((avgAlpha - alphaThreshold) / (255 - alphaThreshold));
        rawDots.push({ x, y, coverage });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  return rawDots.map((dot) => ({
    x: dot.x,
    y: dot.y,
    nx: clamp01((dot.x - minX) / spanX),
    ny: clamp01((dot.y - minY) / spanY),
    coverage: dot.coverage,
  }));
}

/**
 * Computes monochrome brushed silver (#A1A1AA) to luminous white (#FFFFFF) RGB values
 * for a single micro-LED dot, combining diagonal metallic sheen, animated diagonal
 * light-shimmer sweep, and interactive hover brightness boost.
 */
export function computeDotLuminance(
  nx: number,
  ny: number,
  sweepPhase: number,
  hoverAmount = 0,
): DotLuminance {
  const x = clamp01(nx);
  const y = clamp01(ny);
  const hover = clamp01(hoverAmount);

  // Diagonal metallic specular base sheen (creates dimensional silver-to-white letter depth)
  const diag = x * 0.78 + y * 0.42;
  const metallicWave = 0.5 + 0.5 * Math.sin(diag * Math.PI * 3.1 - 0.65);
  const verticalLift = 1 - y * 0.28;
  const baseFactor = clamp01(0.24 + metallicWave * 0.46 + verticalLift * 0.16);

  // Smooth diagonal light-shimmer sweep moving across the letters
  // Normalized phase 0..1 with a gentle resting interval at the end of each cycle
  const wrappedPhase = ((sweepPhase % 1) + 1) % 1;
  const sweepCoord = x * 0.84 + y * 0.34;
  const sweepCenter = -0.3 + wrappedPhase * 1.95;
  const dist = sweepCoord - sweepCenter;
  const sweepBoost = Math.exp(-(dist * dist) / 0.016);

  // Combine base metallic sheen, shimmer sweep, and gentle hover brightness boost
  const intensity = clamp01(baseFactor + sweepBoost * 0.58 + hover * 0.24);

  // Strictly monochrome ramp from #A1A1AA (161, 161, 170) to #FFFFFF (255, 255, 255)
  const r = Math.round(161 + (255 - 161) * intensity);
  const g = Math.round(161 + (255 - 161) * intensity);
  const b = Math.round(170 + (255 - 170) * intensity);

  return {
    r,
    g,
    b,
    intensity,
    sweepBoost,
  };
}

/**
 * Deterministic periodic micro-glitch offset for horizontal dot-matrix scanlines.
 * Fires briefly (~150ms) once every 5.2 seconds on 1–2 narrow horizontal bands.
 */
export function computeMicroGlitchOffset(ny: number, elapsedSec: number): {
  dx: number;
  flicker: number;
} {
  const cycle = 5.2;
  const phase = ((elapsedSec % cycle) + cycle) % cycle;
  // Glitch window active only between 4.82s and 4.98s
  if (phase < 4.82 || phase > 4.98) {
    return { dx: 0, flicker: 0 };
  }

  const localT = (phase - 4.82) / 0.16; // 0..1
  const envelope = Math.sin(localT * Math.PI);
  const bandA = ny > 0.24 && ny < 0.37;
  const bandB = ny > 0.66 && ny < 0.77;

  if (bandA) {
    return {
      dx: (localT < 0.5 ? 1 : -0.75) * 9.5 * envelope,
      flicker: 0.35 * envelope,
    };
  }
  if (bandB) {
    return {
      dx: (localT < 0.5 ? -1 : 0.8) * 7.5 * envelope,
      flicker: 0.28 * envelope,
    };
  }
  return { dx: 0, flicker: 0 };
}

/**
 * Projects a 3D undulating wave grid point into 2D screen space with gentle mouse influence.
 */
export function computeWaveDotPoint(params: {
  gx: number;
  gz: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
  timeSec: number;
  mouseNx: number;
  mouseNy: number;
  mouseActive: number;
}): { x: number; y: number; radius: number; alpha: number } {
  const { gx, gz, cols, rows, width, height, timeSec, mouseNx, mouseNy, mouseActive } = params;
  const u = cols > 1 ? gx / (cols - 1) - 0.5 : 0; // -0.5..0.5
  const v = rows > 1 ? gz / (rows - 1) : 0; // 0 (far) .. 1 (near)

  // Perspective scale: further rows compress slightly toward horizon
  const depth = 0.42 + v * 0.95;
  const perspectiveX = u * width * (1.28 * depth);

  // Layered slow undulating 3D sine waves
  const wavePrimary = Math.sin(u * 7.2 + timeSec * 0.65 + v * 3.1) * 18;
  const waveSecondary = Math.cos(u * 4.4 - timeSec * 0.42 + v * 5.2) * 11;

  // Gentle pointer-reactive elevation ripple
  const pointerU = mouseNx - 0.5;
  const pointerV = mouseNy;
  const dx = u - pointerU;
  const dy = v - pointerV;
  const distSq = dx * dx + dy * dy;
  const pointerLift = mouseActive * Math.exp(-distSq / 0.032) * 26;

  const elevation = (wavePrimary + waveSecondary - pointerLift) * depth;

  const baseY = height * 0.18 + Math.pow(v, 1.15) * height * 0.84;
  const x = width * 0.5 + perspectiveX;
  const y = baseY + elevation;

  const ridgeGlow = clamp01(0.5 + (wavePrimary + waveSecondary) / 56);
  const pointerGlow = mouseActive * Math.exp(-distSq / 0.045) * 0.48;
  const radius = Math.max(0.7, (0.95 + v * 1.45) * (0.8 + ridgeGlow * 0.35 + pointerGlow * 0.4));
  const alpha = clamp01((0.08 + v * 0.28) * (0.65 + ridgeGlow * 0.55) + pointerGlow * 0.45);

  return { x, y, radius, alpha };
}


```
