import { describe, expect, it } from 'vitest';
import { computeNextDockScrollState } from '../src/lib/dockScrollVisibility';

describe('computeNextDockScrollState', () => {
  it('stays visible near the top of the page and clamps negative overscroll', () => {
    const start = { isHidden: true, anchorY: 120 };
    expect(computeNextDockScrollState(start, 10)).toEqual({ isHidden: false, anchorY: 10 });
    expect(computeNextDockScrollState(start, -30)).toEqual({ isHidden: false, anchorY: 0 });
  });

  it('hides smoothly when user scrolls down past threshold', () => {
    let state = { isHidden: false, anchorY: 0 };
    state = computeNextDockScrollState(state, 40);
    expect(state.isHidden).toBe(false);

    state = computeNextDockScrollState(state, 80);
    expect(state).toEqual({ isHidden: true, anchorY: 80 });
  });

  it('reveals immediately when user reverses scroll direction upward past revealDelta', () => {
    let state = { isHidden: true, anchorY: 220 };
    // Continuing down tracks deepest point
    state = computeNextDockScrollState(state, 300);
    expect(state).toEqual({ isHidden: true, anchorY: 300 });

    // Tiny jitter up does not prematurely trigger
    state = computeNextDockScrollState(state, 297);
    expect(state).toEqual({ isHidden: true, anchorY: 300 });

    // Intentional scroll back up reveals dock
    state = computeNextDockScrollState(state, 290);
    expect(state).toEqual({ isHidden: false, anchorY: 290 });
  });

  it('ignores tiny downward jitter before hideDelta is reached', () => {
    const start = { isHidden: false, anchorY: 100 };
    const next = computeNextDockScrollState(start, 105);
    expect(next).toEqual(start);
  });
});
