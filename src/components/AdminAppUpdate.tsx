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
  const [readingMetadata, setReadingMetadata] = useState(false);

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

  const handleApkChange = async (selectedFile: File | undefined) => {
    setFile(selectedFile ?? null);
    if (!selectedFile) return;
    setReadingMetadata(true);
    try {
      const parserModule = await import('apk-manifest-parser');
      const parserExport = parserModule.default as unknown as { default?: typeof parserModule.default };
      const ManifestParser = parserExport.default ?? parserModule.default;
      const metadata = await ManifestParser.extractApkManifest(selectedFile);
      if (!metadata.versionName || !Number.isFinite(Number(metadata.versionCode))) {
        throw new Error('APK manifest is missing version information');
      }
      setVersionName(String(metadata.versionName));
      setVersionCode(String(metadata.versionCode));
      notify(`Detected APK version ${metadata.versionName} (code ${metadata.versionCode})`);
    } catch (error) {
      setVersionName('');
      setVersionCode('');
      notify(error instanceof Error ? `Could not read APK version: ${error.message}` : 'Could not read APK version');
    } finally {
      setReadingMetadata(false);
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
        <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/60 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-600">APK file (max 50 MB)</p>
          <label className="mt-3 flex min-h-16 cursor-pointer items-center justify-center rounded-xl bg-[#d9232d] px-4 py-3 text-center text-sm font-extrabold text-white shadow-sm transition hover:bg-[#b91c1c] active:scale-[0.99]">
            <UploadCloud className="mr-2 h-5 w-5" />
            {file ? 'Change APK file' : 'Choose APK file'}
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => void handleApkChange(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          <p className="mt-2 truncate text-center text-xs font-semibold text-slate-500" title={file?.name}>
            {readingMetadata ? 'Reading APK version…' : file ? file.name : 'Tap the red button to select your APK'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-600">Version name
            <input value={versionName} readOnly={Boolean(file)} onChange={(e) => setVersionName(e.target.value)} placeholder="1.1.59" className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm read-only:bg-slate-50" />
          </label>
          <label className="block text-xs font-bold text-slate-600">Version code (must be higher)
            <input value={versionCode} readOnly={Boolean(file)} onChange={(e) => setVersionCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={String((current?.versionCode ?? 0) + 1)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm read-only:bg-slate-50" />
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
