export const PULL_TO_REFRESH_EVENT = 'rofik:pull-to-refresh';
export const PULL_TRIGGER_THRESHOLD = 72;
export const PULL_MAX_DISTANCE = 118;
export const PULL_DIRECTION_LOCK_PX = 8;

export type PullToRefreshPhase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'done';

/**
 * Progressive iOS-like rubber-band resistance curve.
 * Maps raw downward finger displacement into bounded indicator travel distance.
 */
export function computeDampedPullDistance(
  rawDeltaY: number,
  maxPull = PULL_MAX_DISTANCE,
): number {
  if (!Number.isFinite(rawDeltaY) || rawDeltaY <= 0) return 0;
  return maxPull * (1 - Math.exp(-rawDeltaY / (maxPull * 1.65)));
}

/**
 * Normalized 0..1 progress toward the refresh trigger threshold.
 */
export function computePullProgress(
  pullDistance: number,
  threshold = PULL_TRIGGER_THRESHOLD,
): number {
  if (!Number.isFinite(pullDistance) || pullDistance <= 0 || threshold <= 0) return 0;
  return Math.min(1, pullDistance / threshold);
}

/**
 * Whether the user has pulled past the release-to-refresh threshold.
 */
export function isPullThresholdMet(
  pullDistance: number,
  threshold = PULL_TRIGGER_THRESHOLD,
): boolean {
  return Number.isFinite(pullDistance) && pullDistance >= threshold;
}

/**
 * Classifies initial touch movement so horizontal swipes (carousels/tabs)
 * and upward scroll gestures are never hijacked by pull-to-refresh.
 */
export function classifyTouchDirection(
  dx: number,
  dy: number,
  lockPx = PULL_DIRECTION_LOCK_PX,
): 'pending' | 'pull' | 'scroll' {
  if (Math.abs(dx) < lockPx && Math.abs(dy) < lockPx) return 'pending';
  if (dy <= 0) return 'scroll';
  if (Math.abs(dx) > dy * 0.85) return 'scroll';
  return 'pull';
}

export interface PullRefreshEventDetail {
  waitUntil: (promise: Promise<unknown>) => void;
}

/**
 * Dispatches the global pull-to-refresh event and waits for all mounted views/modals
 * that register refresh promises via `waitUntil(...)` (bounded by `timeoutMs`).
 */
export async function dispatchPullToRefresh(timeoutMs = 4500): Promise<void> {
  if (typeof window === 'undefined') return;
  const pending: Array<Promise<unknown>> = [];
  const detail: PullRefreshEventDetail = {
    waitUntil: (promise) => {
      pending.push(Promise.resolve(promise).catch(() => undefined));
    },
  };
  window.dispatchEvent(new CustomEvent<PullRefreshEventDetail>(PULL_TO_REFRESH_EVENT, { detail }));
  if (pending.length === 0) return;

  await Promise.race([
    Promise.allSettled(pending),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/**
 * Subscribes a view/modal loader to global pull-to-refresh events and automatically
 * registers its returned Promise with the active pull-to-refresh cycle.
 */
export function subscribePullToRefresh(handler: () => Promise<unknown> | unknown): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<PullRefreshEventDetail | undefined>;
    const task = Promise.resolve().then(() => handler());
    if (customEvent.detail && typeof customEvent.detail.waitUntil === 'function') {
      customEvent.detail.waitUntil(task);
    } else {
      void task.catch(() => undefined);
    }
  };
  window.addEventListener(PULL_TO_REFRESH_EVENT, listener);
  return () => window.removeEventListener(PULL_TO_REFRESH_EVENT, listener);
}

const BLOCKED_TARGET_SELECTOR =
  'input, textarea, select, canvas, [contenteditable="true"], [role="slider"], [data-no-pull-refresh="true"]';

function getWindowScrollTop(): number {
  if (typeof window === 'undefined') return 0;
  const scrollingTop =
    typeof document !== 'undefined' ? (document.scrollingElement?.scrollTop ?? 0) : 0;
  return Math.max(window.scrollY || 0, scrollingTop || 0);
}

/**
 * Determines whether a pull-to-refresh gesture can start from the given touch target.
 * - Blocks interactive inputs, sliders, canvases, and opt-out regions.
 * - Blocks when any scrollable ancestor has scrollTop > 1.
 * - If inside a `position: fixed` full-screen overlay/modal whose own scroll containers are
 *   at the top, allows pull-to-refresh even if the background window behind the modal is scrolled.
 */
export function isPullAllowedForTarget(target: EventTarget | null): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof Element === 'undefined' || !(target instanceof Element)) {
    return getWindowScrollTop() <= 1;
  }
  if (target.closest(BLOCKED_TARGET_SELECTOR)) return false;

  let insideFixedOverlay = false;
  let current: Element | null = target;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollableY =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      current.scrollHeight > current.clientHeight + 2;
    if (isScrollableY && current.scrollTop > 1) {
      return false;
    }
    if (style.position === 'fixed') {
      const rect = current.getBoundingClientRect();
      const isFullViewportOverlay =
        current.getAttribute('role') === 'dialog' ||
        (rect.width >= window.innerWidth * 0.75 && rect.height >= window.innerHeight * 0.75);
      if (isFullViewportOverlay) {
        insideFixedOverlay = true;
        break;
      }
    }
    current = current.parentElement;
  }

  return insideFixedOverlay ? true : getWindowScrollTop() <= 1;
}
