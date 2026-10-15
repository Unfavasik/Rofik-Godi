import { describe, expect, it } from 'vitest';
import { mapSupabaseProduct } from '../src/lib/supabaseProducts';

describe('Supabase catalog mapping', () => {
  it('preserves a separate out-of-stock state for public catalog cards', () => {
    const product = mapSupabaseProduct({
      id: 'product-1',
      name: 'Seat cover',
      category: 'Bike Covers',
      price: 500,
      image_url: 'https://example.com/cover.webp',
      in_stock: false,
      is_active: true,
    });
    expect(product.inStock).toBe(false);
    expect(product.image).toContain('cover.webp');
  });

  it('maps safe defaults for legacy product rows', () => {
    const product = mapSupabaseProduct({ id: 'product-2', name: 'Legacy cover', category: 'Bike Covers', price: 100 });
    expect(product.category).toBe('bike');
    expect(product.inStock).toBe(true);
    expect(product.thicknessOptions[0].label).toBe('Standard');
  });

  it('preserves admin-defined color names and swatch codes from Supabase', () => {
    const product = mapSupabaseProduct({
      id: 'product-3', name: 'Custom cover', category: 'Bike Covers', price: 250,
      colors_json: [{ name: 'Crimson Red', hex: '#D9232D', bgClass: 'bg-slate-900' }],
    });
    expect(product.colors).toEqual([{ name: 'Crimson Red', hex: '#D9232D', bgClass: 'bg-slate-900' }]);
  });
});
