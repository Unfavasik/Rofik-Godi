import type { Product, VehicleCategory } from '../types';
import { PRODUCTS } from '../data/products';
import { supabase } from './supabase';
import { convertImageToWebP } from './imagePipeline';

const categoryLabels: Record<VehicleCategory, string> = { bike: 'Bike Covers', scooter: 'Scooter Covers', toto: 'Toto Covers', cushion: 'Cushions', accessory: 'Accessories' };
const categoryKeys: Record<string, VehicleCategory> = { 'Bike Covers': 'bike', 'Scooter Covers': 'scooter', 'Toto Covers': 'toto', Cushions: 'cushion', Accessories: 'accessory' };

type ProductRow = Record<string, unknown>;

const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asColors = (value: unknown, legacy: unknown): Product['colors'] => {
  if (Array.isArray(value) && value.length) return value as Product['colors'];
  return asStrings(legacy).map((name, index) => ({ name, hex: ['#111827', '#D9232D', '#8C5A3C', '#2563EB'][index % 4], bgClass: 'bg-slate-900' }));
};
const asThickness = (value: unknown): Product['thicknessOptions'] => Array.isArray(value) ? value as Product['thicknessOptions'] : [{ label: 'Standard', extraPrice: 0 }];

export const mapSupabaseProduct = (row: ProductRow): Product => {
  const category = (row.category_key as VehicleCategory | null) || categoryKeys[String(row.category || '')] || 'accessory';
  const name = String(row.name || 'Untitled product');
  return {
    id: String(row.id), title: name, subtitle: String(row.subtitle || ''), slug: String(row.slug || name.toLowerCase().replace(/\s+/g, '-')),
    category, categoryLabel: String(row.category || categoryLabels[category]), price: Number(row.price || 0), originalPrice: Number(row.original_price || row.price || 0),
    rating: Number(row.rating || 0), reviewCount: Number(row.review_count || 0), image: String(row.image_url || ''), additionalImages: asStrings(row.additional_images),
    description: String(row.description || ''), features: asStrings(row.features), isBestseller: Boolean(row.is_bestseller), isNew: Boolean(row.is_new),
    isWaterproof: Boolean(row.is_waterproof), isCustomizable: Boolean(row.is_customizable), inStock: row.in_stock === undefined ? Boolean(row.is_active) : Boolean(row.in_stock),
    materials: asStrings(row.materials), colors: asColors(row.colors_json, row.colors), stitchPatterns: asStrings(row.stitch_patterns),
    compatibility: asStrings(row.compatibility_list).length ? asStrings(row.compatibility_list) : String(row.compatibility || '').split(',').map((item) => item.trim()).filter(Boolean),
    thicknessOptions: asThickness(row.thickness_options), badge: row.badge ? String(row.badge) : undefined, badgeColor: row.badge_color as Product['badgeColor'] | undefined,
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
  const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('updated_at', { ascending: false });
  if (error || !data?.length) return PRODUCTS;
  return mapProductsWithReviewSummaries(data as ProductRow[]);
};

export const loadAdminProducts = async (): Promise<Product[] | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('products').select('*').order('updated_at', { ascending: false });
  if (error || !data) return null;
  return mapProductsWithReviewSummaries(data as ProductRow[]);
};

const toRow = (product: Product) => ({
  ...(product.id.match(/^[0-9a-f-]{36}$/i) ? { id: product.id } : {}), slug: product.slug, name: product.title, subtitle: product.subtitle || '',
  category: product.categoryLabel || categoryLabels[product.category], category_key: product.category, price: product.price, original_price: product.originalPrice,
  image_url: product.image, additional_images: product.additionalImages || [], description: product.description,
  features: product.features || [], materials: product.materials || [], stitch_patterns: product.stitchPatterns || [], thickness_options: product.thicknessOptions || [], colors_json: product.colors || [],
  colors: (product.colors || []).map((color) => color.name), compatibility_list: product.compatibility || [], compatibility: (product.compatibility || []).join(', '), badge: product.badge || null,
  badge_color: product.badgeColor || null, is_bestseller: Boolean(product.isBestseller), is_new: Boolean(product.isNew), is_waterproof: Boolean(product.isWaterproof),
  is_customizable: Boolean(product.isCustomizable), in_stock: Boolean(product.inStock), is_active: Boolean(product.inStock),
});

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
  const { error: deleteError } = await supabase.from('product_images').delete().eq('product_id', productId);
  if (deleteError) return { error: deleteError };
  if (!urls.length) return { error: null };
  const { error } = await supabase.from('product_images').insert(urls.map((publicUrl, sort_order) => ({ product_id: productId, public_url: publicUrl, sort_order, alt_text: 'Rofik Godi product image' })));
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
