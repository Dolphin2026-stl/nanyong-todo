'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshSession = useCallback(async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      
      setState({
        user: session?.user || null,
        session,
        isLoading: false,
        isAuthenticated: !!session,
      });
      
      return session;
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        
        // 获取当前会话
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setState({
            user: session?.user || null,
            session,
            isLoading: false,
            isAuthenticated: !!session,
          });
        }
        
        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (mounted) {
            setState({
              user: newSession?.user || null,
              session: newSession,
              isLoading: false,
              isAuthenticated: !!newSession,
            });
          }
        });
        
        return () => {
          subscription.unsubscribe();
        };
      } catch {
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    }
    
    init();
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) throw error;
    
    // 立即更新状态
    if (data.session) {
      setState({
        user: data.session.user,
        session: data.session,
        isLoading: false,
        isAuthenticated: true,
      });
    }
    
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname || email.split('@')[0],
        },
      },
    });
    
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    
    if (error) throw error;
  }, []);

  const getAccessToken = useCallback(async () => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const updateProfile = useCallback(async (data: { nickname?: string; school?: string }) => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { data: userData, error } = await supabase.auth.updateUser({
      data,
    });
    
    if (error) throw error;
    
    // 同步更新 user_profiles 表
    if (userData.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userData.user.id,
          nickname: data.nickname || null,
          school: data.school || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (profileError) throw profileError;
    }
    
    // 更新本地状态
    setState(prev => ({
      ...prev,
      user: userData.user,
    }));
    
    return userData;
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
