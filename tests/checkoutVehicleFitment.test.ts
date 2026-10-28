import { describe, expect, it } from 'vitest';
import {
  getCheckoutVehicleCompanies,
  getCheckoutVehicleModels,
  parseVehicleFitmentValue,
} from '../src/lib/checkoutVehicleFitment';

describe('checkout vehicle fitment options', () => {
  it('offers companies for bikes and scooters, but not unsupported catalog types', () => {
    expect(getCheckoutVehicleCompanies('Bike')).toContain('Hero MotoCorp');
    expect(getCheckoutVehicleCompanies('Scooter')).toContain('Honda');
    expect(getCheckoutVehicleCompanies('Car')).toEqual([]);
  });

  it('shows only the selected company’s bike models with their local photos', () => {
    const models = getCheckoutVehicleModels('Bike', 'Hero MotoCorp');

    expect(models.some((model) => model.name === 'Hero HF Deluxe')).toBe(true);
    expect(models.every((model) => model.brand === 'Hero MotoCorp' && model.image.startsWith('/vehicle-models/'))).toBe(true);
    expect(getCheckoutVehicleModels('Bike', 'Honda').every((model) => model.brand === 'Honda')).toBe(true);
  });

  it('shows scooter previews and preserves Toto model options', () => {
    const scooters = getCheckoutVehicleModels('Scooter', 'Honda');
    expect(scooters.length).toBeGreaterThan(0);
    expect(scooters.every((model) => model.image.startsWith('/vehicle-models/'))).toBe(true);

    const totoCompany = getCheckoutVehicleCompanies('Toto / E-rickshaw')[0];
    expect(getCheckoutVehicleModels('Toto / E-rickshaw', totoCompany).length).toBeGreaterThan(0);
    expect(getCheckoutVehicleModels('Car', 'Toyota')).toEqual([]);
  });

  it('restores new and legacy saved profile vehicle strings into company/model fields', () => {
    expect(parseVehicleFitmentValue('Bike · Hero MotoCorp · Hero HF Deluxe')).toMatchObject({
      type: 'Bike',
      company: 'Hero MotoCorp',
      model: 'Hero HF Deluxe',
      manualValue: '',
    });
    expect(parseVehicleFitmentValue('Hero HF Deluxe')).toMatchObject({
      type: 'Bike',
      company: 'Hero MotoCorp',
      model: 'Hero HF Deluxe',
    });
    expect(parseVehicleFitmentValue('My custom ride')).toMatchObject({
      type: 'Other',
      manualValue: 'My custom ride',
    });
  });
});
