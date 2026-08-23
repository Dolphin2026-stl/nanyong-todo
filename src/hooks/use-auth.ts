'use client';

import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'nanyong-todo-token';

interface LocalUser {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  school: string | null;
  created_at: string;
}

interface AuthState {
  user: LocalUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function fetchUser(token: string): Promise<LocalUser | null> {
  try {
    const res = await fetch('/api/local-auth/me', {
      headers: { 'x-session': token },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshSession = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return null;
      }
      const user = await fetchUser(token);
      setState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
      });
      return user;
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const token = getStoredToken();
      if (!token) {
        if (mounted) setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await fetchUser(token);
      if (mounted) {
        setState({
          user,
          isLoading: false,
          isAuthenticated: !!user,
        });
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/local-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '登录失败');
    }
    storeToken(data.session.access_token);
    setState({
      user: data.user,
      isLoading: false,
      isAuthenticated: true,
    });
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    const res = await fetch('/api/local-auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '注册失败');
    }
    storeToken(data.session.access_token);
    setState({
      user: data.user,
      isLoading: false,
      isAuthenticated: true,
    });
    return data;
  }, []);

  const signOut = useCallback(async () => {
    storeToken(null);
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // 本地版不发送邮件，提示用户联系管理员或直接重设
    throw new Error('本地版暂不支持密码找回，请直接在数据文件中重置');
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return getStoredToken();
  }, []);

  const updateProfile = useCallback(async (data: { nickname?: string; school?: string }) => {
    const token = getStoredToken();
    if (!token) throw new Error('未登录');
    const res = await fetch('/api/local-auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-session': token },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || '更新资料失败');
    setState(prev => ({
      ...prev,
      user: result.user,
    }));
    return result;
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
    getAccessToken,
    updateProfile,
  };
}
