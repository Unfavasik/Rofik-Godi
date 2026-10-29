import { supabase } from './supabase';
import { convertImageToWebP } from './imagePipeline';

export interface StorefrontBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel: string;
}

type BannerRpcRow = Record<string, unknown>;

export function mapStorefrontBannerRows(data: unknown): StorefrontBanner[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter(
      (row): row is BannerRpcRow => Boolean(row) && typeof row === 'object' && !Array.isArray(row),
    )
    .map((row, index) => ({
      id: typeof row.id === 'string' && row.id ? row.id : `store-banner-${index + 1}`,
      title: typeof row.title === 'string' ? row.title.trim() : '',
      subtitle: typeof row.subtitle === 'string' ? row.subtitle : '',
      imageUrl: typeof row.image_url === 'string' ? row.image_url : '',
      linkUrl: typeof row.link_url === 'string' ? row.link_url : '/home',
      buttonLabel: typeof row.button_label === 'string' ? row.button_label : 'Shop now',
    }))
    .filter((banner) => banner.title.length > 0);
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
