'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp, taskTypeLabels, taskPriorityLabels, taskImportanceLabels, TaskType, TaskPriority } from '@/lib/app-context';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import { EmptyTasksIllustration, LoadingIllustration } from '@/components/illustrations';
import AppLayout from '@/components/app-layout';

type SortField = 'end_time' | 'created_at' | 'priority';
type SortOrder = 'asc' | 'desc';

export default function TasksPage() {
  const { tasks, isLoading, refreshTasks, toggleTaskComplete, deleteTask, tags } = useApp();
  const { getAccessToken } = useAuth();
  const toast = useAppToast();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('end_time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [search, setSearch] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getAccessToken();
      if (token) {
        await refreshTasks();
        setHasLoaded(true);
      }
    }
    load();
  }, [refreshTasks, getAccessToken]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // 搜索过滤
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }

    // 类型过滤
    if (filterType !== 'all') {
      result = result.filter(t => t.task_type === filterType);
    }

    // 优先级过滤
    if (filterPriority !== 'all') {
      result = result.filter(t => t.priority === filterPriority);
    }

    // 状态过滤
    if (filterStatus === 'completed') {
      result = result.filter(t => t.is_completed);
    } else if (filterStatus === 'pending') {
      result = result.filter(t => !t.is_completed);
    }

    // 标签过滤（简化：通过标题关键词模拟）
    if (filterTag !== 'all') {
      const tag = tags.find(t => t.id === filterTag);
      if (tag) {
        result = result.filter(t =>
          t.title.includes(tag.name) || (t.description || '').includes(tag.name)
        );
      }
    }

    // 排序
    result.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortField === 'end_time') {
        valA = a.end_time ? new Date(a.end_time).getTime() : 0;
        valB = b.end_time ? new Date(b.end_time).getTime() : 0;
      } else if (sortField === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortField === 'priority') {
        const priorityRank: Record<string, number> = {
          urgent: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        valA = priorityRank[a.priority] || 0;
        valB = priorityRank[b.priority] || 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });

    return result;
  }, [tasks, filterType, filterPriority, filterStatus, filterTag, search, sortField, sortOrder, tags]);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      course: 'bg-task-course',
      homework: 'bg-task-homework',
      exam: 'bg-task-exam',
      activity: 'bg-task-activity',
      personal: 'bg-task-personal',
    };
    return colors[type] || 'bg-gray-400';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      await deleteTask(id);
      toast.success('任务已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '无截止时间';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (task: typeof tasks[0]) => {
    if (!task.end_time || task.is_completed) return false;
    return new Date(task.end_time) < new Date();
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* 页面标题 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">全部任务</h1>
            <p className="text-muted-foreground mt-1">共 {filteredTasks.length} 个任务</p>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索任务..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* 筛选选项 */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">类型:</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="all">全部</option>
                <option value="course">课程</option>
                <option value="homework">作业</option>
                <option value="exam">考试</option>
                <option value="activity">活动</option>
                <option value="personal">个人</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">优先级:</span>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="all">全部</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">状态:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="all">全部</option>
                <option value="pending">待完成</option>
                <option value="completed">已完成</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">排序:</span>
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={e => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field as SortField);
                  setSortOrder(order as SortOrder);
                }}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="end_time-asc">截止时间 ↑</option>
                <option value="end_time-desc">截止时间 ↓</option>
                <option value="priority-desc">优先级 ↓</option>
                <option value="priority-asc">优先级 ↑</option>
                <option value="created_at-desc">创建时间 ↓</option>
                <option value="created_at-asc">创建时间 ↑</option>
              </select>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {!hasLoaded || isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LoadingIllustration className="w-24 h-20 opacity-60" />
              <p className="text-muted-foreground mt-3">加载中...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <EmptyTasksIllustration className="w-32 h-auto opacity-60" />
              <p className="text-muted-foreground mt-3">暂无匹配的任务</p>
              <p className="text-sm text-muted-foreground mt-1">试试调整筛选条件</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-4 p-4 hover:bg-accent/30 transition-colors group"
                >
                  <button
                    onClick={() => toggleTaskComplete(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      task.is_completed
                        ? 'bg-primary border-primary text-white'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {task.is_completed && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${getTypeColor(task.task_type)}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getTypeColor(task.task_type)}`}>
                            {taskTypeLabels[task.task_type as keyof typeof taskTypeLabels]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {taskPriorityLabels[task.priority as keyof typeof taskPriorityLabels]}优先级
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {taskImportanceLabels[task.importance as keyof typeof taskImportanceLabels]}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm ${
                          isOverdue(task) ? 'text-destructive font-medium' : 'text-muted-foreground'
                        }`}>
                          {isOverdue(task) ? '⚠️ 已过期' : formatDateTime(task.end_time)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          创建于 {new Date(task.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="删除任务"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
