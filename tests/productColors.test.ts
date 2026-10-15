import { describe, expect, it } from 'vitest';
import { isValidProductColorValue, toColorPickerValue } from '../src/lib/productColors';

describe('product color values', () => {
  it('accepts hex codes and common CSS color names for admin-defined swatches', () => {
    expect(isValidProductColorValue('#D9232D')).toBe(true);
    expect(isValidProductColorValue('#abc')).toBe(true);
    expect(isValidProductColorValue('navy')).toBe(true);
    expect(isValidProductColorValue(' Crimson ')).toBe(true);
  });

  it('rejects empty, invalid, and inherited CSS keywords', () => {
    expect(isValidProductColorValue('')).toBe(false);
    expect(isValidProductColorValue('not-a-color')).toBe(false);
    expect(isValidProductColorValue('inherit')).toBe(false);
  });

  it('normalizes short hex and safely falls back for named colors in native color inputs', () => {
    expect(toColorPickerValue('#abc')).toBe('#aabbcc');
    expect(toColorPickerValue('#D9232D')).toBe('#D9232D');
    expect(toColorPickerValue('navy')).toBe('#111827');
  });
});
