const MODEL_ID = 'onnx-community/Florence-2-base';
const CAPTION_TASK = '<CAPTION>';

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
      options?: { progress_callback?: (event: Record<string, unknown>) => void },
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
  [/\b(denim)\b/i, 'Denim'],
  [/\b(leather|leatherette|synthetic leather|faux leather)\b/i, 'Leather-like material'],
  [/\b(velvet)\b/i, 'Velvet'],
  [/\b(mesh)\b/i, 'Mesh'],
  [/\b(cotton)\b/i, 'Cotton'],
  [/\b(canvas)\b/i, 'Canvas'],
  [/\b(fabric|textile|cloth)\b/i, 'Fabric'],
];

const visibleStitchTerms: Array<[RegExp, string]> = [
  [/\b(diamond[- ]quilt(?:ed|ing)?)\b/i, 'Diamond quilting'],
  [/\b(quilt(?:ed|ing))\b/i, 'Quilted stitching'],
  [/\b(check(?:ered)?[- ](?:pattern|stitch(?:ing)?))\b/i, 'Check pattern stitching'],
  [/\b(contrast[- ]stitch(?:ing)?)\b/i, 'Contrast stitching'],
  [/\b(stitch(?:ed|ing)?|seam(?:ed|ing)?)\b/i, 'Visible stitched seams'],
];

const matchingTerms = (caption: string, terms: Array<[RegExp, string]>) => [
  ...new Set(terms.flatMap(([pattern, label]) => (pattern.test(caption) ? [label] : []))),
];

export const suggestProductDetailsFromImage = async (
  imageUrl: string,
  onProgress?: (message: string) => void,
): Promise<ProductImageDetailSuggestions> => {
  if (!imageUrl) throw new Error('Upload a product photo before using image auto-fill.');

  const { model, processor, loadImage } = await loadTransformers(onProgress);
  onProgress?.('Reading product photo…');
  const image = await loadImage(imageUrl);
  onProgress?.('Analyzing photo on this device… this may take a little while on phones.');
  const prompts = processor.construct_prompts(CAPTION_TASK);
  const inputs = await processor(image, prompts);
  const generatedIds = await model.generate({
    ...(inputs as Record<string, unknown>),
    max_new_tokens: 64,
  });
  const generatedText =
    processor.batch_decode(generatedIds, { skip_special_tokens: false })[0] || '';
  const result = processor.post_process_generation(generatedText, CAPTION_TASK, image.size);
  const caption = String(result[CAPTION_TASK] || '').trim();
  if (!caption)
    throw new Error('The image model could not describe this photo. Try a clearer product image.');

  const sentences = sentenceList(caption);
  const subtitle = (sentences[0] || caption).replace(/[.!?]+$/, '').slice(0, 120);
  return {
    caption,
    subtitle,
    features: sentences,
    materials: matchingTerms(caption, visibleMaterialTerms),
    stitchPatterns: matchingTerms(caption, visibleStitchTerms),
  };
};
