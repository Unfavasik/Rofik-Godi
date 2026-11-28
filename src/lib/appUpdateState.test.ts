import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_UPDATE_SNOOZE_KEY,
  APP_UPDATE_SNOOZE_MS,
  buildApkFileName,
  parseRgUpdaterProgress,
  readAppUpdateSnooze,
  resolveAppUpdateUiState,
  writeAppUpdateSnooze,
} from './appUpdateState';
import type { AppRelease } from './supabaseAppRelease';

const makeRelease = (overrides: Partial<AppRelease> = {}): AppRelease => ({
  versionCode: 61,
  versionName: '1.1.59',
  minVersionCode: 0,
  apkUrl: 'https://example.supabase.co/storage/v1/object/public/app-releases/Rofik_Godi_Center_1.1.59.apk',
  title: 'New update available',
  notes: ['Faster loading', 'Bug fixes'],
  ...overrides,
});

test('resolveAppUpdateUiState returns empty state when no newer or safe release exists', () => {
  assert.deepEqual(
    resolveAppUpdateUiState({ latest: null, installedVersionCode: 60, snooze: null, now: 1000 }),
    { promptUpdate: null, pendingUpdate: null, required: false, showDeferredDot: false },
  );

  assert.deepEqual(
    resolveAppUpdateUiState({
      latest: makeRelease({ versionCode: 60 }),
      installedVersionCode: 60,
      snooze: null,
      now: 1000,
    }),
    { promptUpdate: null, pendingUpdate: null, required: false, showDeferredDot: false },
  );

  assert.deepEqual(
    resolveAppUpdateUiState({
      latest: makeRelease({ apkUrl: 'javascript:alert(1)' }),
      installedVersionCode: 60,
      snooze: null,
      now: 1000,
    }),
    { promptUpdate: null, pendingUpdate: null, required: false, showDeferredDot: false },
  );
});

test('resolveAppUpdateUiState shows modal before snooze and turns on deferred red dot after Later is tapped', () => {
  const latest = makeRelease({ versionCode: 61 });
  const now = 1_700_000_000_000;

  const beforeLater = resolveAppUpdateUiState({
    latest,
    installedVersionCode: 60,
    snooze: null,
    now,
  });
  assert.equal(beforeLater.promptUpdate?.versionCode, 61);
  assert.equal(beforeLater.pendingUpdate?.versionCode, 61);
  assert.equal(beforeLater.showDeferredDot, false);
  assert.equal(beforeLater.required, false);

  const afterLater = resolveAppUpdateUiState({
    latest,
    installedVersionCode: 60,
    snooze: { code: 61, until: now + APP_UPDATE_SNOOZE_MS },
    now: now + 5000,
  });
  assert.equal(afterLater.promptUpdate, null);
  assert.equal(afterLater.pendingUpdate?.versionCode, 61);
  assert.equal(afterLater.showDeferredDot, true);
});

test('resolveAppUpdateUiState re-prompts when snooze expires or a higher version is published or update is required', () => {
  const now = 1_700_000_000_000;
  const v61 = makeRelease({ versionCode: 61 });
  const v62 = makeRelease({ versionCode: 62, versionName: '1.1.60' });

  const expired = resolveAppUpdateUiState({
    latest: v61,
    installedVersionCode: 60,
    snooze: { code: 61, until: now - 1 },
    now,
  });
  assert.equal(expired.promptUpdate?.versionCode, 61);
  assert.equal(expired.showDeferredDot, false);

  const newerBuild = resolveAppUpdateUiState({
    latest: v62,
    installedVersionCode: 60,
    snooze: { code: 61, until: now + 10_000 },
    now,
  });
  assert.equal(newerBuild.promptUpdate?.versionCode, 62);
  assert.equal(newerBuild.showDeferredDot, false);

  const forcedUpdate = resolveAppUpdateUiState({
    latest: makeRelease({ versionCode: 61, minVersionCode: 61 }),
    installedVersionCode: 60,
    snooze: { code: 61, until: now + 10_000 },
    now,
  });
  assert.equal(forcedUpdate.required, true);
  assert.equal(forcedUpdate.promptUpdate?.versionCode, 61);
  assert.equal(forcedUpdate.showDeferredDot, false);
});

test('snooze storage helpers read and write safely', () => {
  const map = new Map<string, string>();
  const memoryStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };

  assert.equal(readAppUpdateSnooze(memoryStorage), null);
  const written = writeAppUpdateSnooze(memoryStorage, 61, 5000);
  assert.deepEqual(written, { code: 61, until: 5000 + APP_UPDATE_SNOOZE_MS });
  assert.deepEqual(readAppUpdateSnooze(memoryStorage), {
    code: 61,
    until: 5000 + APP_UPDATE_SNOOZE_MS,
  });

  map.set(APP_UPDATE_SNOOZE_KEY, '{broken');
  assert.equal(readAppUpdateSnooze(memoryStorage), null);
});

test('buildApkFileName and parseRgUpdaterProgress handle normal and malformed inputs safely', () => {
  assert.equal(buildApkFileName('1.1.61'), 'Rofik_Godi_Center_1.1.61.apk');
  assert.equal(buildApkFileName('1.1.61 (beta)!'), 'Rofik_Godi_Center_1.1.61beta.apk');
  assert.equal(buildApkFileName('!!!'), 'Rofik_Godi_Center_latest.apk');

  assert.deepEqual(parseRgUpdaterProgress('2|500|1000'), {
    status: 2,
    done: 500,
    total: 1000,
    percent: 50,
  });
  assert.deepEqual(parseRgUpdaterProgress('8|1200|1000'), {
    status: 8,
    done: 1200,
    total: 1000,
    percent: 100,
  });
  assert.deepEqual(parseRgUpdaterProgress('16|0|0'), {
    status: 16,
    done: 0,
    total: 0,
    percent: null,
  });
  assert.deepEqual(parseRgUpdaterProgress('invalid'), {
    status: 0,
    done: 0,
    total: 0,
    percent: null,
  });
});
