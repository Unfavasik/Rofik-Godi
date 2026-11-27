import type { Product } from '../types';
import { supabase } from './supabase';
import {
  mergePriceDropAlerts,
  readLocalPriceDropAlerts,
  removeLocalPriceDropAlert,
  upsertLocalPriceDropAlert,
  writeLocalPriceDropAlerts,
  type PriceDropAlertRecord,
} from './priceDropAlerts';
import { isValidUuid, sanitizeUrl } from './security';

const isUuid = isValidUuid;

type RpcPriceDropAlertRow = {
  id: string;
  product_id: string;
  product_title?: string | null;
  product_image?: string | null;
  target_price: number | string;
  initial_price: number | string;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRpcRowToRecord(
  row: RpcPriceDropAlertRow,
  fallbackProduct?: Pick<Product, 'title' | 'image'>,
): PriceDropAlertRecord {
  return {
    id: row.id,
    productId: row.product_id,
    productTitle: row.product_title || fallbackProduct?.title || 'Product',
    productImage: sanitizeUrl(row.product_image ?? fallbackProduct?.image ?? null, { allowRelative: true }),
    thresholdPrice: Number(row.target_price),
    initialPrice: Number(row.initial_price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    triggeredAt: row.triggered_at,
  };
}

export async function listMyPriceDropAlerts(userId: string): Promise<PriceDropAlertRecord[]> {
  const localAlerts = readLocalPriceDropAlerts(userId);
  if (!supabase || !isUuid(userId)) {
    return localAlerts;
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== userId) {
      return localAlerts;
    }

    const { data, error } = await supabase.rpc('list_my_price_drop_alerts');
    if (error || !Array.isArray(data)) {
      return localAlerts;
    }

    const serverAlerts = (data as RpcPriceDropAlertRow[]).map((row) => mapRpcRowToRecord(row));
    const merged = mergePriceDropAlerts(serverAlerts, localAlerts);
    writeLocalPriceDropAlerts(userId, merged);
    return merged;
  } catch {
    return localAlerts;
  }
}

export async function upsertMyPriceDropAlert(
  userId: string,
  product: Pick<Product, 'id' | 'title' | 'price' | 'image'>,
  thresholdPrice: number,
): Promise<{ alerts: PriceDropAlertRecord[]; error: string | null }> {
  if (!supabase || !isUuid(userId) || !isUuid(product.id)) {
    const updated = upsertLocalPriceDropAlert(userId, product, thresholdPrice);
    return { alerts: updated, error: null };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== userId) {
      const updated = upsertLocalPriceDropAlert(userId, product, thresholdPrice);
      return { alerts: updated, error: null };
    }

    const { data, error } = await supabase.rpc('upsert_my_price_drop_alert', {
      p_product_id: product.id,
      p_target_price: thresholdPrice,
    });

    if (error || !data) {
      return {
        alerts: readLocalPriceDropAlerts(userId),
        error: error?.message || 'Could not save your price drop alert. Please try again.',
      };
    }

    const mapped = mapRpcRowToRecord(data as RpcPriceDropAlertRow, product);
    const current = readLocalPriceDropAlerts(userId);
    const updated = mergePriceDropAlerts([mapped], current.filter((item) => item.productId !== product.id));
    writeLocalPriceDropAlerts(userId, updated);
    return { alerts: updated, error: null };
  } catch {
    return {
      alerts: readLocalPriceDropAlerts(userId),
      error: 'Could not save your price drop alert. Please try again.',
    };
  }
}

export async function deleteMyPriceDropAlert(
  userId: string,
  productId: string,
): Promise<{ alerts: PriceDropAlertRecord[]; error: string | null }> {
  if (!supabase || !isUuid(userId) || !isUuid(productId)) {
    const updated = removeLocalPriceDropAlert(userId, productId);
    return { alerts: updated, error: null };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== userId) {
      const updated = removeLocalPriceDropAlert(userId, productId);
      return { alerts: updated, error: null };
    }

    const { error } = await supabase.rpc('delete_my_price_drop_alert', {
      p_product_id: productId,
    });
    if (error) {
      return {
        alerts: readLocalPriceDropAlerts(userId),
        error: error.message || 'Could not remove this price drop alert.',
      };
    }

    const updated = removeLocalPriceDropAlert(userId, productId);
    return { alerts: updated, error: null };
  } catch {
    return {
      alerts: readLocalPriceDropAlerts(userId),
      error: 'Could not remove this price drop alert. Please try again.',
    };
  }
}
