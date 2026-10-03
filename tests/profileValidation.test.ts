import { describe, expect, it } from 'vitest';
import {
  buildAvatarStoragePath,
  getInitials,
  validateIndianMobile,
  validateProfileFields,
  validateProfileName,
  validateVehicleModel,
} from '../src/lib/profileValidation';

describe('profile validation', () => {
  it('trims and validates a required 2–50 character name', () => {
    expect(validateProfileName('  Rofik Godi  ')).toBeNull();
    expect(validateProfileName(' A ')).toContain('at least 2');
    expect(validateProfileName('  ')).toContain('required');
    expect(validateProfileName('x'.repeat(51))).toContain('50 characters');
  });

  it('allows an empty phone and validates 10-digit Indian mobiles', () => {
    expect(validateIndianMobile('')).toBeNull();
    expect(validateIndianMobile('9876543210')).toBeNull();
    expect(validateIndianMobile('5876543210')).toContain('10-digit Indian');
    expect(validateIndianMobile('+919876543210')).toContain('10-digit Indian');
  });

  it('allows an optional vehicle model up to 60 characters', () => {
    expect(validateVehicleModel('')).toBeNull();
    expect(validateVehicleModel('Hero Splendor')).toBeNull();
    expect(validateVehicleModel('x'.repeat(61))).toContain('60 characters');
  });

  it('returns inline field errors together', () => {
    expect(validateProfileFields({ full_name: '', phone: '123', vehicle_model: 'x'.repeat(61) })).toEqual({
      full_name: 'Name is required.',
      phone: 'Enter a valid 10-digit Indian mobile number.',
      vehicle_model: 'Vehicle model must be 60 characters or fewer.',
    });
  });
});

describe('avatar helpers', () => {
  it('builds the required per-user timestamped WebP path', () => {
    expect(buildAvatarStoragePath('user-123', 1700000000000)).toBe('user-123/avatar-1700000000000.webp');
  });

  it('returns name initials and a safe fallback', () => {
    expect(getInitials('  Rofik Godi Center ')).toBe('RC');
    expect(getInitials('roFik')).toBe('R');
    expect(getInitials('')).toBe('R');
  });
});
