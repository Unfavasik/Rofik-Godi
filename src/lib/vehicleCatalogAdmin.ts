import { VEHICLE_MODELS, type VehicleCatalogModel } from '../data/vehicleModels';

export interface VehicleCatalogOverrides {
  customModels: VehicleCatalogModel[];
  hiddenBrands: string[];
  hiddenModels: string[];
}

export const VEHICLE_CATALOG_CHANGED_EVENT = 'rofik:vehicle-catalog-changed';
const STORAGE_KEY = 'work-app:vehicle-catalog-overrides:v1';
const EMPTY: VehicleCatalogOverrides = { customModels: [], hiddenBrands: [], hiddenModels: [] };

export function readVehicleCatalogOverrides(): VehicleCatalogOverrides {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null') as Partial<VehicleCatalogOverrides> | null;
    return {
      customModels: Array.isArray(parsed?.customModels) ? parsed.customModels.filter(Boolean) as VehicleCatalogModel[] : [],
      hiddenBrands: Array.isArray(parsed?.hiddenBrands) ? parsed.hiddenBrands.filter((value): value is string => typeof value === 'string') : [],
      hiddenModels: Array.isArray(parsed?.hiddenModels) ? parsed.hiddenModels.filter((value): value is string => typeof value === 'string') : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveVehicleCatalogOverrides(next: VehicleCatalogOverrides): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(VEHICLE_CATALOG_CHANGED_EVENT));
}

export function getVisibleVehicleModels(): VehicleCatalogModel[] {
  const overrides = readVehicleCatalogOverrides();
  const all = [...VEHICLE_MODELS, ...overrides.customModels];
  return all.filter((model) => !overrides.hiddenBrands.includes(model.brand) && !overrides.hiddenModels.includes(model.name));
}
