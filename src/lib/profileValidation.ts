export interface ProfileFields {
  full_name: string;
  phone: string;
  vehicle_model: string;
}

export interface ProfileFieldErrors {
  full_name?: string;
  phone?: string;
  vehicle_model?: string;
}

export function validateProfileName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Name is required.';
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (name.length > 50) return 'Name must be 50 characters or fewer.';
  return null;
}

export function validateIndianMobile(value: string): string | null {
  const phone = value.trim();
  if (!phone) return null;
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a valid 10-digit Indian mobile number.';
  return null;
}

export function validateVehicleModel(value: string): string | null {
  if (value.trim().length > 60) return 'Vehicle model must be 60 characters or fewer.';
  return null;
}

export function validateProfileFields(fields: ProfileFields): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const nameError = validateProfileName(fields.full_name);
  const phoneError = validateIndianMobile(fields.phone);
  const vehicleError = validateVehicleModel(fields.vehicle_model);
  if (nameError) errors.full_name = nameError;
  if (phoneError) errors.phone = phoneError;
  if (vehicleError) errors.vehicle_model = vehicleError;
  return errors;
}

export function buildAvatarStoragePath(userId: string, timestamp = Date.now()): string {
  return `${userId}/avatar-${timestamp}.webp`;
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'R';
  if (words.length === 1) return words[0][0].toLocaleUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase();
}
