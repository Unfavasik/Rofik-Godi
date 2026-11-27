# Android App Update Package

> Consolidated from `upd2.zip` into a single Markdown file.

## Contents

- [README / Integration Instructions](#readme--integration-instructions)
- [src/components/AdminAppUpdate.tsx](#srccomponentsadminappupdatetsx)
- [src/components/AppUpdatePrompt.tsx](#srccomponentsappupdateprompttsx)
- [src/hooks/useAppUpdate.ts](#srchooksuseappupdatets)
- [src/lib/supabaseAppRelease.ts](#srclibsupabaseappreleasets)
- [supabase/migrations/20261127180000_app_releases.sql](#supabasemigrations20261127180000_app_releasessql)

## README / Integration Instructions

```text
=== STEP 1: Supabase ===
Run supabase/migrations/20261127180000_app_releases.sql in the Supabase SQL editor (or add it as a migration).
It creates the table public.app_releases (public read, admin-only write via public.is_admin()) and a public storage bucket "app-releases" (50 MB limit, admin-only upload).

=== STEP 2: PASTE THIS TO YOUR AI TOOL (Lovable / v0) ===

Add an admin-controlled Android update announcement. Files are already prepared, copy them as they are:
- src/lib/supabaseAppRelease.ts
- src/hooks/useAppUpdate.ts        (replaces the version that reads /app-version.json)
- src/components/AppUpdatePrompt.tsx
- src/components/AdminAppUpdate.tsx
- supabase/migrations/20261127180000_app_releases.sql

Do this:
1. In src/App.tsx import { AppUpdatePrompt } from './components/AppUpdatePrompt' and render <AppUpdatePrompt /> once at the app root next to the other global modals, outside any lazy/Suspense route. It only runs on Android native.
2. In the admin panel add a new section "App update" (icon Rocket from lucide-react): add 'app-update' to AdminSectionRoute in src/lib/appRoutes.ts with the path /admin/app-update (add it to the admin route list and the section/path maps like the other sections), add a nav item in AdminPanel.tsx, and render <AdminAppUpdate notify={notify} /> when section === 'app-update'. Admins only, same as the other sections.
3. Do not change anything else. Run typecheck and build; if an icon is missing in lucide-react use a similar one.

=== HOW TO RELEASE EVERY NEW APK ===
Admin panel -> App update -> choose the new APK, enter the version name and the version code exactly as in the APK, add notes, press "Upload and publish".
Every installed app shows the "New update available" sheet the next time it opens. "Force update" hides the Later button.

```

## src/components/AdminAppUpdate.tsx

```tsx
import { useEffect, useState } from 'react';
import { Loader2, Rocket, UploadCloud } from 'lucide-react';
import { fetchLatestRelease, publishRelease, uploadApk, type AppRelease } from '../lib/supabaseAppRelease';

/** Admin panel section: upload a new APK and announce it to every installed Android app. */
export const AdminAppUpdate = ({ notify }: { notify: (message: string) => void }) => {
  const [current, setCurrent] = useState<AppRelease | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [notes, setNotes] = useState('');
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchLatestRelease().then(setCurrent);
  }, []);

  const code = Number(versionCode);
  const valid = Boolean(file) && versionName.trim().length > 0 && Number.isInteger(code) && code > (current?.versionCode ?? 0);

  const publish = async () => {
    if (!file || !valid) return;
    setBusy(true);
    try {
      const apkUrl = await uploadApk(file, versionName.trim());
      const release = {
        versionCode: code,
        versionName: versionName.trim(),
        minVersionCode: force ? code : 0,
        apkUrl,
        title: 'New update available',
        notes: notes.split('\n').map((line) => line.trim()).filter(Boolean),
      };
      await publishRelease(release);
      setCurrent({ ...release });
      setFile(null);
      setNotes('');
      setForce(false);
      notify('Update published. Installed apps will show it on next open.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not publish the update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Live version</p>
        <p className="mt-1 text-lg font-black text-slate-900">
          {current ? `${current.versionName} (code ${current.versionCode})` : 'Nothing published yet'}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Rocket className="h-5 w-5 text-[#d9232d]" /> Publish new Android update</h2>
        <label className="block text-xs font-bold text-slate-600">APK file (max 50 MB)
          <input type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-600">Version name
            <input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="1.1.59" className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
          </label>
          <label className="block text-xs font-bold text-slate-600">Version code (must be higher)
            <input value={versionCode} onChange={(e) => setVersionCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={String((current?.versionCode ?? 0) + 1)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
          </label>
        </div>
        <label className="block text-xs font-bold text-slate-600">What's new (one line each)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder={'Smoother scrolling\nBetter notifications'} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="h-4 w-4" />
          Force update (hide the "Later" button)
        </label>
        <button type="button" disabled={!valid || busy} onClick={() => void publish()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#d9232d] text-sm font-extrabold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Upload and publish'}
        </button>
        <p className="text-[11px] text-slate-400">The new version code must be higher than the live one, and equal to the versionCode inside the APK.</p>
      </div>
    </section>
  );
};

```

## src/components/AppUpdatePrompt.tsx

```tsx
import { Browser } from '@capacitor/browser';
import { Download, Sparkles } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';

/** Bottom-sheet that tells Android users a new APK is available. Mount once near the app root. */
export const AppUpdatePrompt = () => {
  const { update, required, dismiss } = useAppUpdate();
  if (!update) return null;

  const startUpdate = () => {
    Browser.open({ url: update.apkUrl }).catch(() => window.open(update.apkUrl, '_blank'));
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fdecee] text-[#d9232d]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 id="app-update-title" className="text-base font-black text-slate-900">{update.title || 'New update available'} 🎉</h2>
            <p className="text-xs font-semibold text-slate-500">Rofik Godi Center · version {update.versionName}</p>
          </div>
        </div>
        {!!update.notes?.length && (
          <ul className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-3.5 text-[13px] leading-snug text-slate-700">
            {update.notes.map((note) => (
              <li key={note} className="flex gap-2"><span aria-hidden="true">✨</span><span>{note}</span></li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2.5">
          {!required && (
            <button type="button" onClick={dismiss} className="min-h-12 flex-1 rounded-2xl bg-slate-100 text-sm font-extrabold text-slate-700 active:scale-[0.98]">
              Later
            </button>
          )}
          <button type="button" onClick={startUpdate} className="flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#d9232d] text-sm font-extrabold text-white active:scale-[0.98]">
            <Download className="h-4 w-4" /> Update now
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-400">After download, tap the file and choose Install. Your data stays safe.</p>
      </div>
    </div>
  );
};

```

## src/hooks/useAppUpdate.ts

```ts
import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { fetchLatestRelease, type AppRelease } from '../lib/supabaseAppRelease';

export type AppUpdateInfo = AppRelease;

export type AppUpdateState = {
  update: AppUpdateInfo | null;
  /** true when the installed app is older than minVersionCode, so "Later" is hidden */
  required: boolean;
  dismiss: () => void;
};

const SNOOZE_KEY = 'rg_update_snooze';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

const readSnooze = (): { code: number; until: number } | null => {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    return raw ? (JSON.parse(raw) as { code: number; until: number }) : null;
  } catch {
    return null;
  }
};

/** Android app only. Compares the installed build (versionCode) with the release published from the admin panel. */
export const useAppUpdate = (): AppUpdateState => {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [required, setRequired] = useState(false);

  const check = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    try {
      const [info, latest] = await Promise.all([App.getInfo(), fetchLatestRelease()]);
      const installed = Number(info.build);
      if (!latest || !Number.isFinite(installed) || !latest.apkUrl) return;
      if (latest.versionCode <= installed) {
        setUpdate(null);
        setRequired(false);
        return;
      }
      const mustUpdate = latest.minVersionCode > installed;
      const snooze = readSnooze();
      if (!mustUpdate && snooze && snooze.code === latest.versionCode && snooze.until > Date.now()) return;
      setRequired(mustUpdate);
      setUpdate(latest);
    } catch {
      /* offline: stay silent */
    }
  }, []);

  useEffect(() => {
    void check();
    let remove: (() => void) | null = null;
    let active = true;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void check();
      }).then((handle) => {
        if (active) remove = () => { void handle.remove(); };
        else void handle.remove();
      }).catch(() => {});
    }
    return () => {
      active = false;
      remove?.();
    };
  }, [check]);

  const dismiss = useCallback(() => {
    if (update) {
      try {
        localStorage.setItem(SNOOZE_KEY, JSON.stringify({ code: update.versionCode, until: Date.now() + SNOOZE_MS }));
      } catch { /* ignore */ }
    }
    setUpdate(null);
  }, [update]);

  return { update, required, dismiss };
};

```

## src/lib/supabaseAppRelease.ts

```ts
import { supabase } from './supabase';

export type AppRelease = {
  versionCode: number;
  versionName: string;
  minVersionCode: number;
  apkUrl: string;
  title: string;
  notes: string[];
  updatedAt?: string;
};

type Row = {
  version_code: number;
  version_name: string;
  min_version_code: number;
  apk_url: string;
  title: string;
  notes: string[] | null;
  updated_at?: string;
};

const fromRow = (row: Row): AppRelease => ({
  versionCode: row.version_code,
  versionName: row.version_name,
  minVersionCode: row.min_version_code ?? 0,
  apkUrl: row.apk_url,
  title: row.title || 'New update available',
  notes: row.notes ?? [],
  updatedAt: row.updated_at,
});

export async function fetchLatestRelease(): Promise<AppRelease | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('app_releases')
    .select('version_code,version_name,min_version_code,apk_url,title,notes,updated_at')
    .eq('id', 'android')
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data as Row);
}

/** Admin only: uploads the APK to the public "app-releases" bucket and returns its public URL. */
export async function uploadApk(file: File, versionName: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  if (!/\.apk$/i.test(file.name)) throw new Error('Please choose an .apk file');
  const safe = versionName.replace(/[^0-9A-Za-z._-]/g, '');
  if (!safe) throw new Error('Enter a version name first');
  const path = `Rofik_Godi_Center_${safe}.apk`;
  const { error } = await supabase.storage.from('app-releases').upload(path, file, {
    upsert: true,
    contentType: 'application/vnd.android.package-archive',
    cacheControl: '300',
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from('app-releases').getPublicUrl(path).data.publicUrl;
}

/** Admin only: publishes (or replaces) the single Android release row. */
export async function publishRelease(release: Omit<AppRelease, 'updatedAt'>): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('app_releases').upsert({
    id: 'android',
    version_code: release.versionCode,
    version_name: release.versionName,
    min_version_code: release.minVersionCode,
    apk_url: release.apkUrl,
    title: release.title,
    notes: release.notes,
    updated_at: new Date().toISOString(),
    updated_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

```

## supabase/migrations/20261127180000_app_releases.sql

```sql
-- Android app update announcements, managed from the admin panel.
create table if not exists public.app_releases (
  id text primary key default 'android' check (id = 'android'),
  version_code integer not null check (version_code > 0),
  version_name text not null,
  min_version_code integer not null default 0 check (min_version_code >= 0),
  apk_url text not null,
  title text not null default 'New update available',
  notes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_releases enable row level security;

drop policy if exists "app_releases_public_read" on public.app_releases;
create policy "app_releases_public_read" on public.app_releases
  for select to anon, authenticated using (true);

drop policy if exists "app_releases_admin_insert" on public.app_releases;
create policy "app_releases_admin_insert" on public.app_releases
  for insert to authenticated with check (public.is_admin());

drop policy if exists "app_releases_admin_update" on public.app_releases;
create policy "app_releases_admin_update" on public.app_releases
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "app_releases_admin_delete" on public.app_releases;
create policy "app_releases_admin_delete" on public.app_releases
  for delete to authenticated using (public.is_admin());

-- Public bucket that holds the APK files (Supabase free plan allows up to 50 MB per file).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-releases', 'app-releases', true, 52428800, null)
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = null;

drop policy if exists "app_releases_bucket_public_read" on storage.objects;
create policy "app_releases_bucket_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'app-releases');

drop policy if exists "app_releases_bucket_admin_insert" on storage.objects;
create policy "app_releases_bucket_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'app-releases' and public.is_admin());

drop policy if exists "app_releases_bucket_admin_update" on storage.objects;
create policy "app_releases_bucket_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'app-releases' and public.is_admin())
  with check (bucket_id = 'app-releases' and public.is_admin());

drop policy if exists "app_releases_bucket_admin_delete" on storage.objects;
create policy "app_releases_bucket_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'app-releases' and public.is_admin());

```
