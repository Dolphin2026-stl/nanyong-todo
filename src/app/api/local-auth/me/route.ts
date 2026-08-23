import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, updateUser, sanitizeUser } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

// 获取当前用户
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-session');
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取用户失败' },
      { status: 500 }
    );
  }
}

// 更新用户资料
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('x-session');
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const updates: { nickname?: string; school?: string } = {};
    if (typeof body.nickname === 'string') updates.nickname = body.nickname;
    if (typeof body.school === 'string') updates.school = body.school;
    const updated = updateUser(user.id, updates);
    if (!updated) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }
    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}
