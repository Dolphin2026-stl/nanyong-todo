import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// 获取所有标签
export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await requireUser(request);
    
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
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
    const { supabase, userId } = await requireUser(request);
    
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: body.name,
        color: body.color || null,
        user_id: userId,
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
