export function getCustomerOrderDeepLinkLookupKey(userId: string | null | undefined, orderSlug: string | null | undefined): string | null {
  const normalizedUserId = userId?.trim();
  const normalizedOrderSlug = orderSlug?.trim().toLowerCase();
  if (!normalizedUserId || !normalizedOrderSlug) return null;
  return `${normalizedUserId}:${normalizedOrderSlug}`;
}
