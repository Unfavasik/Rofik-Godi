import { supabase } from './supabase';

export async function createMyStockAlert(
  productId: string,
  expectedUserId: string,
): Promise<{ data: boolean | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Restock alerts are unavailable right now.') };
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return { data: null, error: new Error('This product cannot be added to restock alerts.') };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) return { data: null, error: new Error('Could not verify your sign-in. Please try again.') };
    if (!authData.user || authData.user.id !== expectedUserId) {
      return { data: null, error: new Error('Sign in to get a restock alert.') };
    }

    const { data, error } = await supabase.rpc('create_my_stock_alert', { p_product_id: productId });
    if (error) return { data: null, error: new Error(error.message || 'Could not set up this restock alert.') };
    if (typeof data !== 'boolean') return { data: null, error: new Error('The restock alert service returned an unexpected response.') };
    return { data, error: null };
  } catch {
    return { data: null, error: new Error('Could not set up this restock alert. Please try again.') };
  }
}
