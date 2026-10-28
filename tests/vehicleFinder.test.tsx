import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VEHICLE_MODELS } from '../src/data/vehicleModels';
import { VehicleFinder } from '../src/components/VehicleFinder';

describe('vehicle fitment catalog', () => {
  it('includes the full PDF model list and company coverage', () => {
    expect(VEHICLE_MODELS).toHaveLength(283);
    expect(new Set(VEHICLE_MODELS.map((vehicle) => vehicle.brand)).size).toBe(37);
    expect(VEHICLE_MODELS.filter((vehicle) => vehicle.type === 'bike')).toHaveLength(191);
    expect(VEHICLE_MODELS.filter((vehicle) => vehicle.type === 'scooter')).toHaveLength(92);
  });

  it('keeps every catalog image local, present, and encoded as WebP', () => {
    const imagePaths = [...new Set(VEHICLE_MODELS.map((vehicle) => vehicle.image))];
    expect(imagePaths).toHaveLength(278);
    for (const imagePath of imagePaths) {
      expect(imagePath).toMatch(/^\/vehicle-models\/[a-z0-9-]+\.webp$/);
      const fullPath = path.join(process.cwd(), 'public', imagePath.slice(1));
      expect(existsSync(fullPath)).toBe(true);
      const header = readFileSync(fullPath).subarray(0, 12).toString('ascii');
      expect(header.slice(0, 4)).toBe('RIFF');
      expect(header.slice(8, 12)).toBe('WEBP');
    }
  });

  it('contains named bike and scooter models with corresponding local photos', () => {
    expect(VEHICLE_MODELS).toContainEqual({
      brand: 'Hero MotoCorp',
      name: 'Hero HF Deluxe',
      type: 'bike',
      image: '/vehicle-models/hero-hf-deluxe.webp',
    });
    expect(VEHICLE_MODELS.some((vehicle) => vehicle.brand === 'Honda' && vehicle.type === 'scooter')).toBe(true);
  });
});

describe('Vehicle Fitment Finder', () => {
  it('starts with a company selector, disables model selection until a company is chosen, and keeps Toto support', () => {
    const html = renderToStaticMarkup(
      <VehicleFinder onFilterVehicle={() => {}} activeVehicleFilter={null} />,
    );
    expect(html).toContain('aria-label="Select company"');
    expect(html).toContain('aria-label="Select model"');
    expect(html).toContain('Pick Company First');
    expect(html).toContain('Hero MotoCorp');
    expect(html).toContain('Toto / Cab');
    expect(html).toContain('Find Covers');
  });
});
