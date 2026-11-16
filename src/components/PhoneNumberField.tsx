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
  compact?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

export const PhoneNumberField: React.FC<PhoneNumberFieldProps> = ({
  id, label, value, country, onChange, onCountryChange, onBlur, error, placeholder = 'Phone number',
  className, disabled = false, compact = false, inputMode = 'tel',
}) => (
  <div className="min-w-0 max-w-full">
    <label htmlFor={id} className={`mb-1 block font-bold ${compact ? 'text-[11px] text-[#4A2B23]' : 'text-[11px] text-[#4A2B23]'}`}>
      {label}
    </label>
    <div className={`flex min-w-0 max-w-full overflow-hidden rounded-xl border focus-within:border-[#6B352A] ${compact ? 'h-9.5 bg-[#FFFCF4] focus-within:bg-white' : 'min-h-11 bg-[#FFFCF4] focus-within:bg-white'} ${error ? 'border-[#9E2A2B]' : 'border-[#E8D8C4]'} ${className || ''}`}>
      <select
        aria-label={`${label} country`}
        value={country}
        onChange={(event) => onCountryChange(event.target.value as CountryCode)}
        disabled={disabled}
        className={`max-w-[44%] shrink-0 border-r border-[#E8D8C4] bg-transparent px-2 font-semibold text-[#2B1611] outline-none ${compact ? 'text-[11.5px]' : 'text-base sm:max-w-[43%] sm:text-xs'}`}
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
        className={`min-w-0 flex-1 bg-transparent px-3 text-[#2B1611] outline-none placeholder:text-[#8A6C63] ${compact ? 'py-1.5 text-[12.5px] font-semibold' : 'py-2 text-base sm:text-sm'}`}
      />
    </div>
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-[10.5px] font-medium text-[#9E2A2B]">{error}</p>}
  </div>
);

