import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Download, Image, Plus, Tag, Trash2, Upload } from 'lucide-react';
import type { Product, VehicleCategory } from '../types';
import type { AdminNotification } from '../lib/supabaseAdmin';
import { loadAdminJsonSetting, saveAdminJsonSetting } from '../lib/supabaseAdmin';
import type { AdminOrderRecord } from '../lib/supabaseAdminOrders';
import { uploadStorefrontBannerImage } from '../lib/supabaseBanners';
import { AdminNotificationComposer } from './AdminNotificationComposer';
import { ConfirmDialog } from './ConfirmDialog';
import {
  deleteAdminNotificationCampaign,
  loadAdminNotificationCampaigns,
  type AdminCustomer,
  type AdminNotificationCampaign,
} from '../lib/supabaseAdmin';

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const dateLabel = (value: string) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const categories: Array<{ id: VehicleCategory; name: string; description: string }> = [
  { id: 'bike', name: 'Bike Covers', description: 'Protective covers and bike-fit accessories.' },
  { id: 'scooter', name: 'Scooter Covers', description: 'Weather-ready covers for scooters.' },
  { id: 'toto', name: 'Toto Covers', description: 'Covers for toto and e-rickshaw vehicles.' },
  { id: 'cushion', name: 'Cushions', description: 'Seat cushions and comfort products.' },
  { id: 'accessory', name: 'Accessories', description: 'Additional products and add-ons.' },
];

export function CategoriesView({
  products,
  onManageProducts,
}: {
  products: Product[];
  onManageProducts: () => void;
}) {
  return (
    <section>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
            Catalog structure
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Categories</h2>
          <p className="mt-1 text-xs text-slate-500">
            Product categories currently supported by the storefront catalog.
          </p>
        </div>
        <button
          onClick={onManageProducts}
          className="rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white"
        >
          Manage products
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const rows = products.filter((product) => product.category === category.id);
          return (
            <article
              key={category.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-[#D9232D]">
                  <Tag className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                  {rows.length} {rows.length === 1 ? 'product' : 'products'}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-black">{category.name}</h3>
              <p className="mt-1 min-h-8 text-[11px] leading-relaxed text-slate-500">
                {category.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px]">
                <span className="text-slate-400">In stock</span>
                <b>{rows.filter((product) => product.inStock).length}</b>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[11px] leading-relaxed text-blue-800">
        <b>Category structure:</b> this repo uses a fixed, typed set of catalog categories shared
        with product filters and Supabase constraints. Add, rename or remove category keys only
        alongside a schema and storefront migration; existing product assignment is managed from
        Products.
      </div>
    </section>
  );
}

type StoreBanner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel: string;
  active: boolean;
};
const emptyBanner = (): StoreBanner => ({
  id: crypto.randomUUID(),
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '/home',
  buttonLabel: 'Shop now',
  active: true,
});

export function BannersView({ notify }: { notify: (message: string) => void }) {
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [draft, setDraft] = useState<StoreBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    void loadAdminJsonSetting<StoreBanner[]>('store_banners', []).then((result) => {
      if (!active) return;
      if (result.error)
        notify('Could not load banner settings. Verify your admin access and database migration.');
      else setBanners(Array.isArray(result.data) ? result.data : []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [notify]);
  const persist = async (next: StoreBanner[]) => {
    setSaving(true);
    const result = await saveAdminJsonSetting('store_banners', next);
    setSaving(false);
    if (result.error) {
      notify(`Banner settings were not saved: ${result.error.message}`);
      return false;
    }
    setBanners(next);
    notify('Banner settings saved');
    return true;
  };
  const setField = <K extends keyof StoreBanner>(key: K, value: StoreBanner[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const result = await uploadStorefrontBannerImage(file);
      setField('imageUrl', result.url);
      notify('Banner image uploaded');
    } catch (error) {
      notify(`Banner image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
    }
  };
  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft?.title.trim()) {
      notify('Enter a banner title');
      return;
    }
    const next = banners.some((banner) => banner.id === draft.id)
      ? banners.map((banner) => (banner.id === draft.id ? draft : banner))
      : [draft, ...banners];
    if (await persist(next)) setDraft(null);
  };
  const toggleActive = (banner: StoreBanner) =>
    void persist(
      banners.map((item) => (item.id === banner.id ? { ...item, active: !item.active } : item)),
    );
  const remove = (id: string) => void persist(banners.filter((item) => item.id !== id));
  return (
    <section>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
            Storefront content
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Banners</h2>
          <p className="mt-1 text-xs text-slate-500">
            Manage banner content saved to the admin settings table.
          </p>
        </div>
        <button
          onClick={() => setDraft(emptyBanner())}
          className="inline-flex items-center gap-2 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add banner
        </button>
      </div>
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-900">
        <b>Storefront feed:</b> active banners appear in the home-page carousel. Paused banners stay
        hidden, and the existing hero slides remain as the fallback when no banner is active.
      </div>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
          Loading banners…
        </div>
      ) : banners.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner) => (
            <article
              key={banner.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative h-40 bg-slate-100">
                {banner.imageUrl ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-slate-300">
                    <Image className="h-10 w-10" />
                  </div>
                )}
                <span
                  className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${banner.active ? 'bg-emerald-100 text-emerald-700' : 'bg-white/90 text-slate-500'}`}
                >
                  {banner.active ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="p-4">
                <h3 className="truncate text-sm font-black">{banner.title}</h3>
                <p className="mt-1 min-h-5 truncate text-[11px] text-slate-500">
                  {banner.subtitle || 'No subtitle'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setDraft(banner)}
                    className="text-[11px] font-bold text-slate-700"
                  >
                    Edit
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleActive(banner)}
                      className="text-[11px] font-bold text-blue-700"
                    >
                      {banner.active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => remove(banner.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <Image className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No banners yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Create a banner draft to configure campaign content.
          </p>
        </div>
      )}
      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={(event) => void saveDraft(event)}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">
                {banners.some((banner) => banner.id === draft.id) ? 'Edit banner' : 'New banner'}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-sm font-bold text-slate-400"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-[11px] font-bold text-slate-600">
                Title
                <input
                  required
                  maxLength={90}
                  value={draft.title}
                  onChange={(event) => setField('title', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                />
              </label>
              <label className="text-[11px] font-bold text-slate-600">
                Subtitle
                <input
                  maxLength={180}
                  value={draft.subtitle}
                  onChange={(event) => setField('subtitle', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                />
              </label>
              <label className="text-[11px] font-bold text-slate-600">
                Banner image
                <div className="mt-1 flex gap-2">
                  <input
                    type="url"
                    value={draft.imageUrl}
                    onChange={(event) => setField('imageUrl', event.target.value)}
                    placeholder="https://…"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    void uploadImage(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">
                  Upload JPG, PNG, WEBP or GIF; it is converted to WebP and saved securely.
                </span>
              </label>
              <label className="text-[11px] font-bold text-slate-600">
                Shop button link
                <input
                  value={draft.linkUrl}
                  onChange={(event) => setField('linkUrl', event.target.value)}
                  placeholder="/shop or https://example.com/page"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">
                  Tapping the button opens this internal page or external website.
                </span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] font-bold text-slate-600">
                  Button label
                  <input
                    value={draft.buttonLabel}
                    onChange={(event) => setField('buttonLabel', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                  />
                </label>
                <label className="flex items-center gap-2 pt-5 text-[11px] font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) => setField('active', event.target.checked)}
                    className="h-4 w-4 accent-[#D9232D]"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save banner'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export function NotificationsView({
  notifications,
  customers,
  onRead,
  onReadAll,
  onCampaignDeleted,
  notify,
}: {
  notifications: AdminNotification[];
  customers: AdminCustomer[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onCampaignDeleted: (campaignId: string) => void;
  notify: (message: string) => void;
}) {
  const [campaigns, setCampaigns] = useState<AdminNotificationCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [pendingCampaign, setPendingCampaign] = useState<AdminNotificationCampaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);

  const refreshCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const response = await loadAdminNotificationCampaigns();
      setCampaigns(response.data);
      setCampaignsError(response.error?.message || '');
    } catch (error) {
      setCampaignsError(error instanceof Error ? error.message : 'Could not load sent notifications.');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCampaigns();
  }, [refreshCampaigns]);

  const confirmDeleteCampaign = async () => {
    if (!pendingCampaign || deletingCampaign) return;
    setDeletingCampaign(true);
    setCampaignsError('');
    try {
      const result = await deleteAdminNotificationCampaign(pendingCampaign.campaign_id);
      if (result.error) {
        setCampaignsError(result.error.message);
        return;
      }
      setCampaigns((current) => current.filter((item) => item.campaign_id !== pendingCampaign.campaign_id));
      onCampaignDeleted(pendingCampaign.campaign_id);
      notify(`Notification removed from ${result.count} recipient inbox${result.count === 1 ? '' : 'es'}.`);
      setPendingCampaign(null);
    } catch (error) {
      setCampaignsError(error instanceof Error ? error.message : 'Could not delete this notification.');
    } finally {
      setDeletingCampaign(false);
    }
  };

  return (
    <section>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
            Activity center
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Notifications</h2>
          <p className="mt-1 text-xs text-slate-500">
            Compose an in-app campaign, then review notifications addressed to this administrator account.
          </p>
        </div>
        <button
          onClick={onReadAll}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold"
        >
          Mark all as read
        </button>
      </div>
      <AdminNotificationComposer
        customers={customers}
        notify={notify}
        onSent={(count) => {
          notify(`Notification sent to ${count} customer${count === 1 ? '' : 's'}.`);
          void refreshCampaigns();
        }}
      />
      <section className="mb-8">
        <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Sent campaigns</p>
            <h3 className="mt-1 text-base font-black text-slate-900">Notifications sent to customers</h3>
            <p className="mt-1 text-[11px] text-slate-500">Delete a campaign to remove it from every recipient’s inbox.</p>
          </div>
          <button type="button" onClick={() => void refreshCampaigns()} disabled={campaignsLoading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 disabled:opacity-50">
            {campaignsLoading ? 'Refreshing…' : 'Refresh history'}
          </button>
        </div>
        {campaignsError && <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-semibold text-amber-800">{campaignsError}</p>}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {campaignsLoading ? (
            <p className="p-8 text-center text-xs text-slate-400">Loading sent notifications…</p>
          ) : campaigns.length ? (
            <div className="divide-y divide-slate-100">
              {campaigns.map((campaign) => (
                <article key={campaign.campaign_id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  {campaign.image_url ? (
                    <img src={campaign.image_url} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#D9232D]"><Bell className="h-5 w-5" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="max-w-full truncate text-sm font-black text-slate-900">{campaign.title}</h4>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-600">{campaign.kind}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{campaign.body}</p>
                    <p className="mt-2 text-[10px] font-medium text-slate-400">{campaign.recipient_count} recipient{campaign.recipient_count === 1 ? '' : 's'} · {dateLabel(campaign.created_at)}</p>
                  </div>
                  <button type="button" onClick={() => setPendingCampaign(campaign)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-[10px] font-black text-red-700 transition hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />Delete for everyone
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-50 text-slate-400"><Bell className="h-5 w-5" /></span>
              <p className="mt-3 text-xs font-bold text-slate-700">No active sent notifications</p>
              <p className="mt-1 text-[10px] text-slate-400">Notifications you send will appear here for up to 7 days.</p>
            </div>
          )}
        </div>
      </section>
      <div className="mb-3 mt-8">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Admin inbox</p>
        <h3 className="mt-1 text-base font-black text-slate-900">Notifications for this administrator</h3>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {notifications.length ? (
          notifications.map((item) => (
            <article
              key={item.id}
              className={`flex gap-3 border-b border-slate-100 p-4 last:border-0 ${item.read_at ? 'bg-white' : 'bg-red-50/40'}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-[#D9232D]">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.body}</p>
                {item.image_url && <img src={item.image_url} alt="" className="mt-3 max-h-36 w-auto rounded-xl object-cover" />}
                <p className="mt-2 text-[10px] text-slate-400">{dateLabel(item.created_at)}</p>
              </div>
              {!item.read_at && (
                <button
                  onClick={() => onRead(item.id)}
                  className="self-center text-[10px] font-bold text-[#D9232D]"
                >
                  Mark read
                </button>
              )}
            </article>
          ))
        ) : (
          <div className="p-14 text-center text-xs text-slate-400">
            No notifications for this admin account.
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pendingCampaign)}
        title="Delete this notification?"
        message={`This will remove “${pendingCampaign?.title || 'this notification'}” from ${pendingCampaign?.recipient_count || 0} recipient inboxes. This cannot be undone.`}
        confirmLabel={deletingCampaign ? 'Deleting…' : 'Delete for everyone'}
        onConfirm={() => void confirmDeleteCampaign()}
        onCancel={() => { if (!deletingCampaign) setPendingCampaign(null); }}
      />
    </section>
  );
}

export function ReportsView({
  metrics,
  orders,
  onExport,
  onNavigate,
}: {
  metrics: Record<string, number> | null;
  orders: AdminOrderRecord[];
  onExport: () => void;
  onNavigate: (section: 'orders' | 'products' | 'customers') => void;
}) {
  const paidOrders = orders.filter(
    (order) => order.paymentStatus === 'PAID' || order.status === 'COMPLETED',
  );
  const items = new Map<string, number>();
  paidOrders.forEach((order) =>
    order.items.forEach((item) => {
      const name = item.product_name || 'Product';
      items.set(name, (items.get(name) || 0) + Number(item.quantity || 1));
    }),
  );
  const leaders = [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <section>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
            Business intelligence
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Reports</h2>
          <p className="mt-1 text-xs text-slate-500">
            Aggregate figures from the admin metrics RPC and the latest 100 orders.
          </p>
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Total orders" value={metrics?.total_orders ?? 0} />
        <Summary label="Revenue" value={money(metrics?.total_revenue ?? 0)} />
        <Summary label="Verified payments" value={metrics?.verified_payments ?? 0} />
        <Summary label="Customers" value={metrics?.total_customers ?? 0} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black">Order status summary</h3>
          <div className="mt-4 space-y-3">
            {[
              'NEW',
              'CONFIRMED',
              'PREPARING',
              'READY_FOR_PICKUP',
              'PICKED_UP',
              'COMPLETED',
              'CANCELLED',
            ].map((status) => {
              const count = orders.filter((order) => order.status === status).length;
              const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
              return (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-[10px]">
                    <span className="font-bold text-slate-600">{status.replaceAll('_', ' ')}</span>
                    <span className="text-slate-400">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#D9232D]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="mt-4 text-[10px] font-bold text-[#D9232D]"
          >
            Open orders →
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black">Top selling products</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {leaders.map(([name, quantity]) => (
              <div key={name} className="flex items-center justify-between gap-4 py-3 text-xs">
                <span className="truncate font-semibold">{name}</span>
                <b>{quantity} sold</b>
              </div>
            ))}
            {!leaders.length && (
              <p className="py-8 text-center text-xs text-slate-400">
                No completed or paid item data in the latest 100 orders.
              </p>
            )}
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="mt-4 text-[10px] font-bold text-[#D9232D]"
          >
            Open products →
          </button>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-[11px] leading-relaxed text-blue-800">
        <b>Data note:</b> KPI totals come from the secured database function. Product/status
        breakdowns are calculated from the most recent 100 order rows currently loaded.
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
