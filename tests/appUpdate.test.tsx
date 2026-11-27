import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mockUpdateState = vi.hoisted(() => ({
  update: null as null | {
    versionCode: number;
    versionName: string;
    minVersionCode: number;
    apkUrl: string;
    title: string;
    notes: string[];
  },
  required: false,
  dismiss: vi.fn(),
}));

const mockStorageFrom = vi.hoisted(() =>
  vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn(() => ({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/app-releases/Rofik_Godi_Center_1.1.59.apk' },
    })),
  })),
);

const mockFrom = vi.hoisted(() =>
  vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  })),
);

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
    },
    storage: { from: mockStorageFrom },
    from: mockFrom,
  },
}));

vi.mock('../src/hooks/useAppUpdate', () => ({
  useAppUpdate: () => mockUpdateState,
}));

import { AdminAppUpdate } from '../src/components/AdminAppUpdate';
import { AppUpdatePrompt } from '../src/components/AppUpdatePrompt';
import { publishRelease, uploadApk } from '../src/lib/supabaseAppRelease';

describe('Android App Update integration', () => {
  it('renders AdminAppUpdate form with APK file input, version fields, and Force update toggle', () => {
    const html = renderToStaticMarkup(<AdminAppUpdate notify={() => undefined} />);
    expect(html).toContain('Publish new Android update');
    expect(html).toContain('APK file (max 50 MB)');
    expect(html).toContain('Version name');
    expect(html).toContain('Version code (must be higher)');
    expect(html).toContain('Force update');
    expect(html).toContain('Upload and publish');
  });

  it('renders AppUpdatePrompt when update is available and respects required vs optional dismiss', () => {
    mockUpdateState.update = null;
    expect(renderToStaticMarkup(<AppUpdatePrompt />)).toBe('');

    mockUpdateState.update = {
      versionCode: 61,
      versionName: '1.1.59',
      minVersionCode: 0,
      apkUrl: 'https://example.supabase.co/storage/v1/object/public/app-releases/Rofik_Godi_Center_1.1.59.apk',
      title: 'New update available',
      notes: ['Faster loading', 'Bug fixes'],
    };
    mockUpdateState.required = false;

    const optionalHtml = renderToStaticMarkup(<AppUpdatePrompt />);
    expect(optionalHtml).toContain('New update available');
    expect(optionalHtml).toContain('Rofik Godi Center · version 1.1.59');
    expect(optionalHtml).toContain('Faster loading');
    expect(optionalHtml).toContain('Later');
    expect(optionalHtml).toContain('Update now');

    mockUpdateState.required = true;
    const forcedHtml = renderToStaticMarkup(<AppUpdatePrompt />);
    expect(forcedHtml).not.toContain('Later');
    expect(forcedHtml).toContain('Update now');

    // Blocks unsafe non-HTTPS URL schemes
    mockUpdateState.update = {
      ...mockUpdateState.update,
      apkUrl: 'javascript:alert(1)',
    };
    expect(renderToStaticMarkup(<AppUpdatePrompt />)).toBe('');
  });

  it('validates APK extension, 50 MB size limit, version name, and publishRelease URL safety', async () => {
    const badExt = new File(['abc'], 'app.zip', { type: 'application/zip' });
    await expect(uploadApk(badExt, '1.1.59')).rejects.toThrow('Please choose an .apk file');

    const oversized = { name: 'big.apk', size: 52_428_801 } as File;
    await expect(uploadApk(oversized, '1.1.59')).rejects.toThrow('50 MB');

    const goodApk = new File(['apk-bytes'], 'release.apk', { type: 'application/vnd.android.package-archive' });
    await expect(uploadApk(goodApk, '!!!')).rejects.toThrow('Enter a version name first');

    const url = await uploadApk(goodApk, '1.1.59');
    expect(url).toContain('Rofik_Godi_Center_1.1.59.apk');

    await expect(
      publishRelease({
        versionCode: 61,
        versionName: '1.1.59',
        minVersionCode: 0,
        apkUrl: 'javascript:alert(1)',
        title: 'New update available',
        notes: [],
      }),
    ).rejects.toThrow('Invalid APK download URL');

    await expect(
      publishRelease({
        versionCode: 61,
        versionName: '1.1.59',
        minVersionCode: 0,
        apkUrl: url,
        title: 'New update available',
        notes: ['Notes'],
      }),
    ).resolves.toBeUndefined();
  });
});
