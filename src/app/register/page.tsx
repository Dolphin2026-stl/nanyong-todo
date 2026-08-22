'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import { LoginIllustration, AppLogo } from '@/components/illustrations';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { signUp } = useAuth();
  const toast = useAppToast();
  const { isLoading: configLoading } = useSupabaseConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast.error('请填写所有必填项');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    
    if (password.length < 6) {
      toast.error('密码长度至少为6位');
      return;
    }

    setIsLoading(true);
    try {
      const data = await signUp(email, password, nickname || undefined);
      
      if (data.user && !data.session) {
        // 需要邮箱验证
        toast.info('注册成功！请查收验证邮件完成注册');
      } else {
        toast.success('注册成功！欢迎加入南雍待办');
      }
      
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '注册失败';
      toast.error(message.includes('already') || message.includes('已存在')
        ? '该邮箱已被注册'
        : message);
    } finally {
      setIsLoading(false);
    }
  };

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f0f9] to-white p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* 左侧插画 */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <LoginIllustration className="w-full max-w-md h-auto" />
          <div className="mt-6 text-center">
            <h2 className="text-xl font-semibold text-[#4A1A6B] mb-2">
              开启高效大学生活
            </h2>
            <p className="text-sm text-muted-foreground">
              加入南雍待办，让每一天都井井有条
            </p>
          </div>
        </div>

        {/* 右侧注册表单 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Logo 和标题 */}
          <div className="flex flex-col items-center mb-6">
            <AppLogo size={48} className="mb-2" />
            <h1 className="text-xl font-bold text-foreground">创建账号</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 昵称 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                昵称 <span className="text-muted-foreground text-xs">(可选)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="给自己起个昵称吧"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                disabled={isLoading}
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                邮箱地址
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="请输入你的邮箱"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                disabled={isLoading}
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少6位密码"
                  className="w-full px-4 py-2.5 pr-12 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                确认密码
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                disabled={isLoading}
              />
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {isLoading ? '注册中...' : '注 册'}
            </button>
          </form>

          {/* 登录入口 */}
          <div className="mt-5 text-center text-sm">
            <span className="text-muted-foreground">已有账号？</span>{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              去登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
