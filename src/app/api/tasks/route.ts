import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserFromToken } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

async function getUserId(request: NextRequest): Promise<string> {
  const token = request.headers.get('x-session');
  if (!token) {
    throw new Error('未登录');
  }
  const user = getUserFromToken(token);
  if (!user) {
    throw new Error('认证失败');
  }
  return user.id;
}

// 获取所有任务
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const completed = searchParams.get('completed');
    
    let query = supabase.from('tasks').select('*').eq('user_id', user.id);
    
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
    
    // 附带每个任务的标签 ID
    const taskIds = (data || []).map(t => t.id as string);
    let tagMap: Record<string, string[]> = {};
    if (taskIds.length > 0) {
      const { data: links, error: linkError } = await supabase
        .from('task_tags')
        .select('*')
        .in('task_id', taskIds);
      if (!linkError) {
        tagMap = {};
        for (const link of links || []) {
          const tid = link.task_id as string;
          if (!tagMap[tid]) tagMap[tid] = [];
          tagMap[tid].push(link.tag_id as string);
        }
      }
    }
    
    const tasksWithTags = (data || []).map(t => ({
      ...t,
      tag_ids: tagMap[t.id as string] || [],
    }));
    
    return NextResponse.json({ tasks: tasksWithTags });
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
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const supabase = getSupabaseClient(token);
    
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description || null,
        task_type: body.task_type || 'personal',
        priority: body.priority || 'medium',
        importance: body.importance || 'normal',
        start_time: body.start_time || null,
        end_time: body.end_time || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 创建任务时可选带标签
    const tagIds: string[] = Array.isArray(body?.tag_ids) ? body.tag_ids : [];
    if (data && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await supabase.from('task_tags').insert({ task_id: data.id, tag_id: tagId });
      }
    }
    
    return NextResponse.json({ task: { ...data, tag_ids: tagIds } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建任务失败' },
      { status: 500 }
    );
  }
}
