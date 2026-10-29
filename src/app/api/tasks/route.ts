import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

async function getUserId(request: NextRequest): Promise<string> {
  const token = request.headers.get('x-session');
  if (!token) {
    throw new Error('未登录');
  }
  const supabase = getSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('认证失败');
  }
  return user.id;
}

// 获取所有任务
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const supabase = getSupabaseClient(token);
    const userId = await getUserId(request);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const completed = searchParams.get('completed');
    
    let query = supabase.from('tasks').select('*').eq('user_id', userId);
    
    if (type) {
      query = query.eq('task_type', type);
    }
    
    if (completed === 'true') {
      query = query.eq('is_completed', true);
    } else if (completed === 'false') {
      query = query.eq('is_completed', false);
    }
    
    const { data, error } = await query.order('end_time', { ascending: true, nullsFirst: false });
    
    if (error) throw error;
    
    const taskIds = (data || []).map(task => task.id);
    const { data: linkedTags } = taskIds.length
      ? await supabase.from('task_tags').select('task_id, tag_id').in('task_id', taskIds)
      : { data: [] };
    const tasks = (data || []).map(task => {
      const metadata = task.metadata && typeof task.metadata === 'object' ? task.metadata as Record<string, unknown> : {};
      const storedTags = Array.isArray(metadata.tagIds) ? metadata.tagIds.filter((id): id is string => typeof id === 'string') : [];
      const linked = (linkedTags || []).filter(link => link.task_id === task.id).map(link => link.tag_id);
      return { ...task, tags: Array.isArray(metadata.tagIds) ? storedTags : linked, is_long_term: metadata.longTerm === true };
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取任务失败' },
      { status: 500 }
    );
  }
}

// 创建任务
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const supabase = getSupabaseClient(token);
    const userId = await getUserId(request);
    
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: body.title,
        description: body.description || null,
        task_type: body.task_type || 'personal',
        priority: body.priority || 'medium',
        importance: body.importance || 'normal',
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        user_id: userId,
        metadata: { longTerm: body.is_long_term === true, tagIds: Array.isArray(body.tags) ? body.tags.filter((id: unknown) => typeof id === 'string') : [] },
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ task: { ...data, tags: data.metadata?.tagIds || [], is_long_term: data.metadata?.longTerm === true } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建任务失败' },
      { status: 500 }
    );
  }
}
