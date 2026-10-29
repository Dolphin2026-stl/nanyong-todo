import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// 删除标签
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, userId } = await requireUser(request);
    
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除标签失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, userId } = await requireUser(request);
    const body = await request.json();
    const updates: { name?: string; color?: string | null } = {};
    if (typeof body.name === 'string') updates.name = body.name.trim();
    if (typeof body.color === 'string' || body.color === null) updates.color = body.color;
    if (!Object.keys(updates).length) return NextResponse.json({ error: '没有可更新的内容' }, { status: 400 });
    const { data, error } = await supabase.from('tags').update(updates)
      .eq('id', id).eq('user_id', userId).select().single();
    if (error) throw error;
    return NextResponse.json({ tag: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新标签失败' },
      { status: 500 }
    );
  }
}
