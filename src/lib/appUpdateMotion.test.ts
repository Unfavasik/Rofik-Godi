import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppUpdateSheetMotion, getSettingsUpdateCardMotion } from './appUpdateMotion';

test('getAppUpdateSheetMotion enables spring sheet entrance, ambient emblem motion, and staggered notes', () => {
  const motion = getAppUpdateSheetMotion(false);
  assert.equal(motion.enabled, true);
  assert.deepEqual(motion.sheetInitial, { opacity: 0, y: 44, scale: 0.96 });
  assert.deepEqual(motion.sheetAnimate, { opacity: 1, y: 0, scale: 1 });
  assert.ok(motion.emblemAnimate.y.length > 1);
  assert.ok(motion.haloAnimate.scale.length > 1);
  assert.ok(motion.arrowAnimate.y.length > 1);
  assert.deepEqual(motion.getNoteInitial(0), { opacity: 0, x: -8 });
  assert.ok(motion.getNoteDelay(2) > motion.getNoteDelay(0));
  assert.ok(motion.getNoteDelay(20) <= 0.32);
});

test('getAppUpdateSheetMotion disables continuous and entrance motion when reduced motion is requested', () => {
  const motion = getAppUpdateSheetMotion(true);
  assert.equal(motion.enabled, false);
  assert.equal(motion.backdropInitial, false);
  assert.equal(motion.sheetInitial, false);
  assert.deepEqual(motion.emblemAnimate, { y: [0], rotate: [0] });
  assert.deepEqual(motion.arrowAnimate, { y: [0] });
  assert.equal(motion.getNoteInitial(0), false);
  assert.equal(motion.getNoteDelay(3), 0);
});

test('getSettingsUpdateCardMotion configures entrance, pulse ring, floating emblem, and reduced motion fallback', () => {
  const normal = getSettingsUpdateCardMotion(false);
  assert.equal(normal.enabled, true);
  assert.deepEqual(normal.cardInitial, { opacity: 0, y: 14, scale: 0.985 });
  assert.deepEqual(normal.cardAnimate, { opacity: 1, y: 0, scale: 1 });
  assert.ok(normal.ringAnimate.scale.length > 1);
  assert.ok(normal.emblemAnimate.y.length > 1);
  assert.ok(normal.arrowAnimate.y.length > 1);
  assert.ok(normal.getNoteDelay(1) > normal.getNoteDelay(0));

  const reduced = getSettingsUpdateCardMotion(true);
  assert.equal(reduced.enabled, false);
  assert.equal(reduced.cardInitial, false);
  assert.deepEqual(reduced.emblemAnimate, { y: [0], rotate: [0] });
  assert.deepEqual(reduced.ringAnimate, { scale: [1], opacity: [0] });
  assert.equal(reduced.getNoteInitial(0), false);
  assert.equal(reduced.getNoteDelay(2), 0);
});
