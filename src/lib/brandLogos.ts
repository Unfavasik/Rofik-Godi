// Brand marks served from theSVG.org via jsDelivr CDN.
// Brand marks remain trademarks of their respective owners.
const BRAND_LOGO_SLUGS: ReadonlyArray<readonly [match: string, slug: string]> = [
  ['bmw', 'bmw'],
  ['bajaj', 'bajaj-auto'],
  ['honda', 'honda'],
  ['yamaha', 'yamaha-motor-corporation'],
  ['suzuki', 'suzuki'],
  ['ktm', 'ktm'],
  ['hero', 'hero-motocorp'],
];

export function getBrandLogoUrl(brand: string): string | null {
  const value = brand.trim().toLowerCase();
  const found = BRAND_LOGO_SLUGS.find(([match]) => value.includes(match));
  return found ? `https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/${found[1]}/default.svg` : null;
}

export function getBrandInitials(brand: string): string {
  return brand
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
