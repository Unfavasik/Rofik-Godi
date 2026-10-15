import type { CartItem, Product } from '../types';

export const MAX_ORDER_ITEM_QUANTITY = 99;
export const MAX_ORDER_LINE_ITEMS = 50;

export function getCartItemUnitPrice(product: Product, selectedThickness?: CartItem['selectedThickness'], embroideryText?: string) {
  const thicknessOptions = product.thicknessOptions || [];
  const thickness = thicknessOptions.find((option) => option.label === selectedThickness?.label)
    || thicknessOptions[0]
    || { label: 'Standard', extraPrice: 0 };
  const embroiderySurcharge = product.isCustomizable && embroideryText?.trim() ? 150 : 0;
  return Math.max(0, Math.round(Number(product.price || 0) + Number(thickness.extraPrice || 0) + embroiderySurcharge));
}

export function sanitizePersistedCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<CartItem>;
    const product = item.product as Product | undefined;
    const quantity = Number(item.quantity);
    if (!product || typeof product.id !== 'string' || typeof item.cartItemId !== 'string' || !Number.isFinite(quantity)) return [];
    const selectedColor = item.selectedColor && typeof item.selectedColor.name === 'string'
      ? item.selectedColor
      : { name: 'Standard', hex: '#111827' };
    return [{
      ...(item as CartItem),
      product,
      quantity: Math.max(1, Math.min(MAX_ORDER_ITEM_QUANTITY, Math.floor(quantity))),
      selectedColor,
      unitPrice: Number.isFinite(Number(item.unitPrice)) ? Math.max(0, Number(item.unitPrice)) : Number(product.price || 0),
    }];
  });
}

/** Only use an authoritative catalog snapshot to reconcile persisted product data. */
export function canReconcileCartFromCatalog(catalogLoaded: boolean, catalogError: Error | null, catalogProducts: Product[]): boolean {
  return catalogLoaded && catalogError === null && catalogProducts.length > 0;
}

/** Refresh saved product data while preserving standalone custom-seat products. */
export function refreshCartFromCatalog(cart: CartItem[], catalogProducts: Product[]): CartItem[] {
  const productsById = new Map(catalogProducts.map((product) => [product.id, product]));

  return cart.flatMap((item) => {
    if (item.product?.id?.startsWith('custom-seat-')) return [item];

    const currentProduct = productsById.get(item.product?.id);
    if (!currentProduct) return [];

    const selectedThickness = currentProduct.thicknessOptions.find(
      (option) => option.label === item.selectedThickness?.label,
    ) || currentProduct.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 };
    const selectedColor = currentProduct.colors.find(
      (color) => color.name.toLowerCase() === item.selectedColor?.name?.toLowerCase(),
    ) || currentProduct.colors[0] || item.selectedColor;
    const quantity = Math.max(1, Math.min(MAX_ORDER_ITEM_QUANTITY, Math.floor(Number(item.quantity) || 1)));

    return [{
      ...item,
      product: currentProduct,
      quantity,
      selectedColor,
      selectedThickness,
      unitPrice: getCartItemUnitPrice(currentProduct, selectedThickness, item.customEmbroideryText),
    }];
  });
}
