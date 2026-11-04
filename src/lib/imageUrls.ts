// Supabase Storage can resize images on the fly through its render endpoint.
// Rewriting storage URLs to that endpoint serves right-sized WebP variants from
// the CDN cache, which keeps list views fast instead of shipping full-size
// originals. Non-storage URLs (local assets, external hosts) pass through.
const STORAGE_PUBLIC_PREFIX = '/storage/v1/object/public/';
const STORAGE_RENDER_PREFIX = '/storage/v1/render/image/public/';

export interface ImageVariantOptions {
  width: number;
  height?: number;
  quality?: number;
}

export function getOptimizedImageUrl(url: string | null | undefined, options: ImageVariantOptions = { width: 800 }): string {
  const value = (url || '').trim();
  if (!value) return value;
  const marker = value.indexOf(STORAGE_PUBLIC_PREFIX);
  if (marker < 0) return value;
  const path = value.slice(marker + STORAGE_PUBLIC_PREFIX.length);
  let origin = '';
  try {
    origin = new URL(value).origin;
  } catch {
    return value;
  }
  const params = new URLSearchParams({
    width: String(options.width),
    quality: String(options.quality ?? 75),
    format: 'webp',
  });
  if (options.height) {
    params.set('height', String(options.height));
    params.set('resize', 'cover');
  }
  return `${origin}${STORAGE_RENDER_PREFIX}${path}?${params.toString()}`;
}
