import { supabase } from './supabase';

export type ProductImageAutofill = {
  subtitle: string;
  features: string[];
  materials: string[];
  stitch_patterns: string[];
};

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const cleanList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 8)
    : [];

export async function autofillProductDetailsFromImage(
  imageUrl: string,
): Promise<ProductImageAutofill> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!imageUrl) throw new Error('Upload a colour image first.');

  const { data, error } = await supabase.functions.invoke('autofill-product-details', {
    body: { image_url: imageUrl },
  });
  if (error) throw new Error(error.message || 'Image details could not be generated.');

  const result = data as Record<string, unknown> | null;
  const subtitle = cleanText(result?.subtitle, 140);
  if (!subtitle) throw new Error('The image model returned no subtitle. Please try another image.');

  return {
    subtitle,
    features: cleanList(result?.features),
    materials: cleanList(result?.materials),
    stitch_patterns: cleanList(result?.stitch_patterns),
  };
}
