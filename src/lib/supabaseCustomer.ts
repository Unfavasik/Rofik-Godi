import { supabase } from './supabase';

export async function getMyProfile() {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles').select('id,full_name,phone,avatar_url,vehicle_model,marketing_opt_in').maybeSingle();
  return data;
}

export async function saveMyProfile(profile: { full_name?: string; phone?: string; avatar_url?: string; vehicle_model?: string; marketing_opt_in?: boolean }) {
  if (!supabase) return { data: null, error: null };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { data: null, error: new Error('Sign in required') };
  return supabase.from('profiles').upsert({ id: userData.user.id, ...profile }).select().single();
}

export async function listMyAddresses() {
  if (!supabase) return [];
  const { data } = await supabase.from('customer_addresses').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false });
  return data || [];
}

export async function saveAddress(address: Record<string, unknown>) {
  if (!supabase) return { data: null, error: null };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { data: null, error: new Error('Sign in required') };
  return supabase.from('customer_addresses').upsert({ ...address, user_id: userData.user.id }).select().single();
}

export async function listMyWishlist() {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data } = await supabase.from('wishlists').select('product_id,created_at').eq('user_id', userData.user.id).order('created_at', { ascending: false });
  return data || [];
}

export async function toggleWishlist(productId: string, saved: boolean) {
  if (!supabase) return { error: null };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: new Error('Sign in required') };
  if (saved) return supabase.from('wishlists').delete().eq('user_id', userData.user.id).eq('product_id', productId);
  return supabase.from('wishlists').insert({ user_id: userData.user.id, product_id: productId });
}

export async function listMyNotifications(expectedUserId?: string) {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || (expectedUserId && expectedUserId !== userData.user.id)) return [];
  const now = new Date().toISOString();
  await supabase.from('notifications').delete().eq('user_id', userData.user.id).lte('expires_at', now);
  const { data } = await supabase.from('notifications').select('id,kind,title,body,action_url,read_at,created_at,expires_at').eq('user_id', userData.user.id).gt('expires_at', now).order('created_at', { ascending: false }).limit(50);
  return data || [];
}

export async function markNotificationRead(id: string, expectedUserId?: string) {
  if (!supabase) return { error: new Error('Service configuration unavailable. Please try again.') };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || (expectedUserId && expectedUserId !== userData.user.id)) return { error: new Error('Sign in required') };
  return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userData.user.id);
}

export async function deleteMyNotification(id: string, expectedUserId?: string) {
  if (!supabase) return { error: new Error('Service configuration unavailable. Please try again.') };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || (expectedUserId && expectedUserId !== userData.user.id)) return { error: new Error('Sign in required') };
  return supabase.from('notifications').delete().eq('id', id).eq('user_id', userData.user.id);
}

export async function listMyOrders() {
  if (!supabase) return [];
  const { data } = await supabase.from('orders').select('id,order_number,status,total,created_at,order_items(product_name,quantity,unit_price)').order('created_at', { ascending: false }).limit(50);
  return data || [];
}

export async function findActiveCoupon(code: string) {
  if (!supabase) return null;
  const { data } = await supabase.from('coupons').select('code,discount_type,discount_value,minimum_order,maximum_discount,usage_limit,usage_count,starts_at,ends_at').eq('code', code.trim().toUpperCase()).eq('is_active', true).maybeSingle();
  return data;
}
