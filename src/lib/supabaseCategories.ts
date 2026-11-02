import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { convertImageToWebP } from './imagePipeline';

export interface StorefrontCategory {
  id: string;
  key: string;
  name: string;
  description: string;
  image: string;
  isActive?: boolean;
  sortOrder?: number;
}

type CategoryRow = {
  id: string;
  category_key: string;
  name: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export const STOREFRONT_CATEGORIES_CHANGED_EVENT = 'rofik:storefront-categories-changed';

// Fallback used while the storefront_categories table has no rows (or the
// migration has not been applied yet).
export const DEFAULT_STOREFRONT_CATEGORIES: StorefrontCategory[] = [
  { id: 'bike', key: 'bike', name: 'Bike Covers', description: 'Protective covers and bike-fit accessories.', image: '', isActive: true, sortOrder: 1 },
  { id: 'scooter', key: 'scooter', name: 'Scooter Covers', description: 'Weather-ready covers for scooters.', image: '', isActive: true, sortOrder: 2 },
  { id: 'toto', key: 'toto', name: 'Toto Covers', description: 'Covers for toto and e-rickshaw vehicles.', image: '', isActive: true, sortOrder: 3 },
  { id: 'cushion', key: 'cushion', name: 'Cushions', description: 'Seat cushions and comfort products.', image: '', isActive: true, sortOrder: 4 },
  { id: 'accessory', key: 'accessory', name: 'Accessories', description: 'Additional products and add-ons.', image: '', isActive: true, sortOrder: 5 },
];

let cachedCategories: StorefrontCategory[] = [];

export function getCachedStorefrontCategories() {
  return cachedCategories;
}

function emitChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(STOREFRONT_CATEGORIES_CHANGED_EVENT));
}

function mapRow(row: CategoryRow): StorefrontCategory {
  return {
    id: row.id,
    key: row.category_key,
    name: row.name,
    description: row.description || '',
    image: row.image_url || '',
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function slugifyCategoryKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function loadStorefrontCategories(options: { includeHidden?: boolean } = {}) {
  if (!supabase) return { data: [] as StorefrontCategory[], error: new Error('Supabase is not configured') };
  let query = supabase
    .from('storefront_categories')
    .select('id,category_key,name,description,image_url,is_active,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (!options.includeHidden) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) return { data: [] as StorefrontCategory[], error };
  const categories = (data as CategoryRow[]).map(mapRow);
  if (!options.includeHidden) cachedCategories = categories;
  return { data: categories, error: null };
}

export async function createCategory(input: { key: string; name: string; description?: string; image?: string; sortOrder?: number }) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('storefront_categories')
    .insert({
      category_key: slugifyCategoryKey(input.key),
      name: input.name.trim(),
      description: input.description?.trim() || '',
      image_url: input.image?.trim() || '',
      is_active: true,
      sort_order: input.sortOrder ?? 0,
    })
    .select('id,category_key,name,description,image_url,is_active,sort_order')
    .single();
  if (error) throw error;
  emitChanged();
  return mapRow(data as CategoryRow);
}

export async function updateCategory(id: string, input: Partial<{ key: string; name: string; description: string; image: string; isActive: boolean; sortOrder: number }>) {
  if (!supabase) throw new Error('Supabase is not configured');
  const patch: Record<string, unknown> = {};
  if (input.key !== undefined) patch.category_key = slugifyCategoryKey(input.key);
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.image !== undefined) patch.image_url = input.image.trim();
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  const { data, error } = await supabase
    .from('storefront_categories')
    .update(patch)
    .eq('id', id)
    .select('id,category_key,name,description,image_url,is_active,sort_order')
    .single();
  if (error) throw error;
  emitChanged();
  return mapRow(data as CategoryRow);
}

export async function deleteCategory(id: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from('storefront_categories').delete().eq('id', id);
  if (error) throw error;
  emitChanged();
}

export async function uploadCategoryImage(id: string, file: File) {
  if (!supabase) throw new Error('Supabase is not configured');
  if (file.size > 5 * 1024 * 1024) throw new Error('Please choose an image smaller than 5MB.');
  const webp = await convertImageToWebP(file, { squareSize: 800 });
  const path = `category-images/${id}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from('product-images').upload(path, webp, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'image/webp',
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  await updateCategory(id, { image: data.publicUrl });
  return { url: data.publicUrl, path, fileName: webp.name, bytes: webp.size };
}

// Storefront hook: active categories only. `ready` is false while the table is
// unavailable or still loading, so callers can fall back to the built-in set.
export function useStorefrontCategories(): { categories: StorefrontCategory[]; ready: boolean } {
  const [categories, setCategories] = useState<StorefrontCategory[]>(getCachedStorefrontCategories());
  const [ready, setReady] = useState(() => getCachedStorefrontCategories().length > 0);
  useEffect(() => {
    let active = true;
    const apply = (result: { data: StorefrontCategory[]; error: unknown }) => {
      if (!active) return;
      if (result.error) {
        setReady(false);
        return;
      }
      setCategories(result.data);
      setReady(true);
    };
    void loadStorefrontCategories().then(apply);
    const onChanged = () => { void loadStorefrontCategories().then(apply); };
    window.addEventListener(STOREFRONT_CATEGORIES_CHANGED_EVENT, onChanged);
    return () => {
      active = false;
      window.removeEventListener(STOREFRONT_CATEGORIES_CHANGED_EVENT, onChanged);
    };
  }, []);
  return { categories, ready };
}
