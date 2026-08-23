/**
 * 本地版数据层（零依赖 JSON 文件存储）
 * 替代 Supabase：所有数据存在本地 data/db.json 文件中
 * 不依赖任何云服务，Coze 合同到期后仍可完整使用
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface LocalTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  importance: string;
  start_time: string | null;
  end_time: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface LocalTag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface LocalUser {
  id: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar_url: string | null;
  school: string | null;
  created_at: string;
  updated_at: string;
}

interface DbShape {
  users: LocalUser[];
  tasks: LocalTask[];
  tags: LocalTag[];
  task_tags: { id: string; task_id: string; tag_id: string }[];
}

/** 数据库文件路径（可用环境变量 LOCAL_DB_PATH 覆盖，默认项目根目录 data/db.json） */
export function getDbPath(): string {
  if (process.env.LOCAL_DB_PATH) return process.env.LOCAL_DB_PATH;
  const root = process.cwd();
  return path.join(root, 'data', 'db.json');
}

let cache: DbShape | null = null;

function emptyDb(): DbShape {
  return { users: [], tasks: [], tags: [], task_tags: [] };
}

/** 读取数据库（带缓存） */
export function loadDb(): DbShape {
  if (cache) return cache;
  try {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(raw);
      cache = { ...emptyDb(), ...parsed };
    } else {
      cache = emptyDb();
      saveDb();
    }
  } catch (err) {
    console.error('本地数据库读取失败，使用空库:', err);
    cache = emptyDb();
  }
  return cache!;
}

/** 保存数据库 */
export function saveDb(): void {
  if (!cache) return;
  try {
    const dbPath = getDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const tmp = dbPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf-8');
    fs.renameSync(tmp, dbPath);
  } catch (err) {
    console.error('本地数据库保存失败:', err);
  }
}

/** 生成 UUID */
export function uuid(): string {
  return crypto.randomUUID();
}

/** 当前时间 ISO 字符串 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 清空缓存（测试用） */
export function resetDbCache(): void {
  cache = null;
}
