'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLogo, SuccessIllustration } from '@/components/illustrations';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // 本地版无需邮箱验证，直接标记成功
    const t = setTimeout(() => {
      setStatus('success');
    }, 1200);
    return () => clearTimeout(t);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <AppLogo size={64} />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">南雍待办</h1>
          <p className="text-muted-foreground mt-1">你的大学日程管理中枢</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">正在验证邮箱...</h2>
              <p className="text-muted-foreground mt-2">请稍候</p>
            </>
          )}

          {status === 'success' && (
            <>
              <SuccessIllustration className="w-24 h-auto mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground">邮箱验证成功！</h2>
              <p className="text-muted-foreground mt-2">
                你的账号已激活，现在可以登录使用南雍待办了。
              </p>
              <button
                onClick={() => router.push('/login')}
                className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                立即登录
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">验证失败</h2>
              <p className="text-muted-foreground mt-2">{errorMsg}</p>
              <p className="text-sm text-muted-foreground mt-4">
                链接可能已过期，请尝试重新注册。
              </p>
              <button
                onClick={() => router.push('/register')}
                className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                重新注册
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/login" className="text-primary hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
