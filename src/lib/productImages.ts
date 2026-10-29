import type { Product } from '../types';

type ProductColor = Product['colors'][number];

type DerivedProductImages = {
  image: string;
  additionalImages: string[];
  coverColorIndex: number;
  coverColorName: string;
};

const uniqueImages = (images: string[]) =>
  images
    .map((image) => image.trim())
    .filter(Boolean)
    .filter((image, index, values) => values.indexOf(image) === index);

export function deriveProductImages(colors: ProductColor[]): DerivedProductImages {
  const coverColorIndex = colors.findIndex((color) => uniqueImages(color.images || []).length > 0);
  const coverColor = coverColorIndex >= 0 ? colors[coverColorIndex] : undefined;
  const images = uniqueImages(coverColor?.images || []);

  return {
    image: images[0] || '',
    additionalImages: images.slice(1),
    coverColorIndex,
    coverColorName: coverColor?.name || '',
  };
}

export function seedLegacyColorImages(
  colors: ProductColor[],
  image: string,
  additionalImages: string[] = [],
): ProductColor[] {
  if (colors.some((color) => uniqueImages(color.images || []).length > 0)) return colors;

  const legacyImages = uniqueImages([image, ...additionalImages]);
  if (!legacyImages.length) return colors;

  return colors.map((color, index) => (index === 0 ? { ...color, images: legacyImages } : color));
}
