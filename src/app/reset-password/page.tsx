'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { AppLogo, SuccessIllustration } from '@/components/illustrations';
import Link from 'next/link';
import { useAppToast } from '@/lib/toast-provider';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAppToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 检查是否有有效的重置 token
    const checkLink = async () => {
      const type = searchParams.get('type');
      const token = searchParams.get('token');
      
      if (type === 'recovery' && token) {
        setIsValidLink(true);
      }
      setIsChecking(false);
    };
    
    checkLink();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('密码至少需要 6 位');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('两次密码不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const token = searchParams.get('token');
      
      // 先验证 token
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token || '',
        type: 'recovery',
      });
      
      if (verifyError) throw verifyError;

      // 更新密码
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('密码重置成功！');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重置失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <AppLogo size={64} />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">南雍待办</h1>
          <p className="text-muted-foreground mt-1">你的大学日程管理中枢</p>
        </div>

        {/* 主卡片 */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          {!isValidLink ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">无效的链接</h2>
              <p className="text-muted-foreground mt-2">
                重置链接无效或已过期，请重新申请重置密码。
              </p>
              <button
                onClick={() => router.push('/forgot-password')}
                className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                重新申请
              </button>
            </div>
          ) : success ? (
            <div className="text-center">
              <SuccessIllustration className="w-24 h-auto mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground">密码已重置！</h2>
              <p className="text-muted-foreground mt-2">
                你可以使用新密码登录了。
              </p>
              <button
                onClick={() => router.push('/login')}
                className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                立即登录
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground text-center mb-2">设置新密码</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                请输入你的新密码
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    新密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="至少 6 位字符"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
                >
                  {isSubmitting ? '重置中...' : '重置密码'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          想起密码了？
          <Link href="/login" className="text-primary hover:underline ml-1">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
