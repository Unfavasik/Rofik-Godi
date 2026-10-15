import { describe, expect, it } from 'vitest';
import { getPhoneCountry, validatePhoneNumber } from '../src/utils/phoneValidation';

describe('validatePhoneNumber', () => {
  it('validates and normalizes Indian mobile numbers', () => {
    expect(validatePhoneNumber('9876543210', 'IN')).toMatchObject({
      valid: true,
      e164: '+919876543210',
      formatted: '+91 98765 43210',
      message: null,
    });
    expect(validatePhoneNumber('+91 98765-43210', 'IN').e164).toBe('+919876543210');
    expect(validatePhoneNumber('(98765) 43210', 'IN').e164).toBe('+919876543210');
  });

  it('rejects empty, incomplete, malformed, and invalid Indian numbers', () => {
    expect(validatePhoneNumber('', 'IN')).toMatchObject({ valid: false, e164: null, message: 'Enter a phone number.' });
    expect(validatePhoneNumber('98765', 'IN').valid).toBe(false);
    expect(validatePhoneNumber('5876543210', 'IN').valid).toBe(false);
    expect(validatePhoneNumber('not a number', 'IN').valid).toBe(false);
  });

  it('validates international numbers using the selected country', () => {
    expect(validatePhoneNumber('202-555-0125', 'US')).toMatchObject({ valid: true, e164: '+12025550125' });
    expect(validatePhoneNumber('+44 20 7031 3000', 'US')).toMatchObject({ valid: true, e164: '+442070313000' });
    expect(validatePhoneNumber('020 7031 3000', 'GB')).toMatchObject({ valid: true, e164: '+442070313000' });
  });

  it('uses an international calling code in preference to the selected country', () => {
    expect(validatePhoneNumber('+91 98765 43210', 'US').e164).toBe('+919876543210');
  });

  it('handles unsupported country codes safely', () => {
    expect(validatePhoneNumber('1234567890', 'ZZ' as never)).toMatchObject({ valid: false, e164: null, message: 'Select a supported country.' });
  });

  it('detects the country of a stored international number', () => {
    expect(getPhoneCountry('+442070313000')).toBe('GB');
    expect(getPhoneCountry('9876543210')).toBe('IN');
  });
});
