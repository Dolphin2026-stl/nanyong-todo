import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, createToken, sanitizeUser } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

// 登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const token = createToken(user);

    return NextResponse.json({
      user: sanitizeUser(user),
      session: { access_token: token },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
