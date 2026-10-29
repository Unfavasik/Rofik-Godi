const clamp = (value: number) => Math.max(0, Math.min(1, value));

const hexToRgb = (value: string): [number, number, number] => {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return [17, 24, 39];
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((digit) => `${digit}${digit}`)
          .join('')
      : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
};

const rgbToHsl = (red: number, green: number, blue: number): [number, number, number] => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === r
      ? (g - b) / delta + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return [hue / 6, saturation, lightness];
};

const hslToRgb = (hue: number, saturation: number, lightness: number): [number, number, number] => {
  if (saturation === 0) return [lightness * 255, lightness * 255, lightness * 255];
  const hueToRgb = (p: number, q: number, t: number) => {
    let next = t;
    if (next < 0) next += 1;
    if (next > 1) next -= 1;
    if (next < 1 / 6) return p + (q - p) * 6 * next;
    if (next < 1 / 2) return q;
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
    return p;
  };
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return [
    hueToRgb(p, q, hue + 1 / 3) * 255,
    hueToRgb(p, q, hue) * 255,
    hueToRgb(p, q, hue - 1 / 3) * 255,
  ];
};

const loadImage = (sourceUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error("This image can't be recolored automatically. Upload the image file instead."),
      );
    image.src = sourceUrl;
  });

export async function recolorImage(sourceUrl: string, hex: string): Promise<Blob> {
  const image = await loadImage(sourceUrl);
  const maxSide = 1200;
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height),
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context)
    throw new Error("This image can't be recolored automatically. Upload the image file instead.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const target = rgbToHsl(...hexToRgb(hex));
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const alpha = pixels.data[offset + 3];
    if (!alpha) continue;
    const [, saturation, lightness] = rgbToHsl(
      pixels.data[offset],
      pixels.data[offset + 1],
      pixels.data[offset + 2],
    );
    // Keep neutral highlights and deep shadows intact. Replacing every pixel's
    // saturation makes a product look like a flat colour overlay and destroys
    // the lighting/texture customers need to judge the product.
    if ((lightness > 0.9 && saturation < 0.12) || lightness < 0.035) continue;
    const tintStrength = saturation < 0.12 ? 0.42 : 0.78;
    const adjustedSaturation = clamp(saturation * (1 - tintStrength) + target[1] * tintStrength);
    const [red, green, blue] = hslToRgb(target[0], adjustedSaturation, clamp(lightness));
    pixels.data[offset] = Math.round(red);
    pixels.data[offset + 1] = Math.round(green);
    pixels.data[offset + 2] = Math.round(blue);
  }
  context.putImageData(pixels, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error(
                "This image can't be recolored automatically. Upload the image file instead.",
              ),
            ),
      'image/webp',
      0.9,
    ),
  );
}
