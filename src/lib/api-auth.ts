import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function requireUser(request: NextRequest) {
  const token = request.headers.get('x-session');
  if (!token) throw new Error('未登录');
  const supabase = getSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('认证失败');
  return { supabase, userId: user.id };
}
