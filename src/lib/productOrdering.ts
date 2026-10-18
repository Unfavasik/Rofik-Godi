import type { Product } from '../types';

export const compareProductsByDisplayOrder = (a: Product, b: Product): number =>
  (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
