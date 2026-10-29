import type { Product, VehicleCategory } from '../types';
import { PRODUCTS } from '../data/products';
import { supabase } from './supabase';
import { convertImageToWebP } from './imagePipeline';

const categoryLabels: Record<VehicleCategory, string> = { bike: 'Bike Covers', scooter: 'Scooter Covers', toto: 'Toto Covers', cushion: 'Cushions', accessory: 'Accessories' };
const categoryKeys: Record<string, VehicleCategory> = { 'Bike Covers': 'bike', 'Scooter Covers': 'scooter', 'Toto Covers': 'toto', Cushions: 'cushion', Accessories: 'accessory' };

type ProductRow = Record<string, unknown>;

const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asColors = (value: unknown, legacy: unknown): Product['colors'] => {
  if (Array.isArray(value) && value.length) return value.flatMap((item): Product['colors'] => {
    if (!item || typeof item !== 'object') return [];
    const color = item as Record<string, unknown>;
    const name = typeof color.name === 'string' ? color.name.trim() : '';
    const hex = typeof color.hex === 'string' ? color.hex.trim() : '';
    const bgClass = typeof color.bgClass === 'string' ? color.bgClass.trim() : 'bg-slate-900';
    const images = asStrings(color.images).map((image) => image.trim()).filter(Boolean);
    return name || hex ? [{ name, hex, bgClass, ...(images.length ? { images } : {}) }] : [];
  });
  return asStrings(legacy).map((name, index) => ({ name: name.trim(), hex: ['#111827', '#D9232D', '#8C5A3C', '#2563EB'][index % 4], bgClass: 'bg-slate-900' }));
};

export const mapSupabaseProduct = (row: ProductRow): Product => {
  const bundled = PRODUCTS.find((item) => item.slug === String(row.slug || ''));
  const value = (key: string, fallback: unknown) => {
    const candidate = row[key];
    if (candidate === null || candidate === undefined || candidate === '' || (Array.isArray(candidate) && candidate.length === 0)) return fallback;
    return candidate;
  };
  const category = (row.category_key as VehicleCategory | null) || categoryKeys[String(row.category || '')] || bundled?.category || 'accessory';
  const name = String(value('name', bundled?.title || 'Untitled product'));
  const slug = String(value('slug', bundled?.slug || name.toLowerCase().replace(/\s+/g, '-')));
  return {
    id: String(row.id || bundled?.id || `rg-prod-${slug}`), title: name, subtitle: String(value('subtitle', bundled?.subtitle || '')), slug,
    displayOrder: Number(row.display_order ?? bundled?.displayOrder ?? 0), category, categoryLabel: String(value('category', bundled?.categoryLabel || categoryLabels[category])), price: Number(row.price ?? bundled?.price ?? 0), originalPrice: Number(row.original_price ?? bundled?.originalPrice ?? row.price ?? 0),
    rating: Number(row.rating ?? bundled?.rating ?? 0), reviewCount: Number(row.review_count ?? bundled?.reviewCount ?? 0), image: String(value('image_url', bundled?.image || '')), additionalImages: asStrings(value('additional_images', bundled?.additionalImages || [])),
    description: String(value('description', bundled?.description || '')), features: asStrings(value('features', bundled?.features || [])), isBestseller: row.is_bestseller === undefined ? Boolean(bundled?.isBestseller) : Boolean(row.is_bestseller), isNew: row.is_new === undefined ? Boolean(bundled?.isNew) : Boolean(row.is_new),
    isWaterproof: row.is_waterproof === undefined ? Boolean(bundled?.isWaterproof) : Boolean(row.is_waterproof), isCustomizable: row.is_customizable === undefined ? Boolean(bundled?.isCustomizable) : Boolean(row.is_customizable), inStock: row.in_stock === undefined ? (bundled?.inStock ?? true) : Boolean(row.in_stock),
    materials: asStrings(value('materials', bundled?.materials || [])), colors: asColors(value('colors_json', bundled?.colors || []), value('colors', bundled?.colors?.map((color) => color.name) || [])), stitchPatterns: asStrings(value('stitch_patterns', bundled?.stitchPatterns || [])),
    compatibility: asStrings(value('compatibility_list', bundled?.compatibility || [])).length ? asStrings(value('compatibility_list', bundled?.compatibility || [])) : String(value('compatibility', bundled?.compatibility?.join(', ') || '')).split(',').map((item) => item.trim()).filter(Boolean),
    thicknessOptions: Array.isArray(value('thickness_options', bundled?.thicknessOptions || [])) && (value('thickness_options', bundled?.thicknessOptions || []) as unknown[]).length ? value('thickness_options', bundled?.thicknessOptions || []) as Product['thicknessOptions'] : [{ label: 'Standard', extraPrice: 0 }], badge: row.badge ? String(row.badge) : bundled?.badge, badgeColor: (row.badge_color || bundled?.badgeColor) as Product['badgeColor'] | undefined,
  };
};
const mapProductsWithReviewSummaries = async (rows: ProductRow[]): Promise<Product[]> => {
  if (!supabase || !rows.length) return rows.map(mapSupabaseProduct);
  const ids = rows.map((row) => String(row.id)).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return rows.map(mapSupabaseProduct);
  const { data } = await supabase.from('product_rating_summary')
    .select('product_id,average_rating,review_count')
    .in('product_id', ids);
  const summaries = new Map((data || []).map((summary) => [summary.product_id, summary]));
  return rows.map((row) => {
    const summary = summaries.get(String(row.id));
    return mapSupabaseProduct({
      ...row,
      rating: Number(summary?.average_rating || 0),
      review_count: Number(summary?.review_count || 0),
    });
  });
};

export const loadPublicProducts = async (): Promise<Product[]> => {
  if (!supabase) return PRODUCTS;
  const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('updated_at', { ascending: false });
  if (error) throw error;
  return mapProductsWithReviewSummaries((data || []) as ProductRow[]);
};

export const loadAdminProducts = async (): Promise<Product[]> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('products').select('*').order('display_order', { ascending: true }).order('updated_at', { ascending: false });
  if (error) throw error;
  if (!data) throw new Error('No product data was returned.');
  return mapProductsWithReviewSummaries(data as ProductRow[]);
};

const toRow = (product: Product) => ({
  ...(product.id.match(/^[0-9a-f-]{36}$/i) ? { id: product.id } : {}), slug: product.slug, name: product.title, subtitle: product.subtitle || '',
  // The database constraint is authoritative; never let a stale display label
  // such as "Bike" or "Bike Cover" reach the products.category column.
  category: categoryLabels[product.category], category_key: product.category, price: product.price, original_price: product.originalPrice,
  image_url: product.image, additional_images: product.additionalImages || [], description: product.description,
  features: product.features || [], materials: product.materials || [], stitch_patterns: product.stitchPatterns || [], thickness_options: product.thicknessOptions || [], colors_json: (product.colors || []).map((color) => ({ ...color, name: color.name.trim(), hex: color.hex.trim(), bgClass: color.bgClass.trim(), images: (color.images || []).map((image) => image.trim()).filter(Boolean) })),
  colors: (product.colors || []).map((color) => color.name), compatibility_list: product.compatibility || [], compatibility: (product.compatibility || []).join(', '), badge: product.badge || null,
  badge_color: product.badgeColor || null, updated_at: new Date().toISOString(), is_bestseller: Boolean(product.isBestseller), is_new: Boolean(product.isNew), is_waterproof: Boolean(product.isWaterproof),
  is_customizable: Boolean(product.isCustomizable), in_stock: Boolean(product.inStock), is_active: true, display_order: product.displayOrder ?? 0,
});

export const reorderSupabaseProducts = async (productIds: string[]) => {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  if (productIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    return { error: new Error('Save or reload all products before changing their order') };
  }
  const { error } = await supabase.rpc('reorder_products', { p_product_ids: productIds });
  return { error };
};

export const upsertSupabaseProduct = async (product: Product) => {
  if (!supabase) return { product, synced: false, error: null };
  const payload = toRow(product);
  const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'slug' }).select('*').single();
  if (error) return { product, synced: false, error };
  const savedProduct = mapSupabaseProduct(data);
  const gallery = [savedProduct.image, ...(savedProduct.additionalImages || [])].filter(Boolean).filter((url, index, items) => items.indexOf(url) === index);
  const galleryResult = await syncProductGallery(savedProduct.id, gallery);
  return { product: savedProduct, synced: !galleryResult.error, error: galleryResult.error };
};

export const syncProductGallery = async (productId: string, urls: string[]) => {
  if (!supabase || !productId.match(/^[0-9a-f-]{36}$/i)) return { error: null };
  const { error } = await supabase.rpc('sync_product_gallery', { p_product_id: productId, p_urls: urls });
  return { error };
};

export const deleteSupabaseProduct = async (product: Product) => {
  if (!supabase || !product.id.match(/^[0-9a-f-]{36}$/i)) return { synced: false, error: null };
  const { error } = await supabase.from('products').delete().eq('id', product.id);
  return { synced: !error, error };
};

export const uploadProductImage = async (file: File) => {
  if (!supabase) throw new Error('Supabase is not configured');
  const webp = await convertImageToWebP(file);
  const path = `products/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('product-images').upload(path, webp, { cacheControl: '31536000', upsert: false, contentType: 'image/webp' });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return { path, url: data.publicUrl, bytes: webp.size, format: 'webp' as const };
};
