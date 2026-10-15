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

const hexColorPattern = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const colorPickerPattern = /^#([\da-f]{3}|[\da-f]{6})$/i;
const nonColorKeywords = new Set(['currentcolor', 'inherit', 'initial', 'revert', 'unset', 'transparent']);

/** Accept a hex code or a real CSS color value/name for product swatches. */
export function isValidProductColorValue(value: string): boolean {
  const color = value.trim();
  if (!color || nonColorKeywords.has(color.toLowerCase())) return false;
  if (hexColorPattern.test(color)) return true;
  if (commonCssColors.has(color.toLowerCase())) return true;
  return typeof CSS !== 'undefined' && CSS.supports('color', color);
}

/** Native color inputs require a six-digit hex; expand short hex and use a safe fallback otherwise. */
export function toColorPickerValue(value: string): string {
  const match = value.trim().match(colorPickerPattern);
  if (!match) return '#111827';
  const digits = match[1];
  if (digits.length === 3) return `#${digits.split('').map((digit) => `${digit}${digit}`).join('')}`;
  return `#${digits}`;
}
