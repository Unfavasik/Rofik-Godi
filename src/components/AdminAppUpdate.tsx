import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Smartphone,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  extractApkMetadata,
  formatApkBytes,
  validateApkFile,
  validateReleaseDraft,
  type ParsedApkMetadata,
} from '../lib/apkManifest';
import {
  fetchLatestRelease,
  publishRelease,
  uploadApk,
  type ApkUploadProgress,
  type AppRelease,
} from '../lib/supabaseAppRelease';
import { sanitizeUrl } from '../lib/security';

type UploadStage = 'idle' | 'validating' | 'uploading' | 'publishing' | 'done';

const formatUpdatedAt = (value?: string) => {
  if (!value) return 'Just now';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently updated';
  return parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

/** Admin panel section: upload a new APK, auto-read its manifest, track upload processing, and publish to Android users. */
export const AdminAppUpdate = ({ notify }: { notify: (message: string) => void }) => {
  const [current, setCurrent] = useState<AppRelease | null>(null);
  const [loadingLive, setLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [readingMetadata, setReadingMetadata] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [metadata, setMetadata] = useState<ParsedApkMetadata | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [notes, setNotes] = useState('');
  const [force, setForce] = useState(false);

  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState<ApkUploadProgress>({
    loaded: 0,
    total: 0,
    percent: 0,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadLiveRelease = useCallback(async (showToast = false) => {
    setLoadingLive(true);
    setLiveError(null);
    try {
      const latest = await fetchLatestRelease();
      setCurrent(latest);
      if (showToast) {
        notify(latest ? `Live version synced: ${latest.versionName} (code ${latest.versionCode})` : 'No live release published yet');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load current release';
      setLiveError(message);
    } finally {
      setLoadingLive(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadLiveRelease(false);
  }, [loadLiveRelease]);

  const clearSelectedFile = () => {
    setFile(null);
    setMetadata(null);
    setParseError(null);
    setParseProgress(0);
    setManualOverride(false);
    setVersionName('');
    setVersionCode('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApkSelection = async (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    const basicError = validateApkFile(selectedFile);
    if (basicError) {
      setFile(null);
      setMetadata(null);
      setParseError(basicError);
      setVersionName('');
      setVersionCode('');
      notify(basicError);
      return;
    }

    setFile(selectedFile);
    setMetadata(null);
    setParseError(null);
    setManualOverride(false);
    setReadingMetadata(true);
    setParseProgress(28);

    const progressTimer = window.setInterval(() => {
      setParseProgress((prev) => (prev < 86 ? Math.min(86, prev + 18) : prev));
    }, 90);

    try {
      setParseProgress(54);
      const parsed = await extractApkMetadata(selectedFile);
      window.clearInterval(progressTimer);
      setParseProgress(100);
      setMetadata(parsed);
      setVersionName(parsed.versionName);
      setVersionCode(String(parsed.versionCode));
      notify(`Detected APK v${parsed.versionName} (code ${parsed.versionCode})`);
    } catch (error) {
      window.clearInterval(progressTimer);
      setParseProgress(0);
      setMetadata(null);
      setManualOverride(true);
      setVersionName('');
      setVersionCode('');
      const message =
        error instanceof Error
          ? error.message
          : 'Could not read AndroidManifest.xml from this APK';
      setParseError(message);
      notify(`Could not auto-read APK version: ${message}`);
    } finally {
      setReadingMetadata(false);
    }
  };

  const liveVersionCode = current?.versionCode ?? 0;
  const validation = useMemo(
    () =>
      validateReleaseDraft({
        file,
        versionName,
        versionCode,
        liveVersionCode,
      }),
    [file, versionName, versionCode, liveVersionCode],
  );

  const busy = uploadStage === 'validating' || uploadStage === 'uploading' || uploadStage === 'publishing';
  const parsedNotes = useMemo(
    () => notes.split('\n').map((line) => line.trim()).filter(Boolean),
    [notes],
  );

  const publish = async () => {
    if (!file || !validation.valid || busy) return;
    setUploadStage('validating');
    setUploadProgress({ loaded: 0, total: file.size, percent: 6 });

    try {
      setUploadStage('uploading');
      const apkUrl = await uploadApk(file, versionName.trim(), (progress) => {
        // Scale storage transfer across 10% -> 90% so publishing occupies 90% -> 100%
        const scaledPercent = Math.max(10, Math.min(90, Math.round(10 + progress.percent * 0.8)));
        setUploadProgress({
          loaded: progress.loaded,
          total: progress.total || file.size,
          percent: scaledPercent,
        });
      });

      setUploadStage('publishing');
      setUploadProgress({ loaded: file.size, total: file.size, percent: 94 });

      const release = {
        versionCode: validation.codeNumber,
        versionName: versionName.trim(),
        minVersionCode: force ? validation.codeNumber : 0,
        apkUrl,
        title: 'New update available',
        notes: parsedNotes,
      };
      await publishRelease(release);

      setUploadProgress({ loaded: file.size, total: file.size, percent: 100 });
      setUploadStage('done');
      setCurrent({ ...release, updatedAt: new Date().toISOString() });
      clearSelectedFile();
      setNotes('');
      setForce(false);
      notify('Update published. Installed apps will show it on next open.');

      window.setTimeout(() => {
        setUploadStage('idle');
      }, 2400);
    } catch (error) {
      setUploadStage('idle');
      notify(error instanceof Error ? error.message : 'Could not publish the update');
    }
  };

  const safeLiveApkUrl = current ? sanitizeUrl(current.apkUrl, { allowRelative: false }) : null;
  const copyLiveLink = async () => {
    if (!safeLiveApkUrl) return;
    try {
      await navigator.clipboard.writeText(safeLiveApkUrl);
      notify('APK download link copied');
    } catch {
      notify('Could not copy link to clipboard');
    }
  };

  const fieldsLocked = Boolean(file && metadata && !manualOverride);
  const previewVersion = versionName.trim() || current?.versionName || '1.1.59';
  const previewNotes = parsedNotes.length
    ? parsedNotes
    : ['Faster catalog loading', 'Improved order & notification updates'];

  return (
    <section className="space-y-5">
      {/* Page Intro Header */}
      <div className="rounded-2xl border border-slate-200/85 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-5 sm:py-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.04em] text-[#D9232D]">
              Android distribution
            </p>
            <h2 className="mt-0.5 font-display text-lg font-extrabold tracking-tight text-slate-950 md:text-xl">
              App Update Manager
            </h2>
            <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
              Drop a signed APK to auto-fill version metadata, monitor upload progress, and ship an over-the-air update prompt to installed Android devices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadLiveRelease(true)}
            disabled={loadingLive || busy}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 sm:self-auto whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
            Refresh live status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Primary Column: Release Composer & Upload Pipeline */}
        <div className="rounded-2xl border border-slate-200/85 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-[#D9232D]">
                <Rocket className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-extrabold text-slate-950">
                  Publish new Android update
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Version name and code populate automatically when an APK is chosen.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3.5 space-y-3.5">
            {/* Interactive APK Dropzone */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="admin-apk-file-input"
                  className="text-xs font-bold text-slate-700"
                >
                  APK file (max 50 MB)
                </label>
                {file && !busy && (
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-[#D9232D]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear file
                  </button>
                )}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!busy) setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (busy) return;
                  const dropped = e.dataTransfer.files?.[0];
                  void handleApkSelection(dropped);
                }}
                className={`relative rounded-xl border-2 border-dashed transition-colors ${
                  dragActive
                    ? 'border-[#D9232D] bg-red-50/70'
                    : file
                      ? 'border-slate-200 bg-slate-50/80'
                      : 'border-slate-300 bg-slate-50/60 hover:border-[#D9232D]/60 hover:bg-red-50/25'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="admin-apk-file-input"
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  disabled={busy}
                  onChange={(e) => void handleApkSelection(e.target.files?.[0])}
                  className="sr-only"
                />

                {!file && !readingMetadata ? (
                  <label
                    htmlFor="admin-apk-file-input"
                    className="flex cursor-pointer flex-col items-center justify-center px-4 py-5 text-center"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-[#D9232D]">
                      <UploadCloud className="h-5 w-5" />
                    </span>
                    <span className="mt-2.5 text-sm font-bold text-slate-900">
                      Drop your signed APK here, or click to browse
                    </span>
                    <span className="mt-0.5 text-xs font-medium text-slate-500">
                      .apk archive up to 50 MB · Auto-reads AndroidManifest.xml
                    </span>
                    <span className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#b91822]">
                      <UploadCloud className="h-4 w-4" />
                      Choose APK file
                    </span>
                  </label>
                ) : (
                  <div className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#D9232D] ring-1 ring-slate-200">
                          {readingMetadata ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <FileArchive className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900" title={file?.name}>
                            {file?.name || 'Inspecting APK…'}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-slate-500 tabular-nums">
                            <span>{formatApkBytes(file?.size ?? 0)}</span>
                            {metadata?.packageName && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-[11px] text-slate-600">{metadata.packageName}</span>
                              </>
                            )}
                            {metadata?.targetSdkVersion && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>SDK {metadata.minSdkVersion ?? '?'}–{metadata.targetSdkVersion}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <label
                        htmlFor="admin-apk-file-input"
                        className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap ${
                          busy ? 'pointer-events-none opacity-50' : ''
                        }`}
                      >
                        Replace APK
                      </label>
                    </div>

                    {/* Manifest Extraction Processing Bar */}
                    {readingMetadata && (
                      <div className="mt-3 border-t border-slate-200/80 pt-3" role="status" aria-live="polite">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>Reading AndroidManifest.xml &amp; extracting version…</span>
                          <span className="font-mono tabular-nums">{parseProgress}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#D9232D] transition-[width] duration-150 ease-out"
                            style={{ width: `${parseProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Manifest Extracted Feedback */}
                    {!readingMetadata && metadata && (
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 text-xs font-semibold text-emerald-700">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Manifest verified · Auto-filled v{metadata.versionName} (code {metadata.versionCode})
                        </span>
                      </div>
                    )}

                    {!readingMetadata && parseError && (
                      <div className="mt-3 flex items-start gap-2 border-t border-amber-200/80 pt-2.5 text-xs font-medium text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>{parseError}. Enter version name and code manually below.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Version Name & Version Code Inputs */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="apk-version-name" className="text-xs font-bold text-slate-700">
                    Version name
                  </label>
                  {metadata && (
                    <button
                      type="button"
                      onClick={() => setManualOverride((prev) => !prev)}
                      className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                    >
                      {manualOverride ? 'Lock to APK' : 'Edit manually'}
                    </button>
                  )}
                </div>
                <input
                  id="apk-version-name"
                  value={versionName}
                  readOnly={fieldsLocked}
                  disabled={busy}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="1.1.59"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#D9232D] focus:outline-none focus:ring-2 focus:ring-[#D9232D]/15 read-only:bg-slate-50 read-only:text-slate-700"
                />
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  {fieldsLocked ? 'Auto-filled from APK manifest' : 'Matches android:versionName'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="apk-version-code" className="text-xs font-bold text-slate-700">
                    Version code (must be higher)
                  </label>
                  <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                    Live: {liveVersionCode}
                  </span>
                </div>
                <input
                  id="apk-version-code"
                  value={versionCode}
                  readOnly={fieldsLocked}
                  disabled={busy}
                  onChange={(e) => setVersionCode(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder={String(liveVersionCode + 1)}
                  className={`mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3.5 font-mono text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 read-only:bg-slate-50 ${
                    versionCode && !validation.isHigherThanLive
                      ? 'border-rose-300 text-rose-700 focus:border-rose-500 focus:ring-rose-500/15'
                      : 'border-slate-200 text-slate-900 focus:border-[#D9232D] focus:ring-[#D9232D]/15'
                  }`}
                />
                <p
                  className={`mt-1 text-[11px] font-medium tabular-nums ${
                    versionCode && !validation.isHigherThanLive
                      ? 'text-rose-600'
                      : validation.isHigherThanLive
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                  }`}
                >
                  {versionCode
                    ? validation.isHigherThanLive
                      ? `Valid · Higher than live build (${liveVersionCode})`
                      : `Must be greater than live build (${liveVersionCode})`
                    : `Next build must be ≥ ${liveVersionCode + 1}`}
                </p>
              </div>
            </div>

            {/* Release Notes */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="apk-release-notes" className="text-xs font-bold text-slate-700">
                  What&apos;s new (one line each)
                </label>
                <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                  {parsedNotes.length} {parsedNotes.length === 1 ? 'highlight' : 'highlights'}
                </span>
              </div>
              <textarea
                id="apk-release-notes"
                value={notes}
                disabled={busy}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={'Faster catalog & seat cover previews\nSmoother checkout and order tracking'}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#D9232D] focus:outline-none focus:ring-2 focus:ring-[#D9232D]/15"
              />
            </div>

            {/* Force Update Toggle */}
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition hover:border-slate-300">
              <input
                type="checkbox"
                checked={force}
                disabled={busy}
                onChange={(e) => setForce(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#D9232D]"
              />
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">
                  Force update (hide the &ldquo;Later&rdquo; button)
                </span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">
                  Enable for critical fixes so customers on older versions must install before continuing.
                </span>
              </div>
            </label>

            {/* Upload Processing & Progress Panel */}
            {uploadStage !== 'idle' && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-slate-200 bg-slate-50/95 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {uploadStage === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#D9232D]" />
                    )}
                    <span className="truncate text-xs font-bold text-slate-900">
                      {uploadStage === 'validating' && 'Preparing APK package…'}
                      {uploadStage === 'uploading' && 'Uploading APK to Supabase Storage…'}
                      {uploadStage === 'publishing' && 'Publishing release & cleaning old APKs…'}
                      {uploadStage === 'done' && 'Release published successfully'}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {uploadProgress.percent}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress.percent}
                  aria-label="APK upload progress"
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-200 ease-out ${
                      uploadStage === 'done'
                        ? 'bg-emerald-600'
                        : 'bg-gradient-to-r from-[#D9232D] via-[#ef4444] to-[#f97316] skeleton-shimmer'
                    }`}
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-200/75 pt-2 text-[11px] font-medium tabular-nums">
                  {[
                    { key: 'validating', label: '1. Validate APK', done: uploadStage !== 'validating', active: uploadStage === 'validating' },
                    { key: 'uploading', label: '2. Upload binary', done: uploadStage === 'publishing' || uploadStage === 'done', active: uploadStage === 'uploading' },
                    { key: 'publishing', label: '3. Publish live', done: uploadStage === 'done', active: uploadStage === 'publishing' },
                  ].map((step) => (
                    <span
                      key={step.key}
                      className={`flex items-center gap-1 truncate ${
                        step.done
                          ? 'font-semibold text-emerald-700'
                          : step.active
                            ? 'font-bold text-[#D9232D]'
                            : 'text-slate-400'
                      }`}
                    >
                      {step.done ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                      ) : step.active ? (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                      ) : (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                      )}
                      <span className="truncate">{step.label}</span>
                    </span>
                  ))}
                </div>

                <p className="mt-1.5 text-[11px] font-medium text-slate-500 tabular-nums">
                  {uploadProgress.total > 0
                    ? `${formatApkBytes(uploadProgress.loaded)} / ${formatApkBytes(uploadProgress.total)} transferred`
                    : 'Starting upload…'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="button"
                disabled={!validation.valid || busy || readingMetadata}
                onClick={() => void publish()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91822] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                <span>
                  {busy
                    ? uploadStage === 'publishing'
                      ? 'Publishing release…'
                      : `Uploading APK (${uploadProgress.percent}%)…`
                    : 'Upload and publish'}
                </span>
              </button>
              <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                {validation.reason && file
                  ? validation.reason
                  : 'The new version code must be higher than the live one, and match the versionCode inside the APK.'}
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Column: Live Status & Android Prompt Preview */}
        <div className="space-y-5 lg:col-span-5">
          {/* Live Release Card */}
          <div className="rounded-2xl border border-slate-200/85 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-600">
                Live production build
              </h3>
              {current && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${
                    current.minVersionCode >= current.versionCode
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {current.minVersionCode >= current.versionCode ? (
                    <>
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Mandatory
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Optional
                    </>
                  )}
                </span>
              )}
            </div>

            {loadingLive ? (
              <div className="mt-4 space-y-2.5" aria-hidden="true">
                <div className="h-7 w-40 rounded-lg bg-slate-200/80 animate-shimmer" />
                <div className="h-4 w-56 rounded-lg bg-slate-100 animate-shimmer" />
                <div className="h-10 w-full rounded-xl bg-slate-100 animate-shimmer" />
              </div>
            ) : liveError ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs font-medium text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{liveError}</span>
              </div>
            ) : current ? (
              <div className="mt-3">
                <p className="font-display text-2xl font-extrabold tracking-tight text-slate-950 tabular-nums">
                  v{current.versionName}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-slate-500 tabular-nums">
                  <span>Version code {current.versionCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatUpdatedAt(current.updatedAt)}</span>
                </p>

                {current.notes?.length > 0 && (
                  <ul className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3 text-xs font-medium text-slate-600">
                    {current.notes.map((note) => (
                      <li key={note} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {safeLiveApkUrl && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3.5">
                    <a
                      href={safeLiveApkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download APK
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyLiveLink()}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-center">
                <p className="text-sm font-bold text-slate-800">Nothing published yet</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Upload your first signed APK on the left to enable in-app updates.
                </p>
              </div>
            )}
          </div>

          {/* Live Android Update Prompt Preview */}
          <div className="rounded-2xl border border-slate-200/85 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-600">
                  Android prompt preview
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {force ? 'Forced modal' : 'Dismissible'}
              </span>
            </div>

            <div className="mt-3.5 rounded-2xl bg-slate-900/95 p-3.5">
              <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                <div className="bg-[#090808] px-4 py-3.5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-gradient-to-br from-[#D9232D] to-[#a6161f] text-white">
                      <Rocket className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white/70 tabular-nums">
                        Rofik Godi Center · version {previewVersion}
                      </p>
                      <p className="text-sm font-extrabold text-white">New update available</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5">
                  <ul className="space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/85 p-3 text-xs leading-snug text-slate-700">
                    {previewNotes.map((line, index) => (
                      <li key={`${line}-${index}`} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
                        <span className={parsedNotes.length === 0 ? 'text-slate-400' : ''}>{line}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex gap-2">
                    {!force && (
                      <span className="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700">
                        Later
                      </span>
                    )}
                    <span className="flex min-h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-[#D9232D] text-xs font-bold text-white">
                      <Download className="h-3.5 w-3.5" />
                      Update now
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
