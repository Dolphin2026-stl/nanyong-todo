import { NextResponse } from 'next/server';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { url, anonKey } = getSupabaseCredentials();
    return NextResponse.json({ url, anonKey });
  } catch (error) {
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    );
  }
}
