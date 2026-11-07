import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { autofillProductDetailsFromImage } from '../src/lib/productImageAutofill';

describe('Gemini product image autofill', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends the uploaded image URL and maps the Gemini fields', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({
      data: {
        subtitle: 'Soft synthetic leather with diamond stitching',
        features: ['Contoured fit', 'Contrast seams'],
        materials: ['Premium synthetic leather'],
        stitch_patterns: ['Diamond quilting'],
      },
      error: null,
    });

    await expect(
      autofillProductDetailsFromImage(
        'https://project.supabase.co/storage/v1/object/public/product-images/cover.webp',
      ),
    ).resolves.toEqual({
      subtitle: 'Soft synthetic leather with diamond stitching',
      features: ['Contoured fit', 'Contrast seams'],
      materials: ['Premium synthetic leather'],
      stitch_patterns: ['Diamond quilting'],
    });

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('autofill-product-details', {
      body: {
        image_url: 'https://project.supabase.co/storage/v1/object/public/product-images/cover.webp',
      },
    });
  });

  it('shows the Edge Function response message instead of the generic non-2xx error', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({ error: 'Gemini request timed out; please retry.' }),
          {
            status: 504,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      },
    });

    await expect(
      autofillProductDetailsFromImage('https://example.test/cover.webp'),
    ).rejects.toThrow('Gemini request timed out; please retry.');
  });

  it('rejects responses without a subtitle', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({
      data: { features: ['Visible seams'] },
      error: null,
    });

    await expect(
      autofillProductDetailsFromImage('https://example.test/cover.webp'),
    ).rejects.toThrow('no subtitle');
  });
});
