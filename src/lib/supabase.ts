import { createClient } from '@supabase/supabase-js';

const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '');
const publishableKey = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || '');
const hasValidPublishableKey = publishableKey !== 'your_supabase_publishable_key';

export const isSupabaseConfigured = Boolean(url && publishableKey && hasValidPublishableKey);

if (import.meta.env.DEV && !isSupabaseConfigured) {
  const missingVariables = [
    !url && 'VITE_SUPABASE_URL',
    (!publishableKey || !hasValidPublishableKey) && 'VITE_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean).join(', ');
  console.warn(`Supabase is not configured. Missing or invalid environment variable(s): ${missingVariables}. The app is running in demo mode.`);
}

export const supabase = isSupabaseConfigured ? createClient(url!, publishableKey!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;
