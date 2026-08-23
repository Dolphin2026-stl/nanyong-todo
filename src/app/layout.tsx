import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-context';
import { AppProvider } from '@/lib/app-context';
import { ToastProvider } from '@/lib/toast-provider';

export const metadata: Metadata = {
  title: {
    default: '南雍待办 - 你的大学日程管理中枢',
    template: '%s | 南雍待办',
  },
  description:
    '南雍待办是面向大学生的智能日程管理工具，支持问卷式任务导入、AI 智能解析、多视图看板、日历导出等功能。',
  keywords: [
    '南雍待办',
    '大学日程',
    '待办事项',
    '任务管理',
    'AI 日程',
    '学生工具',
  ],
  authors: [{ name: 'NanyongToDo Team' }],
  generator: 'NanyongToDo',
  openGraph: {
    title: '南雍待办 - 你的大学日程管理中枢',
    description: '智能待办，轻松管理你的大学生活',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased`}>
        <ThemeProvider>
          <AppProvider>
            <ToastProvider>
              {isDev && <Inspector />}
              {children}
            </ToastProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
