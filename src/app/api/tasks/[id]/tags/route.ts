import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserFromToken } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

// 设置任务标签（body: { tagIds: string[] }，全量替换）
export async function PUT(
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

    // 确认任务属于当前用户
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (taskError || !task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    const body = await request.json();
    const tagIds: string[] = Array.isArray(body?.tagIds) ? body.tagIds : [];

    // 删除旧的关联
    await supabase.from('task_tags').delete().eq('task_id', id);

    // 添加新的关联
    for (const tagId of tagIds) {
      await supabase.from('task_tags').insert({ task_id: id, tag_id: tagId });
    }

    return NextResponse.json({ success: true, tagIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '设置标签失败' },
      { status: 500 }
    );
  }
}

// 获取任务的标签
export async function GET(
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

    const { data: links, error } = await supabase
      .from('task_tags')
      .select('*')
      .eq('task_id', id);
    if (error) throw error;

    const tagIds = (links || []).map(l => l.tag_id as string);
    return NextResponse.json({ tagIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取标签失败' },
      { status: 500 }
    );
  }
}
