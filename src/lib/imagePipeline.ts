const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.86;

export interface ImageConversionOptions {
  /** Center-crop a square from the source and resize it to this output edge length. */
  squareSize?: number;
  /** Scale the whole image to fit inside this canvas (transparent padding, nothing cropped). */
  fitSize?: { width: number; height: number };
  /** Scale the image to cover this canvas and center-crop the overflow. */
  coverSize?: { width: number; height: number };
}

export async function convertImageToWebP(file: File, options: ImageConversionOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  const bitmap = await createImageBitmap(file);
  const squareSize = options.squareSize;
  const fitSize = options.fitSize;
  const coverSize = options.coverSize;
  const width = coverSize
    ? coverSize.width
    : fitSize
      ? fitSize.width
      : squareSize ?? Math.max(1, Math.round(bitmap.width * Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))));
  const height = coverSize
    ? coverSize.height
    : fitSize
      ? fitSize.height
      : squareSize ?? Math.max(1, Math.round(bitmap.height * Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Your browser cannot process this image.');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  try {
    if (squareSize) {
      const cropSize = Math.min(bitmap.width, bitmap.height);
      const sourceX = (bitmap.width - cropSize) / 2;
      const sourceY = (bitmap.height - cropSize) / 2;
      context.drawImage(bitmap, sourceX, sourceY, cropSize, cropSize, 0, 0, squareSize, squareSize);
    } else if (coverSize) {
      // Cover: scale up until the canvas is filled, then center-crop the
      // overflow so the subject fills the frame instead of shrinking.
      const scale = Math.max(coverSize.width / bitmap.width, coverSize.height / bitmap.height);
      const drawWidth = Math.max(coverSize.width, Math.round(bitmap.width * scale));
      const drawHeight = Math.max(coverSize.height, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, Math.round((coverSize.width - drawWidth) / 2), Math.round((coverSize.height - drawHeight) / 2), drawWidth, drawHeight);
    } else if (fitSize) {
      // Contain: scale the full image down to fit the canvas and center it,
      // leaving transparent padding instead of cropping anything away.
      const scale = Math.min(fitSize.width / bitmap.width, fitSize.height / bitmap.height);
      const drawWidth = Math.max(1, Math.round(bitmap.width * scale));
      const drawHeight = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, Math.round((fitSize.width - drawWidth) / 2), Math.round((fitSize.height - drawHeight) / 2), drawWidth, drawHeight);
    } else {
      context.drawImage(bitmap, 0, 0, width, height);
    }
  } finally {
    bitmap.close();
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  if (!blob) throw new Error('Could not convert the image to WebP.');
  if (blob.type !== 'image/webp') throw new Error('Your browser cannot encode WebP images.');
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
  return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
}
