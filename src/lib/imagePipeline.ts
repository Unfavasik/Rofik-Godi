const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.86;

export interface ImageConversionOptions {
  /** Center-crop a square from the source and resize it to this output edge length. */
  squareSize?: number;
}

export async function convertImageToWebP(file: File, options: ImageConversionOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  const bitmap = await createImageBitmap(file);
  const squareSize = options.squareSize;
  const width = squareSize ?? Math.max(1, Math.round(bitmap.width * Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))));
  const height = squareSize ?? Math.max(1, Math.round(bitmap.height * Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))));
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
