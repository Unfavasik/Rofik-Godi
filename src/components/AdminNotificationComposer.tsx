import { useRef, useState } from 'react';
import { BellRing, ImagePlus, Link2, LoaderCircle, Send, X } from 'lucide-react';
import type { AdminCustomer } from '../lib/supabaseAdmin';
import { sendAdminNotification } from '../lib/supabaseAdmin';
import { uploadStorefrontBannerImage } from '../lib/supabaseBanners';
import { NotificationAudiencePicker, type NotificationAudience } from './NotificationAudiencePicker';

const kinds = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'product', label: 'New product' },
  { value: 'offer', label: 'Offer' },
  { value: 'update', label: 'Store update' },
];

export function AdminNotificationComposer({
  customers,
  onSent,
  notify,
}: {
  customers: AdminCustomer[];
  onSent: (count: number) => void;
  notify: (message: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('announcement');
  const [actionUrl, setActionUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audience, setAudience] = useState<NotificationAudience>('SELECTED');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const uploaded = await uploadStorefrontBannerImage(file);
      setImageUrl(uploaded.url);
      notify('Notification image uploaded');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      if (imageInput.current) imageInput.current.value = '';
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!title.trim() || !body.trim()) {
      setError('Add both a notification title and message.');
      return;
    }
    if (audience === 'SELECTED' && !selectedUserIds.length) {
      setError('Select at least one customer, or choose All customers.');
      return;
    }
    if (actionUrl.trim() && !/^\/(?!\/)|^https?:\/\//i.test(actionUrl.trim())) {
      setError('Use an internal path beginning with / or a complete http(s) link.');
      return;
    }
    if (imageUrl.trim() && !/^https?:\/\//i.test(imageUrl.trim())) {
      setError('Use a complete http(s) image URL.');
      return;
    }

    setSending(true);
    try {
      const result = await sendAdminNotification({
        title: title.trim(),
        body: body.trim(),
        kind,
        actionUrl: actionUrl.trim() || null,
        imageUrl: imageUrl.trim() || null,
        userIds: audience === 'ALL' ? null : selectedUserIds,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      onSent(result.count);
      setTitle('');
      setBody('');
      setKind('announcement');
      setActionUrl('');
      setImageUrl('');
      setAudience('SELECTED');
      setSelectedUserIds([]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4 sm:px-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#D9232D] shadow-sm ring-1 ring-rose-100">
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-black text-slate-900">Send a customer notification</h3>
          <p className="mt-1 text-[11px] text-slate-500">Create a custom in-app update for all customers or selected accounts.</p>
        </div>
      </div>

      <form onSubmit={(event) => void submit(event)} className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,.8fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-bold text-slate-600">
              Notification type
              <select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#D9232D]">
                {kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-bold text-slate-600">
              Action link <span className="font-normal text-slate-400">(optional)</span>
              <span className="relative mt-1.5 block">
                <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} maxLength={2048} placeholder="/shop" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#D9232D]" />
              </span>
            </label>
          </div>
          <label className="block text-[11px] font-bold text-slate-600">
            Title
            <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A fresh arrival for your ride" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#D9232D]" />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{title.length}/120</span>
          </label>
          <label className="block text-[11px] font-bold text-slate-600">
            Message
            <textarea required rows={4} maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the message customers will see in their notification inbox..." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-relaxed outline-none focus:border-[#D9232D]" />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{body.length}/1000</span>
          </label>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-slate-600">Notification image <span className="font-normal text-slate-400">(optional)</span></label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste an https:// image URL" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#D9232D]" />
              <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
              <button type="button" onClick={() => imageInput.current?.click()} disabled={uploading || sending} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-600 disabled:opacity-50">
                {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Upload image'}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Upload JPG, PNG, WEBP or GIF (up to 10 MB); it is converted to WebP.</p>
          </div>
          <NotificationAudiencePicker
            customers={customers}
            audience={audience}
            selectedUserIds={selectedUserIds}
            onAudienceChange={setAudience}
            onSelectedUserIdsChange={setSelectedUserIds}
            disabled={sending}
          />
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-semibold text-red-700">{error}</p>}
          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
            <p className="text-[10px] leading-relaxed text-slate-400">In-app only · Notifications expire after 7 days · No SMS or email is sent.</p>
            <button type="submit" disabled={sending || uploading || !title.trim() || !body.trim() || (audience === 'SELECTED' && !selectedUserIds.length)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : 'Send notification'}
            </button>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Live preview</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200">{audience === 'ALL' ? `All ${customers.length} accounts` : `${selectedUserIds.length} selected`}</span>
          </div>
          <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {imageUrl ? <img src={imageUrl} alt="Notification preview" className="h-36 w-full object-cover" /> : <div className="grid h-24 place-items-center bg-gradient-to-br from-red-50 to-orange-50 text-[#D9232D]"><BellRing className="h-7 w-7" /></div>}
            <div className="p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#D9232D]">{kinds.find((item) => item.value === kind)?.label}</p>
              <h4 className="mt-1.5 text-sm font-black text-slate-900">{title || 'Your notification title'}</h4>
              <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">{body || 'Your custom message will appear here.'}</p>
              {actionUrl && <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-[#D9232D]">View details <Link2 className="h-3 w-3" /></div>}
            </div>
          </article>
          {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-600"><X className="h-3 w-3" />Remove image</button>}
        </aside>
      </form>
    </section>
  );
}
