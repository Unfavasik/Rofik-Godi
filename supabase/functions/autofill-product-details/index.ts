import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type GeminiDetails = {
  subtitle: string;
  features: string[];
  materials: string[];
  stitch_patterns: string[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_PATH_PREFIX = '/storage/v1/object/public/product-images/';
const GEMINI_MODELS = [
  { name: 'gemini-flash-latest', attempts: 2 },
  { name: 'gemini-3.5-flash-lite', attempts: 1 },
];
const GEMINI_REQUEST_TIMEOUT_MS = 15_000;
const GEMINI_PROMPT = `This is a bike/toto seat cover. Look at the image and return ONLY JSON: {subtitle: short string, features: string[], materials: string[], stitch_patterns: string[]}. Only describe what is visible. If unsure about material, use generic words like 'Premium synthetic leather'. Do not include markdown, code fences, or text outside the JSON object.`;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';
}

function cleanStringList(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => cleanString(item, 160))
        .filter(Boolean),
    ),
  ].slice(0, maxItems);
}

function parseGeminiJson(text: string): GeminiDetails {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Gemini returned no JSON object');
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  const result: GeminiDetails = {
    subtitle: cleanString(parsed.subtitle, 140),
    features: cleanStringList(parsed.features),
    materials: cleanStringList(parsed.materials, 6),
    stitch_patterns: cleanStringList(parsed.stitch_patterns, 6),
  };
  if (!result.subtitle) throw new Error('Gemini returned an empty subtitle');
  return result;
}

async function readBoundedImage(response: Response): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB');
  if (!response.body) throw new Error('Image response was empty');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error('Image is larger than 5 MB');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

function isRetryableGeminiStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get('retry-after') || 0);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 4000);
  return Math.min(700 * 2 ** attempt, 3000);
}

async function waitBeforeRetry(response: Response, attempt: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs(response, attempt)));
}

function validImageUrl(rawUrl: unknown, supabaseUrl: string): URL | null {
  if (typeof rawUrl !== 'string' || rawUrl.length > 2048) return null;
  try {
    const url = new URL(rawUrl);
    const expected = new URL(supabaseUrl);
    if (url.protocol !== 'https:' || url.origin !== expected.origin) return null;
    if (!url.pathname.startsWith(IMAGE_PATH_PREFIX)) return null;
    if (
      url.pathname
        .slice(IMAGE_PATH_PREFIX.length)
        .split('/')
        .some((part) => part === '..')
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !geminiApiKey) {
    return jsonResponse({ error: 'Image auto-fill is not configured.' }, 500);
  }
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ error: 'Please sign in with an admin account.' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'Please sign in again.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: admin, error: adminError } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();
  if (adminError || !admin?.user_id)
    return jsonResponse({ error: 'Admin access is required.' }, 403);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }
  const imageUrl = validImageUrl(payload.image_url, supabaseUrl);
  if (!imageUrl)
    return jsonResponse({ error: 'Use an uploaded image from the product-images bucket.' }, 400);

  let imageResponse: Response;
  try {
    imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  } catch {
    return jsonResponse({ error: 'Could not load the uploaded image. Please try again.' }, 400);
  }
  if (!imageResponse.ok) return jsonResponse({ error: 'Could not load the uploaded image.' }, 400);
  const contentType = (imageResponse.headers.get('content-type') || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return jsonResponse({ error: 'Only JPG, PNG, or WebP product images are supported.' }, 415);
  }

  let imageBytes: Uint8Array;
  try {
    imageBytes = await readBoundedImage(imageResponse);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Could not read the image.' },
      413,
    );
  }
  if (!imageBytes.length) return jsonResponse({ error: 'The uploaded image is empty.' }, 400);

  let geminiResponse: Response | null = null;
  try {
    const requestBody = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: GEMINI_PROMPT },
            { inline_data: { mime_type: contentType, data: toBase64(imageBytes) } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 384,
        responseMimeType: 'application/json',
      },
    });

    modelLoop: for (const modelConfig of GEMINI_MODELS) {
      for (let attempt = 0; attempt < modelConfig.attempts; attempt += 1) {
        geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.name}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiApiKey },
            body: requestBody,
            signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
          },
        );
        if (geminiResponse.ok || !isRetryableGeminiStatus(geminiResponse.status)) break;
        console.warn('Gemini image request is temporarily unavailable; retrying', {
          model,
          status: geminiResponse.status,
          attempt: attempt + 1,
        });
        if (attempt < modelConfig.attempts - 1) {
          await waitBeforeRetry(geminiResponse, attempt);
        }
      }
      if (geminiResponse?.ok || !isRetryableGeminiStatus(geminiResponse?.status ?? 0)) break modelLoop;
      console.warn('Gemini model remained unavailable; trying fallback model', {
        model: modelConfig.name,
        status: geminiResponse?.status,
      });
    }
    if (!geminiResponse) throw new Error('Gemini did not return a response');
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const detail =
      error instanceof Error
        ? error.message.replaceAll(geminiApiKey, '[REDACTED]').replace(/\s+/g, ' ').slice(0, 180)
        : 'Unknown network error';
    const timedOut = errorName === 'TimeoutError' || errorName === 'AbortError';
    console.error('Gemini image request failed before receiving a response', {
      name: errorName,
      detail,
    });
    return jsonResponse(
      {
        error: timedOut
          ? 'Gemini image analysis timed out. Please try again in a moment.'
          : 'Could not connect to Gemini image analysis. Please try again.',
        code: timedOut ? 'GEMINI_TIMEOUT' : 'GEMINI_NETWORK_ERROR',
      },
      timedOut ? 504 : 502,
    );
  }
  if (!geminiResponse.ok) {
    let providerMessage = '';
    try {
      const providerBody = await geminiResponse.text();
      const parsed = JSON.parse(providerBody) as Record<string, unknown>;
      const providerError = parsed.error as Record<string, unknown> | undefined;
      providerMessage =
        typeof providerError?.message === 'string'
          ? providerError.message
          : typeof parsed.message === 'string'
            ? parsed.message
            : '';
    } catch {
      // Keep the empty provider message when Gemini returns a non-JSON error body.
    }
    providerMessage = providerMessage
      .replaceAll(geminiApiKey, '[REDACTED]')
      .replace(/\s+/g, ' ')
      .slice(0, 240);
    console.error('Gemini image detail request returned non-2xx', {
      status: geminiResponse.status,
      provider_message: providerMessage,
    });
    return jsonResponse(
      {
        error: providerMessage
          ? `Gemini API error (${geminiResponse.status}): ${providerMessage}`
          : isRetryableGeminiStatus(geminiResponse.status)
            ? `Gemini is temporarily busy (HTTP ${geminiResponse.status}). Please try again in a moment.`
            : `Gemini API returned HTTP ${geminiResponse.status}. Check the API key or try again later.`,
        code: 'GEMINI_API_ERROR',
      },
      502,
    );
  }

  let responseData: Record<string, unknown>;
  try {
    responseData = await geminiResponse.json();
  } catch {
    return jsonResponse({ error: 'Image analysis returned an invalid response.' }, 502);
  }
  const candidates = Array.isArray(responseData.candidates)
    ? (responseData.candidates as Array<Record<string, unknown>>)
    : [];
  const content = candidates[0]?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts)
    ? (content.parts as Array<Record<string, unknown>>)
    : [];
  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
  if (!text)
    return jsonResponse(
      { error: 'The image model returned no details. Try a clearer photo.' },
      502,
    );

  try {
    return jsonResponse(parseGeminiJson(text));
  } catch {
    return jsonResponse(
      { error: 'The image model returned unreadable details. Please try again.' },
      502,
    );
  }
});
