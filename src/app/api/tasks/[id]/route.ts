import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserFromToken } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

// 更新任务
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('x-session') ?? undefined;
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);
    
    const body = await request.json();
    
    const updateData: Record<string, unknown> = { ...body };
    
    // 如果标记为完成，添加完成时间
    if (body.is_completed === true) {
      updateData.completed_at = new Date().toISOString();
    } else if (body.is_completed === false) {
      updateData.completed_at = null;
    }
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ task: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新任务失败' },
      { status: 500 }
    );
  }
}

// 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('x-session') ?? undefined;
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除任务失败' },
      { status: 500 }
    );
  }
}
