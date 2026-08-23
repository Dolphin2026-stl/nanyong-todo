'use client';

import { createContext, useContext, ReactNode } from 'react';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface SupabaseConfigContextType {
  config: SupabaseConfig | null;
  isLoading: boolean;
  error: Error | null;
}

// 本地版：直接提供占位配置，不请求网络
const SupabaseConfigContext = createContext<SupabaseConfigContextType>({
  config: { url: 'local', anonKey: 'local' },
  isLoading: false,
  error: null,
});

export function SupabaseConfigProvider({ children }: { children: ReactNode }) {
  return (
    <SupabaseConfigContext.Provider value={{ config: { url: 'local', anonKey: 'local' }, isLoading: false, error: null }}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}

export function useSupabaseConfig() {
  return useContext(SupabaseConfigContext);
}

// 本地版：无需初始化，直接返回 null
export function SupabaseConfigInject() {
  return null;
}
