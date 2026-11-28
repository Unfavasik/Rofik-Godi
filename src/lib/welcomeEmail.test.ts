import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedWelcomeEmailOrigin,
  isWelcomeEmailEligibleUser,
  requestWelcomeEmailIfEligible,
} from './welcomeEmail';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

test('isWelcomeEmailEligibleUser accepts only confirmed accounts created within 30 days', () => {
  const now = Date.parse('2026-11-28T10:00:00Z');
  const recentConfirmed = {
    id: 'user-1',
    email: 'rider@example.com',
    created_at: '2026-11-20T10:00:00Z',
    email_confirmed_at: '2026-11-20T10:05:00Z',
  };
  assert.equal(isWelcomeEmailEligibleUser(recentConfirmed, now), true);

  // Unconfirmed account is skipped
  assert.equal(
    isWelcomeEmailEligibleUser(
      { id: 'user-2', email: 'rider@example.com', created_at: '2026-11-27T10:00:00Z' },
      now,
    ),
    false,
  );

  // Account older than 30 days is skipped
  assert.equal(
    isWelcomeEmailEligibleUser(
      {
        id: 'user-3',
        email: 'rider@example.com',
        created_at: '2026-09-01T10:00:00Z',
        email_confirmed_at: '2026-09-01T10:05:00Z',
      },
      now,
    ),
    false,
  );
});

test('isAllowedWelcomeEmailOrigin allows production, localhost, Capacitor, and Pages previews while skipping third-party sandboxes', () => {
  assert.equal(isAllowedWelcomeEmailOrigin('https://rofikgodicenter.pages.dev'), true);
  assert.equal(isAllowedWelcomeEmailOrigin('https://abc123.rofikgodicenter.pages.dev'), true);
  assert.equal(isAllowedWelcomeEmailOrigin('http://localhost:3000'), true);
  assert.equal(isAllowedWelcomeEmailOrigin('capacitor://localhost'), true);
  assert.equal(
    isAllowedWelcomeEmailOrigin('https://ais-dev-dp3obvac7yxjvolbbpj33l-33474082471.asia-southeast1.run.app'),
    false,
  );
});

test('requestWelcomeEmailIfEligible sends explicit Bearer token once and deduplicates across retries and sessions', async () => {
  const now = Date.parse('2026-11-28T10:00:00Z');
  const localStore = createMemoryStorage();
  const sessionStore = createMemoryStorage();
  const calls: Array<{ name: string; options: unknown }> = [];

  const mockClient = {
    functions: {
      invoke: async (name: string, options?: unknown) => {
        calls.push({ name, options });
        return { data: { ok: true, emailSent: true }, error: null };
      },
    },
  } as unknown as Parameters<typeof requestWelcomeEmailIfEligible>[0];

  const session = {
    access_token: 'jwt-token-123',
    user: {
      id: 'user-1',
      email: 'rider@example.com',
      created_at: '2026-11-27T10:00:00Z',
      email_confirmed_at: '2026-11-27T10:01:00Z',
    },
  };

  // Skipped on preview sandbox origin without calling invoke
  const previewResult = await requestWelcomeEmailIfEligible(mockClient, session, {
    origin: 'https://ais-dev-example.run.app',
    nowMs: now,
    localStorage: localStore,
    sessionStorage: sessionStore,
  });
  assert.equal(previewResult, 'skipped');
  assert.equal(calls.length, 0);

  // Sent on production origin with explicit Bearer token
  const prodResult = await requestWelcomeEmailIfEligible(mockClient, session, {
    origin: 'https://rofikgodicenter.pages.dev',
    nowMs: now,
    localStorage: localStore,
    sessionStorage: sessionStore,
  });
  assert.equal(prodResult, 'sent');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    name: 'send-order-confirmation',
    options: {
      body: { type: 'welcome' },
      headers: { Authorization: 'Bearer jwt-token-123' },
    },
  });

  // Subsequent session with cleared sessionStorage still skips via localStorage
  const secondSessionResult = await requestWelcomeEmailIfEligible(mockClient, session, {
    origin: 'https://rofikgodicenter.pages.dev',
    nowMs: now,
    localStorage: localStore,
    sessionStorage: createMemoryStorage(),
  });
  assert.equal(secondSessionResult, 'skipped');
  assert.equal(calls.length, 1);
});

test('requestWelcomeEmailIfEligible stops retrying within the same session if Edge Function fails', async () => {
  const now = Date.parse('2026-11-28T10:00:00Z');
  const localStore = createMemoryStorage();
  const sessionStore = createMemoryStorage();
  let callCount = 0;

  const failingClient = {
    functions: {
      invoke: async () => {
        callCount += 1;
        return { data: null, error: new Error('Service temporarily unavailable') };
      },
    },
  } as unknown as Parameters<typeof requestWelcomeEmailIfEligible>[0];

  const session = {
    access_token: 'jwt-token-456',
    user: {
      id: 'user-2',
      email: 'rider2@example.com',
      created_at: '2026-11-27T10:00:00Z',
      email_confirmed_at: '2026-11-27T10:01:00Z',
    },
  };

  const first = await requestWelcomeEmailIfEligible(failingClient, session, {
    origin: 'https://rofikgodicenter.pages.dev',
    nowMs: now,
    localStorage: localStore,
    sessionStorage: sessionStore,
  });
  assert.equal(first, 'failed');
  assert.equal(callCount, 1);

  // Second attempt in the same session does not spam another request
  const second = await requestWelcomeEmailIfEligible(failingClient, session, {
    origin: 'https://rofikgodicenter.pages.dev',
    nowMs: now,
    localStorage: localStore,
    sessionStorage: sessionStore,
  });
  assert.equal(second, 'skipped');
  assert.equal(callCount, 1);
});
