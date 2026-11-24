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

export type DotMatrixSurfaceTone = 'dark' | 'light';

/**
 * Computes monochrome metallic RGB values for a single micro-LED dot, combining
 * diagonal metallic sheen, animated diagonal light-shimmer sweep, and interactive
 * hover boost. Defaults to brushed silver (#A1A1AA) to luminous white (#FFFFFF)
 * on dark surfaces, or deep obsidian (#111318) to brushed graphite (#606876) on
 * light transparent surfaces.
 */
export function computeDotLuminance(
  nx: number,
  ny: number,
  sweepPhase: number,
  hoverAmount = 0,
  tone: DotMatrixSurfaceTone = 'dark',
): DotLuminance {
  const x = clamp01(nx);
  const y = clamp01(ny);
  const hover = clamp01(hoverAmount);

  // Diagonal metallic specular base sheen (creates dimensional letter depth)
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

  // Combine base metallic sheen, shimmer sweep, and gentle hover boost
  const intensity = clamp01(baseFactor + sweepBoost * 0.58 + hover * 0.24);

  if (tone === 'light') {
    // High-contrast monochrome dark ink ramp from #111318 (17, 19, 24) to #606876 (96, 104, 118)
    const r = Math.round(17 + (96 - 17) * intensity);
    const g = Math.round(19 + (104 - 19) * intensity);
    const b = Math.round(24 + (118 - 24) * intensity);

    return {
      r,
      g,
      b,
      intensity,
      sweepBoost,
    };
  }

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
