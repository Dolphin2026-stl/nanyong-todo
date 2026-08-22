import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let configPromise: Promise<{ url: string; anonKey: string }> | null = null;

async function fetchConfig(): Promise<{ url: string; anonKey: string }> {
  if (configPromise) return configPromise;
  
  configPromise = fetch('/api/supabase-config')
    .then(res => {
      if (!res.ok) throw new Error('获取Supabase配置失败');
      return res.json();
    })
    .catch(err => {
      configPromise = null;
      throw err;
    });
  
  return configPromise;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    throw new Error('Supabase 配置尚未加载，请使用 getSupabaseBrowserClientWithRetry');
  }
  return browserClient;
}

export function createBrowserSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    throw new Error('Supabase 配置尚未加载');
  }
  return browserClient;
}

export async function getSupabaseBrowserClientAsync(): Promise<SupabaseClient> {
  if (browserClient) return browserClient;
  
  const config = await fetchConfig();
  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  
  return browserClient;
}

export async function getSupabaseBrowserClientWithRetry(
  maxRetries = 3,
  delay = 500
): Promise<SupabaseClient> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getSupabaseBrowserClientAsync();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}
