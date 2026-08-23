import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserFromToken } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

// 获取所有标签
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);
    
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return NextResponse.json({ tags: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取标签失败' },
      { status: 500 }
    );
  }
}

// 创建标签
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);
    
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name: body.name,
        color: body.color || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ tag: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建标签失败' },
      { status: 500 }
    );
  }
}
