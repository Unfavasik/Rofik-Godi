import { supabase } from './supabase';

export type ActivityEntityType = 'order' | 'review' | 'customer' | 'support_request' | 'product' | 'coupon' | 'campaign';
export type SupportRequestStatus = 'open' | 'in_progress' | 'resolved';
export type AdminActivityCursor = { createdAt: string; id: string };

export type AdminActivityEvent = {
  id: string;
  event_type: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  actor_user_id: string | null;
  subject_user_id: string | null;
  actor_name: string;
  actor_email: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  title: string;
  body: string;
  details: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

const toError = (error: { message?: string } | null | undefined) =>
  error ? new Error(error.message || 'Activity request failed.') : null;

const toEvent = (value: unknown): AdminActivityEvent => {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const details =
    row.details && typeof row.details === 'object' ? (row.details as Record<string, unknown>) : {};
  return {
    id: String(row.id || ''),
    event_type: String(row.event_type || ''),
    entity_type: String(row.entity_type || 'order') as ActivityEntityType,
    entity_id: String(row.entity_id || ''),
    actor_user_id: row.actor_user_id ? String(row.actor_user_id) : null,
    subject_user_id: row.subject_user_id ? String(row.subject_user_id) : null,
    actor_name: String(row.actor_name || 'System'),
    actor_email: String(row.actor_email || ''),
    customer_name: String(row.customer_name || 'Customer'),
    customer_email: String(row.customer_email || ''),
    customer_phone: String(row.customer_phone || ''),
    title: String(row.title || 'Activity'),
    body: String(row.body || ''),
    details,
    created_at: String(row.created_at || ''),
    read_at: row.read_at ? String(row.read_at) : null,
  };
};

export async function loadAdminActivityEvents(limit = 200, before?: AdminActivityCursor): Promise<{
  data: AdminActivityEvent[];
  error: Error | null;
}> {
  if (!supabase) return { data: [], error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('admin_list_activity_feed', {
    p_limit: limit,
    p_before_created_at: before?.createdAt ?? null,
    p_before_id: before?.id ?? null,
  });
  if (error) return { data: [], error: toError(error) };
  return { data: Array.isArray(data) ? data.map(toEvent) : [], error: null };
}

export async function loadAdminActivityUnreadCount(): Promise<{
  count: number;
  error: Error | null;
}> {
  if (!supabase) return { count: 0, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('admin_unread_activity_count');
  if (error) return { count: 0, error: toError(error) };
  return { count: Number(data || 0), error: null };
}

export async function markAdminActivityRead(id: string): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { error } = await supabase.rpc('admin_mark_activity_read', { p_event_id: id });
  return { error: toError(error) };
}

export async function markAllAdminActivityRead(): Promise<{
  count: number;
  error: Error | null;
}> {
  if (!supabase) return { count: 0, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('admin_mark_all_activity_read');
  if (error) return { count: 0, error: toError(error) };
  return { count: Number(data || 0), error: null };
}

export async function updateAdminSupportRequestStatus(
  requestId: string,
  status: SupportRequestStatus,
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { error } = await supabase.rpc('admin_update_customer_support_status', {
    p_request_id: requestId,
    p_status: status,
  });
  return { error: toError(error) };
}
