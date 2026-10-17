import type { CartItem, CustomerOrderRecord, Product } from '../types';

export const MAX_ORDER_ITEM_QUANTITY = 99;
export const MAX_ORDER_LINE_ITEMS = 50;

export function resolveStitchPatternSelection(availableStitches: string[] | null | undefined, selected?: string | null): string | undefined {
  const patterns = (availableStitches || []).filter(Boolean);
  return selected && patterns.includes(selected) ? selected : patterns[0] || undefined;
}

export function getCartItemUnitPrice(product: Product, selectedThickness?: CartItem['selectedThickness'], embroideryText?: string) {
  const thicknessOptions = product.thicknessOptions || [];
  const thickness = thicknessOptions.find((option) => option.label === selectedThickness?.label)
    || thicknessOptions[0]
    || { label: 'Standard', extraPrice: 0 };
  const embroiderySurcharge = product.isCustomizable && embroideryText?.trim() ? 150 : 0;
  return Math.max(0, Math.round(Number(product.price || 0) + Number(thickness.extraPrice || 0) + embroiderySurcharge));
}

const normalizeCartOption = (value?: string | null) => (value || '').trim().toLowerCase();

function isSameCartConfiguration(left: CartItem, right: CartItem): boolean {
  return left.product.id === right.product.id
    && normalizeCartOption(left.selectedColor?.name) === normalizeCartOption(right.selectedColor?.name)
    && normalizeCartOption(left.selectedColor?.hex) === normalizeCartOption(right.selectedColor?.hex)
    && normalizeCartOption(left.selectedStitch) === normalizeCartOption(right.selectedStitch)
    && normalizeCartOption(left.selectedThickness?.label) === normalizeCartOption(right.selectedThickness?.label)
    && (left.customEmbroideryText || '').trim() === (right.customEmbroideryText || '').trim();
}

export function createDefaultCartItem(product: Product, cartItemId = `${product.id}-quick-${Date.now()}`): CartItem {
  const selectedColor = product.colors[0] || { name: 'Standard', hex: '#111827' };
  const selectedThickness = product.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 };
  const selectedStitch = resolveStitchPatternSelection(product.stitchPatterns);
  return {
    cartItemId,
    product,
    quantity: 1,
    selectedColor,
    selectedStitch,
    selectedThickness,
    unitPrice: getCartItemUnitPrice(product, selectedThickness),
  };
}

export function hasMatchingCartItem(cart: CartItem[], candidate: CartItem): boolean {
  return cart.some((item) => isSameCartConfiguration(item, candidate));
}

export function toggleCartItem(cart: CartItem[], candidate: CartItem): CartItem[] {
  if (hasMatchingCartItem(cart, candidate)) {
    return cart.filter((item) => !isSameCartConfiguration(item, candidate));
  }
  return addOrMergeCartItem(cart, candidate);
}

/** Coalesce identical lines already present in persisted or reconciled cart data. */
function mergeDuplicateCartLines(items: CartItem[]): CartItem[] {
  const merged: CartItem[] = [];
  for (const item of items) {
    const index = merged.findIndex((existing) => isSameCartConfiguration(existing, item));
    if (index < 0) {
      merged.push(item);
      continue;
    }
    const existing = merged[index];
    merged[index] = {
      ...existing,
      product: item.product,
      quantity: Math.min(MAX_ORDER_ITEM_QUANTITY, existing.quantity + item.quantity),
      selectedColor: item.selectedColor,
      selectedStitch: item.selectedStitch,
      selectedThickness: item.selectedThickness,
      customEmbroideryText: item.customEmbroideryText,
      unitPrice: item.unitPrice,
    };
  }
  return merged;
}

/** Add once; quantity changes are made with the cart's quantity controls. */
export function addOrMergeCartItem(cart: CartItem[], incoming: CartItem): CartItem[] {
  const incomingQuantity = Math.max(1, Math.min(MAX_ORDER_ITEM_QUANTITY, Math.floor(Number(incoming.quantity) || 1)));
  const incomingItem = { ...incoming, quantity: incomingQuantity };
  const existingIndex = cart.findIndex((item) => isSameCartConfiguration(item, incomingItem));
  if (existingIndex < 0) return [...cart, incomingItem];

  return cart.map((item, index) => index === existingIndex
    ? {
      ...item,
      product: incomingItem.product,
      selectedColor: incomingItem.selectedColor,
      selectedStitch: incomingItem.selectedStitch,
      selectedThickness: incomingItem.selectedThickness,
      customEmbroideryText: incomingItem.customEmbroideryText,
      unitPrice: incomingItem.unitPrice,
    }
    : item);
}

export function sanitizePersistedCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const sanitized = value.flatMap((entry): CartItem[] => {
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
  return mergeDuplicateCartLines(sanitized);
}

/** Only use an authoritative catalog snapshot to reconcile persisted product data. */
export function canReconcileCartFromCatalog(catalogLoaded: boolean, catalogError: Error | null, catalogProducts: Product[]): boolean {
  return catalogLoaded && catalogError === null && catalogProducts.length > 0;
}

/** Refresh saved product data while preserving standalone custom-seat products. */
export function refreshCartFromCatalog(cart: CartItem[], catalogProducts: Product[]): CartItem[] {
  const productsById = new Map(catalogProducts.map((product) => [product.id, product]));

  return mergeDuplicateCartLines(cart.flatMap((item) => {
    if (item.product?.id?.startsWith('custom-seat-')) return [item];

    const currentProduct = productsById.get(item.product?.id);
    if (!currentProduct) return [];

    const selectedThickness = currentProduct.thicknessOptions.find(
      (option) => option.label === item.selectedThickness?.label,
    ) || currentProduct.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 };
    const selectedColor = currentProduct.colors.find(
      (color) => color.name.toLowerCase() === item.selectedColor?.name?.toLowerCase(),
    ) || currentProduct.colors[0] || item.selectedColor;
    const selectedStitch = resolveStitchPatternSelection(currentProduct.stitchPatterns, item.selectedStitch);
    const quantity = Math.max(1, Math.min(MAX_ORDER_ITEM_QUANTITY, Math.floor(Number(item.quantity) || 1)));

    return [{
      ...item,
      product: currentProduct,
      quantity,
      selectedColor,
      selectedStitch,
      selectedThickness,
      unitPrice: getCartItemUnitPrice(currentProduct, selectedThickness, item.customEmbroideryText),
    }];
  }));
}

/** Rebuild a completed order from the current public catalog, never historical prices. */
export function buildReorderCartItems(
  orderItems: CustomerOrderRecord['order_items'],
  catalogProducts: Product[],
): { items: CartItem[]; skippedItems: string[] } {
  const productsById = new Map(catalogProducts.map((product) => [product.id, product]));
  const skippedItems: string[] = [];
  const rebuiltItems = orderItems.flatMap((orderItem, index): CartItem[] => {
    const product = orderItem.product_id ? productsById.get(orderItem.product_id) : undefined;
    if (!product || !product.inStock) {
      skippedItems.push(orderItem.product_name || 'Unavailable product');
      return [];
    }

    const colorName = (orderItem.color || '').trim().toLowerCase();
    const selectedColor = product.colors.find((color) => color.name.trim().toLowerCase() === colorName)
      || (orderItem.color
        ? { name: orderItem.color, hex: product.colors[0]?.hex || '#111827' }
        : product.colors[0] || { name: 'Standard', hex: '#111827' });
    const thicknessLabel = (orderItem.selected_thickness || '').trim();
    const selectedThickness = product.thicknessOptions.find((option) => option.label.trim().toLowerCase() === thicknessLabel.toLowerCase())
      || product.thicknessOptions[0]
      || { label: 'Standard', extraPrice: 0 };
    const selectedStitch = resolveStitchPatternSelection(product.stitchPatterns, orderItem.selected_stitch);
    const customEmbroideryText = orderItem.custom_embroidery_text?.trim() || undefined;
    return [{
      cartItemId: `buy-again-${product.id}-${Date.now()}-${index}`,
      product,
      quantity: Math.max(1, Math.min(MAX_ORDER_ITEM_QUANTITY, Math.floor(Number(orderItem.quantity) || 1))),
      selectedColor,
      selectedStitch,
      selectedThickness,
      customEmbroideryText,
      unitPrice: getCartItemUnitPrice(product, selectedThickness, customEmbroideryText),
    }];
  });

  return {
    items: refreshCartFromCatalog(rebuiltItems, catalogProducts),
    skippedItems: [...new Set(skippedItems)],
  };
}
