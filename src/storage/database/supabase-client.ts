/**
 * 本地版数据访问兼容层
 * 对外保持 getSupabaseClient(token) 接口不变，内部使用本地 JSON 存储。
 * 这样所有 API routes 无需修改即可在本地运行。
 * 仅模拟本项目用到的 Supabase 查询链（from/select/eq/in/order/insert/update/delete/single）。
 */
import { loadDb, saveDb, uuid, nowIso } from './local-db';
import { getUserFromToken } from './local-auth';

export interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

type Row = Record<string, unknown>;

class LocalQueryBuilder {
  private table: string;
  private filters: { field: string; value: unknown; op: 'eq' | 'in' | 'neq' }[] = [];
  private orderField: string | null = null;
  private orderAscending = true;
  private orderNullsFirst = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_cols = '*'): this {
    return this;
  }

  eq(field: string, value: unknown): this {
    this.filters.push({ field, value, op: 'eq' });
    return this;
  }

  in(field: string, values: unknown[]): this {
    this.filters.push({ field, value: values, op: 'in' });
    return this;
  }

  neq(field: string, value: unknown): this {
    this.filters.push({ field, value, op: 'neq' });
    return this;
  }

  order(field: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orderField = field;
    this.orderAscending = opts?.ascending ?? true;
    this.orderNullsFirst = opts?.nullsFirst ?? false;
    return this;
  }

  private getRows(): Row[] {
    const db = loadDb();
    let rows: Row[];
    if (this.table === 'tasks') rows = [...db.tasks] as unknown as Row[];
    else if (this.table === 'tags') rows = [...db.tags] as unknown as Row[];
    else if (this.table === 'task_tags') rows = [...db.task_tags] as unknown as Row[];
    else rows = [];

    for (const f of this.filters) {
      rows = rows.filter(row => {
        const val = (row as Record<string, unknown>)[f.field];
        if (f.op === 'eq') return val === f.value;
        if (f.op === 'neq') return val !== f.value;
        if (f.op === 'in') {
          const arr = f.value as unknown[];
          return arr.includes(val);
        }
        return true;
      });
    }
    return rows;
  }

  private sortRows(rows: Row[]): Row[] {
    if (!this.orderField) return rows;
    return rows.sort((a, b) => {
      const va = (a as Record<string, unknown>)[this.orderField!];
      const vb = (b as Record<string, unknown>)[this.orderField!];
      if (va === null || va === undefined) return this.orderNullsFirst ? -1 : 1;
      if (vb === null || vb === undefined) return this.orderNullsFirst ? 1 : -1;
      let cmp: number;
      if (typeof va === 'string' && typeof vb === 'string') {
        const ta = Date.parse(va);
        const tb = Date.parse(vb);
        if (!isNaN(ta) && !isNaN(tb)) cmp = ta - tb;
        else cmp = va.localeCompare(vb);
      } else {
        cmp = va > vb ? 1 : va < vb ? -1 : 0;
      }
      return this.orderAscending ? cmp : -cmp;
    });
  }

  single(): LocalQuerySingleBuilder {
    return new LocalQuerySingleBuilder(this);
  }

  async then(resolve: (value: SupabaseResponse<Row[]>) => void): Promise<void> {
    let rows = this.getRows();
    rows = this.sortRows(rows);
    resolve({ data: rows, error: null });
  }
}

class LocalQuerySingleBuilder {
  private parent: LocalQueryBuilder;

  constructor(parent: LocalQueryBuilder) {
    this.parent = parent;
  }

  async then(resolve: (value: SupabaseResponse<Row>) => void): Promise<void> {
    // 复用父查询的过滤/排序逻辑
    const rows = await new Promise<Row[]>(res => {
      this.parent.then(r => res(r.data || []));
    });
    resolve({ data: rows[0] || null, error: null });
  }
}

class LocalInsertBuilder {
  private table: string;
  private values: Row[] = [];

  constructor(table: string, values: Row | Row[]) {
    this.table = table;
    this.values = Array.isArray(values) ? values : [values];
  }

  select(_cols = '*'): LocalInsertBuilderWithSelect {
    return new LocalInsertBuilderWithSelect(this.table, this.values);
  }

  async then(resolve: (value: SupabaseResponse<Row[]>) => void): Promise<void> {
    const db = loadDb();
    const inserted: Row[] = [];
    const now = nowIso();
    for (const v of this.values) {
      const row = { ...v };
      if (this.table === 'tasks') {
        row.id = row.id || uuid();
        row.created_at = row.created_at || now;
        row.updated_at = row.updated_at || now;
        row.is_completed = row.is_completed ?? false;
        (db.tasks as unknown as Row[]).push(row);
        inserted.push(row);
      } else if (this.table === 'tags') {
        row.id = row.id || uuid();
        row.created_at = row.created_at || now;
        (db.tags as unknown as Row[]).push(row);
        inserted.push(row);
      } else if (this.table === 'task_tags') {
        row.id = row.id || uuid();
        row.created_at = row.created_at || now;
        (db.task_tags as unknown as Row[]).push(row);
        inserted.push(row);
      }
    }
    saveDb();
    resolve({ data: inserted, error: null });
  }
}

class LocalInsertBuilderWithSelect {
  private table: string;
  private values: Row[];

  constructor(table: string, values: Row[]) {
    this.table = table;
    this.values = values;
  }

  single(): LocalSingleBuilder {
    return new LocalSingleBuilder(this.table, this.values);
  }
}

class LocalSingleBuilder {
  private table: string;
  private values: Row[];

  constructor(table: string, values: Row[]) {
    this.table = table;
    this.values = values;
  }

  async then(resolve: (value: SupabaseResponse<Row>) => void): Promise<void> {
    const db = loadDb();
    const now = nowIso();
    const row = { ...this.values[0] };
    if (this.table === 'tasks') {
      row.id = row.id || uuid();
      row.created_at = row.created_at || now;
      row.updated_at = row.updated_at || now;
      row.is_completed = row.is_completed ?? false;
      (db.tasks as unknown as Row[]).push(row);
    } else if (this.table === 'tags') {
      row.id = row.id || uuid();
      row.created_at = row.created_at || now;
      (db.tags as unknown as Row[]).push(row);
    }
    saveDb();
    resolve({ data: row, error: null });
  }
}

class LocalUpdateBuilder {
  private table: string;
  private updates: Row;
  private filters: { field: string; value: unknown; op: 'eq' | 'in' }[] = [];

  constructor(table: string, updates: Row) {
    this.table = table;
    this.updates = updates;
  }

  eq(field: string, value: unknown): this {
    this.filters.push({ field, value, op: 'eq' });
    return this;
  }

  in(field: string, values: unknown[]): this {
    this.filters.push({ field, value: values, op: 'in' });
    return this;
  }

  select(_cols = '*'): LocalUpdateBuilderWithSelect {
    return new LocalUpdateBuilderWithSelect(this.table, this.updates, this.filters);
  }

  async then(resolve: (value: SupabaseResponse<Row[]>) => void): Promise<void> {
    const db = loadDb();
    let collection: Row[];
    if (this.table === 'tasks') collection = db.tasks as unknown as Row[];
    else if (this.table === 'tags') collection = db.tags as unknown as Row[];
    else if (this.table === 'task_tags') collection = db.task_tags as unknown as Row[];
    else collection = [];

    const updated: Row[] = [];
    for (const row of collection) {
      let match = true;
      for (const f of this.filters) {
        const val = row[f.field];
        if (f.op === 'eq' && val !== f.value) match = false;
        if (f.op === 'in' && !(f.value as unknown[]).includes(val)) match = false;
      }
      if (match) {
        Object.assign(row, this.updates);
        row.updated_at = nowIso();
        updated.push(row);
      }
    }
    saveDb();
    resolve({ data: updated, error: null });
  }
}

class LocalUpdateBuilderWithSelect {
  private table: string;
  private updates: Row;
  private filters: { field: string; value: unknown; op: 'eq' | 'in' }[] = [];

  constructor(table: string, updates: Row, filters: { field: string; value: unknown; op: 'eq' | 'in' }[]) {
    this.table = table;
    this.updates = updates;
    this.filters = filters;
  }

  single(): LocalUpdateSingleBuilder {
    return new LocalUpdateSingleBuilder(this.table, this.updates, this.filters);
  }

  async then(resolve: (value: SupabaseResponse<Row[]>) => void): Promise<void> {
    const db = loadDb();
    let collection: Row[];
    if (this.table === 'tasks') collection = db.tasks as unknown as Row[];
    else if (this.table === 'tags') collection = db.tags as unknown as Row[];
    else if (this.table === 'task_tags') collection = db.task_tags as unknown as Row[];
    else collection = [];

    const updated: Row[] = [];
    for (const row of collection) {
      let match = true;
      for (const f of this.filters) {
        const val = row[f.field];
        if (f.op === 'eq' && val !== f.value) match = false;
        if (f.op === 'in' && !(f.value as unknown[]).includes(val)) match = false;
      }
      if (match) {
        Object.assign(row, this.updates);
        row.updated_at = nowIso();
        updated.push(row);
      }
    }
    saveDb();
    resolve({ data: updated, error: null });
  }
}

class LocalUpdateSingleBuilder {
  private table: string;
  private updates: Row;
  private filters: { field: string; value: unknown; op: 'eq' | 'in' }[] = [];

  constructor(table: string, updates: Row, filters: { field: string; value: unknown; op: 'eq' | 'in' }[]) {
    this.table = table;
    this.updates = updates;
    this.filters = filters;
  }

  async then(resolve: (value: SupabaseResponse<Row>) => void): Promise<void> {
    const db = loadDb();
    let collection: Row[];
    if (this.table === 'tasks') collection = db.tasks as unknown as Row[];
    else if (this.table === 'tags') collection = db.tags as unknown as Row[];
    else if (this.table === 'task_tags') collection = db.task_tags as unknown as Row[];
    else collection = [];

    let found: Row | null = null;
    for (const row of collection) {
      let match = true;
      for (const f of this.filters) {
        const val = row[f.field];
        if (f.op === 'eq' && val !== f.value) match = false;
        if (f.op === 'in' && !(f.value as unknown[]).includes(val)) match = false;
      }
      if (match) {
        Object.assign(row, this.updates);
        row.updated_at = nowIso();
        found = row;
        break;
      }
    }
    saveDb();
    resolve({ data: found, error: null });
  }
}

class LocalDeleteBuilder {
  private table: string;
  private filters: { field: string; value: unknown; op: 'eq' | 'in' }[] = [];

  constructor(table: string) {
    this.table = table;
  }

  eq(field: string, value: unknown): this {
    this.filters.push({ field, value, op: 'eq' });
    return this;
  }

  in(field: string, values: unknown[]): this {
    this.filters.push({ field, value: values, op: 'in' });
    return this;
  }

  select(_cols = '*'): LocalDeleteBuilderWithSelect {
    return new LocalDeleteBuilderWithSelect(this.table, this.filters);
  }

  async then(resolve: (value: SupabaseResponse<Row[]>) => void): Promise<void> {
    const db = loadDb();
    let collection: Row[];
    if (this.table === 'tasks') collection = db.tasks as unknown as Row[];
    else if (this.table === 'tags') collection = db.tags as unknown as Row[];
    else if (this.table === 'task_tags') collection = db.task_tags as unknown as Row[];
    else collection = [];

    const deleted: Row[] = [];
    for (let i = collection.length - 1; i >= 0; i--) {
      const row = collection[i];
      let match = true;
      for (const f of this.filters) {
        const val = row[f.field];
        if (f.op === 'eq' && val !== f.value) match = false;
        if (f.op === 'in' && !(f.value as unknown[]).includes(val)) match = false;
      }
      if (match) {
        deleted.push(collection.splice(i, 1)[0]);
      }
    }
    saveDb();
    resolve({ data: deleted, error: null });
  }
}

class LocalDeleteBuilderWithSelect {
  private table: string;
  private filters: { field: string; value: unknown; op: 'eq' | 'in' }[] = [];

  constructor(table: string, filters: { field: string; value: unknown; op: 'eq' | 'in' }[]) {
    this.table = table;
    this.filters = filters;
  }

  async then(resolve: (value: SupabaseResponse<Row[]>) => void): Promise<void> {
    const db = loadDb();
    let collection: Row[];
    if (this.table === 'tasks') collection = db.tasks as unknown as Row[];
    else if (this.table === 'tags') collection = db.tags as unknown as Row[];
    else if (this.table === 'task_tags') collection = db.task_tags as unknown as Row[];
    else collection = [];

    const deleted: Row[] = [];
    for (let i = collection.length - 1; i >= 0; i--) {
      const row = collection[i];
      let match = true;
      for (const f of this.filters) {
        const val = row[f.field];
        if (f.op === 'eq' && val !== f.value) match = false;
        if (f.op === 'in' && !(f.value as unknown[]).includes(val)) match = false;
      }
      if (match) {
        deleted.push(collection.splice(i, 1)[0]);
      }
    }
    saveDb();
    resolve({ data: deleted, error: null });
  }
}

export class LocalClient {
  from(table: string) {
    return {
      select: (cols = '*') => new LocalQueryBuilder(table).select(cols),
      insert: (values: Row | Row[]) => new LocalInsertBuilder(table, values),
      update: (updates: Row) => new LocalUpdateBuilder(table, updates),
      delete: () => new LocalDeleteBuilder(table),
    };
  }

  auth = {
    getUser: async () => {
      return { data: { user: null }, error: null };
    },
  };
}

/**
 * 获取本地数据访问客户端（兼容旧接口，token 用于校验用户身份）
 */
export function getSupabaseClient(token?: string): LocalClient {
  if (token) {
    getUserFromToken(token);
  }
  return new LocalClient();
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  return { url: 'local', anonKey: 'local' };
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return undefined;
}
