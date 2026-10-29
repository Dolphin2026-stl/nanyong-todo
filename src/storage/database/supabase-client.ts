import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials { url: string; anonKey: string }

// Keep the existing variable names compatible with the former Coze deployment.
// Never use a service-role key in visitor-facing task routes.
export function getSupabaseCredentials(): SupabaseCredentials {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase URL / anon key 尚未配置');
  return { url, anonKey };
}

export function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();
  return createClient(url, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
