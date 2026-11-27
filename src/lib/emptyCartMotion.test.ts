import test from 'node:test';
import assert from 'node:assert/strict';
import { getEmptyCartMotionConfig } from './emptyCartMotion';

test('getEmptyCartMotionConfig enables float, shadow, ring, and interactive CTA motion by default', () => {
  const config = getEmptyCartMotionConfig(false);

  assert.equal(config.enabled, true);
  assert.ok(config.cardInitial !== false);
  assert.ok(Array.isArray(config.floatAnimate.y));
  assert.ok(Array.isArray(config.shadowAnimate.scaleX));
  assert.ok(Array.isArray(config.ringAnimate.scale));
  assert.deepEqual(config.ctaHover, { scale: 1.03, y: -1 });
  assert.deepEqual(config.ctaTap, { scale: 0.97 });
});

test('getEmptyCartMotionConfig disables continuous and spring motion when prefers-reduced-motion is active', () => {
  const config = getEmptyCartMotionConfig(true);

  assert.equal(config.enabled, false);
  assert.equal(config.cardInitial, false);
  assert.equal(config.ctaInitial, false);
  assert.deepEqual(config.floatAnimate, { y: 0, rotate: 0 });
  assert.deepEqual(config.shadowAnimate, { scaleX: 1, opacity: 0.14 });
  assert.deepEqual(config.ringAnimate, { scale: 1, opacity: 0.7 });
  assert.equal(config.ctaHover, undefined);
  assert.equal(config.ctaTap, undefined);
});
