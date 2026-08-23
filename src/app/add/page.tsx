'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, taskTypeLabels, taskPriorityLabels, taskImportanceLabels, TaskType, TaskPriority, TaskImportance } from '@/lib/app-context';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import AppLayout from '@/components/app-layout';

type ImportMode = 'form' | 'ai';

export default function AddTaskPage() {
  const [mode, setMode] = useState<ImportMode>('form');
  const router = useRouter();
  const { addTask, settings, updateSettings } = useApp();
  const { getAccessToken } = useAuth();
  const toast = useAppToast();

  // 表单模式状态
  const [taskType, setTaskType] = useState<TaskType>('homework');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [importance, setImportance] = useState<TaskImportance>('normal');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI 模式状态
  const [aiText, setAiText] = useState('');
  const [apiKey, setApiKey] = useState(settings.aiApiKey || '');
  const [baseUrl, setBaseUrl] = useState(settings.aiBaseUrl || '');
  const [model, setModel] = useState(settings.aiModel || '');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<Array<{
    title: string;
    description: string;
    task_type: TaskType;
    priority: TaskPriority;
    importance: TaskImportance;
    start_time?: string;
    end_time?: string;
    selected?: boolean;
  }>>([]);

  const taskTypes: { id: TaskType; label: string; icon: string; color: string }[] = [
    { id: 'course', label: '课程', icon: '📚', color: 'task-course' },
    { id: 'homework', label: '作业', icon: '📝', color: 'task-homework' },
    { id: 'exam', label: '考试', icon: '📖', color: 'task-exam' },
    { id: 'activity', label: '活动', icon: '🎉', color: 'task-activity' },
    { id: 'personal', label: '个人', icon: '👤', color: 'task-personal' },
  ];

  const priorities: { id: TaskPriority; label: string; color: string }[] = [
    { id: 'low', label: '低', color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'medium', label: '中', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'high', label: '高', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'urgent', label: '紧急', color: 'bg-red-100 text-red-700 border-red-200' },
  ];

  const importances: { id: TaskImportance; label: string }[] = [
    { id: 'normal', label: '普通' },
    { id: 'important', label: '重要' },
    { id: 'very_important', label: '非常重要' },
  ];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入任务标题');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      
      const start_time = startDate && startTime ? `${startDate}T${startTime}` : undefined;
      const end_time = endDate && endTime ? `${endDate}T${endTime}` : undefined;

      await addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        task_type: taskType,
        priority,
        importance,
        start_time,
        end_time,
      });
      
      toast.success('任务添加成功！');
      router.push('/dashboard');
    } catch (err) {
      toast.error('添加任务失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIParser = async () => {
    if (!aiText.trim()) {
      toast.error('请输入要解析的文本');
      return;
    }

    // 保存 API 配置到本地
    if (apiKey) {
      updateSettings({ aiApiKey: apiKey, aiBaseUrl: baseUrl, aiModel: model });
    }

    setIsParsing(true);
    try {
      const res = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
          model: model || undefined,
          semesterStart: '2026-08-24',
          weeks: 18,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '解析失败');
      }

      setParsedTasks(data.tasks.map((t: typeof parsedTasks[0]) => ({ ...t, selected: true })));
      toast.success(`成功解析出 ${data.tasks.length} 个任务`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '解析失败');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleTaskSelection = (index: number) => {
    setParsedTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, selected: !task.selected } : task
    ));
  };

  const importSelectedTasks = async () => {
    const selected = parsedTasks.filter(t => t.selected);
    if (selected.length === 0) {
      toast.error('请选择要导入的任务');
      return;
    }

    setIsSubmitting(true);
    try {
      for (const task of selected) {
        await addTask({
          title: task.title,
          description: task.description,
          task_type: task.task_type,
          priority: task.priority,
          importance: task.importance,
          start_time: task.start_time,
          end_time: task.end_time,
        });
      }
      toast.success(`成功导入 ${selected.length} 个任务！`);
      router.push('/dashboard');
    } catch (err) {
      toast.error('导入失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: TaskType) => {
    const colors: Record<string, string> = {
      course: 'bg-task-course',
      homework: 'bg-task-homework',
      exam: 'bg-task-exam',
      activity: 'bg-task-activity',
      personal: 'bg-task-personal',
    };
    return colors[type] || 'bg-gray-400';
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">添加任务</h1>
          <p className="text-muted-foreground mt-1">快速创建你的待办事项</p>
        </div>

        {/* 模式切换 */}
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setMode('form')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              mode === 'form'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📋 问卷式导入
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
              mode === 'ai'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🤖 AI 智能解析
          </button>
        </div>

        {/* 问卷式导入 */}
        {mode === 'form' && (
          <form onSubmit={handleFormSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
            {/* 步骤1：选择任务类型 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                <span className="text-primary mr-1">1.</span>选择任务类型
              </label>
              <div className="grid grid-cols-5 gap-2">
                {taskTypes.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTaskType(type.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      taskType === type.id
                        ? `border-${type.color} bg-${type.color}/10`
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                    style={taskType === type.id ? {
                      borderColor: `var(--${type.color.replace('task-', 'task-')})`,
                      backgroundColor: `color-mix(in srgb, var(--${type.color.replace('task-', 'task-')}) 10%, transparent)`,
                    } : {}}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 步骤2：标题 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <span className="text-primary mr-1">2.</span>任务标题 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如：高等数学第三章作业"
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* 步骤3：时间 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                <span className="text-primary mr-1">3.</span>时间安排
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">开始时间（可选）</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">截止时间（可选）</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 步骤4：优先级 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                <span className="text-primary mr-1">4.</span>设置优先级
              </label>
              <div className="flex gap-2 flex-wrap">
                {priorities.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
                      priority === p.id
                        ? p.color + ' border-current'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 步骤5：重要程度 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                <span className="text-primary mr-1">5.</span>重要程度
              </label>
              <div className="flex gap-2 flex-wrap">
                {importances.map(imp => (
                  <button
                    key={imp.id}
                    type="button"
                    onClick={() => setImportance(imp.id)}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
                      importance === imp.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    {imp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 步骤6：备注 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <span className="text-primary mr-1">6.</span>备注 <span className="text-muted-foreground text-xs">(可选)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="补充任务详情、参考资料等..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? '添加中...' : '✨ 添加到看板'}
            </button>
          </form>
        )}

        {/* AI 智能解析 */}
        {mode === 'ai' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              {/* API 配置 */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔑</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">API 配置（可选）</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      您的API密钥仅用于本次解析，不会存储或泄露。不填写则使用系统默认模型。
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="API Key (可选)"
                    className="px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder="Base URL (可选，如 https://api.openai.com/v1)"
                    className="px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="模型名称 (可选，如 gpt-4o / glm-4)"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                />
              </div>

              {/* 文本输入 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  粘贴待解析文本
                </label>
                <textarea
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  placeholder={`例如：\n"同学们，下周一下午2点高等数学期中考试，请携带学生证和计算器。\n另外，周三之前完成第三章课后习题1-20题，提交到学习通。\n周五晚7点在大活举办迎新晚会，记得准时参加。"`}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* 解析按钮 */}
              <button
                onClick={handleAIParser}
                disabled={isParsing || !aiText.trim()}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isParsing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    AI 正在解析...
                  </>
                ) : (
                  <>🤖 开始 AI 解析</>
                )}
              </button>
            </div>

            {/* 解析结果 */}
            {parsedTasks.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    解析结果 <span className="text-sm font-normal text-muted-foreground">({parsedTasks.length} 个任务)</span>
                  </h3>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    请确认后导入
                  </span>
                </div>

                <div className="space-y-3">
                  {parsedTasks.map((task, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        task.selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                      onClick={() => toggleTaskSelection(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          task.selected
                            ? 'bg-primary border-primary text-white'
                            : 'border-border'
                        }`}>
                          {task.selected && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${getTypeColor(task.task_type)}`} />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getTypeColor(task.task_type)}`}>
                              {taskTypeLabels[task.task_type]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {taskPriorityLabels[task.priority]}优先级
                            </span>
                            <span className="text-xs text-muted-foreground">
                              · {taskImportanceLabels[task.importance]}
                            </span>
                          </div>
                          {task.end_time && (
                            <p className="text-xs text-muted-foreground mt-1">
                              🕐 {new Date(task.end_time).toLocaleString('zh-CN')}
                            </p>
                          )}
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={importSelectedTasks}
                  disabled={isSubmitting || !parsedTasks.some(t => t.selected)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? '导入中...' : `📥 导入选中的 ${parsedTasks.filter(t => t.selected).length} 个任务`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
