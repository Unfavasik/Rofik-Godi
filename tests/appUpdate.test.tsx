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
  pendingUpdate: null as null | {
    versionCode: number;
    versionName: string;
    minVersionCode: number;
    apkUrl: string;
    title: string;
    notes: string[];
  },
  required: false,
  showDeferredDot: false,
  dismiss: vi.fn(),
  startUpdate: vi.fn(),
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
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
      startAutoRefresh: vi.fn().mockResolvedValue(undefined),
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
import { BottomNav } from '../src/components/BottomNav';
import { AccountView } from '../src/components/AccountView';
import { SettingsView } from '../src/components/SettingsView';
import { I18nProvider } from '../src/lib/i18n';
import { publishRelease, uploadApk } from '../src/lib/supabaseAppRelease';

describe('Android App Update integration', () => {
  it('renders AdminAppUpdate form with APK file input, version fields, Force update toggle, and live preview', () => {
    const html = renderToStaticMarkup(<AdminAppUpdate notify={() => undefined} />);
    expect(html).toContain('App Update Manager');
    expect(html).toContain('Publish new Android update');
    expect(html).toContain('APK file (max 50 MB)');
    expect(html).toContain('Version name');
    expect(html).toContain('Version code (must be higher)');
    expect(html).toContain('Force update');
    expect(html).toContain('Upload and publish');
    expect(html).toContain('Live production build');
    expect(html).toContain('Android prompt preview');
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
    expect(optionalHtml).toContain('Install the latest APK once by hand to enable in-app updates');

    (globalThis as unknown as { window?: Record<string, unknown> }).window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      RGUpdater: {
        download: vi.fn(() => 'STARTED'),
        progress: vi.fn(() => '8|100|100'),
      },
    };
    try {
      const readyHtml = renderToStaticMarkup(<AppUpdatePrompt />);
      expect(readyHtml).toContain('In-app installer ready');
    } finally {
      delete (globalThis as unknown as { window?: Record<string, unknown> }).window;
    }

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

    const progressEvents: number[] = [];
    const url = await uploadApk(goodApk, '1.1.59', (progress) => {
      progressEvents.push(progress.percent);
    });
    expect(url).toContain('Rofik_Godi_Center_1.1.59.apk');
    expect(progressEvents[progressEvents.length - 1]).toBe(100);

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

  it('renders deferred update red dots on BottomNav and AccountView Settings and top update card inside SettingsView', () => {
    const release = {
      versionCode: 61,
      versionName: '1.1.59',
      minVersionCode: 0,
      apkUrl: 'https://example.supabase.co/storage/v1/object/public/app-releases/Rofik_Godi_Center_1.1.59.apk',
      title: 'New update available',
      notes: ['Faster loading', 'Bug fixes'],
    };

    const navWithoutDot = renderToStaticMarkup(
      <I18nProvider language="en">
        <BottomNav
          activeTab="home"
          setActiveTab={() => undefined}
          cartCount={0}
          wishlistCount={0}
          onOpenCart={() => undefined}
          onOpenWishlist={() => undefined}
          onOpenShop={() => undefined}
          onOpenAccount={() => undefined}
          onScrollToTop={() => undefined}
          accountUpdateDot={false}
        />
      </I18nProvider>,
    );
    expect(navWithoutDot).not.toContain('bottom-nav-account-update-dot');

    const navWithDot = renderToStaticMarkup(
      <I18nProvider language="en">
        <BottomNav
          activeTab="home"
          setActiveTab={() => undefined}
          cartCount={0}
          wishlistCount={0}
          onOpenCart={() => undefined}
          onOpenWishlist={() => undefined}
          onOpenShop={() => undefined}
          onOpenAccount={() => undefined}
          onScrollToTop={() => undefined}
          accountUpdateDot
        />
      </I18nProvider>,
    );
    expect(navWithDot).toContain('bottom-nav-account-update-dot');
    expect(navWithDot).toContain('update available');

    const accountWithDot = renderToStaticMarkup(
      <I18nProvider language="en">
        <AccountView
          onOpenWishlist={() => undefined}
          hasAppUpdate
          pendingAppUpdate={release}
        />
      </I18nProvider>,
    );
    expect(accountWithDot).toContain('account-header-settings-update-dot');
    expect(accountWithDot).toContain('account-settings-update-dot');
    expect(accountWithDot).toContain('Update available');

    const settingsWithoutUpdate = renderToStaticMarkup(
      <I18nProvider language="en">
        <SettingsView onBack={() => undefined} isAuthenticated pendingAppUpdate={null} />
      </I18nProvider>,
    );
    expect(settingsWithoutUpdate).not.toContain('settings-app-update-card');

    const settingsWithUpdate = renderToStaticMarkup(
      <I18nProvider language="en">
        <SettingsView onBack={() => undefined} isAuthenticated pendingAppUpdate={release} />
      </I18nProvider>,
    );
    expect(settingsWithUpdate).toContain('settings-app-update-card');
    expect(settingsWithUpdate).toContain('App update');
    expect(settingsWithUpdate).toContain('v1.1.59');
    expect(settingsWithUpdate).toContain('Update now');
  });
});
