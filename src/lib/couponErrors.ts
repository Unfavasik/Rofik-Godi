export function normalizeCouponFailureMessage(message: string): string {
  if (/per[\s-]+customer\s+limit/i.test(message) || /already\s+used\s+(?:this\s+)?coupon/i.test(message)) {
    return "You've already used this coupon.";
  }
  return message;
}
