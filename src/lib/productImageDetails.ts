const MODEL_ID = 'onnx-community/Florence-2-base';
const CAPTION_TASK = '<MORE_DETAILED_CAPTION>';
const CAPTION_PROMPT = `${CAPTION_TASK} Describe the product's visible surface material and texture, then identify any visible stitch or quilt pattern. Use only visual evidence; if a material cannot be identified reliably, say it is unclear rather than guessing.`;

type ImageSize = { width: number; height: number };
type FlorenceProcessor = ((image: unknown, prompts: unknown) => Promise<unknown>) & {
  construct_prompts: (task: string) => unknown;
  batch_decode: (ids: unknown, options: { skip_special_tokens: boolean }) => string[];
  post_process_generation: (text: string, task: string, size: ImageSize) => Record<string, unknown>;
};
type FlorenceModel = {
  generate: (input: unknown) => Promise<unknown>;
};
type TransformersModule = {
  env: {
    backends: {
      onnx: {
        wasm: { proxy: boolean };
      };
    };
  };
  Florence2ForConditionalGeneration: {
    from_pretrained: (
      modelId: string,
      options?: {
        dtype?: string;
        progress_callback?: (event: Record<string, unknown>) => void;
      },
    ) => Promise<FlorenceModel>;
  };
  AutoProcessor: {
    from_pretrained: (modelId: string) => Promise<FlorenceProcessor>;
  };
  load_image: (source: string) => Promise<{ size: ImageSize }>;
};

export type ProductImageDetailSuggestions = {
  caption: string;
  subtitle: string;
  features: string[];
  materials: string[];
  stitchPatterns: string[];
};

let transformersPromise: Promise<{
  model: FlorenceModel;
  processor: FlorenceProcessor;
  loadImage: TransformersModule['load_image'];
}> | null = null;

const loadTransformers = async (onProgress?: (message: string) => void) => {
  if (!transformersPromise) {
    transformersPromise = (async () => {
      const transformers =
        (await import('@huggingface/transformers')) as unknown as TransformersModule;
      // Keep CPU-bound WASM inference in a worker so mobile browsers remain responsive.
      transformers.env.backends.onnx.wasm.proxy = true;
      const [model, processor] = await Promise.all([
        transformers.Florence2ForConditionalGeneration.from_pretrained(MODEL_ID, {
          dtype: 'q4',
          progress_callback: (event) => {
            const progress = typeof event.progress === 'number' ? Math.round(event.progress) : null;
            if (event.status === 'progress' && progress !== null) {
              onProgress?.(`Loading image AI model… ${progress}%`);
            }
          },
        }),
        transformers.AutoProcessor.from_pretrained(MODEL_ID),
      ]);
      return { model, processor, loadImage: transformers.load_image };
    })().catch((error: unknown) => {
      transformersPromise = null;
      throw error;
    });
  }
  return transformersPromise;
};

const sentenceList = (caption: string) =>
  caption
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^[\s,;:-]+|[\s,;:-]+$/g, ''))
    .filter((sentence) => sentence.length >= 12)
    .slice(0, 4);

const visibleMaterialTerms: Array<[RegExp, string]> = [
  [
    /\b(?:leather(?:ette)?|(?:synthetic|faux|vegan|artificial|pu|pvc)[- ]leather|vinyl)\b/i,
    'Leather-like upholstery (visual estimate)',
  ],
  [/\b(?:suede|alcantara|microfiber|microfibre)\b/i, 'Suede or microfiber-like surface'],
  [/\b(?:mesh|netted|breathable fabric)\b/i, 'Mesh fabric'],
  [/\bdenim\b/i, 'Denim'],
  [/\bvelvet\b/i, 'Velvet'],
  [/\bcotton\b/i, 'Cotton'],
  [/\bpolyester\b/i, 'Polyester fabric'],
  [/\bcanvas\b/i, 'Canvas'],
  [/\b(?:fabric|textile|cloth|woven)\b/i, 'Upholstery fabric'],
  [/\bperforated\b/i, 'Perforated upholstery'],
];

const visibleStitchTerms: Array<[RegExp, string]> = [
  [/\bdiamond[- ](?:quilt(?:ed|ing)?|stitch(?:ed|ing)?)\b/i, 'Diamond quilting'],
  [/\bdiamond[- ]pattern\b/i, 'Diamond-pattern stitching'],
  [/\bquilt(?:ed|ing)?\b/i, 'Quilted stitching'],
  [
    /\b(?:hexagonal|hexagon|honeycomb)(?:[- ](?:quilt(?:ed|ing)?|stitch(?:ed|ing)?|pattern))?\b/i,
    'Honeycomb or hexagonal stitching',
  ],
  [/\bchevron(?:[- ](?:quilt(?:ed|ing)?|stitch(?:ed|ing)?|pattern))?\b/i, 'Chevron stitching'],
  [/\bcross[- ]stitch(?:ed|ing)?\b/i, 'Cross-stitching'],
  [/\bcheck(?:ered)?[- ](?:pattern|stitch(?:ing)?)\b/i, 'Check pattern stitching'],
  [/\bcontrast[- ]stitch(?:ing)?\b/i, 'Contrast stitching'],
  [
    /\b(?:horizontal|vertical|parallel)\s+(?:channels?|ribs?|lines?|panels?)\b|\b(?:channel[- ]quilt(?:ed|ing)?|ribbed)\b/i,
    'Channel stitching',
  ],
  [/\b(?:piping|piped seams?|welting)\b/i, 'Piped seams'],
  [/\b(?:stitch(?:ed|ing)?|seam(?:ed|ing)?)\b/i, 'Visible stitched seams'],
];

const matchingTerms = (caption: string, terms: Array<[RegExp, string]>) => [
  ...new Set(terms.flatMap(([pattern, label]) => (pattern.test(caption) ? [label] : []))),
];

export const extractImageAttributes = (caption: string) => {
  const materials = matchingTerms(caption, visibleMaterialTerms);
  const detectedStitches = matchingTerms(caption, visibleStitchTerms);
  const specificStitches = detectedStitches.filter(
    (pattern) => pattern !== 'Quilted stitching' && pattern !== 'Visible stitched seams',
  );

  return {
    materials: materials.length
      ? materials
      : ['Material unclear from photo — confirm before listing'],
    stitchPatterns: specificStitches.length
      ? specificStitches
      : detectedStitches.length
        ? detectedStitches
        : ['Stitch pattern unclear from photo — confirm before listing'],
  };
};

export const suggestProductDetailsFromImage = async (
  imageUrl: string,
  onProgress?: (message: string) => void,
): Promise<ProductImageDetailSuggestions> => {
  if (!imageUrl) throw new Error('Upload a product photo before using image auto-fill.');

  const { model, processor, loadImage } = await loadTransformers(onProgress);
  onProgress?.('Reading product photo…');
  const image = await loadImage(imageUrl);
  onProgress?.('Analyzing photo on this device… this may take a little while on phones.');
  const prompts = processor.construct_prompts(CAPTION_PROMPT);
  const inputs = await processor(image, prompts);
  const generatedIds = await model.generate({
    ...(inputs as Record<string, unknown>),
    max_new_tokens: 128,
  });
  const generatedText =
    processor.batch_decode(generatedIds, { skip_special_tokens: false })[0] || '';
  const result = processor.post_process_generation(generatedText, CAPTION_TASK, image.size);
  const caption = String(result[CAPTION_TASK] || '').trim();
  if (!caption)
    throw new Error('The image model could not describe this photo. Try a clearer product image.');

  const sentences = sentenceList(caption);
  const subtitle = (sentences[0] || caption).replace(/[.!?]+$/, '').slice(0, 120);
  const imageAttributes = extractImageAttributes(caption);
  return {
    caption,
    subtitle,
    features: sentences,
    ...imageAttributes,
  };
};
