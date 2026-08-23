import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, hashPassword } from '@/storage/database/local-auth';
import { loadDb, saveDb } from '@/storage/database/local-db';

export const dynamic = 'force-dynamic';

// 修改密码（本地版）
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-session');
    const user = getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { oldPassword, newPassword } = body || {};
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少需要 6 位' }, { status: 400 });
    }
    const { verifyPassword } = await import('@/storage/database/local-auth');
    if (oldPassword && !verifyPassword(oldPassword, user.password_hash)) {
      return NextResponse.json({ error: '原密码错误' }, { status: 400 });
    }
    const db = loadDb();
    const target = db.users.find(u => u.id === user.id);
    if (!target) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    target.password_hash = hashPassword(newPassword);
    target.updated_at = new Date().toISOString();
    saveDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '修改密码失败' },
      { status: 500 }
    );
  }
}
