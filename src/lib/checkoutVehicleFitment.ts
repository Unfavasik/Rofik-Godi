import { VEHICLE_BRANDS } from '../data/products';
import { VEHICLE_MODELS, type VehicleCatalogModel } from '../data/vehicleModels';

export type CheckoutVehicleType = 'Bike' | 'Scooter' | 'Car' | 'Toto / E-rickshaw' | 'Other';

export type CheckoutFitmentModel = Pick<VehicleCatalogModel, 'brand' | 'name' | 'image'>;

export function getCheckoutVehicleCompanies(type: CheckoutVehicleType): string[] {
  const catalogType = type === 'Bike' ? 'bike' : type === 'Scooter' ? 'scooter' : null;
  if (catalogType) {
    return Array.from(new Set(VEHICLE_MODELS.filter((model) => model.type === catalogType).map((model) => model.brand))).sort(
      (a, b) => a.localeCompare(b),
    );
  }
  if (type === 'Toto / E-rickshaw') return VEHICLE_BRANDS.toto.map(({ brand }) => brand);
  return [];
}

export function getCheckoutVehicleModels(type: CheckoutVehicleType, company: string): CheckoutFitmentModel[] {
  const catalogType = type === 'Bike' ? 'bike' : type === 'Scooter' ? 'scooter' : null;
  if (catalogType) {
    return VEHICLE_MODELS.filter((model) => model.type === catalogType && model.brand === company).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
  if (type === 'Toto / E-rickshaw') {
    return (VEHICLE_BRANDS.toto.find((group) => group.brand === company)?.models || []).map((name) => ({
      brand: company,
      name,
      image: '',
    }));
  }
  return [];
}
