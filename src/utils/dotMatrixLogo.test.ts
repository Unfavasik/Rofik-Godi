import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDotLuminance,
  computeMicroGlitchOffset,
  computeWaveDotPoint,
  sampleHalftoneGrid,
} from './dotMatrixLogo';

test('sampleHalftoneGrid returns empty array for invalid dimensions or transparent buffer', () => {
  const empty = new Uint8ClampedArray(16 * 16 * 4);
  assert.deepEqual(sampleHalftoneGrid(empty, 0, 16, 4), []);
  assert.deepEqual(sampleHalftoneGrid(empty, 16, 0, 4), []);
  assert.deepEqual(sampleHalftoneGrid(empty, 16, 16, 0), []);
  assert.deepEqual(sampleHalftoneGrid(empty, 16, 16, 4), []);
});

test('sampleHalftoneGrid samples opaque pixels with normalized coordinates in [0, 1]', () => {
  const width = 40;
  const height = 20;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 4; y < 16; y += 1) {
    for (let x = 8; x < 32; x += 1) {
      const idx = (y * width + x) * 4;
      rgba[idx] = 255;
      rgba[idx + 1] = 255;
      rgba[idx + 2] = 255;
      rgba[idx + 3] = 255;
    }
  }

  const dots = sampleHalftoneGrid(rgba, width, height, 6, 44);
  assert.ok(dots.length > 0, 'Expected at least one sampled halftone dot');
  for (const dot of dots) {
    assert.ok(dot.nx >= 0 && dot.nx <= 1, 'nx must stay in [0, 1]');
    assert.ok(dot.ny >= 0 && dot.ny <= 1, 'ny must stay in [0, 1]');
    assert.ok(dot.coverage >= 0 && dot.coverage <= 1, 'coverage must stay in [0, 1]');
  }
});

test('computeDotLuminance stays within monochrome silver-to-white range on dark tone and dark ink range on light tone', () => {
  const base = computeDotLuminance(0.5, 0.5, 0.0, 0);
  const hovered = computeDotLuminance(0.5, 0.5, 0.0, 1);

  assert.ok(base.r >= 161 && base.r <= 255);
  assert.ok(base.g >= 161 && base.g <= 255);
  assert.ok(base.b >= 170 && base.b <= 255);
  assert.ok(hovered.intensity >= base.intensity);
  assert.ok(hovered.r >= base.r);

  const lightBase = computeDotLuminance(0.5, 0.5, 0.0, 0, 'light');
  assert.ok(lightBase.r >= 17 && lightBase.r <= 96);
  assert.ok(lightBase.g >= 19 && lightBase.g <= 104);
  assert.ok(lightBase.b >= 24 && lightBase.b <= 118);
});

test('computeMicroGlitchOffset is zero outside glitch window and non-zero inside active bands', () => {
  assert.deepEqual(computeMicroGlitchOffset(0.3, 1.0), { dx: 0, flicker: 0 });
  const active = computeMicroGlitchOffset(0.3, 4.86);
  assert.ok(active.dx !== 0);
  assert.ok(active.flicker > 0);
});

test('computeWaveDotPoint returns finite coordinates, positive radius, and clamped alpha', () => {
  const point = computeWaveDotPoint({
    gx: 5,
    gz: 4,
    cols: 10,
    rows: 10,
    width: 400,
    height: 200,
    timeSec: 1.5,
    mouseNx: 0.5,
    mouseNy: 0.5,
    mouseActive: 1,
  });
  assert.ok(Number.isFinite(point.x));
  assert.ok(Number.isFinite(point.y));
  assert.ok(point.radius >= 0.7);
  assert.ok(point.alpha >= 0 && point.alpha <= 1);
});
