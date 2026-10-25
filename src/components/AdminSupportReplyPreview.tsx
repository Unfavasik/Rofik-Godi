import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AttachmentMeta = { path: string; name: string; size: number; mime_type: string };

type AdminSupportReplyPreviewProps = {
  details: Record<string, unknown>;
};

const attachmentList = (value: unknown): AttachmentMeta[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AttachmentMeta => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as Record<string, unknown>;
    return typeof entry.path === 'string' && typeof entry.name === 'string' && typeof entry.mime_type === 'string';
  }).map((entry) => ({
    path: entry.path,
    name: entry.name,
    size: Number(entry.size || 0),
    mime_type: entry.mime_type,
  }));
};

export function AdminSupportReplyPreview({ details }: AdminSupportReplyPreviewProps) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  const attachments = useMemo(() => attachmentList(details.attachments), [details.attachments]);
  const images = attachments.filter((attachment) => attachment.mime_type.startsWith('image/'));
  const files = attachments.filter((attachment) => !attachment.mime_type.startsWith('image/'));
  const message = typeof details.message === 'string' ? details.message.trim() : '';

  useEffect(() => {
    let active = true;
    if (!supabase || !attachments.length) return () => { active = false; };
    void Promise.all(attachments.map(async (attachment) => {
      const result = await supabase!.storage.from('support-attachments').createSignedUrl(attachment.path, 3600);
      return result.data?.signedUrl ? [attachment.path, result.data.signedUrl] as const : null;
    })).then((entries) => {
      if (!active) return;
      setSignedUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry))));
    });
    return () => { active = false; };
  }, [attachments]);

  if (!message && !attachments.length) return null;
  return <>
    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
      {message && <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{message}</p>}
      {images.length > 0 && <div className={`${message ? 'mt-2.5' : ''} grid grid-cols-2 gap-2 sm:grid-cols-3`}>
        {images.map((attachment) => {
          const url = signedUrls[attachment.path];
          return url ? <button key={attachment.path} type="button" onClick={() => setPreview({ name: attachment.name, url })} className="group overflow-hidden rounded-xl border border-sky-100 bg-white text-left" aria-label={`Preview ${attachment.name}`}>
            <img src={url} alt={attachment.name} className="h-28 w-full object-cover transition group-hover:scale-105" loading="lazy" />
            <span className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-slate-600"><ImageIcon className="h-3.5 w-3.5 shrink-0 text-sky-600" /><span className="truncate">{attachment.name}</span></span>
          </button> : <div key={attachment.path} className="grid h-28 place-items-center rounded-xl border border-sky-100 bg-white text-[10px] text-slate-400">Loading image…</div>;
        })}
      </div>}
      {files.length > 0 && <div className="mt-2 space-y-1">{files.map((attachment) => <div key={attachment.path} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-slate-600"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{attachment.name}</span></div>)}</div>}
      {!message && attachments.length > 0 && <p className="mt-2 text-[10px] font-semibold text-slate-500">Attachment sent with this reply</p>}
    </div>
    {preview && <div role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`} className="fixed inset-0 z-[110] flex flex-col bg-slate-950/95 p-3 text-white sm:p-6" onClick={() => setPreview(null)}>
      <div className="flex items-center justify-between gap-3 pb-3" onClick={(event) => event.stopPropagation()}>
        <p className="min-w-0 truncate text-xs font-bold">{preview.name}</p>
        <div className="flex shrink-0 items-center gap-2"><a href={preview.url} download={preview.name} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-slate-900"><Download className="h-4 w-4" />Download</a><button type="button" onClick={() => setPreview(null)} aria-label="Close image preview" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><X className="h-5 w-5" /></button></div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}><img src={preview.url} alt={preview.name} className="max-h-full max-w-full rounded-xl object-contain" /></div>
    </div>}
  </>;
}
