import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  EyeOff,
  Image,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import type { Product, VehicleCategory } from '../types';
import type { AdminNotification } from '../lib/supabaseAdmin';
import { loadAdminJsonSetting, saveAdminJsonSetting } from '../lib/supabaseAdmin';
import type { AdminOrderRecord } from '../lib/supabaseAdminOrders';
import {
  BANNER_FONT_OPTIONS,
  deleteProductImageIfUnreferenced,
  formatBannerScheduleWindow,
  getBannerFontClass,
  getBannerScheduleState,
  getBannerTitleSizeClass,
  normalizeBannerFontStyle,
  parseBannerScheduleDate,
  uploadStorefrontBannerImage,
  type BannerFontStyle,
  type BannerScheduleState,
} from '../lib/supabaseBanners';
import { AdminNotificationComposer } from './AdminNotificationComposer';
import { BannerLinkPicker } from './BannerLinkPicker';
import { ConfirmDialog } from './ConfirmDialog';
import {
  deleteAdminNotificationCampaign,
  loadAdminNotificationCampaigns,
  type AdminCustomer,
  type AdminNotificationCampaign,
} from '../lib/supabaseAdmin';
import {
  matchesNotificationCategoryToggle,
  type NotificationCategoryToggleFilter,
} from '../lib/notificationCategory';

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
          className="banner-cta-shine min-h-11 rounded-xl bg-[#D9232D] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-[#b91822] active:scale-[0.98]"
        >
          Manage products
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const rows = products.filter((product) => product.category === category.id);
          return (
            <article
              key={category.id}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
  startsAt?: string;
  endsAt?: string;
  fontStyle?: BannerFontStyle;
};

function toDatetimeLocalValue(value?: string | null): string {
  const date = parseBannerScheduleDate(value);
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyBanner = (): StoreBanner => ({
  id: crypto.randomUUID(),
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '/home',
  buttonLabel: 'Shop now',
  active: true,
  startsAt: '',
  endsAt: '',
  fontStyle: 'outfit',
});

const SCHEDULE_BADGE_META: Record<
  BannerScheduleState,
  { label: string; badgeClass: string; dotClass: string }
> = {
  live: {
    label: 'Live',
    badgeClass: 'bg-emerald-500/90 text-white shadow-2xs',
    dotClass: 'bg-white',
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-indigo-600/90 text-white shadow-2xs',
    dotClass: 'bg-indigo-200',
  },
  expired: {
    label: 'Ended',
    badgeClass: 'bg-rose-600/90 text-white shadow-2xs',
    dotClass: 'bg-rose-200',
  },
  paused: {
    label: 'Paused',
    badgeClass: 'bg-white/90 text-slate-600',
    dotClass: 'bg-slate-400',
  },
};

export function BannersView({ notify }: { notify: (message: string) => void }) {
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [draft, setDraft] = useState<StoreBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StoreBanner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [previewRatio, setPreviewRatio] = useState<'mobile' | 'desktop'>('mobile');
  const [now, setNow] = useState(() => new Date());
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

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

  const setField = <K extends keyof StoreBanner>(key: K, value: StoreBanner[K]) => {
    if (key === 'startsAt' || key === 'endsAt') setScheduleError('');
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const applySchedulePreset = (preset: 'always' | '24h' | '7d' | '30d' | 'weekend') => {
    setScheduleError('');
    const current = new Date();
    current.setSeconds(0, 0);
    if (preset === 'always') {
      setDraft((d) => (d ? { ...d, startsAt: '', endsAt: '' } : d));
      return;
    }
    if (preset === 'weekend') {
      const day = current.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      const start = new Date(current);
      start.setDate(current.getDate() + daysUntilSaturday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      end.setHours(23, 59, 0, 0);
      setDraft((d) =>
        d
          ? {
              ...d,
              active: true,
              startsAt: toDatetimeLocalValue(start.toISOString()),
              endsAt: toDatetimeLocalValue(end.toISOString()),
            }
          : d,
      );
      return;
    }
    const hours = preset === '24h' ? 24 : preset === '7d' ? 24 * 7 : 24 * 30;
    const end = new Date(current.getTime() + hours * 3600_000);
    setDraft((d) =>
      d
        ? {
            ...d,
            active: true,
            startsAt: toDatetimeLocalValue(current.toISOString()),
            endsAt: toDatetimeLocalValue(end.toISOString()),
          }
        : d,
    );
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please choose an image file (JPG, PNG, WEBP or GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify('Please choose an image smaller than 10MB.');
      return;
    }
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
    if (!draft) return;
    if (!draft.title.trim() && !draft.imageUrl.trim()) {
      notify('Enter a banner title or upload a banner image');
      return;
    }
    const link = draft.linkUrl.trim();
    if (link && !/^(\/|https?:\/\/)/i.test(link)) {
      notify('The link must start with "/" for an internal page or "https://" for a website.');
      return;
    }

    const parsedStart = parseBannerScheduleDate(draft.startsAt);
    const parsedEnd = parseBannerScheduleDate(draft.endsAt);
    if (draft.startsAt?.trim() && !parsedStart) {
      setScheduleError('Enter a valid start date and time.');
      notify('Enter a valid start date and time.');
      return;
    }
    if (draft.endsAt?.trim() && !parsedEnd) {
      setScheduleError('Enter a valid end date and time.');
      notify('Enter a valid end date and time.');
      return;
    }
    if (parsedStart && parsedEnd && parsedEnd.getTime() <= parsedStart.getTime()) {
      const msg = 'End date/time must be after the start date/time.';
      setScheduleError(msg);
      notify(msg);
      return;
    }

    const normalized: StoreBanner = {
      ...draft,
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      linkUrl: link,
      buttonLabel: draft.buttonLabel.trim() || 'Shop now',
      startsAt: parsedStart ? parsedStart.toISOString() : '',
      endsAt: parsedEnd ? parsedEnd.toISOString() : '',
      fontStyle: normalizeBannerFontStyle(draft.fontStyle),
    };
    const next = banners.some((banner) => banner.id === normalized.id)
      ? banners.map((banner) => (banner.id === normalized.id ? normalized : banner))
      : [normalized, ...banners];
    if (await persist(next)) {
      setScheduleError('');
      setDraft(null);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    const next = [...banners];
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next);
  };
  const toggleActive = (banner: StoreBanner) =>
    void persist(
      banners.map((item) => (item.id === banner.id ? { ...item, active: !item.active } : item)),
    );
  const remove = (banner: StoreBanner) => setPendingDelete(banner);
  const confirmRemove = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const deleted = pendingDelete;
    const saved = await persist(banners.filter((item) => item.id !== deleted.id));
    if (saved && deleted.imageUrl) {
      const storageResult = await deleteProductImageIfUnreferenced(deleted.imageUrl);
      if (storageResult.error) {
        notify(`Banner deleted, but its Storage image could not be removed: ${storageResult.error.message}`);
      } else {
        notify('Banner and its Supabase Storage image deleted');
      }
    }
    if (saved) setPendingDelete(null);
    setDeleting(false);
  };

  const counts = banners.reduce(
    (acc, banner) => {
      const state = getBannerScheduleState(banner, now);
      acc[state] += 1;
      return acc;
    },
    { live: 0, scheduled: 0, expired: 0, paused: 0 } as Record<BannerScheduleState, number>,
  );

  const describeDestination = (linkUrl: string) => {
    const clean = linkUrl.trim();
    if (/^\/(?:shop\/products|products|product)\//i.test(clean)) return 'Product link';
    if (/^https?:\/\//i.test(clean)) return 'External website';
    return 'Storefront shop';
  };

  const draftScheduleState = draft ? getBannerScheduleState(draft, now) : 'live';
  const draftBadgeMeta = SCHEDULE_BADGE_META[draftScheduleState];

  return (
    <section className="max-w-full space-y-6 overflow-x-hidden">
      {/* Header & Live Promotional Calendar Summary */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">
            Storefront content &amp; promotional calendar
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Banners
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Design, order, and schedule promotional hero slides to auto-activate and deactivate on the home storefront.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 shadow-2xs">
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>{counts.live} live</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1 text-indigo-700">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>{counts.scheduled} scheduled</span>
            </span>
            {counts.expired > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-rose-600">{counts.expired} ended</span>
              </>
            )}
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">{counts.paused} paused</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setScheduleError('');
              setDraft(emptyBanner());
            }}
            className="banner-cta-shine group/cta inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D9232D] hover:bg-[#B91C1C] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover/cta:scale-110" />
            <span>Add banner</span>
          </button>
        </div>
      </div>

      {/* Concise Workshop Banner & Scheduling Guidelines */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-amber-50/80 via-white to-rose-50/50 p-4 text-[11px] leading-relaxed text-slate-700 shadow-2xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            <b className="text-slate-900">Auto-scheduling:</b> Set optional start and end dates/times so seasonal or festival banners go live and expire automatically. When no custom banner is currently live, the default Rofik Godi Centre showcase banner appears.
          </span>
          <span>
            <b className="text-slate-900">Recommended artwork:</b> <b>1200 × 800 px (3:2 ratio)</b> — auto-converted to crisp WebP on upload.
          </span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
          Loading banners…
        </div>
      ) : banners.length ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner, index) => {
            const scheduleState = getBannerScheduleState(banner, now);
            const badgeMeta = SCHEDULE_BADGE_META[scheduleState];
            const hasSchedule = Boolean(banner.startsAt?.trim() || banner.endsAt?.trim());

            return (
              <article
                key={banner.id}
                className={`group min-w-0 overflow-hidden rounded-3xl border bg-white shadow-xs transition-all hover:shadow-md ${
                  scheduleState === 'live'
                    ? 'border-slate-200/90'
                    : scheduleState === 'scheduled'
                      ? 'border-indigo-200/90'
                      : 'border-slate-200/60 opacity-85'
                }`}
              >
                {/* Storefront-Accurate Visual Card Preview: Unobstructed Poster + Dedicated Studio Caption Bar */}
                <div
                  onClick={() => {
                    setScheduleError('');
                    setDraft({
                      ...banner,
                      startsAt: toDatetimeLocalValue(banner.startsAt),
                      endsAt: toDatetimeLocalValue(banner.endsAt),
                    });
                  }}
                  role="presentation"
                  className="w-full cursor-pointer overflow-hidden bg-gradient-to-br from-white via-rose-50/40 to-slate-100/80"
                >
                  {/* Top Stage: Smart Uncropped Image Showcase with Classic Glass Ambient Backdrop */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-b from-white via-[#FAFBFD] to-rose-50/35">
                    {banner.imageUrl ? (
                      <>
                        <img
                          src={banner.imageUrl}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-2xl saturate-150"
                        />
                        <img
                          src={banner.imageUrl}
                          alt={banner.title || 'Promotional banner'}
                          referrerPolicy="no-referrer"
                          className="relative z-10 h-full w-full object-contain p-1.5 drop-shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-rose-100/75 via-white to-amber-50/60 text-slate-400">
                        <Image className="h-10 w-10 opacity-50" />
                      </div>
                    )}

                    {/* Top Badges: Slide Order + Destination + Schedule/Active Status */}
                    <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/55 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white ring-1 ring-white/40 backdrop-blur-md">
                        <span className="text-[#FF8A8F]">#{index + 1}</span>
                        <span className="text-white/40">·</span>
                        <span className="normal-case tracking-normal text-white/95">
                          {describeDestination(banner.linkUrl)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-md ${badgeMeta.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badgeMeta.dotClass}`} />
                        {badgeMeta.label}
                      </span>
                    </div>

                    {/* Poster-Only Mode CTA Pill (when no title/subtitle is entered) */}
                    {!banner.title.trim() && !banner.subtitle.trim() && (
                      <div className="absolute inset-x-3 bottom-2.5 z-20 flex items-center justify-between gap-2">
                        <span className="banner-cta-shine inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] pl-2.5 pr-1 py-0.5 text-[10px] font-extrabold text-white shadow-md ring-1 ring-white/40">
                          <span>{banner.buttonLabel || 'Shop now'}</span>
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-white">
                            <ArrowRight className="h-2.5 w-2.5" />
                          </span>
                        </span>
                        <span className="rounded-full bg-slate-900/45 px-2 py-0.5 text-[9.5px] font-bold text-white ring-1 ring-white/45 backdrop-blur-md">
                          Poster only
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Stage: Gradient + Classic Glass Effect Editorial Bar */}
                  {(banner.title.trim() || banner.subtitle.trim()) && (
                    <div className="relative flex flex-col gap-2 border-t border-white/90 bg-gradient-to-br from-white/95 via-rose-50/60 to-slate-100/90 px-3.5 py-3 backdrop-blur-xl">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D9232D]/35 to-transparent"
                      />
                      <div className="min-w-0 w-full">
                        {banner.title.trim() && (
                          <h3
                            className={`${getBannerFontClass(banner.fontStyle)} ${getBannerTitleSizeClass(banner.title, 'card')} break-words text-balance text-slate-900`}
                          >
                            {banner.title}
                          </h3>
                        )}
                        {banner.subtitle.trim() && (
                          <p className="font-banner-subtitle mt-0.5 break-words text-[11px] font-medium leading-[1.38] text-slate-600">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-end">
                        <span className="banner-cta-shine shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] pl-3 pr-1 py-1 text-[10px] font-extrabold text-white shadow-[0_6px_16px_-4px_rgba(217,35,45,0.4)] ring-1 ring-white/40">
                          <span>{banner.buttonLabel || 'Shop now'}</span>
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-white">
                            <ArrowRight className="h-2.5 w-2.5" />
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Promotional Schedule Strip */}
                <div
                  className={`flex items-center justify-between gap-2 border-b px-3.5 py-2 text-[10.5px] font-semibold ${
                    hasSchedule
                      ? scheduleState === 'scheduled'
                        ? 'border-indigo-100 bg-indigo-50/60 text-indigo-800'
                        : scheduleState === 'expired'
                          ? 'border-rose-100 bg-rose-50/60 text-rose-700'
                          : 'border-emerald-100 bg-emerald-50/50 text-emerald-800'
                      : 'border-slate-100 bg-slate-50/70 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
                    <span className="truncate">
                      {formatBannerScheduleWindow(banner.startsAt, banner.endsAt)}
                    </span>
                  </div>
                  {hasSchedule && (
                    <span className="shrink-0 font-extrabold uppercase tracking-wider text-[9px]">
                      {scheduleState === 'scheduled'
                        ? 'Upcoming'
                        : scheduleState === 'expired'
                          ? 'Expired'
                          : scheduleState === 'live'
                            ? 'In window'
                            : 'Paused'}
                    </span>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || saving}
                      aria-label={`Move ${banner.title} up`}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === banners.length - 1 || saving}
                      aria-label={`Move ${banner.title} down`}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleError('');
                        setDraft({
                          ...banner,
                          startsAt: toDatetimeLocalValue(banner.startsAt),
                          endsAt: toDatetimeLocalValue(banner.endsAt),
                        });
                      }}
                      className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleActive(banner)}
                      className={`inline-flex min-h-10 items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-colors ${
                        banner.active
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {banner.active ? (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(banner)}
                      className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-[11px] font-bold text-[#D9232D] transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
            <Image className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-black text-slate-800">No custom banners yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            The home storefront is currently showing the default Rofik Godi Centre showcase banner. Create a banner to launch your own promotion.
          </p>
          <button
            type="button"
            onClick={() => {
              setScheduleError('');
              setDraft(emptyBanner());
            }}
            className="banner-cta-shine group/cta mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#D9232D] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#B91C1C] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover/cta:scale-110" />
            <span>Create first banner</span>
          </button>
        </div>
      )}

      {/* Banner Studio Modal with Live Interactive Storefront Preview & Schedule Picker */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-950/50 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <form
            onSubmit={(event) => void saveDraft(event)}
            className="flex max-h-[92dvh] w-full max-w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl sm:max-h-[90dvh] sm:max-w-xl sm:rounded-3xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
                  Banner Studio &amp; Schedule
                </p>
                <h3 className="truncate text-lg font-black text-slate-900">
                  {banners.some((banner) => banner.id === draft.id) ? 'Edit banner' : 'New banner'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScheduleError('');
                  setDraft(null);
                }}
                className="min-h-11 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5">
            {/* Live Storefront WYSIWYG Preview — mirrors the upgraded HeroBanner */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Live Storefront Preview
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${draftBadgeMeta.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${draftBadgeMeta.dotClass}`} />
                    <span>{draftBadgeMeta.label}</span>
                  </span>
                </div>

                {/* Mobile 16:9 vs Widescreen 2:1 Viewport Switcher */}
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/75 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewRatio('mobile')}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      previewRatio === 'mobile'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mobile 16:9
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewRatio('desktop')}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      previewRatio === 'desktop'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Widescreen 2:1
                  </button>
                </div>
              </div>

              <div className="classic-glass relative overflow-hidden rounded-[22px] bg-gradient-to-br from-white/95 via-rose-50/45 to-slate-100/90 shadow-[0_16px_36px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/[0.08]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-30 rounded-[22px] ring-1 ring-inset ring-white/80"
                />
                {/* Top Stage: Smart Uncropped Image Showcase with Classic Glass Ambient Aura */}
                <div
                  className={`relative w-full overflow-hidden bg-gradient-to-b from-white via-[#FAFBFD] to-rose-50/40 transition-all duration-300 ${
                    previewRatio === 'mobile' ? 'aspect-[16/9]' : 'aspect-[2/1]'
                  }`}
                >
                  {draft.imageUrl ? (
                    <>
                      <img
                        src={draft.imageUrl}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-2xl saturate-150"
                      />
                      <img
                        src={draft.imageUrl}
                        alt="Banner preview"
                        referrerPolicy="no-referrer"
                        className="relative z-10 h-full w-full object-contain p-1.5 sm:p-2 drop-shadow-[0_10px_22px_rgba(15,23,42,0.12)]"
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-100/80 via-white to-amber-50/70">
                      <div className="banner-ambient-pulse pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#D9232D]/15 blur-2xl" />
                    </div>
                  )}

                  {/* Bottom-Right Frosted Carousel Dot Indicators & Poster-Only CTA */}
                  <div className="absolute inset-x-3.5 bottom-3 z-20 flex items-center justify-between gap-3 sm:inset-x-4">
                    {!(draft.title.trim() || draft.subtitle.trim() || !draft.imageUrl) ? (
                      <div className="banner-cta-shine shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] pl-3 pr-1.5 py-1 text-[10.5px] font-extrabold text-white shadow-md ring-1 ring-white/40">
                        <span>{draft.buttonLabel.trim() || 'Shop now'}</span>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    ) : (
                      <span />
                    )}

                    <div className="ml-auto flex items-center gap-1.5 rounded-full bg-slate-900/45 px-2.5 py-1.5 shadow-[0_4px_14px_rgba(15,23,42,0.2)] ring-1 ring-white/55 backdrop-blur-md">
                      <span className="relative h-1.5 w-6 overflow-hidden rounded-full bg-white/35">
                        <span className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-[#FF4D58]" />
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-white/65" />
                    </div>
                  </div>
                </div>

                {/* Bottom Stage: Gradient + Classic Glass Effect Editorial Panel */}
                {(draft.title.trim() || draft.subtitle.trim() || !draft.imageUrl) && (
                  <div className="relative z-20 flex flex-col gap-2.5 border-t border-white/90 bg-gradient-to-br from-white/92 via-rose-50/65 to-slate-100/90 px-4 py-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D9232D]/35 to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="banner-ambient-pulse pointer-events-none absolute -left-8 -top-4 h-20 w-36 rounded-full bg-rose-400/15 blur-2xl"
                    />
                    <div className="relative min-w-0 flex-1">
                      {(draft.title.trim() || !draft.imageUrl) && (
                        <p
                          className={`${getBannerFontClass(draft.fontStyle)} ${getBannerTitleSizeClass(
                            draft.title.trim() || 'Your headline appears here',
                            'preview',
                          )} break-words text-balance text-slate-900`}
                        >
                          {draft.title.trim() || 'Your headline appears here'}
                        </p>
                      )}
                      {(draft.subtitle.trim() || (!draft.title.trim() && !draft.imageUrl)) && (
                        <p className="font-banner-subtitle mt-1 break-words text-[11.5px] sm:text-xs font-medium leading-[1.4] text-slate-600">
                          {draft.subtitle.trim() || 'Add a subtitle to highlight offers, fitment or fabric quality.'}
                        </p>
                      )}
                    </div>

                    <div className="relative flex items-center justify-end sm:shrink-0">
                      <div className="banner-cta-shine shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91C1C] pl-3.5 pr-1.5 py-1 text-[10.5px] font-extrabold text-white shadow-[0_8px_18px_-4px_rgba(217,35,45,0.4)] ring-1 ring-white/40">
                        <span>{draft.buttonLabel.trim() || 'Shop now'}</span>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-white">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold text-slate-800">
                  Banner Studio Caption{' '}
                  <span className="font-normal text-slate-400">
                    (displayed cleanly below the poster — never covers your image)
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    {
                      label: 'Monsoon Fit',
                      title: 'Waterproof Monsoon Seat Covers',
                      subtitle: 'Double-stitched weather protection for bikes & scooters.',
                    },
                    {
                      label: 'Cushion Upgrade',
                      title: 'All-Day Riding Comfort Cushions',
                      subtitle: 'High-density foam & custom piping fitted to your model.',
                    },
                    {
                      label: 'Toto Set',
                      title: 'Heavy-Duty Toto & E-Rickshaw Covers',
                      subtitle: 'Full passenger & driver seat sets built for daily durability.',
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        setField('title', tpl.title);
                        setField('subtitle', tpl.subtitle);
                      }}
                      className="rounded-lg border border-slate-200 bg-white hover:border-[#D9232D] hover:text-[#D9232D] px-2 py-1 text-[10px] font-bold text-slate-600 transition-colors"
                    >
                      + {tpl.label}
                    </button>
                  ))}
                  {(draft.title || draft.subtitle) && (
                    <button
                      type="button"
                      onClick={() => {
                        setField('title', '');
                        setField('subtitle', '');
                      }}
                      className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-[#D9232D] transition-colors"
                    >
                      Clear text (Image-only)
                    </button>
                  )}
                </div>
              </div>

              <label className="text-[11px] font-bold text-slate-700">
                <span className="flex items-center justify-between">
                  <span>Title</span>
                  <span className="text-[10px] font-medium text-slate-400">
                    Compact bottom-left headline ({draft.title.length}/90)
                  </span>
                </span>
                <input
                  required={!draft.imageUrl.trim()}
                  maxLength={90}
                  placeholder="e.g. Custom Monsoon Seat Covers (or leave blank for image-only banner)"
                  value={draft.title}
                  onChange={(event) => setField('title', event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-base font-semibold text-slate-900 focus:border-[#D9232D] focus:bg-white focus:outline-none sm:text-xs"
                />
              </label>

              <label className="text-[11px] font-bold text-slate-700">
                <span className="flex items-center justify-between">
                  <span>Subtitle</span>
                  <span className="text-[10px] font-medium text-slate-400">
                    Single-line caption ({draft.subtitle.length}/180)
                  </span>
                </span>
                <input
                  maxLength={180}
                  placeholder="e.g. Waterproof double-stitched covers custom-fitted for every ride"
                  value={draft.subtitle}
                  onChange={(event) => setField('subtitle', event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-base font-medium text-slate-900 focus:border-[#D9232D] focus:bg-white focus:outline-none sm:text-xs"
                />
              </label>

              {/* Google Font Typography Selector */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-[#D9232D]">
                      <Type className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        Google Font Headline Style
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Curated Google Fonts with automatic optical sizing for titles &amp; subtitles
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BANNER_FONT_OPTIONS.map((option) => {
                    const selected = normalizeBannerFontStyle(draft.fontStyle) === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setField('fontStyle', option.id)}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                          selected
                            ? 'border-[#D9232D] bg-white ring-2 ring-[#D9232D]/15 shadow-2xs'
                            : 'border-slate-200/90 bg-white/80 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <span
                          className={`${option.className} text-sm leading-tight text-slate-900`}
                        >
                          {option.label}
                        </span>
                        <span className="mt-1 text-[9.5px] font-medium text-slate-500">
                          {option.familyName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="text-[11px] font-bold text-slate-700">
                Banner image
                <div
                  className="mt-1"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void uploadImage(event.dataTransfer.files?.[0]);
                  }}
                >
                  {draft.imageUrl ? (
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200">
                      <div className="aspect-[3/2] w-full bg-slate-100">
                        <img
                          src={draft.imageUrl}
                          alt="Banner image preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {uploadingImage && (
                        <div className="absolute inset-0 grid place-items-center bg-white/75 text-[11px] font-bold text-slate-700">
                          Uploading…
                        </div>
                      )}
                      <div className="absolute right-2.5 top-2.5 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="rounded-xl bg-white/95 px-3 py-1.5 text-[10.5px] font-bold text-slate-700 shadow disabled:opacity-50"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setField('imageUrl', '')}
                          disabled={uploadingImage}
                          className="rounded-xl bg-white/95 px-3 py-1.5 text-[10.5px] font-bold text-red-600 shadow disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="grid aspect-[3/2] w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:border-[#D9232D] hover:bg-red-50/40 disabled:opacity-50"
                    >
                      <span className="pointer-events-none px-4">
                        <Upload className="mx-auto h-6 w-6 text-slate-400" />
                        <span className="mt-2 block text-[11px] font-bold text-slate-600">
                          {uploadingImage ? 'Uploading…' : 'Click or drop an image to upload'}
                        </span>
                        <span className="mt-1 block text-[10px] font-normal text-slate-400">
                          JPG, PNG, WEBP or GIF · up to 10MB
                        </span>
                      </span>
                    </button>
                  )}
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
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => setField('imageUrl', event.target.value)}
                  placeholder="…or paste an image URL (https://…)"
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-base font-normal focus:border-[#D9232D] focus:bg-white focus:outline-none sm:text-[11px]"
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-400">
                  Recommended: 1200 × 800 px (3:2 landscape). Automatically converted to WebP.
                </span>
              </label>

              <label className="text-[11px] font-bold text-slate-700">
                Button destination
                <span className="mt-1 block font-normal">
                  <BannerLinkPicker
                    value={draft.linkUrl}
                    onChange={(linkUrl) => setField('linkUrl', linkUrl)}
                  />
                </span>
              </label>

              {/* Promotional Schedule Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-[#D9232D]">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        Promotional Schedule <span className="font-normal text-slate-400">(optional)</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Automatically activate and deactivate this banner by date &amp; time
                      </p>
                    </div>
                  </div>
                  {(draft.startsAt || draft.endsAt) && (
                    <button
                      type="button"
                      onClick={() => applySchedulePreset('always')}
                      className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Clear schedule
                    </button>
                  )}
                </div>

                {/* Quick Schedule Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Quick set:</span>
                  {[
                    { id: 'always' as const, label: 'Always on' },
                    { id: '24h' as const, label: 'Next 24h' },
                    { id: '7d' as const, label: '7 days' },
                    { id: '30d' as const, label: '30 days' },
                    { id: 'weekend' as const, label: 'This weekend' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applySchedulePreset(preset.id)}
                      className="rounded-lg border border-slate-200/90 bg-white hover:border-[#D9232D] hover:text-[#D9232D] px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Start & End Date/Time Inputs */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <label htmlFor="banner-starts-at" className="text-[11px] font-bold text-slate-700">
                        Start date &amp; time
                      </label>
                      {draft.startsAt && (
                        <button
                          type="button"
                          onClick={() => setField('startsAt', '')}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      id="banner-starts-at"
                      type="datetime-local"
                      value={draft.startsAt || ''}
                      onChange={(event) => setField('startsAt', event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 focus:border-[#D9232D] focus:outline-none sm:text-xs"
                    />
                    <span className="mt-1 block text-[10px] text-slate-400">
                      Leave blank to start immediately
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <label htmlFor="banner-ends-at" className="text-[11px] font-bold text-slate-700">
                        End date &amp; time
                      </label>
                      {draft.endsAt && (
                        <button
                          type="button"
                          onClick={() => setField('endsAt', '')}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      id="banner-ends-at"
                      type="datetime-local"
                      value={draft.endsAt || ''}
                      min={draft.startsAt || undefined}
                      onChange={(event) => setField('endsAt', event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 focus:border-[#D9232D] focus:outline-none sm:text-xs"
                    />
                    <span className="mt-1 block text-[10px] text-slate-400">
                      Leave blank to run indefinitely
                    </span>
                  </div>
                </div>

                {scheduleError && (
                  <p role="alert" className="rounded-xl bg-red-50 border border-red-200/80 px-3 py-2 text-[11px] font-bold text-red-600">
                    {scheduleError}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-[10.5px] ring-1 ring-slate-200/80">
                  <span className="min-w-0 truncate font-semibold text-slate-600">
                    {formatBannerScheduleWindow(draft.startsAt, draft.endsAt)}
                  </span>
                  <span className="shrink-0 font-extrabold text-slate-800">
                    Status: {draftBadgeMeta.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Button label
                    <input
                      value={draft.buttonLabel}
                      onChange={(event) => setField('buttonLabel', event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-base font-semibold text-slate-900 focus:border-[#D9232D] focus:bg-white focus:outline-none sm:text-xs"
                    />
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {['Shop now', 'Explore Catalog', 'View Offer', 'Custom Fitment'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setField('buttonLabel', preset)}
                        className={`min-h-8 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                          draft.buttonLabel === preset
                            ? 'bg-[#D9232D] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 self-start rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs font-bold text-slate-700 sm:mt-5">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) => setField('active', event.target.checked)}
                    className="h-4 w-4 accent-[#D9232D]"
                  />
                  <div>
                    <span className="block text-xs font-extrabold text-slate-900">Enabled</span>
                    <span className="block text-[10px] font-medium text-slate-500">
                      Uncheck to pause regardless of schedule
                    </span>
                  </div>
                </label>
              </div>
            </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-white px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setScheduleError('');
                  setDraft(null);
                }}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="banner-cta-shine min-h-11 rounded-xl bg-[#D9232D] hover:bg-[#B91C1C] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save banner'}
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this banner?"
        message={`This will remove “${pendingDelete?.title || 'this banner'}” and its uploaded image from Supabase Storage when it is not used elsewhere.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete banner'}
        onConfirm={() => void confirmRemove()}
        onCancel={() => { if (!deleting) setPendingDelete(null); }}
      />
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
  focusCampaignId,
  onFocusHandled,
}: {
  notifications: AdminNotification[];
  customers: AdminCustomer[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onCampaignDeleted: (campaignId: string) => void;
  notify: (message: string) => void;
  focusCampaignId?: string | null;
  onFocusHandled?: () => void;
}) {
  const [campaigns, setCampaigns] = useState<AdminNotificationCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [pendingCampaign, setPendingCampaign] = useState<AdminNotificationCampaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategoryToggleFilter>('All');

  const categoryOptions: NotificationCategoryToggleFilter[] = ['All', 'Orders', 'Promotions', 'Support', 'System'];
  const filteredCampaigns = campaigns.filter((campaign) =>
    matchesNotificationCategoryToggle(campaign, categoryFilter),
  );
  const filteredInboxNotifications = notifications.filter((item) =>
    matchesNotificationCategoryToggle(item, categoryFilter),
  );
  const categoryCountFor = (category: NotificationCategoryToggleFilter) =>
    campaigns.filter((campaign) => matchesNotificationCategoryToggle(campaign, category)).length +
    notifications.filter((item) => matchesNotificationCategoryToggle(item, category)).length;

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

  const handledFocusId = useRef<string | null>(null);
  useEffect(() => {
    if (!focusCampaignId || campaignsLoading || handledFocusId.current === focusCampaignId) return;
    handledFocusId.current = focusCampaignId;
    const campaignRow = document.getElementById(`admin-campaign-${focusCampaignId}`);
    if (campaignRow) campaignRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else notify('This campaign is no longer in the recipient history; its activity record is still available.');
    onFocusHandled?.();
  }, [campaigns, campaignsLoading, focusCampaignId, notify, onFocusHandled]);

  const confirmDeleteCampaign = async () => {
    if (!pendingCampaign || deletingCampaign) return;
    setDeletingCampaign(true);
    setCampaignsError('');
    try {
      const result = await deleteAdminNotificationCampaign(
        pendingCampaign.campaign_id,
        pendingCampaign.image_url,
      );
      if (result.error) {
        setCampaignsError(result.error.message);
        return;
      }
      setCampaigns((current) => current.filter((item) => item.campaign_id !== pendingCampaign.campaign_id));
      onCampaignDeleted(pendingCampaign.campaign_id);
      notify(`Notification removed from ${result.count} recipient inbox${result.count === 1 ? '' : 'es'}.`);
      if (result.storageError) {
        notify(`Notification removed, but its Storage image could not be deleted: ${result.storageError.message}`);
      } else if (pendingCampaign.image_url) {
        notify('Notification and its Supabase Storage image deleted');
      }
      setPendingCampaign(null);
    } catch (error) {
      setCampaignsError(error instanceof Error ? error.message : 'Could not delete this notification.');
    } finally {
      setDeletingCampaign(false);
    }
  };

  return (
    <section>
      <div className="relative mb-7 overflow-hidden rounded-3xl border border-slate-200/85 bg-gradient-to-br from-white via-white to-rose-50/35 p-5 shadow-[0_10px_32px_-18px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/70 bg-red-50/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9232D]" />
              Activity center
            </span>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Notifications
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Compose an in-app campaign, then review notifications addressed to this administrator account.
            </p>
          </div>
          <button
            onClick={onReadAll}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-2xs transition hover:border-red-200 hover:bg-red-50/40 hover:text-[#D9232D]"
          >
            Mark all as read
          </button>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div
            role="tablist"
            aria-label="Filter notifications by category"
            className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100/90 p-1"
          >
            {categoryOptions.map((category) => {
              const active = categoryFilter === category;
              const count = categoryCountFor(category);
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategoryFilter(category)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-white text-[#D9232D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{category}</span>
                  <span className={`text-[10.5px] tabular-nums ${active ? 'text-[#D9232D]/75' : 'text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
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
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Sent campaigns</p>
            <h3 className="mt-1 font-display text-base font-black text-slate-900">Notifications sent to customers</h3>
            <p className="mt-1 text-[11px] font-medium text-slate-500">Delete a campaign to remove it from every recipient’s inbox.</p>
          </div>
          <button type="button" onClick={() => void refreshCampaigns()} disabled={campaignsLoading} className="min-h-11 self-start rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto">
            {campaignsLoading ? 'Refreshing…' : 'Refresh history'}
          </button>
        </div>
        {campaignsError && <p role="alert" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-semibold text-amber-800">{campaignsError}</p>}
        <div className="overflow-hidden rounded-3xl border border-slate-200/85 bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.07)]">
          {campaignsLoading ? (
            <div className="divide-y divide-slate-100 p-4 space-y-3">
              <p className="sr-only">Loading sent notifications…</p>
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 py-2">
                  <div className="h-14 w-16 shrink-0 rounded-2xl animate-shimmer" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-48 max-w-full rounded-lg animate-shimmer" />
                    <div className="h-3 w-72 max-w-full rounded-lg animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCampaigns.length ? (
            <div className="divide-y divide-slate-100">
              {filteredCampaigns.map((campaign) => (
                <article id={`admin-campaign-${campaign.campaign_id}`} key={campaign.campaign_id} className="flex min-w-0 flex-col gap-4 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:p-5">
                  {campaign.image_url ? (
                    <img src={campaign.image_url} alt="" className="h-16 w-20 shrink-0 rounded-2xl object-cover shadow-2xs" />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#D9232D] ring-1 ring-rose-100"><Bell className="h-5 w-5" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="max-w-full break-words text-sm font-black text-slate-900 sm:truncate">{campaign.title}</h4>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-600">{campaign.kind}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-slate-600">{campaign.body}</p>
                    <p className="mt-2 text-[10px] font-semibold text-slate-400 tabular-nums">{campaign.recipient_count} recipient{campaign.recipient_count === 1 ? '' : 's'} · {dateLabel(campaign.created_at)}</p>
                  </div>
                  <button type="button" onClick={() => setPendingCampaign(campaign)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-[11px] font-black text-red-700 shadow-2xs transition hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />Delete for everyone
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400"><Bell className="h-5 w-5" /></span>
              <p className="mt-3 text-xs font-extrabold text-slate-700">
                {campaigns.length > 0 && categoryFilter !== 'All'
                  ? `No ${categoryFilter.toLowerCase()} campaigns found`
                  : 'No active sent notifications'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {campaigns.length > 0 && categoryFilter !== 'All'
                  ? 'Switch category filters to view all sent campaigns.'
                  : 'Notifications you send will appear here for up to 7 days.'}
              </p>
              {campaigns.length > 0 && categoryFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('All')}
                  className="mt-4 min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Show all categories
                </button>
              )}
            </div>
          )}
        </div>
      </section>
      <div className="mb-3 mt-8">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Admin inbox</p>
        <h3 className="mt-1 font-display text-base font-black text-slate-900">Notifications for this administrator</h3>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200/85 bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.07)]">
        {filteredInboxNotifications.length ? (
          filteredInboxNotifications.map((item) => (
            <article
              key={item.id}
              className={`flex flex-wrap items-start gap-3 border-b border-slate-100 p-4 last:border-0 sm:flex-nowrap sm:gap-3.5 sm:p-5 ${item.read_at ? 'bg-white' : 'bg-red-50/35'}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-50 text-[#D9232D] ring-1 ring-red-100">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-black text-slate-900">{item.title}</p>
                <p className="mt-1 break-words text-xs leading-relaxed text-slate-600">{item.body}</p>
                {item.image_url && <img src={item.image_url} alt="" className="mt-3 max-h-36 max-w-full w-auto rounded-2xl object-cover shadow-2xs" />}
                <p className="mt-2 text-[10px] font-medium text-slate-400">{dateLabel(item.created_at)}</p>
              </div>
              {!item.read_at && (
                <button
                  onClick={() => onRead(item.id)}
                  className="min-h-10 shrink-0 self-center rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-extrabold text-[#D9232D] transition hover:bg-red-100"
                >
                  Mark read
                </button>
              )}
            </article>
          ))
        ) : (
          <div className="p-14 text-center text-xs font-semibold text-slate-400">
            {notifications.length > 0 && categoryFilter !== 'All' ? (
              <div className="space-y-3">
                <p>No {categoryFilter.toLowerCase()} notifications in your admin inbox.</p>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('All')}
                  className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Show all categories
                </button>
              </div>
            ) : (
              'No notifications for this admin account.'
            )}
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
      <div className="relative mb-7 overflow-hidden rounded-3xl border border-slate-200/85 bg-gradient-to-br from-white via-white to-rose-50/35 p-5 shadow-[0_10px_32px_-18px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/70 bg-red-50/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9232D]" />
              Business intelligence
            </span>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Reports
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Aggregate figures from the admin metrics RPC and the latest 100 orders.
            </p>
          </div>
          <button
            onClick={onExport}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Total orders" value={metrics?.total_orders ?? 0} />
        <Summary label="Revenue" value={money(metrics?.total_revenue ?? 0)} />
        <Summary label="Verified payments" value={metrics?.verified_payments ?? 0} />
        <Summary label="Customers" value={metrics?.total_customers ?? 0} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="min-w-0 rounded-3xl border border-slate-200/85 bg-white p-5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.07)] sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-black text-slate-900">Order status summary</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 tabular-nums">
              {orders.length} analyzed
            </span>
          </div>
          <div className="mt-4 space-y-3.5">
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
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="font-extrabold text-slate-700">{status.replaceAll('_', ' ')}</span>
                    <span className="font-bold text-slate-500 tabular-nums">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D9232D] to-rose-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="mt-5 inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-extrabold text-[#D9232D] transition hover:bg-red-100"
          >
            Open orders →
          </button>
        </div>
        <div className="min-w-0 rounded-3xl border border-slate-200/85 bg-white p-5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.07)] sm:p-6">
          <h3 className="font-display text-sm font-black text-slate-900">Top selling products</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {leaders.map(([name, quantity], idx) => (
              <div key={name} className="flex items-center justify-between gap-4 py-3 text-xs">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-50 font-mono text-[11px] font-black text-[#D9232D]">
                    0{idx + 1}
                  </span>
                  <span className="truncate font-extrabold text-slate-800">{name}</span>
                </span>
                <b className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 tabular-nums">
                  {quantity} sold
                </b>
              </div>
            ))}
            {!leaders.length && (
              <p className="py-10 text-center text-xs font-semibold text-slate-400">
                No completed or paid item data in the latest 100 orders.
              </p>
            )}
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="mt-5 inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-extrabold text-[#D9232D] transition hover:bg-red-100"
          >
            Open products →
          </button>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-[11px] leading-relaxed text-blue-800">
        <b>Data note:</b> KPI totals come from the secured database function. Product/status
        breakdowns are calculated from the most recent 100 order rows currently loaded.
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/85 bg-white p-5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.07)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D9232D]/80 to-rose-300/40" />
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-black text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}
