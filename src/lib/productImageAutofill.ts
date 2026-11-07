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

async function getInvocationErrorMessage(error: unknown): Promise<string> {
  const fallback =
    error instanceof Error
      ? error.message
      : 'Image details could not be generated. Please try again.';
  const context =
    error && typeof error === 'object' ? (error as { context?: unknown }).context : undefined;

  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as Record<string, unknown>;
      const message = cleanText(body.error ?? body.message, 320);
      if (message) return message;
    } catch {
      // Fall back to the Supabase Functions error when the response is not JSON.
    }
  }

  return fallback || 'Image details could not be generated. Please try again.';
}

export async function autofillProductDetailsFromImage(
  imageUrl: string,
): Promise<ProductImageAutofill> {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!imageUrl) throw new Error('Upload a colour image first.');

  const { data, error } = await supabase.functions.invoke('autofill-product-details', {
    body: { image_url: imageUrl },
  });
  if (error) throw new Error(await getInvocationErrorMessage(error));

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
