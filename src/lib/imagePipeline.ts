const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.86;

export async function convertImageToWebP(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot process this image.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  if (!blob) throw new Error('Could not convert the image to WebP.');
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image';
  return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
}
