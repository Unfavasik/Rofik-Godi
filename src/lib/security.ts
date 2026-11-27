const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Safe identifier for PostgREST filters & mocked IDs: strictly allows only
// ASCII alphanumerics, hyphens, and underscores (forbids commas, dots, parens,
// quotes, whitespace, slashes, and operators).
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Accept ISO-8601 timestamps produced by PostgreSQL / PostgREST (with optional
// fractional seconds, `Z`, or numeric offset) while rejecting any PostgREST
// filter punctuation like commas, parens, quotes, or whitespace.
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})$/;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

export function isValidSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value.trim());
}

export function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!ISO_TIMESTAMP_PATTERN.test(trimmed)) return false;
  return Number.isFinite(Date.parse(trimmed));
}

export function validatePostgrestCursor<T extends Record<string, unknown>>(
  cursor: T | null | undefined,
  timestampKey: keyof T,
): { valid: true; timestamp: string; id: string } | { valid: false } {
  if (!cursor || typeof cursor !== 'object') return { valid: false };
  const rawTimestamp = cursor[timestampKey];
  const rawId = cursor['id'];
  if (!isValidIsoTimestamp(rawTimestamp) || !isValidSafeId(rawId)) {
    return { valid: false };
  }
  return {
    valid: true,
    timestamp: rawTimestamp.trim(),
    id: rawId.trim(),
  };
}

export interface SanitizeUrlOptions {
  allowRelative?: boolean;
  allowHttpLocalhost?: boolean;
  maxLength?: number;
}

export function sanitizeUrl(
  value: unknown,
  options: SanitizeUrlOptions = {},
): string | null {
  const {
    allowRelative = true,
    allowHttpLocalhost = false,
    maxLength = 2048,
  } = options;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;

  // Reject ASCII control characters and backslashes that browsers might normalize.
  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || code === 0x5c) return null;
  }

  if (trimmed.startsWith('/')) {
    if (!allowRelative) return null;
    // Block protocol-relative URLs like `//evil.example`.
    if (trimmed.startsWith('//')) return null;
    try {
      const parsed = new URL(trimmed, 'https://rofik-godi.invalid');
      if (parsed.origin !== 'https://rofik-godi.invalid') return null;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) return null;
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
    if (
      allowHttpLocalhost &&
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function stripDangerousObjectKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripDangerousObjectKeys(item)) as unknown as T;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const source = value as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    cleaned[key] = stripDangerousObjectKeys(source[key]);
  }
  return cleaned as T;
}

export function safeJsonParse<T = unknown>(
  raw: string | null | undefined,
  maxBytes = 512_000,
): T | null {
  if (typeof raw !== 'string' || !raw || raw.length > maxBytes) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return stripDangerousObjectKeys(parsed) as T;
  } catch {
    return null;
  }
}

export function escapeSqlLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function sanitizePlainText(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0x7f)) {
      out += value[i];
    }
  }
  return out.trim().slice(0, maxLength);
}

export function generateSecureToken(prefix = 'id', byteLength = 16): string {
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, '') || 'id';
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj) {
    throw new Error('Cryptographic RNG is unavailable in this environment.');
  }
  if (byteLength === 16 && typeof cryptoObj.randomUUID === 'function') {
    return `${safePrefix}-${cryptoObj.randomUUID()}`;
  }
  const length = Math.max(8, Math.min(64, Math.floor(byteLength)));
  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues(bytes);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return `${safePrefix}-${hex}`;
}
