import {
  getCachedVehicleModels,
  loadVehicleModels,
  VEHICLE_CATALOG_CHANGED_EVENT,
  type VehicleCatalogModel,
} from './supabaseVehicleCatalog';

export { VEHICLE_CATALOG_CHANGED_EVENT };
export type VehicleCatalogOverrides = never;

/** Public catalog reads come from Supabase. This compatibility helper no longer reads localStorage. */
export function getVisibleVehicleModels(): VehicleCatalogModel[] {
  return getCachedVehicleModels();
}

export async function refreshVisibleVehicleModels() {
  return loadVehicleModels();
}
