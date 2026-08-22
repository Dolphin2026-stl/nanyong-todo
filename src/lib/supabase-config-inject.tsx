'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface SupabaseConfigContextType {
  config: SupabaseConfig | null;
  isLoading: boolean;
  error: Error | null;
}

const SupabaseConfigContext = createContext<SupabaseConfigContextType>({
  config: null,
  isLoading: true,
  error: null,
});

export function SupabaseConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SupabaseConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      try {
        const res = await fetch('/api/supabase-config');
        if (!res.ok) throw new Error('获取配置失败');
        const data = await res.json();
        if (mounted) {
          setConfig(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchConfig();
    return () => { mounted = false; };
  }, []);

  return (
    <SupabaseConfigContext.Provider value={{ config, isLoading, error }}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}

export function useSupabaseConfig() {
  return useContext(SupabaseConfigContext);
}

// 服务端预取配置，客户端初始化 Supabase 浏览器客户端
export function SupabaseConfigInject() {
  const { config } = useSupabaseConfig();
  
  // 当配置加载后，初始化浏览器客户端（通过设置全局变量）
  useEffect(() => {
    if (config) {
      // 预取配置，触发浏览器客户端初始化
      import('./supabase-browser').then(mod => {
        mod.getSupabaseBrowserClientWithRetry().catch(() => {
          // 静默失败，后续调用会重试
        });
      });
    }
  }, [config]);
  
  return null;
}
