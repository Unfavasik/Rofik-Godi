import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearWishlistHeartbeatEntry,
  getWishlistHeartbeatEntry,
  IDLE_WISHLIST_HEARTBEAT,
  resolveProductCardHeartbeatState,
  triggerWishlistHeartbeatEntry,
  type WishlistHeartbeatMap,
} from './wishlistHeartbeat';

test('triggerWishlistHeartbeatEntry activates heartbeat with monotonic pulse for added product', () => {
  const initial: WishlistHeartbeatMap = {};
  const next = triggerWishlistHeartbeatEntry(initial, 'prod-1', 1);

  assert.deepEqual(next['prod-1'], { pulse: 1, active: true });
  assert.deepEqual(getWishlistHeartbeatEntry(next, 'prod-2'), IDLE_WISHLIST_HEARTBEAT);
});

test('clearWishlistHeartbeatEntry clears active flag while keeping pulse key and guards stale timers', () => {
  const triggered = triggerWishlistHeartbeatEntry({}, 'prod-1', 2);

  // Stale timer with pulse 1 must not clear pulse 2
  const afterStale = clearWishlistHeartbeatEntry(triggered, 'prod-1', 1);
  assert.equal(afterStale['prod-1']?.active, true);
  assert.equal(afterStale['prod-1']?.pulse, 2);

  // Matching timer clears active flag while preserving pulse 2 to avoid remounting
  const afterCurrent = clearWishlistHeartbeatEntry(triggered, 'prod-1', 2);
  assert.deepEqual(afterCurrent['prod-1'], { pulse: 2, active: false });
});

test('resolveProductCardHeartbeatState animates controlled cards only when added and active', () => {
  // Pre-loaded wishlisted card (not triggered via handleToggleWishlist) does not animate on mount
  assert.deepEqual(
    resolveProductCardHeartbeatState({
      isWishlisted: true,
      localPulseKey: 0,
      controlledHeartbeat: IDLE_WISHLIST_HEARTBEAT,
    }),
    { heartKey: 0, shouldAnimate: false },
  );

  // Card triggered by handleToggleWishlist animates while active and wishlisted
  assert.deepEqual(
    resolveProductCardHeartbeatState({
      isWishlisted: true,
      localPulseKey: 0,
      controlledHeartbeat: { pulse: 3, active: true },
    }),
    { heartKey: 3, shouldAnimate: true },
  );

  // Once removed from wishlist, animation stays disabled even if pulse was set
  assert.deepEqual(
    resolveProductCardHeartbeatState({
      isWishlisted: false,
      localPulseKey: 0,
      controlledHeartbeat: { pulse: 3, active: true },
    }),
    { heartKey: 3, shouldAnimate: false },
  );

  // Uncontrolled ProductCard preserves standalone SSR/component test behavior
  assert.deepEqual(
    resolveProductCardHeartbeatState({
      isWishlisted: true,
      localPulseKey: 4,
    }),
    { heartKey: 4, shouldAnimate: true },
  );
});
