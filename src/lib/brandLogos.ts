// Brand logos served locally from /brand-logos (webp, sourced by the store admin).
// Brand marks remain trademarks of their respective owners.
// More specific matches must come first (e.g. "Kinetic Green" before "Kinetic").
const BRAND_LOGO_FILES: ReadonlyArray<readonly [match: string, file: string]> = [
  ['royal enfield', 'royal-enfield.webp'],
  ['royal-enfield', 'royal-enfield.webp'],
  ['hero', 'hero-motocorp.webp'],
  ['honda', 'honda.webp'],
  ['tvs', 'tvs.webp'],
  ['bajaj', 'bajaj.webp'],
  ['yamaha', 'yamaha.webp'],
  ['suzuki', 'suzuki.webp'],
  ['ktm', 'ktm.webp'],
  ['ola', 'ola.webp'],
  ['ather', 'ather.webp'],
  ['triumph', 'triumph.webp'],
  ['jawa', 'jawa.webp'],
  ['yezdi', 'yezdi.webp'],
  ['kawasaki', 'kawasaki.webp'],
  ['harley', 'harley-davidson.webp'],
  ['bmw', 'bmw-motorrad.webp'],
  ['aprilia', 'aprilia.webp'],
  ['vespa', 'vespa.webp'],
  ['ducati', 'ducati.webp'],
  ['revolt', 'revolt.webp'],
  ['ultraviolette', 'ultraviolette.webp'],
  ['simple energy', 'simple-energy.webp'],
  ['simple', 'simple-energy.webp'],
  ['pure', 'pure-ev.webp'],
  ['kinetic green', 'kinetic-green.webp'],
  ['kinetic', 'kinetic.webp'],
  ['husqvarna', 'husqvarna.webp'],
  ['benelli', 'benelli.webp'],
  ['qj', 'qjmotor.webp'],
  ['keeway', 'keeway.webp'],
  ['bsa', 'bsa.webp'],
];

export function getBrandLogoUrl(brand: string): string | null {
  const value = brand.trim().toLowerCase();
  const found = BRAND_LOGO_FILES.find(([match]) => value.includes(match));
  return found ? `/brand-logos/${found[1]}` : null;
}

export function getBrandInitials(brand: string): string {
  return brand
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
