import { describe, expect, it } from 'vitest';
import { deriveProductImages, seedLegacyColorImages } from '../src/lib/productImages';

const color = (name: string, images: string[] = []) => ({
  name,
  hex: '#111827',
  bgClass: 'bg-slate-900',
  images,
});

describe('product image derivation', () => {
  it('uses the first colour with photos as the storefront cover and deduplicates its gallery', () => {
    expect(
      deriveProductImages([
        color('Black'),
        color('Crimson', [' red-main ', 'red-gallery', 'red-main']),
        color('Blue', ['blue-main']),
      ]),
    ).toEqual({
      image: 'red-main',
      additionalImages: ['red-gallery'],
      coverColorIndex: 1,
      coverColorName: 'Crimson',
    });
  });

  it('returns an empty storefront gallery when no colour has photos', () => {
    expect(deriveProductImages([color('Black'), color('Red')])).toEqual({
      image: '',
      additionalImages: [],
      coverColorIndex: -1,
      coverColorName: '',
    });
  });
});

describe('legacy product image migration', () => {
  it('seeds old product-level images into the first colour with no photos', () => {
    expect(
      seedLegacyColorImages([color('Black'), color('Red')], 'main', ['main', 'gallery']),
    ).toEqual([color('Black', ['main', 'gallery']), color('Red')]);
  });

  it('does not overwrite existing colour photos', () => {
    const colors = [color('Black', ['black-main']), color('Red')];
    expect(seedLegacyColorImages(colors, 'legacy-main', ['legacy-gallery'])).toBe(colors);
  });
});
