import { supabase } from './supabase';

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
  createdAt: string;
  status: string;
};

export type AdminNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export async function loadAdminCustomers(): Promise<{ data: AdminCustomer[]; error: Error | null }> {
  if (!supabase) return { data: [], error: new Error('Supabase is not configured') };
  const { data, error } = await supabase.rpc('admin_customer_summary');
  if (error) return { data: [], error };
  return {
    data: (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id), name: String(row.name || 'Customer'), email: String(row.email || ''),
      phone: String(row.phone || ''), orderCount: Number(row.order_count || 0),
      totalSpent: Number(row.total_spent || 0), lastOrder: row.last_order ? String(row.last_order) : null,
      createdAt: String(row.created_at), status: String(row.status || 'New'),
    })), error: null,
  };
}

export async function loadAdminNotifications(): Promise<{ data: AdminNotification[]; error: Error | null }> {
  if (!supabase) return { data: [], error: new Error('Supabase is not configured') };
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: [], error: userError || new Error('Administrator sign-in required') };
  const { data, error } = await supabase.from('notifications').select('id,kind,title,body,action_url,read_at,created_at').eq('user_id', userData.user.id).order('created_at', { ascending: false }).limit(50);
  return { data: (data || []) as AdminNotification[], error };
}

export async function markAdminNotificationRead(id: string) {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: new Error('Administrator sign-in required') };
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userData.user.id);
  return { error };
}

export async function markAllAdminNotificationsRead() {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: new Error('Administrator sign-in required') };
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userData.user.id).is('read_at', null);
  return { error };
}

export async function loadAdminSettings() {
  if (!supabase) return { data: {}, error: new Error('Supabase is not configured') };
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'admin_settings').maybeSingle();
  return { data: (data?.value || {}) as Record<string, boolean>, error };
}

export async function saveAdminSettings(value: Record<string, boolean>) {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: new Error('Administrator sign-in required') };
  const { error } = await supabase.from('app_settings').upsert({ key: 'admin_settings', value, updated_by: userData.user.id, updated_at: new Date().toISOString() });
  return { error };
}

export async function loadDashboardMetrics() {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  const { data, error } = await supabase.rpc('admin_dashboard_metrics');
  return { data: data as { total_orders: number; pending_orders: number; completed_orders: number; cancelled_orders: number; total_revenue: number; verified_payments: number; total_customers: number; total_products: number } | null, error };
}
