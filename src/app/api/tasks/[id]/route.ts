import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

async function requireUser(token: string | undefined) {
  if (!token) throw new Error('未登录');
  const supabase = getSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('认证失败');
  return { supabase, userId: user.id };
}

// 更新任务
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('x-session') ?? undefined;
    const { supabase, userId } = await requireUser(token);
    
    const body = await request.json();
    
    const allowed = ['title', 'description', 'task_type', 'priority', 'importance', 'start_time', 'end_time', 'is_completed'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) updateData[key] = body[key];
    if (Object.prototype.hasOwnProperty.call(body, 'tags') || Object.prototype.hasOwnProperty.call(body, 'is_long_term')) {
      const { data: existing, error: readError } = await supabase.from('tasks').select('metadata').eq('id', id).eq('user_id', userId).single();
      if (readError) throw readError;
      const oldMetadata = existing.metadata && typeof existing.metadata === 'object' ? existing.metadata as Record<string, unknown> : {};
      updateData.metadata = {
        ...oldMetadata,
        ...(Object.prototype.hasOwnProperty.call(body, 'tags') ? { tagIds: Array.isArray(body.tags) ? body.tags.filter((tag: unknown) => typeof tag === 'string') : [] } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, 'is_long_term') ? { longTerm: body.is_long_term === true } : {}),
      };
    }
    
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
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ task: { ...data, tags: data.metadata?.tagIds || [], is_long_term: data.metadata?.longTerm === true } });
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
    const { supabase, userId } = await requireUser(token);
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除任务失败' },
      { status: 500 }
    );
  }
}
