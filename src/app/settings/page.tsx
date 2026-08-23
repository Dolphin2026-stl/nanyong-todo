'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp, TaskImportance } from '@/lib/app-context';
import { useTheme, colorSchemes, styleThemes, ThemeColor, ThemeStyle } from '@/lib/theme-context';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import AppLayout from '@/components/app-layout';

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const { colorScheme, setColorScheme, styleTheme, setStyleTheme, customBackground, setCustomBackground, blurLevel, setBlurLevel } = useTheme();
  const { user, getAccessToken, updateProfile } = useAuth();
  const toast = useAppToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 用户资料
  const [nickname, setNickname] = useState(user?.user_metadata?.nickname || '');
  const [school, setSchool] = useState(user?.user_metadata?.school || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // AI 设置
  const [aiApiKey, setAiApiKey] = useState(settings.aiApiKey);
  const [aiBaseUrl, setAiBaseUrl] = useState(settings.aiBaseUrl);
  const [aiModel, setAiModel] = useState(settings.aiModel);
  const [showApiKey, setShowApiKey] = useState(false);

  // 紧急阈值
  const [urgentDays, setUrgentDays] = useState<number>(settings.urgentDays);
  const [urgentImportance, setUrgentImportance] = useState<TaskImportance>(settings.urgentImportance);

  // 导出状态
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.user_metadata?.nickname || '');
      setSchool(user.user_metadata?.school || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      await updateProfile({ nickname, school });
      toast.success('个人资料已更新');
    } catch (err) {
      toast.error('更新失败，请重试');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAISettings = () => {
    updateSettings({
      aiApiKey,
      aiBaseUrl,
      aiModel,
    });
    toast.success('AI 设置已保存到本地');
  };

  const handleSaveUrgentSettings = () => {
    updateSettings({
      urgentDays,
      urgentImportance,
    });
    toast.success('紧急阈值已更新');
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomBackground(dataUrl);
      setStyleTheme('custom');
      toast.success('背景图片已设置');
    };
    reader.readAsDataURL(file);
  };

  const handleExportCalendar = async () => {
    setIsExporting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/calendar-export', {
        headers: { 'x-session': token || '' },
      });
      
      if (!res.ok) throw new Error('导出失败');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nanyong-todo-calendar.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('日历文件已下载，可导入手机日历');
    } catch (err) {
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const email = user?.email || '';
  const initial = (nickname?.[0] || email?.[0] || 'U').toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">设置</h1>
          <p className="text-muted-foreground mt-1">个性化你的南雍待办</p>
        </div>

        {/* 个人资料 */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span>👤</span> 个人资料
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {/* 头像 */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
                {initial}
              </div>
              <div>
                <p className="font-medium text-foreground">{nickname || '未设置昵称'}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>

            {/* 昵称 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="输入你的昵称"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* 学校 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">学校（可选）</label>
              <input
                type="text"
                value={school}
                onChange={e => setSchool(e.target.value)}
                placeholder="例如：南京大学"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isUpdatingProfile ? '保存中...' : '保存资料'}
            </button>
          </div>
        </section>

        {/* 主题设置 */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span>🎨</span> 主题设置
            </h2>
          </div>
          <div className="p-5 space-y-6">
            {/* 配色方案 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">配色方案</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(colorSchemes) as [ThemeColor, typeof colorSchemes[ThemeColor]][]).map(([key, scheme]) => (
                  <button
                    key={key}
                    onClick={() => setColorScheme(key)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      colorScheme === key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex gap-1 mb-2 justify-center">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.primary }} />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.accent }} />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.muted }} />
                    </div>
                    <p className="text-sm font-medium text-foreground text-center">{scheme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 风格主题 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">主题风格</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(styleThemes) as [ThemeStyle, typeof styleThemes[ThemeStyle]][]).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setStyleTheme(key)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      styleTheme === key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      <span className="text-2xl">{theme.icon}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground text-center">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义背景 */}
            {styleTheme === 'custom' && (
              <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                <p className="text-sm font-medium text-foreground">自定义背景图片</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    上传图片
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                  />
                  {customBackground && (
                    <button
                      onClick={() => { setCustomBackground(''); toast.success('已清除背景'); }}
                      className="px-4 py-2 text-destructive border border-destructive/30 rounded-lg text-sm font-medium hover:bg-destructive/5 transition-colors"
                    >
                      清除背景
                    </button>
                  )}
                </div>
                
                {customBackground && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      模糊度: {blurLevel}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={blurLevel}
                      onChange={e => setBlurLevel(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 紧急阈值 */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span>🔥</span> 紧急任务阈值
            </h2>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                时间阈值（天）
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                任务截止时间在以下天数内会被标记为紧急
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={urgentDays}
                  onChange={e => setUrgentDays(Number(e.target.value))}
                  className="flex-1 accent-destructive"
                />
                <span className="text-lg font-bold text-destructive w-12 text-right">
                  {urgentDays}天
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                重要程度门槛
              </label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: 'optional' as TaskImportance, label: '可选及以上' },
                  { id: 'suggested' as TaskImportance, label: '建议及以上' },
                  { id: 'normal' as TaskImportance, label: '普通及以上' },
                  { id: 'important' as TaskImportance, label: '重要及以上' },
                  { id: 'very_important' as TaskImportance, label: '仅非常重要' },
                ]).map(imp => (
                  <button
                    key={imp.id}
                    onClick={() => setUrgentImportance(imp.id)}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all ${
                      urgentImportance === imp.id
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    {imp.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveUrgentSettings}
              className="px-5 py-2.5 bg-destructive text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              保存设置
            </button>
          </div>
        </section>

        {/* AI 设置 */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span>🤖</span> AI 智能解析设置
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              您的 API 密钥仅保存在浏览器本地，不会上传到服务器。
            </p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-3 py-2.5 text-muted-foreground hover:text-foreground border border-input rounded-lg transition-colors"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Base URL（可选）
              </label>
              <input
                type="text"
                value={aiBaseUrl}
                onChange={e => setAiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                模型名称（可选）
              </label>
              <input
                type="text"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder="gpt-4o / glm-4 / qwen-max 等"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <button
              onClick={handleSaveAISettings}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              保存设置
            </button>
          </div>
        </section>

        {/* 日历导出 */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span>📅</span> 日历导出
            </h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-4">
              导出 .ics 文件，可导入 iOS / Android 系统日历，在手机上接收提醒。
            </p>
            <button
              onClick={handleExportCalendar}
              disabled={isExporting}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {isExporting ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              导出到手机日历
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
