import { describe, expect, it } from 'vitest';
import {
  getCheckoutVehicleCompanies,
  getCheckoutVehicleModels,
  parseVehicleFitmentValue,
  resolveVehicleFitment,
} from '../src/lib/checkoutVehicleFitment';
import type { VehicleCatalogModel } from '../src/lib/supabaseVehicleCatalog';

// The catalog lives in the vehicle_models table; tests inject a representative
// slice so the parsing and scoping logic stays verifiable without Supabase.
const catalog: VehicleCatalogModel[] = [
  { id: '1', brand: 'Hero MotoCorp', name: 'Hero HF Deluxe', type: 'bike', image: '/vehicle-models/hero-hf-deluxe.webp' },
  { id: '2', brand: 'Hero MotoCorp', name: 'Hero Splendor Plus', type: 'bike', image: '/vehicle-models/hero-splendor-plus.webp' },
  { id: '3', brand: 'Honda', name: 'Honda Activa 6G', type: 'scooter', image: '/vehicle-models/honda-activa-6g.webp' },
  { id: '4', brand: 'Bajaj Auto', name: 'Bajaj Pulsar N160 2V', type: 'bike', image: '/vehicle-models/bajaj-pulsar-n160-2v.webp' },
];

describe('checkout vehicle fitment options', () => {
  it('offers companies for bikes and scooters, but not unsupported catalog types', () => {
    expect(getCheckoutVehicleCompanies('Bike', catalog)).toContain('Hero MotoCorp');
    expect(getCheckoutVehicleCompanies('Scooter', catalog)).toContain('Honda');
    expect(getCheckoutVehicleCompanies('Car', catalog)).toEqual([]);
  });

  it('shows only the selected company’s bike models with their local photos', () => {
    const models = getCheckoutVehicleModels('Bike', 'Hero MotoCorp', catalog);

    expect(models.some((model) => model.name === 'Hero HF Deluxe')).toBe(true);
    expect(models.every((model) => model.brand === 'Hero MotoCorp' && model.image.startsWith('/vehicle-models/'))).toBe(true);
    expect(getCheckoutVehicleModels('Bike', 'Honda', catalog)).toEqual([]);
  });

  it('keeps model options scoped to the selected company and vehicle type', () => {
    const heroBikes = getCheckoutVehicleModels('Bike', ' hero motocorp ', catalog);
    const hondaScooters = getCheckoutVehicleModels('Scooter', 'Honda', catalog);

    expect(heroBikes.length).toBeGreaterThan(0);
    expect(heroBikes.every((model) => model.brand === 'Hero MotoCorp')).toBe(true);
    expect(hondaScooters.length).toBeGreaterThan(0);
    expect(hondaScooters.every((model) => model.brand === 'Honda')).toBe(true);
    expect(heroBikes.some((bike) => hondaScooters.some((scooter) => scooter.name === bike.name))).toBe(false);
    expect(getCheckoutVehicleModels('Bike', '', catalog)).toEqual([]);
    expect(getCheckoutVehicleModels('Bike', 'unknown company', catalog)).toEqual([]);
  });

  it('shows scooter previews and preserves Toto model options', () => {
    const scooters = getCheckoutVehicleModels('Scooter', 'Honda', catalog);
    expect(scooters.length).toBeGreaterThan(0);
    expect(scooters.every((model) => model.image.startsWith('/vehicle-models/'))).toBe(true);

    const totoCompany = getCheckoutVehicleCompanies('Toto / E-rickshaw')[0];
    expect(getCheckoutVehicleModels('Toto / E-rickshaw', totoCompany).length).toBeGreaterThan(0);
    expect(getCheckoutVehicleModels('Car', 'Toyota', catalog)).toEqual([]);
  });

  it('parses the checkout middle-dot format into company/model fields', () => {
    expect(parseVehicleFitmentValue('Bike · Hero MotoCorp · Hero HF Deluxe', catalog)).toMatchObject({
      type: 'Bike',
      company: 'Hero MotoCorp',
      model: 'Hero HF Deluxe',
      manualValue: '',
    });
  });

  it('restores legacy saved profile vehicle strings into company/model fields', () => {
    expect(parseVehicleFitmentValue('Bajaj Auto - Bajaj Pulsar N160 2V', catalog)).toMatchObject({
      type: 'Bike',
      company: 'Bajaj Auto',
      model: 'Bajaj Pulsar N160 2V',
      manualValue: '',
    });
    expect(parseVehicleFitmentValue('Hero HF Deluxe', catalog)).toMatchObject({
      type: 'Bike',
      company: 'Hero MotoCorp',
      model: 'Hero HF Deluxe',
    });
    expect(parseVehicleFitmentValue('My custom ride', catalog)).toMatchObject({
      type: 'Other',
      manualValue: 'My custom ride',
    });
  });

  it('resolves the catalog image for both stored formats without creating a new image copy', () => {
    expect(resolveVehicleFitment('Bike · Bajaj Auto · Bajaj Pulsar N160 2V', catalog)).toMatchObject({
      company: 'Bajaj Auto',
      model: 'Bajaj Pulsar N160 2V',
      image: '/vehicle-models/bajaj-pulsar-n160-2v.webp',
    });
    expect(resolveVehicleFitment('Bajaj Auto - Bajaj Pulsar N160 2V', catalog)).toMatchObject({
      company: 'Bajaj Auto',
      model: 'Bajaj Pulsar N160 2V',
      image: '/vehicle-models/bajaj-pulsar-n160-2v.webp',
    });
  });
});
