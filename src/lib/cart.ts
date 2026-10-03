import type { CartItem, Product } from '../types';

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

    return [{
      ...item,
      product: currentProduct,
      selectedColor,
      selectedThickness,
      unitPrice: currentProduct.price + selectedThickness.extraPrice + (item.customEmbroideryText ? 150 : 0),
    }];
  });
}
