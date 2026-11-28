import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CART_ARC_EASING,
  computeParabolicArcTrajectory,
  evaluateCubicBezierEasing,
  getSquashStretchMotionProps,
  getSupportSendAnticipationTargets,
  selectBestCartTargetPoint,
} from './motionChoreography';

test('computeParabolicArcTrajectory produces a cubic Bezier arc with lateral swing, apex hang-time, and SVG ribbon path', () => {
  const start = { x: 120, y: 620 };
  const end = { x: 340, y: 44 };
  const arc = computeParabolicArcTrajectory(start, end, { steps: 24 });

  assert.equal(arc.x.length, 25);
  assert.equal(arc.y.length, 25);
  assert.equal(arc.x[0], start.x);
  assert.equal(arc.y[0], start.y);
  assert.equal(arc.x[arc.x.length - 1], end.x);
  assert.equal(arc.y[arc.y.length - 1], end.y);

  // Midpoint y must sit noticeably above (smaller y value than) the straight-line midpoint
  const linearMidY = (start.y + end.y) / 2;
  const actualMidY = arc.y[12];
  assert.ok(actualMidY < linearMidY - 40, `Expected curved midpoint ${actualMidY} < ${linearMidY - 40}`);

  // Upper control point sits above the higher of start/end and SVG cubic path is valid
  assert.ok(arc.controlPoint.y < Math.min(start.y, end.y));
  assert.ok(arc.svgPath.startsWith('M ') && arc.svgPath.includes(' C '));

  // Aerodynamic stretch near midpoint and compact tuck into cart at end
  assert.ok(arc.scaleY[12] > arc.scaleX[12]);
  assert.ok(arc.scaleX[arc.scaleX.length - 1] < 0.6);

  // Even a nearly vertical right-column throw must bow laterally into a clear arc
  const verticalArc = computeParabolicArcTrajectory({ x: 300, y: 580 }, { x: 350, y: 40 }, { steps: 24 });
  const linearMidX = (300 + 350) / 2;
  assert.ok(Math.abs(verticalArc.x[12] - linearMidX) > 30, 'Expected clear lateral swing on vertical throw');
  assert.ok(verticalArc.durationSec >= 0.58 && verticalArc.durationSec <= 0.76);
  assert.deepEqual(verticalArc.easing, CART_ARC_EASING);
});

test('evaluateCubicBezierEasing matches standard [0.4, 0, 0.2, 1] fluid curve properties', () => {
  assert.equal(evaluateCubicBezierEasing(0), 0);
  assert.equal(evaluateCubicBezierEasing(1), 1);

  const q1 = evaluateCubicBezierEasing(0.25, CART_ARC_EASING);
  const mid = evaluateCubicBezierEasing(0.5, CART_ARC_EASING);
  const q3 = evaluateCubicBezierEasing(0.75, CART_ARC_EASING);

  // Material standard [0.4, 0, 0.2, 1]: gentle launch, brisk cruise (~0.776 at t=0.5), silky settle
  assert.ok(q1 > 0.12 && q1 < 0.25, `Expected ease-in at t=0.25, got ${q1}`);
  assert.ok(mid > 0.74 && mid < 0.81, `Expected fluid cruise (~0.776) at t=0.5, got ${mid}`);
  assert.ok(q3 > 0.92 && q3 < 0.99, `Expected smooth deceleration at t=0.75, got ${q3}`);

  // Strictly monotonic across sampled steps
  let prev = -1;
  for (let i = 0; i <= 20; i += 1) {
    const val = evaluateCubicBezierEasing(i / 20, CART_ARC_EASING);
    assert.ok(val >= prev, `Expected monotonic value at step ${i}: ${val} >= ${prev}`);
    prev = val;
  }
});

test('getSquashStretchMotionProps provides volume-preserving squash on tap and respects reduced motion', () => {
  const normal = getSquashStretchMotionProps(false);
  assert.ok(normal.whileTap && normal.whileTap.scaleX > 1 && normal.whileTap.scaleY < 1);
  assert.ok(normal.whileHover && normal.whileHover.scaleX > 1);

  const reduced = getSquashStretchMotionProps(true);
  assert.equal(reduced.whileHover, undefined);
  assert.equal(reduced.whileTap, undefined);

  const disabled = getSquashStretchMotionProps(false, { disabled: true });
  assert.equal(disabled.whileTap, undefined);
});

test('getSupportSendAnticipationTargets pulls back in windup before launching forward', () => {
  const windup = getSupportSendAnticipationTargets('windup', false);
  assert.ok(windup.button.scaleX < 1);
  assert.ok(windup.button.x < 0);
  assert.ok(windup.icon.x < 0);
  assert.ok(windup.icon.y > 0);
  assert.ok(windup.icon.rotate < 0);

  const launch = getSupportSendAnticipationTargets('launch', false);
  assert.ok(launch.button.scaleX > 1);
  assert.ok(launch.icon.x > 0);
  assert.ok(launch.icon.y < 0);
  assert.equal(launch.icon.opacity, 0);

  const reduced = getSupportSendAnticipationTargets('windup', true);
  assert.equal(reduced.icon.x, 0);
  assert.equal(reduced.button.scaleX, 1);
});

test('selectBestCartTargetPoint picks the top-most visible cart button within viewport bounds', () => {
  const point = selectBestCartTargetPoint(
    [
      { rect: { left: 320, top: 16, width: 40, height: 40 } },
      { rect: { left: 9999, top: 20, width: 40, height: 40 } }, // off-screen
      { rect: { left: 336, top: 12, width: 40, height: 40 } }, // topmost visible modal cart
    ],
    { width: 390, height: 844 },
  );

  assert.deepEqual(point, { x: 356, y: 32 });

  // When header cart is scrolled above the top edge, align smoothly to the top edge
  const scrolledFallback = selectBestCartTargetPoint(
    [{ rect: { left: 332, top: -180, width: 40, height: 40 } }],
    { width: 390, height: 844 },
  );
  assert.deepEqual(scrolledFallback, { x: 352, y: 26 });
});
