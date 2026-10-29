'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp, taskTypeLabels, taskPriorityLabels } from '@/lib/app-context';
import { taskScheduleTime, taskScheduleLabel } from '@/lib/task-dates';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import { EmptyTasksIllustration, LoadingIllustration } from '@/components/illustrations';
import AppLayout from '@/components/app-layout';
import { useTheme } from '@/lib/theme-context';

type ViewType = 'day' | 'week';
const chartPalette = ['#6d3d8c', '#3b82f6', '#ef4444', '#eab308', '#64748b'];
const dailyQuotes = [
  { text: '雄关漫道真如铁，而今迈步从头越。', by: '毛泽东《忆秦娥·娄山关》', url: 'https://www.mod.gov.cn/gfbw/gfjy_index/16485064.html' },
  { text: '世上无难事，只要肯登攀。', by: '毛泽东《水调歌头·重上井冈山》', url: 'https://www.mod.gov.cn/gfbw/jmsd/4909819.html' },
  { text: '幸福都是奋斗出来的。', by: '习近平 · 新年贺词', url: 'https://www.moe.gov.cn/jyb_xwfb/moe_176/202506/t20250630_1196067.html' },
  { text: '团结奋斗是中国人民创造历史伟业的必由之路。', by: '习近平 · 团结奋斗', url: 'https://www.moe.gov.cn/jyb_xwfb/moe_176/202506/t20250630_1196067.html' },
];

export default function DashboardPage() {
  const { tasks, tags, isLoading, refreshTasks, refreshTags, toggleTaskComplete, deleteTask, settings } = useApp();
  const { getAccessToken } = useAuth();
  const toast = useAppToast();
  const { styleTheme } = useTheme();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [view, setView] = useState<ViewType>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => { setQuoteIndex(new Date().getDate() % dailyQuotes.length); }, []);

  // 加载任务
  useEffect(() => {
    async function load() {
      const token = await getAccessToken();
      if (token) {
        await refreshTasks();
        await refreshTags();
        setHasLoaded(true);
      }
    }
    load();
  }, [refreshTasks, refreshTags, getAccessToken]);

  // 紧急任务筛选
  const urgentTasks = useMemo(() => {
    const now = new Date();
    const threshold = new Date(now.getTime() + settings.urgentDays * 24 * 60 * 60 * 1000);
    
    const importanceRank: Record<string, number> = {
      optional: 0,
      suggested: 1,
      normal: 2,
      important: 3,
      very_important: 4,
    };
    const minImportance = importanceRank[settings.urgentImportance] ?? 3;
    
    return tasks
      .filter(task => {
        if (task.is_completed) return false;
        const scheduleTime = taskScheduleTime(task);
        if (!scheduleTime || task.is_long_term) return false;
        const endDate = new Date(scheduleTime);
        const importance = importanceRank[task.importance] || 0;
        return endDate <= threshold && importance >= minImportance;
      })
      .sort((a, b) => new Date(taskScheduleTime(a)!).getTime() - new Date(taskScheduleTime(b)!).getTime())
      .slice(0, 3);
  }, [tasks, settings]);

  const longTermTasks = useMemo(() => tasks.filter(task => task.is_long_term && !task.is_completed && task.end_time)
    .sort((a, b) => new Date(a.end_time!).getTime() - new Date(b.end_time!).getTime()), [tasks]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const inMonth = (iso?: string) => iso && new Date(iso).getFullYear() === now.getFullYear() && new Date(iso).getMonth() === now.getMonth();
    const scheduled = tasks.filter(task => inMonth(taskScheduleTime(task)));
    const completed = tasks.filter(task => task.is_completed && inMonth(task.completed_at)).length;
    const types = (Object.keys(taskTypeLabels) as Array<keyof typeof taskTypeLabels>).map(type => ({ type, label: taskTypeLabels[type], count: scheduled.filter(task => task.task_type === type).length }));
    return { scheduled: scheduled.length, completed, types };
  }, [tasks]);
  const pieGradient = useMemo(() => {
    if (!monthStats.scheduled) return 'conic-gradient(#e5e7eb 0 100%)';
    let offset = 0;
    const slices = monthStats.types.map((item, index) => {
      const start = offset;
      offset += item.count / monthStats.scheduled * 100;
      return `${chartPalette[index]} ${start}% ${offset}%`;
    });
    return `conic-gradient(${slices.join(',')})`;
  }, [monthStats]);

  // 倒计时更新
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date().getTime();
      const newCountdowns: Record<string, string> = {};
      
      [...urgentTasks, ...longTermTasks].forEach(task => {
        const scheduleTime = taskScheduleTime(task);
        if (scheduleTime) {
          const end = new Date(scheduleTime).getTime();
          const diff = end - now;
          
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (days >= 7) {
              newCountdowns[task.id] = `${days}天`;
            } else if (days > 0) {
              newCountdowns[task.id] = `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
            } else if (hours > 0) {
              newCountdowns[task.id] = `${hours}时 ${minutes}分 ${seconds}秒`;
            } else {
              newCountdowns[task.id] = `${minutes}分 ${seconds}秒`;
            }
          } else {
            newCountdowns[task.id] = task.end_time ? '已过期' : '已开始';
          }
        }
      });
      
      setCountdowns(newCountdowns);
    };

    const interval = setInterval(updateCountdowns, 1000);
    updateCountdowns();
    return () => clearInterval(interval);
  }, [urgentTasks, longTermTasks]);

  // 日视图任务
  const dayTasks = useMemo(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    return tasks.filter(task => {
      if (task.is_completed) return false;
      const scheduleTime = taskScheduleTime(task);
      const taskDate = scheduleTime ? new Date(scheduleTime) : null;
      if (!taskDate) return false;
      return taskDate >= dayStart && taskDate <= dayEnd;
    }).sort((a, b) => {
      const aTime = taskScheduleTime(a) ? new Date(taskScheduleTime(a)!).getTime() : 0;
      const bTime = taskScheduleTime(b) ? new Date(taskScheduleTime(b)!).getTime() : 0;
      return aTime - bTime;
    });
  }, [tasks, selectedDate]);

  // 周视图任务
  const weekTasks = useMemo(() => {
    // 获取本周第一天（周日开始）
    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return tasks.filter(task => {
      if (task.is_completed) return false;
      const scheduleTime = taskScheduleTime(task);
      const taskDate = scheduleTime ? new Date(scheduleTime) : null;
      if (!taskDate) return false;
      return taskDate >= weekStart && taskDate <= weekEnd;
    });
  }, [tasks, selectedDate]);

  // 月历数据
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      tasks: typeof tasks;
    }> = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 上月填充
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        tasks: [],
      });
    }
    
    // 本月
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayTasks = tasks.filter(task => {
        if (task.is_completed) return false;
        const scheduleTime = taskScheduleTime(task);
        const taskDate = scheduleTime ? new Date(scheduleTime) : null;
        if (!taskDate) return false;
        return taskDate >= dayStart && taskDate <= dayEnd;
      });
      
      const isToday = date.getTime() === today.getTime();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected,
        tasks: dayTasks,
      });
    }
    
    return days;
  }, [tasks, currentMonth, selectedDate]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

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

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 获取本周日期
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const weekStart = new Date(selectedDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [selectedDate]);

  const getTasksForDate = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return weekTasks.filter(task => {
      const scheduleTime = taskScheduleTime(task);
      const taskDate = scheduleTime ? new Date(scheduleTime) : null;
      if (!taskDate) return false;
      return taskDate >= dayStart && taskDate <= dayEnd;
    }).sort((a, b) => {
      const aTime = taskScheduleTime(a) ? new Date(taskScheduleTime(a)!).getTime() : 0;
      const bTime = taskScheduleTime(b) ? new Date(taskScheduleTime(b)!).getTime() : 0;
      return aTime - bTime;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">主看板</h1>
          <p className="text-muted-foreground mt-1">管理你的每日待办事项</p>
        </div>
        {(styleTheme === 'red-revolution' || styleTheme === 'long-march') && <aside className="rounded-xl border border-red-300/50 bg-red-950/85 text-amber-50 px-5 py-4 shadow-lg">
          <span className="text-xs tracking-widest text-amber-300">🚩 今日一句</span>
          <p className="font-serif text-lg mt-1">“{dailyQuotes[quoteIndex].text}”</p>
          <a href={dailyQuotes[quoteIndex].url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-200 underline underline-offset-4">— {dailyQuotes[quoteIndex].by} · 查看出处</a>
          <p className="text-xs text-amber-200/70 border-t border-amber-200/20 mt-3 pt-2">雄关漫道真如铁，而今迈步从头越。</p>
        </aside>}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左侧：最近安排 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 视图切换 + 日期 */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">最近安排</h2>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 日期选择 */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      if (view === 'day') newDate.setDate(newDate.getDate() - 1);
                      else newDate.setDate(newDate.getDate() - 7);
                      setSelectedDate(newDate);
                    }}
                    className="p-1.5 hover:bg-background rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="px-3 py-1 text-sm font-medium hover:bg-background rounded-md transition-colors"
                  >
                    今天
                  </button>
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      if (view === 'day') newDate.setDate(newDate.getDate() + 1);
                      else newDate.setDate(newDate.getDate() + 7);
                      setSelectedDate(newDate);
                    }}
                    className="p-1.5 hover:bg-background rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {/* 视图切换 */}
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setView('day')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      view === 'day' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    日
                  </button>
                  <button
                    onClick={() => setView('week')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      view === 'week' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    周
                  </button>
                </div>
              </div>
            </div>

            {/* 日视图 */}
            {view === 'day' && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-medium text-foreground mb-4">{formatDate(selectedDate)}</h3>
                
                {!hasLoaded || isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <LoadingIllustration className="w-24 h-20 opacity-60" />
                    <p className="text-muted-foreground mt-3">加载中...</p>
                  </div>
                ) : dayTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <EmptyTasksIllustration className="w-32 h-auto opacity-60" />
                    <p className="text-muted-foreground mt-3">今天没有待办任务</p>
                    <p className="text-sm text-muted-foreground mt-1">去添加一个吧～</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
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
                        
                        <div className={`w-1 self-stretch rounded-full ${getTypeColor(task.task_type)} flex-shrink-0`} />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {taskScheduleTime(task) && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {taskScheduleLabel(task)} {formatTime(taskScheduleTime(task))}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {taskPriorityLabels[task.priority as keyof typeof taskPriorityLabels]}优先级
                            </span>
                            {task.tags?.map(id => { const tag = tags.find(item => item.id === id); return tag ? <span key={id} className="text-xs rounded-full px-2 py-0.5 bg-primary/10 text-primary">#{tag.name}</span> : null; })}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
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
            )}

            {/* 周视图 */}
            {view === 'week' && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-medium text-foreground mb-4">
                  {weekDates[0].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                </h3>
                
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, idx) => {
                    const date = weekDates[idx];
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayTasksList = getTasksForDate(date);
                    
                    return (
                      <div key={day} className="text-center">
                        <div className={`text-sm mb-2 ${
                          isToday ? 'text-primary font-semibold' : 'text-muted-foreground'
                        }`}>
                          {day}
                          <div className={`text-lg font-medium ${
                            isToday ? 'bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1' : ''
                          }`}>
                            {date.getDate()}
                          </div>
                        </div>
                        
                        <div className="space-y-1 min-h-[100px]">
                          {dayTasksList.slice(0, 3).map(task => (
                            <div
                              key={task.id}
                              className={`text-xs p-1.5 rounded text-left truncate ${getTypeColor(task.task_type)} text-white cursor-pointer hover:opacity-80 transition-opacity`}
                              title={`${task.title} - ${taskScheduleLabel(task)} ${formatTime(taskScheduleTime(task))}`}
                              onClick={() => {
                                setSelectedDate(date);
                                setView('day');
                              }}
                            >
                              {task.title}
                            </div>
                          ))}
                          {dayTasksList.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{dayTasksList.length - 3} 更多
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <section className="bg-card border border-border rounded-xl p-5" aria-label="长远目标">
              <h2 className="text-lg font-semibold mb-3">🚩 长远目标</h2>
              {longTermTasks.length === 0 ? <p className="text-sm text-muted-foreground">在添加任务时勾选“作为长远目标”，这里就会显示 DDL 倒计时。</p> : <div className="grid sm:grid-cols-2 gap-3">{longTermTasks.map(task => <div key={task.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="font-medium">{task.title}</p>
                <p className="text-xl font-mono font-bold text-primary mt-2">{countdowns[task.id] || '计算中...'}</p>
                <p className="text-xs text-muted-foreground mt-1">DDL · {new Date(task.end_time!).toLocaleString('zh-CN')}</p>
              </div>)}</div>}
            </section>
          </div>

          {/* 右侧：迫在眉睫 + 本月规划 */}
          <div className="space-y-4">
            {/* 迫在眉睫 - 醒目卡片 */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-rose-700 text-white p-5 shadow-lg shadow-red-500/20">
              {/* 装饰 */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 blur-xl" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl animate-pulse-subtle">🔥</span>
                  <h2 className="text-lg font-bold">迫在眉睫</h2>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                    {urgentTasks.length > 0 ? urgentTasks.length : 0}
                  </span>
                </div>
                
                {!hasLoaded || isLoading ? (
                  <div className="py-8 text-center text-white/70 text-sm">加载中...</div>
                ) : urgentTasks.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm text-white/80">暂无紧急任务</p>
                    <p className="text-xs text-white/60 mt-1">保持这样的节奏！</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {urgentTasks.slice(0, 3).map((task, idx) => {
                      const isExpired = countdowns[task.id] === '已过期';
                      return (
                        <div
                          key={task.id}
                          className="bg-white/15 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/20 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{task.title}</h4>
                              <div className="mt-1.5">
                                {isExpired ? (
                                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">
                                    ⚠️ 已过期
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1 text-xs">
                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-mono font-bold text-white tracking-tight">
                                      {countdowns[task.id] || '计算中...'}
                                      {!isExpired && <span className="ml-1 opacity-80">【{taskScheduleLabel(task)}】</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-lg font-semibold text-foreground">本月规划</h2>
            
            <div className="bg-card border border-border rounded-xl p-4">
              {/* 月历标题 */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-accent rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="font-medium">
                  {currentMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-accent rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* 星期标题 */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-xs text-center text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* 日期格子 */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const hasTasks = day.tasks.length > 0;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
                      disabled={!day.isCurrentMonth}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative ${
                        !day.isCurrentMonth
                          ? 'text-muted-foreground/30 cursor-default'
                          : day.isSelected
                          ? 'bg-primary text-primary-foreground font-medium'
                          : day.isToday
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-accent cursor-pointer'
                      }`}
                    >
                      {day.date.getDate()}
                      {/* 任务小圆点 */}
                      {hasTasks && day.isCurrentMonth && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          {day.tasks.slice(0, 3).map((task, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${day.isSelected ? 'bg-primary-foreground' : getTypeColor(task.task_type)}`}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* 悬停提示 */}
                      {hasTasks && day.isCurrentMonth && (
                        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10">
                          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-left text-xs w-40">
                            {day.tasks.slice(0, 5).map(task => (
                              <div key={task.id} className="flex items-center gap-1.5 py-0.5">
                                <div className={`w-2 h-2 rounded-full ${getTypeColor(task.task_type)}`} />
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                            {day.tasks.length > 5 && (
                              <div className="text-muted-foreground pt-0.5">还有 {day.tasks.length - 5} 项</div>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* 图例 */}
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-task-course" />
                  课程
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-task-homework" />
                  作业
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-task-exam" />
                  考试
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-task-activity" />
                  活动
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-task-personal" />
                  个人
                </div>
              </div>
            </div>
          </div>
        </div>
        <section className="bg-card border border-border rounded-xl p-5" aria-label="阶段数据可视化">
          <h2 className="text-lg font-semibold">📊 阶段数据 · 本月</h2>
          <div className="grid md:grid-cols-[180px_1fr] gap-8 items-center mt-5">
            <div className="relative mx-auto w-40 h-40 rounded-full" style={{ background: pieGradient }} role="img" aria-label={`本月任务类型占比，共 ${monthStats.scheduled} 项`}>
              <div className="absolute inset-7 rounded-full bg-card flex flex-col items-center justify-center"><b className="text-2xl">{monthStats.scheduled}</b><span className="text-xs text-muted-foreground">本月安排</span></div>
            </div>
            <div className="space-y-2">
              <p className="text-sm">本月已完成 <strong className="text-primary">{monthStats.completed}</strong> 项任务</p>
              {monthStats.types.map((item, index) => <div key={item.type} className="grid grid-cols-[36px_1fr_34px] items-center gap-2 text-xs">
                <span>{item.label}</span><div className="h-3 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${monthStats.scheduled ? item.count / monthStats.scheduled * 100 : 0}%`, background: chartPalette[index] }} /></div><span className="text-right">{item.count}</span>
              </div>)}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
