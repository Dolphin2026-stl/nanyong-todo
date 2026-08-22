'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useAppToast } from '@/lib/toast-provider';
import { AppLogo } from '@/components/illustrations';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  const { resetPassword } = useAuth();
  const toast = useAppToast();
  const { isLoading: configLoading } = useSupabaseConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('请输入邮箱地址');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setIsSent(true);
      toast.success('重置密码邮件已发送，请查收');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '发送失败';
      toast.error(message);
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
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Logo 和标题 */}
          <div className="flex flex-col items-center mb-6">
            <AppLogo size={48} className="mb-2" />
            <h1 className="text-xl font-bold text-foreground">找回密码</h1>
            <p className="text-sm text-muted-foreground mt-1">
              输入你的邮箱，我们将发送重置链接
            </p>
          </div>

          {isSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">邮件已发送</h3>
              <p className="text-sm text-muted-foreground mb-6">
                我们已向 <span className="font-medium text-foreground">{email}</span> 发送了重置密码邮件，
                请查收并点击链接重置密码。
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                返回登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="请输入注册时使用的邮箱"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? '发送中...' : '发送重置邮件'}
              </button>
            </form>
          )}

          {/* 返回登录 */}
          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-primary font-medium hover:underline">
              ← 返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
