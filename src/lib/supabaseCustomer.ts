import { supabase } from './supabase';
import { convertImageToWebP } from './imagePipeline';
import { buildAvatarStoragePath } from './profileValidation';

export async function getMyProfile(expectedUserId?: string) {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user || (expectedUserId && expectedUserId !== user.id)) return null;
  const { data } = await supabase.from('profiles').select('id,full_name,phone,avatar_url,vehicle_model,marketing_opt_in').eq('id', user.id).maybeSingle();
  return data;
}

export async function getMyAuthEmail() {
  if (!supabase) return '';
  const { data } = await supabase.auth.getUser();
  return data.user?.email || '';
}

export async function saveMyProfile(profile: { full_name: string; phone: string; avatar_url: string | null; vehicle_model: string }) {
  if (!supabase) return { data: null, error: new Error('Profile service is unavailable.'), metadataError: null };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { data: null, error: new Error('Sign in required.'), metadataError: null };
  const payload = {
    full_name: profile.full_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    vehicle_model: profile.vehicle_model,
  };
  const { data, error } = await supabase.from('profiles').upsert({ id: userData.user.id, ...payload }).select().single();
  if (error) return { data: null, error, metadataError: null };
  const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: payload.full_name, phone: payload.phone } });
  return { data, error: null, metadataError };
}

export async function uploadMyAvatar(file: File): Promise<{ data: { path: string; url: string } | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Avatar storage is unavailable.') };
  if (!file.type.startsWith('image/')) return { data: null, error: new Error('Choose an image file.') };
  if (file.size === 0 || file.size > 5 * 1024 * 1024) return { data: null, error: new Error('The original image must be larger than 0 bytes and no more than 5 MB.') };
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { data: null, error: new Error('Sign in required.') };
  try {
    const webpFile = await convertImageToWebP(file, { squareSize: 512 });
    if (webpFile.size > 2 * 1024 * 1024) return { data: null, error: new Error('The converted avatar must be 2 MB or smaller.') };
    const path = buildAvatarStoragePath(user.id, Date.now());
    const { error } = await supabase.storage.from('avatars').upload(path, webpFile, {
      cacheControl: '3600',
      contentType: 'image/webp',
      upsert: false,
    });
    if (error) return { data: null, error };
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { data: { path, url: data.publicUrl }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Could not process this avatar image.') };
  }
}

export async function deleteMyAvatar(avatarUrl: string | null | undefined): Promise<{ error: Error | null }> {
  if (!avatarUrl) return { error: null };
  if (!supabase) return { error: new Error('Avatar storage is unavailable.') };
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { error: new Error('Sign in required.') };
  const marker = '/storage/v1/object/public/avatars/';
  const markerIndex = avatarUrl.indexOf(marker);
  if (markerIndex < 0) return { error: new Error('The previous avatar file could not be located.') };
  let path: string;
  try {
    path = decodeURIComponent(avatarUrl.slice(markerIndex + marker.length));
  } catch {
    return { error: new Error('The previous avatar path is invalid.') };
  }
  if (!path.startsWith(`${user.id}/`)) return { error: new Error('You can only remove your own avatar.') };
  const { error } = await supabase.storage.from('avatars').remove([path]);
  return { error };
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
