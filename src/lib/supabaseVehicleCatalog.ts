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
}

type VehicleRow = {
  id: string;
  brand: string;
  name: string;
  type: VehicleCatalogType;
  image_url: string | null;
  is_active: boolean;
};

export const VEHICLE_CATALOG_CHANGED_EVENT = 'rofik:vehicle-catalog-changed';
let cachedModels: VehicleCatalogModel[] = [];

function mapRow(row: VehicleRow): VehicleCatalogModel {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    type: row.type,
    image: row.image_url || '',
    isActive: row.is_active,
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
  let query = supabase
    .from('vehicle_models')
    .select('id,brand,name,type,image_url,is_active')
    .order('brand', { ascending: true })
    .order('name', { ascending: true });
  if (!options.includeHidden) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) return { data: [] as VehicleCatalogModel[], error };
  const models = (data as VehicleRow[]).map(mapRow);
  if (!options.includeHidden) cachedModels = models;
  return { data: models, error: null };
}

export async function createVehicleModel(input: { brand: string; name: string; type: VehicleCatalogType; image: string }) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('vehicle_models')
    .insert({ brand: input.brand.trim(), name: input.name.trim(), type: input.type, image_url: input.image.trim(), is_active: true })
    .select('id,brand,name,type,image_url,is_active')
    .single();
  if (error) throw error;
  emitChanged();
  return mapRow(data as VehicleRow);
}

export async function updateVehicleModel(id: string, input: Partial<{ brand: string; name: string; type: VehicleCatalogType; image: string; isActive: boolean }>) {
  if (!supabase) throw new Error('Supabase is not configured');
  const patch: Record<string, unknown> = {};
  if (input.brand !== undefined) patch.brand = input.brand.trim();
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.type !== undefined) patch.type = input.type;
  if (input.image !== undefined) patch.image_url = input.image.trim();
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  const { data, error } = await supabase
    .from('vehicle_models')
    .update(patch)
    .eq('id', id)
    .select('id,brand,name,type,image_url,is_active')
    .single();
  if (error) throw error;
  emitChanged();
  return mapRow(data as VehicleRow);
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
