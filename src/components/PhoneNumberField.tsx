import React from 'react';
import { PHONE_COUNTRIES, type CountryCode } from '../utils/phoneValidation';

interface PhoneNumberFieldProps {
  id: string;
  label: string;
  value: string;
  country: CountryCode;
  onChange: (value: string) => void;
  onCountryChange: (country: CountryCode) => void;
  onBlur?: () => void;
  error?: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

export const PhoneNumberField: React.FC<PhoneNumberFieldProps> = ({
  id, label, value, country, onChange, onCountryChange, onBlur, error, placeholder = 'Phone number',
  className, disabled = false, inputMode = 'tel',
}) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-[11px] font-bold text-gray-700">
      {label}
    </label>
    <div className={`flex min-h-11 overflow-hidden rounded-xl border bg-gray-50 focus-within:border-[#D9232D] ${error ? 'border-red-400' : 'border-gray-200'} ${className || ''}`}>
      <select
        aria-label={`${label} country`}
        value={country}
        onChange={(event) => onCountryChange(event.target.value as CountryCode)}
        disabled={disabled}
        className="max-w-[48%] shrink-0 border-r border-gray-200 bg-transparent px-2 text-[11px] font-semibold text-gray-800 outline-none sm:max-w-[43%]"
      >
        {PHONE_COUNTRIES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name} (+{option.callingCode})
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode={inputMode}
        autoComplete="tel"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[12.5px] text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-[10px] font-medium text-red-600">{error}</p>}
  </div>
);
