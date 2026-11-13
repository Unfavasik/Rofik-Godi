import { supabase } from './supabase';
import { convertImageToWebP } from './imagePipeline';

export type BannerFontStyle = 'outfit' | 'syne' | 'serif' | 'tech';

export interface StorefrontBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel: string;
  startsAt?: string;
  endsAt?: string;
  fontStyle?: BannerFontStyle;
}

export type BannerScheduleState = 'live' | 'scheduled' | 'expired' | 'paused';

export const BANNER_FONT_OPTIONS: Array<{
  id: BannerFontStyle;
  label: string;
  familyName: string;
  className: string;
}> = [
  {
    id: 'outfit',
    label: 'Outfit Geometric',
    familyName: 'Outfit',
    className: 'font-banner-outfit font-extrabold',
  },
  {
    id: 'syne',
    label: 'Syne Display',
    familyName: 'Syne',
    className: 'font-banner-syne font-extrabold',
  },
  {
    id: 'serif',
    label: 'Playfair Editorial',
    familyName: 'Playfair Display',
    className: 'font-banner-serif font-bold italic',
  },
  {
    id: 'tech',
    label: 'Space Grotesk',
    familyName: 'Space Grotesk',
    className: 'font-banner-tech font-bold',
  },
];

export function normalizeBannerFontStyle(value?: unknown): BannerFontStyle | undefined {
  if (value === 'outfit' || value === 'syne' || value === 'serif' || value === 'tech') {
    return value;
  }
  return undefined;
}

export function getBannerFontClass(fontStyle?: BannerFontStyle | string | null): string {
  switch (fontStyle) {
    case 'syne':
      return 'font-banner-syne font-extrabold tracking-[-0.025em]';
    case 'serif':
      return 'font-banner-serif font-bold italic tracking-[-0.01em]';
    case 'tech':
      return 'font-banner-tech font-bold tracking-[-0.022em]';
    case 'outfit':
    default:
      return 'font-banner-outfit font-extrabold tracking-[-0.02em]';
  }
}

export function getBannerTitleSizeClass(
  title: string,
  variant: 'hero' | 'preview' | 'card' = 'hero',
): string {
  const len = title.trim().length;
  if (variant === 'card') {
    if (len <= 26) return 'text-[15px] leading-[1.15]';
    if (len <= 52) return 'text-[13.5px] leading-[1.18]';
    return 'text-[12.5px] leading-[1.22]';
  }
  if (variant === 'preview') {
    if (len <= 26) return 'text-[clamp(16px,3.4vw,20px)] leading-[1.12]';
    if (len <= 52) return 'text-[clamp(14.5px,3vw,18px)] leading-[1.15]';
    return 'text-[clamp(13px,2.6vw,16px)] leading-[1.2]';
  }
  if (len <= 26) return 'text-[clamp(18px,4.3vw,26px)] leading-[1.1]';
  if (len <= 52) return 'text-[clamp(16px,3.8vw,22.5px)] leading-[1.14]';
  return 'text-[clamp(14.5px,3.3vw,19px)] leading-[1.18]';
}

export function parseBannerScheduleDate(value?: string | null): Date | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getBannerScheduleState(
  banner: {
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  },
  now: Date = new Date(),
): BannerScheduleState {
  if (banner.active === false) return 'paused';
  const nowMs = now.getTime();
  const startDate = parseBannerScheduleDate(banner.startsAt);
  if (startDate && nowMs < startDate.getTime()) {
    return 'scheduled';
  }
  const endDate = parseBannerScheduleDate(banner.endsAt);
  if (endDate && nowMs > endDate.getTime()) {
    return 'expired';
  }
  return 'live';
}

export function isBannerCurrentlyActive(
  banner: {
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  },
  now: Date = new Date(),
): boolean {
  return getBannerScheduleState(banner, now) === 'live';
}

export function formatBannerScheduleWindow(
  startsAt?: string | null,
  endsAt?: string | null,
): string {
  const start = parseBannerScheduleDate(startsAt);
  const end = parseBannerScheduleDate(endsAt);
  const fmt = (date: Date) =>
    date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return 'Always on (no schedule limits)';
}

type BannerRpcRow = Record<string, unknown>;

export function mapStorefrontBannerRows(
  data: unknown,
  now: Date = new Date(),
): StorefrontBanner[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter(
      (row): row is BannerRpcRow => Boolean(row) && typeof row === 'object' && !Array.isArray(row),
    )
    .map((row, index) => {
      const rawStartsAt =
        typeof row.starts_at === 'string'
          ? row.starts_at.trim()
          : typeof row.startsAt === 'string'
            ? row.startsAt.trim()
            : '';
      const rawEndsAt =
        typeof row.ends_at === 'string'
          ? row.ends_at.trim()
          : typeof row.endsAt === 'string'
            ? row.endsAt.trim()
            : '';
      const fontStyle = normalizeBannerFontStyle(row.font_style ?? row.fontStyle);
      const activeFlag =
        typeof row.active === 'boolean'
          ? row.active
          : typeof row.active === 'string'
            ? row.active.toLowerCase() !== 'false'
            : true;

      const publicBanner: StorefrontBanner = {
        id: typeof row.id === 'string' && row.id ? row.id : `store-banner-${index + 1}`,
        title: typeof row.title === 'string' ? row.title.trim() : '',
        subtitle: typeof row.subtitle === 'string' ? row.subtitle : '',
        imageUrl: typeof row.image_url === 'string' ? row.image_url : '',
        linkUrl: typeof row.link_url === 'string' ? row.link_url : '/home',
        buttonLabel: typeof row.button_label === 'string' ? row.button_label : 'Shop now',
        ...(rawStartsAt ? { startsAt: rawStartsAt } : {}),
        ...(rawEndsAt ? { endsAt: rawEndsAt } : {}),
        ...(fontStyle ? { fontStyle } : {}),
      };
      return { publicBanner, activeFlag };
    })
    .filter(
      ({ publicBanner, activeFlag }) =>
        (publicBanner.title.length > 0 || publicBanner.imageUrl.length > 0) &&
        isBannerCurrentlyActive(
          {
            active: activeFlag,
            startsAt: publicBanner.startsAt,
            endsAt: publicBanner.endsAt,
          },
          now,
        ),
    )
    .map((entry) => entry.publicBanner);
}

export async function loadActiveStorefrontBanners() {
  if (!supabase) return { data: [] as StorefrontBanner[], error: null };
  const { data, error } = await supabase.rpc('get_active_storefront_banners');
  if (error) return { data: [] as StorefrontBanner[], error };
  return { data: mapStorefrontBannerRows(data), error: null };
}

export async function uploadStorefrontBannerImage(file: File) {
  if (!supabase) throw new Error('Supabase is not configured');
  if (file.size > 10 * 1024 * 1024) throw new Error('Please choose an image smaller than 10MB.');
  const webp = await convertImageToWebP(file);
  const path = `banners/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('product-images').upload(path, webp, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'image/webp',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return { path, url: data.publicUrl, bytes: webp.size, format: 'webp' as const };
}

const PRODUCT_IMAGES_PUBLIC_PREFIX = '/storage/v1/object/public/product-images/';

function productImagePathFromPublicUrl(value: string) {
  try {
    const parsed = new URL(value);
    const marker = parsed.pathname.indexOf(PRODUCT_IMAGES_PUBLIC_PREFIX);
    if (marker < 0) return '';
    return decodeURIComponent(parsed.pathname.slice(marker + PRODUCT_IMAGES_PUBLIC_PREFIX.length));
  } catch {
    return '';
  }
}

/** Remove a product-images object only when no remaining record references it. */
export async function deleteProductImageIfUnreferenced(publicUrl: string) {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  const path = productImagePathFromPublicUrl(publicUrl);
  if (!path) return { error: null };

  const [productsResult, settingsResult, notificationsResult] = await Promise.all([
    supabase.from('products').select('image_url,additional_images,colors_json').limit(10000),
    supabase.from('app_settings').select('value').eq('key', 'store_banners').maybeSingle(),
    supabase.from('notifications').select('image_url').limit(10000),
  ]);
  const readError = productsResult.error || settingsResult.error || notificationsResult.error;
  if (readError) return { error: readError };

  const references = new Set<string>();
  for (const row of productsResult.data || []) {
    if (typeof row.image_url === 'string') references.add(row.image_url);
    for (const url of Array.isArray(row.additional_images) ? row.additional_images : []) {
      if (typeof url === 'string') references.add(url);
    }
    if (Array.isArray(row.colors_json)) {
      for (const color of row.colors_json) {
        if (!color || typeof color !== 'object') continue;
        const images = (color as Record<string, unknown>).images;
        if (Array.isArray(images)) {
          for (const url of images) if (typeof url === 'string') references.add(url);
        }
      }
    }
  }
  const banners = settingsResult.data?.value;
  if (Array.isArray(banners)) {
    for (const banner of banners) {
      if (banner && typeof banner === 'object') {
        const imageUrl = (banner as Record<string, unknown>).imageUrl;
        if (typeof imageUrl === 'string') references.add(imageUrl);
      }
    }
  }
  for (const row of notificationsResult.data || []) {
    if (typeof row.image_url === 'string') references.add(row.image_url);
  }

  const canonicalUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  if (references.has(canonicalUrl)) return { error: null };
  const { error } = await supabase.storage.from('product-images').remove([path]);
  return { error };
}
