import { supabase } from './supabase';
import { convertImageToWebP } from './imagePipeline';

export type VehicleCatalogType = 'bike' | 'scooter';

export interface VehicleCatalogModel {
  id: string;
  brand: string;
  name: string;
  type: VehicleCatalogType;
  image: string;
  isActive?: boolean;
  slug?: string;
  shortDescription?: string;
}

type VehicleRow = {
  id: string;
  brand: string;
  name: string;
  type: VehicleCatalogType;
  image_url: string | null;
  is_active: boolean;
  slug: string | null;
  short_description: string | null;
};

export const VEHICLE_CATALOG_CHANGED_EVENT = 'rofik:vehicle-catalog-changed';
let cachedModels: VehicleCatalogModel[] = [];

export function slugifyVehicleModelName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// The slug/short_description columns ship in migration 20261102180000; until it is
// applied the selects and writes below fall back to the original column set.
const MODEL_SELECT_COLUMNS = 'id,brand,name,type,image_url,is_active,slug,short_description';
const MODEL_BASE_COLUMNS = 'id,brand,name,type,image_url,is_active';
let extraColumnsAvailable = true;

function isUndefinedColumnError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '42703');
}

function mapRow(row: VehicleRow): VehicleCatalogModel {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    type: row.type,
    image: row.image_url || '',
    isActive: row.is_active,
    slug: row.slug || '',
    shortDescription: row.short_description || '',
  };
}

function emitChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(VEHICLE_CATALOG_CHANGED_EVENT));
}

export function getCachedVehicleModels() {
  return cachedModels;
}

export async function loadVehicleModels(options: { includeHidden?: boolean } = {}) {
  if (!supabase) return { data: [] as VehicleCatalogModel[], error: new Error('Supabase is not configured') };
  const runQuery = async (columns: string) => {
    let query = supabase!
      .from('vehicle_models')
      .select(columns)
      .order('brand', { ascending: true })
      .order('name', { ascending: true });
    if (!options.includeHidden) query = query.eq('is_active', true);
    return query;
  };
  let { data, error } = await runQuery(extraColumnsAvailable ? MODEL_SELECT_COLUMNS : MODEL_BASE_COLUMNS);
  if (error && isUndefinedColumnError(error)) {
    extraColumnsAvailable = false;
    ({ data, error } = await runQuery(MODEL_BASE_COLUMNS));
  }
  if (error) return { data: [] as VehicleCatalogModel[], error };
  const models = (data as unknown as VehicleRow[]).map(mapRow);
  if (!options.includeHidden) cachedModels = models;
  return { data: models, error: null };
}

export async function createVehicleModel(input: { brand: string; name: string; type: VehicleCatalogType; image: string; slug?: string; shortDescription?: string }) {
  if (!supabase) throw new Error('Supabase is not configured');
  const baseValues = { brand: input.brand.trim(), name: input.name.trim(), type: input.type, image_url: input.image.trim(), is_active: true };
  const runInsert = async (withExtra: boolean) => {
    const values = withExtra
      ? { ...baseValues, slug: input.slug?.trim() || slugifyVehicleModelName(input.name), short_description: input.shortDescription?.trim() || null }
      : baseValues;
    return supabase!
      .from('vehicle_models')
      .insert(values)
      .select(extraColumnsAvailable ? MODEL_SELECT_COLUMNS : MODEL_BASE_COLUMNS)
      .single();
  };
  let { data, error } = await runInsert(extraColumnsAvailable);
  if (error && isUndefinedColumnError(error)) {
    extraColumnsAvailable = false;
    ({ data, error } = await runInsert(false));
  }
  if (error) throw error;
  emitChanged();
  return mapRow(data as unknown as VehicleRow);
}

export async function updateVehicleModel(id: string, input: Partial<{ brand: string; name: string; type: VehicleCatalogType; image: string; isActive: boolean; slug: string; shortDescription: string }>) {
  if (!supabase) throw new Error('Supabase is not configured');
  const basePatch: Record<string, unknown> = {};
  if (input.brand !== undefined) basePatch.brand = input.brand.trim();
  if (input.name !== undefined) basePatch.name = input.name.trim();
  if (input.type !== undefined) basePatch.type = input.type;
  if (input.image !== undefined) basePatch.image_url = input.image.trim();
  if (input.isActive !== undefined) basePatch.is_active = input.isActive;
  const runUpdate = async (withExtra: boolean) => {
    const patch: Record<string, unknown> = { ...basePatch };
    if (withExtra) {
      if (input.slug !== undefined) patch.slug = slugifyVehicleModelName(input.slug);
      if (input.shortDescription !== undefined) patch.short_description = input.shortDescription.trim();
    }
    return supabase!
      .from('vehicle_models')
      .update(patch)
      .eq('id', id)
      .select(extraColumnsAvailable ? MODEL_SELECT_COLUMNS : MODEL_BASE_COLUMNS)
      .single();
  };
  let { data, error } = await runUpdate(extraColumnsAvailable);
  if (error && isUndefinedColumnError(error)) {
    extraColumnsAvailable = false;
    ({ data, error } = await runUpdate(false));
  }
  if (error) throw error;
  emitChanged();
  return mapRow(data as unknown as VehicleRow);
}

export async function deleteVehicleModel(id: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from('vehicle_models').delete().eq('id', id);
  if (error) throw error;
  emitChanged();
}

export async function uploadVehicleModelImage(id: string, file: File) {
  if (!supabase) throw new Error('Supabase is not configured');
  if (file.size > 5 * 1024 * 1024) throw new Error('Please choose an image smaller than 5MB.');
  const webp = await convertImageToWebP(file, { squareSize: 800 });
  const path = `vehicle-models/${id}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from('product-images').upload(path, webp, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'image/webp',
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  await updateVehicleModel(id, { image: data.publicUrl });
  return { url: data.publicUrl, path, fileName: webp.name, bytes: webp.size };
}
