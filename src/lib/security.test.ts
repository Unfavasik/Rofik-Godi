import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeSqlLikePattern,
  generateSecureToken,
  isValidIsoTimestamp,
  isValidSafeId,
  isValidUuid,
  safeJsonParse,
  sanitizePlainText,
  sanitizeUrl,
  stripDangerousObjectKeys,
  validatePostgrestCursor,
} from './security';

test('isValidUuid & isValidSafeId validate identifiers and reject PostgREST injection payloads', () => {
  assert.equal(isValidUuid('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isValidUuid('  550E8400-E29B-41D4-A716-446655440000  '), true);
  assert.equal(isValidUuid('550e8400-e29b-41d4-a716-446655440000,is_admin.eq.true'), false);
  assert.equal(isValidUuid("1' OR '1'='1"), false);
  assert.equal(isValidUuid('rg-prod-01'), false);
  assert.equal(isValidUuid(null), false);

  assert.equal(isValidSafeId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isValidSafeId('cursor-ticket_1'), true);
  assert.equal(isValidSafeId('cursor-ticket,id.eq.other'), false);
  assert.equal(isValidSafeId('ticket-1).eq.1'), false);
  assert.equal(isValidSafeId(''), false);
});

test('validatePostgrestCursor rejects PostgREST filter syntax injection in timestamp and id', () => {
  const valid = validatePostgrestCursor(
    {
      updated_at: '2026-11-26T10:15:30.123456+00:00',
      id: '550e8400-e29b-41d4-a716-446655440000',
    },
    'updated_at',
  );
  assert.deepEqual(valid, {
    valid: true,
    timestamp: '2026-11-26T10:15:30.123456+00:00',
    id: '550e8400-e29b-41d4-a716-446655440000',
  });

  const injectedTimestamp = validatePostgrestCursor(
    {
      updated_at: '2026-11-26T10:00:00Z),id.neq.00000000-0000-0000-0000-000000000000',
      id: '550e8400-e29b-41d4-a716-446655440000',
    },
    'updated_at',
  );
  assert.deepEqual(injectedTimestamp, { valid: false });

  const injectedId = validatePostgrestCursor(
    {
      updated_at: '2026-11-26T10:00:00Z',
      id: '550e8400-e29b-41d4-a716-446655440000),status.eq.open',
    },
    'updated_at',
  );
  assert.deepEqual(injectedId, { valid: false });
  assert.equal(isValidIsoTimestamp('not-a-timestamp'), false);
});

test('sanitizeUrl rejects javascript, data, credentialed, backslash, and protocol-relative URLs', () => {
  assert.equal(sanitizeUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeUrl('JaVaScRiPt:alert(document.cookie)'), null);
  assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeUrl('//evil.example/phish'), null);
  assert.equal(sanitizeUrl('/\\evil.example/phish'), null);
  assert.equal(sanitizeUrl('https://user:pass@example.com/secret'), null);
  assert.equal(sanitizeUrl('http://example.com/insecure'), null);
  assert.equal(sanitizeUrl('/shop/products/rg-prod-01?ref=alert'), '/shop/products/rg-prod-01?ref=alert');
  assert.equal(sanitizeUrl('/shop/products/rg-prod-01', { allowRelative: false }), null);
  assert.equal(sanitizeUrl('https://rofikgodicenter.pages.dev/shop'), 'https://rofikgodicenter.pages.dev/shop');
  assert.equal(sanitizeUrl('http://localhost:3000/auth', { allowHttpLocalhost: true }), 'http://localhost:3000/auth');
  assert.equal(sanitizeUrl('http://localhost:3000/auth', { allowHttpLocalhost: false }), null);
});

test('safeJsonParse & stripDangerousObjectKeys prevent prototype pollution and oversized payloads', () => {
  const payload = '{"__proto__":{"polluted":true},"constructor":{"prototype":{"pwned":true}},"nested":{"__proto__":{"x":1},"ok":42}}';
  const parsed = safeJsonParse<Record<string, unknown>>(payload);
  assert.ok(parsed);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(({} as Record<string, unknown>).pwned, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'constructor'), false);
  assert.deepEqual(parsed.nested, { ok: 42 });

  const stripped = stripDangerousObjectKeys({ a: 1, constructor: 'bad', prototype: 'bad' });
  assert.deepEqual(stripped, { a: 1 });
  assert.equal(safeJsonParse('{"a":1}', 4), null);
  assert.equal(safeJsonParse('{invalid'), null);
});

test('escapeSqlLikePattern and sanitizePlainText neutralize wildcards and control characters', () => {
  assert.equal(escapeSqlLikePattern('100%_off\\test'), '100\\%\\_off\\\\test');
  assert.equal(sanitizePlainText('Hello\u0000\u0007\nWorld\u007f', 20), 'Hello\nWorld');
  assert.equal(sanitizePlainText('abcdefghij', 5), 'abcde');
});

test('generateSecureToken produces prefixed CSPRNG tokens with sufficient entropy', () => {
  const token1 = generateSecureToken('note');
  const token2 = generateSecureToken('note');
  assert.match(token1, /^note-[0-9a-f-]{32,36}$/i);
  assert.notEqual(token1, token2);

  const hexToken = generateSecureToken('key_1', 24);
  assert.match(hexToken, /^key_1-[0-9a-f]{48}$/);
});
