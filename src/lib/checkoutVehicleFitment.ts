import { VEHICLE_BRANDS } from '../data/products';
import { getCachedVehicleModels, type VehicleCatalogModel } from './supabaseVehicleCatalog';

export type CheckoutVehicleType = 'Bike' | 'Scooter' | 'Car' | 'Toto / E-rickshaw' | 'Other';
export type CheckoutFitmentModel = Pick<VehicleCatalogModel, 'brand' | 'name' | 'image'>;

export interface ParsedVehicleFitment { type: CheckoutVehicleType; company: string; model: string; manualValue: string }
export interface ResolvedVehicleFitment extends ParsedVehicleFitment { image: string }
const checkoutVehicleTypes: CheckoutVehicleType[] = ['Bike', 'Scooter', 'Car', 'Toto / E-rickshaw', 'Other'];
const catalogFor = (models?: VehicleCatalogModel[]) => models || getCachedVehicleModels();

export function getCheckoutVehicleCompanies(type: CheckoutVehicleType, models?: VehicleCatalogModel[]): string[] {
  const catalogType = type === 'Bike' ? 'bike' : type === 'Scooter' ? 'scooter' : null;
  if (catalogType) return Array.from(new Set(catalogFor(models).filter((model) => model.type === catalogType).map((model) => model.brand))).sort((a, b) => a.localeCompare(b));
  if (type === 'Toto / E-rickshaw') return VEHICLE_BRANDS.toto.map(({ brand }) => brand);
  return [];
}

export function getCheckoutVehicleModels(type: CheckoutVehicleType, company: string, models?: VehicleCatalogModel[]): CheckoutFitmentModel[] {
  const selectedCompany = company.trim().toLocaleLowerCase();
  if (!selectedCompany) return [];
  const catalogType = type === 'Bike' ? 'bike' : type === 'Scooter' ? 'scooter' : null;
  if (catalogType) return catalogFor(models).filter((model) => model.type === catalogType && model.brand.trim().toLocaleLowerCase() === selectedCompany).sort((a, b) => a.name.localeCompare(b.name));
  if (type === 'Toto / E-rickshaw') {
    const group = VEHICLE_BRANDS.toto.find((item) => item.brand.trim().toLocaleLowerCase() === selectedCompany);
    return (group?.models || []).map((name) => ({ brand: group?.brand || company.trim(), name, image: '' }));
  }
  return [];
}

export function parseVehicleFitmentValue(value: string, models?: VehicleCatalogModel[]): ParsedVehicleFitment {
  const original = value.trim();
  if (!original) return { type: 'Bike', company: '', model: '', manualValue: '' };
  const parts = original.split('·').map((part) => part.trim()).filter(Boolean);
  const explicitType = checkoutVehicleTypes.find((type) => type.toLowerCase() === parts[0]?.toLowerCase());
  const details = explicitType ? parts.slice(1) : parts;
  let companyHint = details.length > 1 ? details[0] : '';
  let modelHint = details.length > 1 ? details.slice(1).join(' · ') : details[0] || '';
  // Legacy profile strings separate company and model with a spaced hyphen
  // ("Bajaj Auto - Bajaj Pulsar N160 2V"); the checkout writes the middle-dot
  // format, but saved profiles predate it.
  if (!explicitType && details.length === 1) {
    const hyphenSplit = modelHint.match(/^(.+?)\s+-\s+(.+)$/);
    if (hyphenSplit) {
      companyHint = hyphenSplit[1].trim();
      modelHint = hyphenSplit[2].trim();
    }
  }
  if (!modelHint) return explicitType ? { type: explicitType, company: '', model: '', manualValue: '' } : { type: 'Other', company: '', model: '', manualValue: original };
  const matchesName = (candidate: string, target: string) => candidate.toLowerCase() === target.toLowerCase() || candidate.toLowerCase().startsWith(`${target.toLowerCase()} `) || candidate.toLowerCase().endsWith(` ${target.toLowerCase()}`);
  const allowedCatalogType = explicitType === 'Bike' ? 'bike' : explicitType === 'Scooter' ? 'scooter' : null;
  if (!explicitType || allowedCatalogType) {
    const catalogModels = catalogFor(models).filter((model) => allowedCatalogType ? model.type === allowedCatalogType : true);
    const match = catalogModels.find((model) => model.name.toLowerCase() === modelHint.toLowerCase() && (!companyHint || model.brand.toLowerCase() === companyHint.toLowerCase())) || catalogModels.find((model) => matchesName(model.name, modelHint) && (!companyHint || model.brand.toLowerCase() === companyHint.toLowerCase())) || catalogModels.find((model) => matchesName(model.name, modelHint));
    if (match) return { type: match.type === 'bike' ? 'Bike' : 'Scooter', company: match.brand, model: match.name, manualValue: '' };
  }
  if (explicitType === 'Toto / E-rickshaw') {
    for (const company of companyHint ? [companyHint] : getCheckoutVehicleCompanies(explicitType)) {
      const match = getCheckoutVehicleModels(explicitType, company).find((model) => matchesName(model.name, modelHint));
      if (match) return { type: explicitType, company: match.brand, model: match.name, manualValue: '' };
    }
  }
  if (explicitType === 'Car' || explicitType === 'Other') return { type: explicitType, company: companyHint, model: modelHint, manualValue: original };
  return { type: 'Other', company: '', model: '', manualValue: original };
}

export function resolveVehicleFitment(value: string, models?: VehicleCatalogModel[]): ResolvedVehicleFitment {
  const parsed = parseVehicleFitmentValue(value, models);
  const catalogModel = catalogFor(models).find((model) => model.brand.toLowerCase() === parsed.company.toLowerCase() && model.name.toLowerCase() === parsed.model.toLowerCase());
  return { ...parsed, image: catalogModel?.image || '' };
}
