import type { CartItem } from '../types';
import { supabase } from './supabase';
import { normalizeCouponFailureMessage } from './couponErrors';
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type CouponEligibility = 'EVERYONE' | 'FIRST_ORDER' | 'EXISTING_CUSTOMERS';
export type CouponApplyTo = 'ALL_PRODUCTS' | 'SELECTED_PRODUCTS' | 'SELECTED_CATEGORIES';
export type CouponStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED' | 'USAGE_LIMIT_REACHED';

export interface CouponRecord {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount: number | null;
  minimum_order_value: number;
  starts_at: string;
  expires_at: string;
  usage_limit: number | null;
  per_customer_limit: number | null;
  used_count: number;
  eligibility: CouponEligibility;
  apply_to: CouponApplyTo;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  coupon_products?: Array<{ product_id: string }>;
  coupon_categories?: Array<{ category_key: string }>;
}

export interface CouponProductChoice {
  id: string;
  name: string;
  category_key: string | null;
}

export interface CouponUsageRecord {
  customer_id: string;
  order_id: string;
  discount_amount: number;
  created_at: string;
}

export interface CouponAnalyticsSummary {
  total_uses: number;
  remaining_uses: number | null;
  total_discount_given: number;
}

export interface CouponQuote {
  valid: boolean;
  message: string;
  code?: string;
  subtotal?: number;
  eligible_subtotal?: number;
  discount?: number;
  discount_amount?: number;
  final_total?: number;
}

export interface CustomerCouponOffer {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_value: number;
  max_discount: number | null;
  expires_at: string;
  eligibility: CouponEligibility;
  apply_to: CouponApplyTo;
  description: string | null;
  product_names: string[];
  category_keys: string[];
}

export interface CouponPayload {
  id?: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount: number | null;
  minimum_order_value: number;
  starts_at: string;
  expires_at: string;
  usage_limit: number | null;
  per_customer_limit: number | null;
  eligibility: CouponEligibility;
  apply_to: CouponApplyTo;
  product_ids: string[];
  category_keys: string[];
  description: string | null;
  is_enabled: boolean;
}

export function getCouponStatus(coupon: CouponRecord, now = Date.now()): CouponStatus {
  if (!coupon.is_enabled) return 'DISABLED';
  if (now < new Date(coupon.starts_at).getTime()) return 'SCHEDULED';
  if (now > new Date(coupon.expires_at).getTime()) return 'EXPIRED';
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) return 'USAGE_LIMIT_REACHED';
  return 'ACTIVE';
}

export async function loadCustomerCouponOffers() {
  if (!supabase) return { data: [] as CustomerCouponOffer[], error: 'Offers are temporarily unavailable.' };
  const { data, error } = await supabase.rpc('list_available_coupon_offers');
  if (error) return { data: [] as CustomerCouponOffer[], error: 'Offers are temporarily unavailable. Please try again later.' };
  return { data: (data || []) as CustomerCouponOffer[], error: '' };
}

async function confirmAdmin() {
  if (!supabase) return { ok: false, message: 'Supabase is not connected. Configure the public Supabase URL and publishable key to manage coupons.' };
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) return { ok: false, message: 'Sign in with an authorized admin account to manage coupons.' };
  const { data, error } = await supabase.rpc('is_admin');
  if (error || data !== true) return { ok: false, message: 'Administrator access is required to manage coupons.' };
  return { ok: true, message: '' };
}

export async function loadAdminCoupons() {
  const access = await confirmAdmin();
  if (!access.ok || !supabase) return { data: [] as CouponRecord[], error: access.message };
  const { data, error } = await supabase
    .from('coupons')
    .select('id,code,discount_type,discount_value,max_discount,minimum_order_value,starts_at,expires_at,usage_limit,per_customer_limit,used_count,eligibility,apply_to,description,is_enabled,created_at,updated_at,coupon_products(product_id),coupon_categories(category_key)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return { data: [] as CouponRecord[], error: 'Could not load coupons. Confirm the secure coupon migration is installed.' };
  return { data: (data || []) as unknown as CouponRecord[], error: '' };
}

export async function loadCouponProducts() {
  if (!supabase) return { data: [] as CouponProductChoice[], error: 'Supabase is not connected.' };
  const access = await confirmAdmin();
  if (!access.ok) return { data: [] as CouponProductChoice[], error: access.message };
  const { data, error } = await supabase
    .from('products')
    .select('id,name,category_key')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(500);
  if (error) return { data: [] as CouponProductChoice[], error: 'Could not load the product catalog.' };
  return { data: (data || []) as CouponProductChoice[], error: '' };
}

export async function saveAdminCoupon(payload: CouponPayload) {
  const access = await confirmAdmin();
  if (!access.ok || !supabase) return { data: null, error: access.message };
  const { data, error } = await supabase.rpc('save_coupon', { p_payload: payload });
  if (error) return { data: null, error: error.message || 'Could not save this coupon.' };
  return { data: data as { id: string; code: string }, error: '' };
}

export async function disableAdminCoupon(id: string) {
  const access = await confirmAdmin();
  if (!access.ok || !supabase) return { error: access.message };
  const { error } = await supabase.rpc('disable_coupon', { p_coupon_id: id });
  return { error: error?.message || '' };
}

export async function deleteUnusedAdminCoupon(id: string) {
  const access = await confirmAdmin();
  if (!access.ok || !supabase) return { error: access.message };
  const { error } = await supabase.rpc('delete_unused_coupon', { p_coupon_id: id });
  return { error: error?.message || '' };
}

export async function loadCouponUsages(couponId: string) {
  const access = await confirmAdmin();
  const emptySummary: CouponAnalyticsSummary = { total_uses: 0, remaining_uses: 0, total_discount_given: 0 };
  if (!access.ok || !supabase) return { data: [] as CouponUsageRecord[], summary: emptySummary, error: access.message };
  const { data, error } = await supabase.rpc('coupon_analytics', { p_coupon_id: couponId });
  if (error || !data) return { data: [] as CouponUsageRecord[], summary: emptySummary, error: 'Could not load coupon usage.' };
  const result = (Array.isArray(data) ? data[0] : data) as {
    total_uses?: number;
    remaining_uses?: number | null;
    total_discount_given?: number;
    usage_rows?: CouponUsageRecord[];
  };
  return {
    data: Array.isArray(result.usage_rows) ? result.usage_rows : [],
    summary: {
      total_uses: Number(result.total_uses || 0),
      remaining_uses: result.remaining_uses === null ? null : Number(result.remaining_uses || 0),
      total_discount_given: Number(result.total_discount_given || 0),
    },
    error: '',
  };
}

export async function validateCustomerCoupon(code: string, items: CartItem[], expectedUserId: string): Promise<CouponQuote> {
  if (!supabase) return { valid: false, message: 'Secure coupon validation is unavailable until Supabase is connected.' };
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user || userData.user.id !== expectedUserId) {
    return { valid: false, message: 'Sign in to apply a coupon.' };
  }
  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: code,
    p_items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
  });
  if (error) return { valid: false, message: normalizeCouponFailureMessage(error.message || 'Coupon validation is temporarily unavailable.') };
  const result = (Array.isArray(data) ? data[0] : data) as CouponQuote | null;
  if (!result) return { valid: false, message: 'Coupon validation returned no result.' };
  if (!result.valid) return { ...result, message: normalizeCouponFailureMessage(result.message || 'Coupon is invalid or expired.') };
  return result;
}
