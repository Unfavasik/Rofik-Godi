import { supabase } from './supabase';

export interface AccountDeletionRequest {
  user_id: string;
  status: 'scheduled' | 'cancelled';
  requested_at: string;
  scheduled_for: string;
  cancelled_at: string | null;
  reason: string | null;
  feedback: string | null;
}

export async function getMyAccountDeletionRequest(): Promise<{
  data: AccountDeletionRequest | null;
  error: string;
}> {
  if (!supabase) return { data: null, error: '' };
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('user_id,status,requested_at,scheduled_for,cancelled_at,reason,feedback')
    .maybeSingle();
  return {
    data: (data as AccountDeletionRequest | null) ?? null,
    error: error?.message || '',
  };
}

export async function requestAccountDeletion(
  reason: string,
  feedback: string,
): Promise<{ scheduledFor: string | null; error: string }> {
  if (!supabase)
    return { scheduledFor: null, error: 'Account deletion is unavailable in demo mode.' };
  const { data, error } = await supabase.rpc('request_account_deletion', {
    p_reason: reason.trim() || null,
    p_feedback: feedback.trim() || null,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return {
    scheduledFor: row && typeof row.scheduled_for === 'string' ? row.scheduled_for : null,
    error: error?.message || '',
  };
}

export async function cancelAccountDeletion(): Promise<{ cancelled: boolean; error: string }> {
  if (!supabase)
    return { cancelled: false, error: 'Account deletion is unavailable in demo mode.' };
  const { data, error } = await supabase.rpc('cancel_account_deletion');
  return { cancelled: data === true, error: error?.message || '' };
}
