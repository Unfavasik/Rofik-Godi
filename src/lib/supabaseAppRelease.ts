import { supabase } from './supabase';
import { sanitizeUrl } from './security';

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

const MAX_APK_BYTES = 52_428_800;

const fromRow = (row: Row): AppRelease => ({
  versionCode: row.version_code,
  versionName: row.version_name,
  minVersionCode: row.min_version_code ?? 0,
  apkUrl: sanitizeUrl(row.apk_url, { allowRelative: false }) ?? '',
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
  if (file.size > MAX_APK_BYTES) throw new Error('APK file exceeds the 50 MB limit');
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

async function removeOldApks(keepUrl: string): Promise<void> {
  if (!supabase) return;
  const marker = '/storage/v1/object/public/app-releases/';
  const keepPath = keepUrl.includes(marker)
    ? decodeURIComponent(keepUrl.split(marker)[1].split('?')[0])
    : '';
  if (!keepPath) return;

  const bucket = supabase.storage.from('app-releases');
  if (typeof bucket.list !== 'function' || typeof bucket.remove !== 'function') return;
  const { data: objects, error: listError } = await bucket.list('', {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (listError) throw new Error(`Could not inspect old APK files: ${listError.message}`);
  const stalePaths = (objects ?? [])
    .map((object) => object.name)
    .filter((name) => name && name !== keepPath);
  if (!stalePaths.length) return;

  const { error: removeError } = await bucket.remove(stalePaths);
  if (removeError) throw new Error(`APK published, but old APK cleanup failed: ${removeError.message}`);
}

/** Admin only: publishes (or replaces) the single Android release row. */
export async function publishRelease(release: Omit<AppRelease, 'updatedAt'>): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured');
  const safeApkUrl = sanitizeUrl(release.apkUrl, { allowRelative: false });
  if (!safeApkUrl) throw new Error('Invalid APK download URL');
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('app_releases').upsert({
    id: 'android',
    version_code: release.versionCode,
    version_name: release.versionName,
    min_version_code: release.minVersionCode,
    apk_url: safeApkUrl,
    title: release.title,
    notes: release.notes,
    updated_at: new Date().toISOString(),
    updated_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  await removeOldApks(safeApkUrl);
}
