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

  it('allows an empty phone and validates Indian mobiles in national or E.164 format', () => {
    expect(validateIndianMobile('')).toBeNull();
    expect(validateIndianMobile('9876543210')).toBeNull();
    expect(validateIndianMobile('5876543210')).toContain('Indian mobile');
    expect(validateIndianMobile('+91 98765 43210')).toBeNull();
  });

  it('allows an optional vehicle model up to 60 characters', () => {
    expect(validateVehicleModel('')).toBeNull();
    expect(validateVehicleModel('Hero Splendor')).toBeNull();
    expect(validateVehicleModel('x'.repeat(61))).toContain('60 characters');
  });

  it('returns inline field errors together', () => {
    expect(validateProfileFields({ full_name: '', phone: '123', vehicle_model: 'x'.repeat(61) })).toEqual({
      full_name: 'Name is required.',
      phone: 'Enter a valid phone number for India.',
      vehicle_model: 'Vehicle model must be 60 characters or fewer.',
    });
  });

  it('validates profile numbers using the selected country', () => {
    expect(validateProfileFields({ full_name: 'Rider', phone: '202-555-0125', phoneCountry: 'US', vehicle_model: '' })).toEqual({});
    expect(validateProfileFields({ full_name: 'Rider', phone: '5876543210', phoneCountry: 'IN', vehicle_model: '' }).phone)
      .toBe('Enter an Indian mobile number, not a landline.');
  });
});

describe('avatar helpers', () => {
  it('builds the required per-user timestamped WebP path', () => {
    expect(buildAvatarStoragePath('user-123', 1700000000000)).toBe('user-123/avatar-1700000000000.webp');
  });

  it('matches the avatar URL constraint path shape for UUID users', () => {
    const path = buildAvatarStoragePath('550e8400-e29b-41d4-a716-446655440000', 1700000000000);
    expect(path).toMatch(/^[0-9a-f-]{36}\/avatar-\d+\.webp$/);
  });

  it('returns name initials and a safe fallback', () => {
    expect(getInitials('  Rofik Godi Center ')).toBe('RC');
    expect(getInitials('roFik')).toBe('R');
    expect(getInitials('')).toBe('R');
  });
});
