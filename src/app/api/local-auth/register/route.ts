import { NextRequest, NextResponse } from 'next/server';
import { createUser, findUserByEmail, verifyPassword, createToken, sanitizeUser } from '@/storage/database/local-auth';

export const dynamic = 'force-dynamic';

// 注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nickname } = body || {};

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: '密码至少需要 6 位' }, { status: 400 });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 409 });
    }

    const user = createUser(email, password, nickname);
    const token = createToken(user);

    return NextResponse.json({
      user: sanitizeUser(user),
      session: { access_token: token },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '注册失败' },
      { status: 500 }
    );
  }
}
