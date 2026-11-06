const commonCssColors = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
  'gray', 'grey', 'silver', 'gold', 'navy', 'teal', 'maroon', 'olive', 'lime', 'aqua',
  'cyan', 'magenta', 'fuchsia', 'indigo', 'violet', 'coral', 'crimson', 'beige', 'tan',
  'chocolate', 'tomato', 'salmon', 'turquoise', 'lavender', 'ivory', 'khaki', 'rebeccapurple',
  'darkred', 'darkgreen', 'darkblue', 'darkorange', 'darkcyan', 'darkmagenta', 'darkgray',
  'darkgrey', 'lightgray', 'lightgrey', 'slategray', 'slategrey', 'slateblue', 'steelblue',
  'royalblue', 'hotpink', 'deeppink', 'firebrick', 'mediumseagreen', 'springgreen',
  'mediumaquamarine', 'blueviolet', 'darkviolet', 'orchid', 'plum', 'saddlebrown', 'peru',
  'wheat', 'burlywood', 'indianred', 'rosybrown', 'lightsalmon', 'darksalmon',
]);

const namedColors: Array<[string, string]> = [
  ['Black', '#000000'], ['White', '#ffffff'], ['Grey', '#808080'], ['Silver', '#c0c0c0'],
  ['Red', '#ff0000'], ['Crimson Red', '#dc143c'], ['Maroon', '#800000'], ['Orange', '#ffa500'],
  ['Yellow', '#ffff00'], ['Gold', '#ffd700'], ['Green', '#008000'], ['Olive', '#808000'],
  ['Lime', '#00ff00'], ['Teal', '#008080'], ['Cyan', '#00ffff'], ['Sky Blue', '#87ceeb'],
  ['Blue', '#0000ff'], ['Navy', '#000080'], ['Purple', '#800080'], ['Violet', '#ee82ee'],
  ['Pink', '#ffc0cb'], ['Magenta', '#ff00ff'], ['Brown', '#a52a2a'], ['Beige', '#f5f5dc'],
  ['Cream', '#fffdd0'], ['Coffee', '#6f4e37'], ['Khaki', '#f0e68c'], ['Burgundy', '#800020'],
  ['Coral', '#ff7f50'], ['Tomato', '#ff6347'], ['Salmon', '#fa8072'], ['Turquoise', '#40e0d0'],
  ['Lavender', '#e6e6fa'], ['Indigo', '#4b0082'], ['Chocolate', '#d2691e'], ['Tan', '#d2b48c'],
  ['Plum', '#dda0dd'], ['Steel Blue', '#4682b4'], ['Royal Blue', '#4169e1'], ['Hot Pink', '#ff69b4'],
  ['Forest Green', '#228b22'], ['Mint', '#98ff98'], ['Charcoal', '#36454f'], ['Ivory', '#fffff0'],
];

const hexColorPattern = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const colorPickerPattern = /^#([\da-f]{3}|[\da-f]{6})$/i;
const nonColorKeywords = new Set(['currentcolor', 'inherit', 'initial', 'revert', 'unset', 'transparent']);

const hexToRgb = (value: string): [number, number, number] | null => {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].split('').map((digit) => `${digit}${digit}`).join('') : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16)) as [number, number, number];
};

const cssColorToHex = (value: string): string | null => {
  const direct = toColorPickerValue(value);
  if (hexColorPattern.test(value.trim())) return direct;
  const known = namedColors.find(([name]) => name.toLowerCase() === value.trim().toLowerCase());
  if (known) return known[1];
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#000000';
  context.fillStyle = value.trim();
  const normalized = context.fillStyle;
  if (normalized.startsWith('#')) return toColorPickerValue(normalized);
  const rgb = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  return rgb ? `#${[rgb[1], rgb[2], rgb[3]].map((item) => Number(item).toString(16).padStart(2, '0')).join('')}` : null;
};

/** Accept a hex code or a real CSS color value/name for product swatches. */
export function isValidProductColorValue(value: string): boolean {
  const color = value.trim();
  if (!color || nonColorKeywords.has(color.toLowerCase())) return false;
  if (hexColorPattern.test(color)) return true;
  if (commonCssColors.has(color.toLowerCase())) return true;
  return typeof CSS !== 'undefined' && CSS.supports('color', color);
}

/** Returns the nearest friendly name from the built-in common color palette. */
export function getColorNameFromHex(value: string): string {
  const hex = cssColorToHex(value);
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return value.trim();
  let closest = namedColors[0][0];
  let distance = Number.POSITIVE_INFINITY;
  for (const [name, candidateHex] of namedColors) {
    const candidate = hexToRgb(candidateHex);
    if (!candidate) continue;
    const next = (rgb[0] - candidate[0]) ** 2 + (rgb[1] - candidate[1]) ** 2 + (rgb[2] - candidate[2]) ** 2;
    if (next < distance) { distance = next; closest = name; }
  }
  return closest;
}

/** A stable Tailwind-compatible color class for the editor's live swatch preview. */
export function getColorBgClass(value: string): string {
  const hex = cssColorToHex(value);
  return hex ? `bg-[${hex}]` : 'bg-slate-900';
}

/** Native color inputs require a six-digit hex; expand short hex and use a safe fallback otherwise. */
export function toColorPickerValue(value: string): string {
  const match = value.trim().match(colorPickerPattern);
  if (!match) return '#111827';
  const digits = match[1];
  if (digits.length === 3) return `#${digits.split('').map((digit) => `${digit}${digit}`).join('')}`;
  return `#${digits}`;
}

import type { Product } from '../types';

/** Defaults shown on the storefront Specifications block when nothing is set. */
export const DEFAULT_PACKAGE_INCLUDES = ['1 Seat Cover'];
export const DEFAULT_INSTALLATION = 'Easy (DIY)';

/**
 * Returns the selected colour's values, falling back to the product-level
 * defaults. A colour value counts as "set" only when it is a non-empty string
 * or a non-empty list — an empty field means "inherit from the product", so
 * colours without their own details always match the product defaults.
 */
export function getColorDetails(product: Product, color: Product['colors'][number]) {
  const own = <T,>(key: keyof Product['colors'][number], fallback: T): T => {
    const value = color[key] as T | undefined;
    if (value === undefined) return fallback;
    if (typeof value === 'string') return (value.trim() ? value : fallback);
    if (Array.isArray(value)) return (value.length ? value : fallback);
    return value;
  };
  return {
    subtitle: own('subtitle', product.subtitle || ''),
    features: own('features', product.features || []),
    compatibility: own('compatibility', product.compatibility || []),
    materials: own('materials', product.materials || []),
    stitchPatterns: own('stitchPatterns', product.stitchPatterns || []),
    packageIncludes: own('packageIncludes', product.packageIncludes?.length ? product.packageIncludes : DEFAULT_PACKAGE_INCLUDES),
    installation: own('installation', product.installation || DEFAULT_INSTALLATION),
  };
}
