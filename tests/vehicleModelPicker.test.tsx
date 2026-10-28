import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehicleModelPicker } from '../src/components/VehicleModelPicker';
import type { CheckoutFitmentModel } from '../src/lib/checkoutVehicleFitment';

const models: CheckoutFitmentModel[] = [
  { brand: 'Kawasaki', name: 'Kawasaki KLX230', image: '/vehicle-models/kawasaki-klx230.webp' },
  { brand: 'Kawasaki', name: 'Kawasaki Versys-X 300', image: '/vehicle-models/kawasaki-versys-x-300.webp' },
];

const labels = {
  selectedLabel: 'Selected vehicle',
  changeLabel: 'Change model',
  ariaLabel: 'Model',
};

describe('shared vehicle model picker', () => {
  it('shows image cards while a model has not been selected', () => {
    const html = renderToStaticMarkup(
      <VehicleModelPicker models={models} selectedModel="" onSelect={() => undefined} {...labels} />,
    );

    expect(html).toContain('Kawasaki KLX230');
    expect(html).toContain('Kawasaki Versys-X 300');
    expect(html).toContain('src="/vehicle-models/kawasaki-klx230.webp"');
    expect(html).not.toContain('Selected vehicle');
  });

  it('collapses the list into one selected card with a change action', () => {
    const html = renderToStaticMarkup(
      <VehicleModelPicker models={models} selectedModel="Kawasaki KLX230" onSelect={() => undefined} {...labels} />,
    );

    expect(html).toContain('Selected vehicle');
    expect(html).toContain('Change model');
    expect(html).toContain('Kawasaki KLX230');
    expect(html).toContain('src="/vehicle-models/kawasaki-klx230.webp"');
    expect(html).not.toContain('Kawasaki Versys-X 300');
  });
});
