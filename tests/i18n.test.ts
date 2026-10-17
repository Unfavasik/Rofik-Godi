import { describe, expect, it } from 'vitest';
import { formatInr, translate } from '../src/lib/i18n';

describe('lightweight customer i18n', () => {
  it('translates supported customer text into natural Bangla', () => {
    expect(translate('bn', 'nav.home')).toBe('হোম');
    expect(translate('bn', 'product.onlyLeft', { count: 3 })).toBe('মাত্র 3টি বাকি');
  });

  it('uses English as the Hindi and unknown-language fallback', () => {
    expect(translate('hi', 'nav.home')).toBe('Home');
    expect(translate('en', 'status.ready')).toBe('Ready for pickup');
    expect(translate('hi', 'notification.step', { current: 2, total: 4 })).toBe('Step 2 of 4');
  });

  it('translates order milestones and notification controls without exposing dictionary keys', () => {
    expect(translate('bn', 'status.ready')).toBe('সংগ্রহের জন্য প্রস্তুত');
    expect(translate('bn', 'notification.step', { current: 2, total: 4 })).toBe('4টির মধ্যে ধাপ 2');
    expect(translate('bn', 'pwa.iosHint')).toContain('Share');
  });

  it('shows cancelled unpaid orders as not payable in both supported languages', () => {
    expect(translate('en', 'orders.cancelledUnpaid')).toBe('Not paid — order cancelled');
    expect(translate('bn', 'orders.cancelledUnpaid')).toBe('অর্ডার বাতিল — পেমেন্ট করা হয়নি');
    expect(translate('bn', 'orders.paymentMethodCancelled')).toBe('অর্ডার বাতিল — প্রযোজ্য নয়');
    expect(translate('bn', 'orders.cancelledOrderTotal')).toBe('বাতিল অর্ডারের মোট');
  });

  it('formats rupees with Indian digit grouping in every language', () => {
    expect(formatInr(123456)).toBe('₹1,23,456');
    expect(formatInr(1234.5)).toBe('₹1,234.5');
    expect(formatInr(Number.NaN)).toBe('₹0');
  });
});
