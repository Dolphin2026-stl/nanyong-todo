'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/** 获取当前登录用户的 access token（本地版从 localStorage 读取） */
async function getSessionToken(): Promise<string | undefined> {
  try {
    return localStorage.getItem('nanyong-todo-token') || undefined;
  } catch {
    return undefined;
  }
}

/** 构造带认证头的请求头 */
async function authHeaders(json = false): Promise<Record<string, string>> {
  const token = await getSessionToken();
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers['x-session'] = token;
  return headers;
}

export type TaskType = 'course' | 'homework' | 'exam' | 'activity' | 'personal';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
// 重要程度 5 档（星标制）：可选-建议-普通-重要-非常重要
export type TaskImportance = 'optional' | 'suggested' | 'normal' | 'important' | 'very_important';

export interface Task {
  id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  priority: TaskPriority;
  importance: TaskImportance;
  start_time?: string;
  end_time?: string;
  is_completed: boolean;
  completed_at?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface UserSettings {
  urgentDays: number;
  urgentImportance: TaskImportance;
  aiApiKey?: string;
  aiBaseUrl?: string;
  aiModel?: string;
}

const defaultSettings: UserSettings = {
  urgentDays: 7,
  urgentImportance: 'important',
};

interface AppContextType {
  tasks: Task[];
  tags: Tag[];
  settings: UserSettings;
  isLoading: boolean;
  refreshTasks: () => Promise<void>;
  refreshTags: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_completed'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  // 批量操作
  batchUpdateTasks: (ids: string[], updates: Partial<Task>) => Promise<void>;
  batchDeleteTasks: (ids: string[]) => Promise<void>;
  addTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => void;
  exportCalendar: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const SETTINGS_KEY = 'nanyong-todo-settings';

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 加载设置
  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch {
      // 忽略
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // 忽略
    }
  }, [settings]);

  const refreshTasks = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/tasks', { headers });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      // 忽略
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTags = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/tags', { headers });
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch {
      // 忽略
    }
  }, []);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_completed'>): Promise<Task> => {
    const headers = await authHeaders(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || '创建任务失败');
    }
    const data = await res.json();
    setTasks(prev => [data.task, ...prev]);
    return data.task;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const headers = await authHeaders(true);
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('更新任务失败');
    const data = await res.json();
    setTasks(prev => prev.map(t => t.id === id ? data.task : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('删除任务失败');
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // 批量更新任务（统一设置优先级/重要程度/标签等）
  const batchUpdateTasks = useCallback(async (ids: string[], updates: Partial<Task>) => {
    if (ids.length === 0) return;
    const headers = await authHeaders(true);
    const res = await fetch('/api/tasks/batch', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ids, updates }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || '批量更新失败');
    }
    const data = await res.json();
    setTasks(prev => {
      const updatedMap = new Map<string, Task>((data.tasks || []).map((t: Task) => [t.id, t] as const));
      return prev.map(t => updatedMap.get(t.id) || t);
    });
  }, []);

  // 批量删除任务
  const batchDeleteTasks = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const headers = await authHeaders(true);
    const res = await fetch('/api/tasks/batch', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('批量删除失败');
    const idSet = new Set(ids);
    setTasks(prev => prev.filter(t => !idSet.has(t.id)));
  }, []);

  const toggleTaskComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await updateTask(id, { is_completed: !task.is_completed });
  }, [tasks, updateTask]);

  const addTag = useCallback(async (name: string, color?: string): Promise<Tag> => {
    const headers = await authHeaders(true);
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error('创建标签失败');
    const data = await res.json();
    setTags(prev => [...prev, data.tag]);
    return data.tag;
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/tags/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('删除标签失败');
    setTags(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTag = useCallback(async (id: string, updates: { name?: string; color?: string }) => {
    const headers = await authHeaders(true);
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('更新标签失败');
    const data = await res.json();
    setTags(prev => prev.map(t => t.id === id ? data.tag : t));
  }, []);

  const exportCalendar = useCallback(async () => {
    // 由调用方自己实现 fetch 逻辑
  }, []);

  return (
    <AppContext.Provider value={{
      tasks,
      tags,
      settings,
      isLoading,
      refreshTasks,
      refreshTags,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskComplete,
      batchUpdateTasks,
      batchDeleteTasks,
      addTag,
      updateTag,
      deleteTag,
      updateSettings,
      exportCalendar,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp 必须在 AppProvider 中使用');
  }
  return context;
}

export const taskTypeLabels: Record<TaskType, string> = {
  course: '课程',
  homework: '作业',
  exam: '考试',
  activity: '活动',
  personal: '个人',
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export const taskImportanceLabels: Record<TaskImportance, string> = {
  optional: '可选',
  suggested: '建议',
  normal: '普通',
  important: '重要',
  very_important: '非常重要',
};

// 重要程度 5 档顺序（用于星标滑动和排序）
export const taskImportanceOrder: TaskImportance[] = [
  'optional',
  'suggested',
  'normal',
  'important',
  'very_important',
];

// 重要程度 → 星标数（0-4 星）
export const taskImportanceStars: Record<TaskImportance, number> = {
  optional: 1,
  suggested: 2,
  normal: 3,
  important: 4,
  very_important: 5,
};
