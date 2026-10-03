import type { CartItem, Product } from '../types';

/** Refresh cart product data from the current catalog and discard deleted products. */
export function refreshCartFromCatalog(cart: CartItem[], catalogProducts: Product[]): CartItem[] {
  const productsById = new Map(catalogProducts.map((product) => [product.id, product]));

  return cart.flatMap((item) => {
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
