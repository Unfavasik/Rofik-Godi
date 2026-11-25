export interface DockScrollState {
  isHidden: boolean;
  anchorY: number;
}

export interface DockScrollOptions {
  topRevealOffset?: number;
  hideThreshold?: number;
  hideDelta?: number;
  revealDelta?: number;
}

/**
 * Pure scroll-direction state machine for the floating bottom dock.
 * - Swiping up / scrolling down the page (scrollY increasing) slides the dock down and hides it.
 * - Swiping down / scrolling back up the page (scrollY decreasing) or returning near the top slides it back up.
 * - Ignores small micro-jitter and iOS negative rubber-band overscroll.
 */
export function computeNextDockScrollState(
  prev: DockScrollState,
  rawScrollY: number,
  options: DockScrollOptions = {},
): DockScrollState {
  const {
    topRevealOffset = 24,
    hideThreshold = 56,
    hideDelta = 10,
    revealDelta = 6,
  } = options;

  const y = Number.isFinite(rawScrollY) ? Math.max(0, rawScrollY) : 0;

  if (y <= topRevealOffset) {
    return { isHidden: false, anchorY: y };
  }

  const delta = y - prev.anchorY;

  if (delta > 0) {
    if (prev.isHidden) {
      return { isHidden: true, anchorY: y };
    }
    if (y >= hideThreshold && delta >= hideDelta) {
      return { isHidden: true, anchorY: y };
    }
    return prev;
  }

  if (delta < 0) {
    if (!prev.isHidden) {
      return { isHidden: false, anchorY: y };
    }
    if (delta <= -revealDelta) {
      return { isHidden: false, anchorY: y };
    }
    return prev;
  }

  return prev;
}
