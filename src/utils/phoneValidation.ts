import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';

export type { CountryCode };

export interface PhoneValidationResult {
  valid: boolean;
  formatted: string;
  e164: string | null;
  message: string | null;
}

export interface PhoneCountryOption {
  code: CountryCode;
  name: string;
  callingCode: string;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const PHONE_COUNTRIES: PhoneCountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: regionNames.of(code) || code,
    callingCode: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function validatePhoneNumber(
  input: string,
  selectedCountry: CountryCode = 'IN',
): PhoneValidationResult {
  const value = input.trim();
  if (!value) {
    return { valid: false, formatted: '', e164: null, message: 'Enter a phone number.' };
  }
  if (!isSupportedCountry(selectedCountry)) {
    return { valid: false, formatted: value, e164: null, message: 'Select a supported country.' };
  }

  try {
    const parsed = parsePhoneNumberFromString(value, selectedCountry);
    if (!parsed) {
      return { valid: false, formatted: value, e164: null, message: 'Enter a valid phone number.' };
    }
    if (!parsed.isValid()) {
      return {
        valid: false,
        formatted: value,
        e164: null,
        message: `Enter a valid phone number for ${regionNames.of(parsed.country || selectedCountry) || selectedCountry}.`,
      };
    }
    if (parsed.country === 'IN' && parsed.getType() !== 'MOBILE' && parsed.getType() !== 'FIXED_LINE_OR_MOBILE') {
      return {
        valid: false,
        formatted: value,
        e164: null,
        message: 'Enter an Indian mobile number, not a landline.',
      };
    }
    return {
      valid: true,
      formatted: parsed.formatInternational(),
      e164: parsed.number,
      message: null,
    };
  } catch {
    return { valid: false, formatted: value, e164: null, message: 'Enter a valid phone number.' };
  }
}

export function getPhoneCountry(
  input: string,
  fallback: CountryCode = 'IN',
): CountryCode {
  try {
    const parsed = parsePhoneNumberFromString(input.trim(), fallback);
    return parsed?.country && isSupportedCountry(parsed.country) ? parsed.country : fallback;
  } catch {
    return fallback;
  }
}
