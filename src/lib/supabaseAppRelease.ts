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

export type ApkUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

function uploadViaXhr(params: {
  endpoint: string;
  apikey: string;
  accessToken: string;
  file: File;
  onProgress: (progress: ApkUploadProgress) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', params.endpoint, true);
    xhr.setRequestHeader('apikey', params.apikey);
    xhr.setRequestHeader('Authorization', `Bearer ${params.accessToken}`);
    xhr.setRequestHeader('x-upsert', 'true');

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable && event.total > 0 ? event.total : params.file.size;
      const loaded = Math.min(event.loaded, total);
      const percent = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
      params.onProgress({ loaded, total, percent });
    };

    xhr.onerror = () => reject(new Error('Network error while uploading the APK file'));
    xhr.onabort = () => reject(new Error('APK upload was cancelled'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        params.onProgress({ loaded: params.file.size, total: params.file.size, percent: 100 });
        resolve();
        return;
      }
      let message = `Upload failed (HTTP ${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        // Keep HTTP fallback error message
      }
      reject(new Error(message));
    };

    const formData = new FormData();
    formData.append('cacheControl', '300');
    formData.append('', params.file);
    xhr.send(formData);
  });
}

/** Admin only: uploads the APK to the public "app-releases" bucket and returns its public URL. */
export async function uploadApk(
  file: File,
  versionName: string,
  onProgress?: (progress: ApkUploadProgress) => void,
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  if (!/\.apk$/i.test(file.name)) throw new Error('Please choose an .apk file');
  if (file.size > MAX_APK_BYTES) throw new Error('APK file exceeds the 50 MB limit');
  const safe = versionName.replace(/[^0-9A-Za-z._-]/g, '');
  if (!safe) throw new Error('Enter a version name first');
  const path = `Rofik_Godi_Center_${safe}.apk`;

  const supabaseUrl = ((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '').replace(/\/+$/, '');
  const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

  if (onProgress && typeof XMLHttpRequest !== 'undefined' && supabaseUrl && supabaseKey && typeof supabase.auth.getSession === 'function') {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (accessToken) {
      onProgress({ loaded: 0, total: file.size, percent: 0 });
      await uploadViaXhr({
        endpoint: `${supabaseUrl}/storage/v1/object/app-releases/${encodeURIComponent(path)}`,
        apikey: supabaseKey,
        accessToken,
        file,
        onProgress,
      });
      return supabase.storage.from('app-releases').getPublicUrl(path).data.publicUrl;
    }
  }

  onProgress?.({ loaded: 0, total: file.size, percent: 15 });
  const { error } = await supabase.storage.from('app-releases').upload(path, file, {
    upsert: true,
    contentType: 'application/vnd.android.package-archive',
    cacheControl: '300',
  });
  if (error) throw new Error(error.message);
  onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
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
