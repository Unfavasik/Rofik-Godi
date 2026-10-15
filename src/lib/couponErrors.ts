export function normalizeCouponFailureMessage(message: string): string {
  if (/create_store_pickup_order_v2|schema cache|function .* does not exist/i.test(message)) {
    return 'The secure order service is updating. Please try again shortly.';
  }
  if (/per[\s-]+customer\s+limit/i.test(message) || /already\s+used\s+(?:this\s+)?coupon/i.test(message)) {
    return "You've already used this coupon.";
  }
  return message;
}
