export interface WishlistHeartbeatEntry {
  pulse: number;
  active: boolean;
}

export type WishlistHeartbeatMap = Record<string, WishlistHeartbeatEntry>;

export const WISHLIST_HEARTBEAT_DURATION_MS = 600;

export const IDLE_WISHLIST_HEARTBEAT: WishlistHeartbeatEntry = {
  pulse: 0,
  active: false,
};

export function triggerWishlistHeartbeatEntry(
  current: WishlistHeartbeatMap,
  productId: string,
  nextPulse: number,
): WishlistHeartbeatMap {
  if (!productId) return current;
  return {
    ...current,
    [productId]: {
      pulse: nextPulse,
      active: true,
    },
  };
}

export function clearWishlistHeartbeatEntry(
  current: WishlistHeartbeatMap,
  productId: string,
  expectedPulse?: number,
): WishlistHeartbeatMap {
  const existing = current[productId];
  if (!existing || !existing.active) return current;
  if (expectedPulse !== undefined && existing.pulse !== expectedPulse) {
    return current;
  }
  return {
    ...current,
    [productId]: {
      ...existing,
      active: false,
    },
  };
}

export function getWishlistHeartbeatEntry(
  map: WishlistHeartbeatMap,
  productId: string,
): WishlistHeartbeatEntry {
  return map[productId] ?? IDLE_WISHLIST_HEARTBEAT;
}

export function resolveProductCardHeartbeatState(params: {
  isWishlisted: boolean;
  localPulseKey: number;
  controlledHeartbeat?: WishlistHeartbeatEntry;
}): { heartKey: number; shouldAnimate: boolean } {
  const { isWishlisted, localPulseKey, controlledHeartbeat } = params;
  if (controlledHeartbeat !== undefined) {
    return {
      heartKey: controlledHeartbeat.pulse,
      shouldAnimate: isWishlisted && controlledHeartbeat.active,
    };
  }
  return {
    heartKey: localPulseKey,
    shouldAnimate: isWishlisted,
  };
}
