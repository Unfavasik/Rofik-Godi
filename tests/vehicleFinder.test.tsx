import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehicleFinder } from '../src/components/VehicleFinder';

// The catalog moved from a static data file into the vehicle_models table;
// the seed migration is now the source of truth these checks guard.
const SEED_PATH = path.join(process.cwd(), 'supabase/migrations/20261102160000_supabase_vehicle_catalog.sql');
const SEED_INSERT = /insert into public\.vehicle_models \(brand, name, type, image_url\) values \('([^']+)', '([^']+)', '(bike|scooter)', '([^']*)'\)/g;

function seedCatalog() {
  const sql = readFileSync(SEED_PATH, 'utf8');
  return [...sql.matchAll(SEED_INSERT)].map((match) => ({
    brand: match[1],
    name: match[2],
    type: match[3] as 'bike' | 'scooter',
    image: match[4],
  }));
}

describe('vehicle fitment catalog seed', () => {
  const catalog = seedCatalog();

  it('includes the full model list and company coverage', () => {
    expect(catalog).toHaveLength(283);
    expect(new Set(catalog.map((vehicle) => vehicle.brand)).size).toBe(37);
    expect(catalog.filter((vehicle) => vehicle.type === 'bike')).toHaveLength(191);
    expect(catalog.filter((vehicle) => vehicle.type === 'scooter')).toHaveLength(92);
  });

  it('keeps every catalog image local, present, and encoded as WebP', () => {
    const imagePaths = [...new Set(catalog.map((vehicle) => vehicle.image))];
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
    expect(catalog).toContainEqual({
      brand: 'Hero MotoCorp',
      name: 'Hero HF Deluxe',
      type: 'bike',
      image: '/vehicle-models/hero-hf-deluxe.webp',
    });
    expect(catalog.some((vehicle) => vehicle.brand === 'Honda' && vehicle.type === 'scooter')).toBe(true);
  });
});

describe('Vehicle Fitment Finder', () => {
  it('renders the company/model selectors and keeps Toto support', () => {
    const html = renderToStaticMarkup(
      <VehicleFinder onFilterVehicle={() => {}} activeVehicleFilter={null} />,
    );
    expect(html).toContain('aria-label="Select company"');
    expect(html).toContain('aria-label="Select model"');
    expect(html).toContain('Toto / Cab');
    expect(html).toContain('Find Covers');
  });
});
