import { describe, expect, it, vi } from 'vitest';
import {
  classifyTouchDirection,
  computeDampedPullDistance,
  computePullProgress,
  dispatchPullToRefresh,
  isPullThresholdMet,
  PULL_MAX_DISTANCE,
  PULL_TRIGGER_THRESHOLD,
  subscribePullToRefresh,
} from '../src/lib/pullToRefresh';

describe('pullToRefresh helpers', () => {
  it('applies progressive rubber-band damping and bounds pull distance', () => {
    expect(computeDampedPullDistance(0)).toBe(0);
    expect(computeDampedPullDistance(-40)).toBe(0);

    const small = computeDampedPullDistance(40);
    const medium = computeDampedPullDistance(160);
    const huge = computeDampedPullDistance(1000);

    expect(small).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(small);
    expect(huge).toBeLessThan(PULL_MAX_DISTANCE);
    expect(huge).toBeGreaterThan(PULL_TRIGGER_THRESHOLD);
  });

  it('computes normalized progress and release threshold accurately', () => {
    expect(computePullProgress(0)).toBe(0);
    expect(computePullProgress(PULL_TRIGGER_THRESHOLD / 2)).toBeCloseTo(0.5, 4);
    expect(computePullProgress(PULL_TRIGGER_THRESHOLD * 2)).toBe(1);

    expect(isPullThresholdMet(PULL_TRIGGER_THRESHOLD - 1)).toBe(false);
    expect(isPullThresholdMet(PULL_TRIGGER_THRESHOLD)).toBe(true);
  });

  it('locks onto vertical pull only for downward gestures and ignores horizontal or upward swipes', () => {
    expect(classifyTouchDirection(2, 3)).toBe('pending');
    expect(classifyTouchDirection(0, -14)).toBe('scroll');
    expect(classifyTouchDirection(24, 10)).toBe('scroll');
    expect(classifyTouchDirection(-20, 12)).toBe('scroll');
    expect(classifyTouchDirection(4, 18)).toBe('pull');
  });

  it('dispatches pull-to-refresh events and awaits all subscribed async loaders', async () => {
    const listeners = new Set<EventListener>();
    const mockWindow = {
      addEventListener: (type: string, fn: EventListener) => {
        if (type) listeners.add(fn);
      },
      removeEventListener: (_type: string, fn: EventListener) => {
        listeners.delete(fn);
      },
      dispatchEvent: (event: Event) => {
        listeners.forEach((fn) => fn(event));
        return true;
      },
      setTimeout: globalThis.setTimeout.bind(globalThis),
    };
    vi.stubGlobal('window', mockWindow);
    try {
      let resolvedFirst = false;
      let resolvedSecond = false;
      const unsub1 = subscribePullToRefresh(async () => {
        await new Promise((r) => setTimeout(r, 15));
        resolvedFirst = true;
      });
      const unsub2 = subscribePullToRefresh(async () => {
        await new Promise((r) => setTimeout(r, 10));
        resolvedSecond = true;
        throw new Error('non-fatal loader failure');
      });

      await dispatchPullToRefresh(500);
      expect(resolvedFirst).toBe(true);
      expect(resolvedSecond).toBe(true);

      unsub1();
      unsub2();
      resolvedFirst = false;
      await dispatchPullToRefresh(500);
      expect(resolvedFirst).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
