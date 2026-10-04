import { supabase } from './supabase';

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
