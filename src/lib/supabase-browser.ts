/**
 * 本地版：不再使用 Supabase，此文件保留为空壳兼容（避免旧引用报错）
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseBrowserClient(): any {
  throw new Error('本地版不使用 Supabase');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createBrowserSupabaseClient(): any {
  throw new Error('本地版不使用 Supabase');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSupabaseBrowserClientAsync(): Promise<any> {
  throw new Error('本地版不使用 Supabase');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSupabaseBrowserClientWithRetry(): Promise<any> {
  throw new Error('本地版不使用 Supabase');
}
