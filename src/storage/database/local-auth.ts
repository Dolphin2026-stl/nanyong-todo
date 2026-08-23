/**
 * 本地版认证模块
 * 替代 Supabase Auth：bcryptjs 密码加密 + 自签名 JWT
 * 零依赖外部服务，完全本地运行
 */
import crypto from 'crypto';
import { loadDb, saveDb, uuid, nowIso, LocalUser } from './local-db';

// 简化版密码哈希（使用 Node 内置 crypto，避免外部依赖 bcryptjs 编译问题）
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const calc = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calc, 'hex'));
  } catch {
    return false;
  }
}

// JWT 实现（HS256，无外部依赖）
const JWT_SECRET = process.env.LOCAL_JWT_SECRET || 'nanyong-todo-local-secret-change-me';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

export function signToken(payload: JwtPayload): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64');
  return `${header}.${body}.${base64url(signature)}`;
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64');
    const sigBuf = base64urlDecode(signature);
    const expBuf = Buffer.from(expected);
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(base64urlDecode(body).toString('utf-8')) as JwtPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 签发 7 天有效期的 token */
export function createToken(user: LocalUser): string {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + 7 * 24 * 3600,
  });
}

/** 根据 token 获取用户 */
export function getUserFromToken(token: string | undefined | null): LocalUser | null {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const db = loadDb();
  return db.users.find(u => u.id === payload.sub) || null;
}

/** 按邮箱查找用户 */
export function findUserByEmail(email: string): LocalUser | null {
  const db = loadDb();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/** 创建用户（注册） */
export function createUser(email: string, password: string, nickname?: string): LocalUser {
  const db = loadDb();
  const now = nowIso();
  const user: LocalUser = {
    id: uuid(),
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    nickname: nickname || email.split('@')[0],
    avatar_url: null,
    school: null,
    created_at: now,
    updated_at: now,
  };
  db.users.push(user);
  saveDb();
  return user;
}

/** 更新用户资料 */
export function updateUser(id: string, updates: { nickname?: string; school?: string }): LocalUser | null {
  const db = loadDb();
  const user = db.users.find(u => u.id === id);
  if (!user) return null;
  if (updates.nickname !== undefined) user.nickname = updates.nickname;
  if (updates.school !== undefined) user.school = updates.school;
  user.updated_at = nowIso();
  saveDb();
  return user;
}

/** 用户信息脱敏（不含密码哈希） */
export function sanitizeUser(user: LocalUser) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    school: user.school,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
