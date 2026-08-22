'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type ThemeColor = 'nanda-purple' | 'teal' | 'sky' | 'gold';
export type ThemeStyle = 'natural' | 'modern' | 'nanda-fun' | 'custom';

export interface ThemeConfig {
  color: ThemeColor;
  style: ThemeStyle;
  customBackground?: string;
  customBlur: number;
  customOverlay: number;
}

export interface ColorSchemeInfo {
  name: string;
  primary: string;
  accent: string;
  muted: string;
}

export interface StyleThemeInfo {
  name: string;
  icon: string;
}

export const colorSchemes: Record<ThemeColor, ColorSchemeInfo> = {
  'nanda-purple': { name: '南大紫', primary: '#4A1A6B', accent: '#7B3F9E', muted: '#EDE9FE' },
  'teal': { name: '青绿', primary: '#0D9488', accent: '#14B8A6', muted: '#CCFBF1' },
  'sky': { name: '天空蓝', primary: '#0284C7', accent: '#38BDF8', muted: '#E0F2FE' },
  'gold': { name: '金色', primary: '#D97706', accent: '#FBBF24', muted: '#FEF3C7' },
};

export const styleThemes: Record<ThemeStyle, StyleThemeInfo> = {
  'natural': { name: '自然', icon: '🌿' },
  'modern': { name: '现代', icon: '✨' },
  'nanda-fun': { name: '南哪', icon: '🏫' },
  'custom': { name: '自定义', icon: '🎨' },
};

const defaultConfig: ThemeConfig = {
  color: 'nanda-purple',
  style: 'natural',
  customBlur: 10,
  customOverlay: 0.6,
};

interface ThemeContextType {
  theme: ThemeConfig;
  colorScheme: ThemeColor;
  styleTheme: ThemeStyle;
  customBackground: string | undefined;
  blurLevel: number;
  setColorScheme: (color: ThemeColor) => void;
  setStyleTheme: (style: ThemeStyle) => void;
  setCustomBackground: (bg: string | null) => void;
  setBlurLevel: (blur: number) => void;
  setThemeColor: (color: ThemeColor) => void;
  setThemeStyle: (style: ThemeStyle) => void;
  setCustomBlur: (blur: number) => void;
  setCustomOverlay: (overlay: number) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'nanyong-todo-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultConfig);

  // 从 localStorage 加载主题
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTheme({ ...defaultConfig, ...JSON.parse(saved) });
      }
    } catch {
      // 忽略读取错误
    }
  }, []);

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // 设置颜色主题
    root.setAttribute('data-theme', theme.color);
    
    // 设置风格主题
    root.setAttribute('data-style', theme.style);
    
    // 自定义背景
    if (theme.style === 'custom' && theme.customBackground) {
      // 背景图片层
      let bgEl = document.getElementById('custom-bg-layer');
      if (!bgEl) {
        bgEl = document.createElement('div');
        bgEl.id = 'custom-bg-layer';
        bgEl.className = 'custom-bg';
        document.body.insertBefore(bgEl, document.body.firstChild);
      }
      bgEl.style.backgroundImage = `url(${theme.customBackground})`;
      bgEl.style.setProperty('--custom-bg-blur', `${theme.customBlur}px`);
      
      // 遮罩层
      let overlayEl = document.getElementById('custom-bg-overlay');
      if (!overlayEl) {
        overlayEl = document.createElement('div');
        overlayEl.id = 'custom-bg-overlay';
        overlayEl.className = 'custom-bg-overlay';
        bgEl.after(overlayEl);
      }
      overlayEl.style.setProperty('--custom-bg-overlay', String(theme.customOverlay));
    } else {
      const bgEl = document.getElementById('custom-bg-layer');
      const overlayEl = document.getElementById('custom-bg-overlay');
      if (bgEl) bgEl.remove();
      if (overlayEl) overlayEl.remove();
    }
  }, [theme]);

  const saveTheme = useCallback((newTheme: ThemeConfig) => {
    setTheme(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTheme));
    } catch {
      // 忽略保存错误
    }
  }, []);

  const setThemeColor = useCallback((color: ThemeColor) => {
    saveTheme({ ...theme, color });
  }, [theme, saveTheme]);

  const setColorScheme = setThemeColor;

  const setThemeStyle = useCallback((style: ThemeStyle) => {
    saveTheme({ ...theme, style });
  }, [theme, saveTheme]);

  const setStyleTheme = setThemeStyle;

  const setCustomBackground = useCallback((bg: string | null) => {
    if (bg === null) {
      const { customBackground: _, ...rest } = theme;
      saveTheme(rest as ThemeConfig);
    } else {
      saveTheme({ ...theme, customBackground: bg });
    }
  }, [theme, saveTheme]);

  const setCustomBlur = useCallback((blur: number) => {
    saveTheme({ ...theme, customBlur: blur });
  }, [theme, saveTheme]);

  const setBlurLevel = setCustomBlur;

  const setCustomOverlay = useCallback((overlay: number) => {
    saveTheme({ ...theme, customOverlay: overlay });
  }, [theme, saveTheme]);

  const resetTheme = useCallback(() => {
    saveTheme(defaultConfig);
  }, [saveTheme]);

  const value: ThemeContextType = {
    theme,
    colorScheme: theme.color,
    styleTheme: theme.style,
    customBackground: theme.customBackground,
    blurLevel: theme.customBlur,
    setColorScheme,
    setStyleTheme,
    setCustomBackground,
    setBlurLevel,
    setThemeColor,
    setThemeStyle,
    setCustomBlur,
    setCustomOverlay,
    resetTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 中使用');
  }
  return context;
}
