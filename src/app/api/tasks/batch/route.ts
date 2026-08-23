import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserFromToken } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

// 批量更新任务（统一设置优先级/重要程度等）
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);

    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const updates: Record<string, unknown> = body?.updates || {};

    if (ids.length === 0) {
      return NextResponse.json({ error: '未选择任何任务' }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有要更新的属性' }, { status: 400 });
    }

    // 允许更新的白名单字段
    const allowed = ['title', 'description', 'task_type', 'priority', 'importance', 'start_time', 'end_time', 'is_completed'];
    const cleanUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) cleanUpdates[key] = updates[key];
    }
    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json({ error: '没有允许更新的字段' }, { status: 400 });
    }

    if (cleanUpdates.is_completed === true) {
      cleanUpdates.completed_at = new Date().toISOString();
    } else if (cleanUpdates.is_completed === false) {
      cleanUpdates.completed_at = null;
    }
    cleanUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tasks')
      .update(cleanUpdates)
      .in('id', ids)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;

    return NextResponse.json({ tasks: data || [], updated: data?.length || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量更新失败' },
      { status: 500 }
    );
  }
}

// 批量删除任务
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);

    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: '未选择任何任务' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: data?.length || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量删除失败' },
      { status: 500 }
    );
  }
}
