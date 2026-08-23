'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp, taskTypeLabels, taskPriorityLabels, taskImportanceLabels, taskImportanceOrder, taskImportanceStars, TaskType, TaskPriority, TaskImportance } from '@/lib/app-context';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import { EmptyTasksIllustration, LoadingIllustration } from '@/components/illustrations';
import AppLayout from '@/components/app-layout';

type SortField = 'end_time' | 'created_at' | 'priority';
type SortOrder = 'asc' | 'desc';

const priorityOptions: { id: TaskPriority; label: string }[] = [
  { id: 'low', label: '低' },
  { id: 'medium', label: '中' },
  { id: 'high', label: '高' },
  { id: 'urgent', label: '紧急' },
];

export default function TasksPage() {
  const { tasks, isLoading, refreshTasks, toggleTaskComplete, deleteTask, batchUpdateTasks, batchDeleteTasks, tags, addTag } = useApp();
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

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

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

  // 批量选择辅助
  const visibleIds = filteredTasks.map(t => t.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));

  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  // 批量操作
  const handleBatchPriority = async (priority: TaskPriority) => {
    if (selectedIds.size === 0) return;
    try {
      await batchUpdateTasks([...selectedIds], { priority });
      toast.success(`已将 ${selectedIds.size} 个任务的优先级设为「${taskPriorityLabels[priority]}」`);
      clearSelection();
    } catch (err) {
      toast.error('批量修改优先级失败');
    }
  };

  const handleBatchImportance = async (importance: TaskImportance) => {
    if (selectedIds.size === 0) return;
    try {
      await batchUpdateTasks([...selectedIds], { importance });
      toast.success(`已将 ${selectedIds.size} 个任务的重要程度设为「${taskImportanceLabels[importance]}」`);
      clearSelection();
    } catch (err) {
      toast.error('批量修改重要程度失败');
    }
  };

  const handleBatchTag = async (tagId: string) => {
    if (selectedIds.size === 0 || !tagId) return;
    try {
      await batchUpdateTasks([...selectedIds], { tag_id: tagId });
      toast.success(`已将 ${selectedIds.size} 个任务打上标签`);
      clearSelection();
    } catch (err) {
      toast.error('批量设置标签失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个任务吗？此操作不可恢复！`)) return;
    try {
      await batchDeleteTasks([...selectedIds]);
      toast.success(`已删除 ${selectedIds.size} 个任务`);
      clearSelection();
    } catch (err) {
      toast.error('批量删除失败');
    }
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

  // 星标组件
  const Stars = ({ importance }: { importance: TaskImportance }) => {
    const stars = taskImportanceStars[importance] || 0;
    return (
      <span className="inline-flex items-center gap-0.5 align-middle" title={taskImportanceLabels[importance]}>
        {[1, 2, 3, 4, 5].map(n => (
          <svg key={n} className={`w-3 h-3 ${n <= stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30 fill-muted-foreground/20'}`} viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118l-2.8-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </span>
    );
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
          <button
            onClick={() => selectMode ? clearSelection() : setSelectMode(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectMode
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {selectMode ? '取消批量' : '批量编辑'}
          </button>
        </div>

        {/* 批量操作栏 */}
        {selectMode && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={el => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  全选本页 ({visibleIds.length})
                </label>
                <span className="text-sm font-medium text-primary">
                  已选 {selectedIds.size} 个任务
                </span>
              </div>
              <button
                onClick={clearSelection}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                清空选择
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 批量改优先级 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">优先级:</span>
                <select
                  value=""
                  onChange={e => { if (e.target.value) handleBatchPriority(e.target.value as TaskPriority); e.target.value = ''; }}
                  className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="" disabled>选择...</option>
                  {priorityOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* 批量改重要程度 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">重要程度:</span>
                <select
                  value=""
                  onChange={e => { if (e.target.value) handleBatchImportance(e.target.value as TaskImportance); e.target.value = ''; }}
                  className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="" disabled>选择...</option>
                  {taskImportanceOrder.map(imp => (
                    <option key={imp} value={imp}>{taskImportanceLabels[imp]} ({taskImportanceStars[imp]}星)</option>
                  ))}
                </select>
              </div>

              {/* 批量删除 */}
              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                删除所选
              </button>
            </div>
          </div>
        )}

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
                {priorityOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
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
                  className={`flex items-start gap-4 p-4 transition-colors group ${
                    selectedIds.has(task.id) ? 'bg-primary/5' : 'hover:bg-accent/30'
                  }`}
                >
                  {/* 选择框（批量模式下显示） */}
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleOne(task.id)}
                      className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary flex-shrink-0"
                    />
                  )}

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
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Stars importance={task.importance} />
                            <span>{taskImportanceLabels[task.importance as keyof typeof taskImportanceLabels]}</span>
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

                  {!selectMode && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="删除任务"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
