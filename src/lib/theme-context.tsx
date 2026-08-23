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
  /** 当前风格选中的内置背景 id（可选） */
  backgroundId?: string;
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
  /** 内置背景图集（每个风格 3 张可选，用 CSS 渐变/图案模拟，离线可用） */
  backgrounds: { id: string; name: string; css: string }[];
}

export const colorSchemes: Record<ThemeColor, ColorSchemeInfo> = {
  'nanda-purple': { name: '南大紫', primary: '#4A1A6B', accent: '#7B3F9E', muted: '#EDE9FE' },
  'teal': { name: '青绿', primary: '#0D9488', accent: '#14B8A6', muted: '#CCFBF1' },
  'sky': { name: '天空蓝', primary: '#0284C7', accent: '#38BDF8', muted: '#E0F2FE' },
  'gold': { name: '金色', primary: '#D97706', accent: '#FBBF24', muted: '#FEF3C7' },
};

export const styleThemes: Record<ThemeStyle, StyleThemeInfo> = {
  'natural': {
    name: '自然',
    icon: '🌿',
    backgrounds: [
      { id: 'natural-forest', name: '森林晨雾', css: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 35%, #d1fae5 70%, #f7fee7 100%)' },
      { id: 'natural-ocean', name: '海风微光', css: 'linear-gradient(160deg, #ecfeff 0%, #cffafe 40%, #e0f2fe 75%, #f0f9ff 100%)' },
      { id: 'natural-sunset', name: '暖阳草甸', css: 'linear-gradient(150deg, #fffbeb 0%, #fef3c7 40%, #fce7f3 75%, #fdf2f8 100%)' },
    ],
  },
  'modern': {
    name: '现代',
    icon: '✨',
    backgrounds: [
      { id: 'modern-clean', name: '极简灰蓝', css: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' },
      { id: 'modern-grid', name: '网格蓝图', css: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' },
      { id: 'modern-aurora', name: '极光渐变', css: 'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 50%, #fce7f3 100%)' },
    ],
  },
  'nanda-fun': {
    name: '南哪',
    icon: '🏫',
    backgrounds: [
      { id: 'nanda-xianlin-square', name: '仙林二源广场', css: 'url(/themes/仙林校区二源广场.jpg)' },
      { id: 'nanda-xianlin-spring', name: '仙林春景', css: 'url(/themes/仙林校区春景.jpg)' },
      { id: 'nanda-gulou-tower', name: '鼓楼北大楼', css: 'url(/themes/鼓楼北大楼.jpg)' },
      { id: 'nanda-gulou-spring', name: '鼓楼春景', css: 'url(/themes/鼓楼校区春景.jpg)' },
      { id: 'nanda-gulou-gate', name: '鼓楼校门', css: 'url(/themes/鼓楼校门.jpg)' },
      { id: 'nanda-suzhou-swan', name: '苏州天鹅', css: 'url(/themes/苏州天鹅.jpg)' },
      { id: 'nanda-suzhou-view', name: '苏州景色', css: 'url(/themes/苏州景色.jpg)' },
      { id: 'nanda-suzhou-cat', name: '苏州猫咪', css: 'url(/themes/苏州猫咪.jpg)' },
    ],
  },
  'custom': {
    name: '自定义',
    icon: '🎨',
    backgrounds: [],
  },
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
  backgroundId: string | undefined;
  setColorScheme: (color: ThemeColor) => void;
  setStyleTheme: (style: ThemeStyle) => void;
  setCustomBackground: (bg: string | null) => void;
  setBlurLevel: (blur: number) => void;
  setThemeColor: (color: ThemeColor) => void;
  setThemeStyle: (style: ThemeStyle) => void;
  setCustomBlur: (blur: number) => void;
  setCustomOverlay: (overlay: number) => void;
  setBackgroundId: (id: string | null) => void;
  /** 原子化设置自定义背景（同时设置背景图和风格，避免状态覆盖） */
  applyCustomBackground: (bg: string) => void;
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
    
    // 内置背景选择：自然/现代/南哪 风格下，若选中某张内置背景，覆盖 body::before 的渐变
    if (theme.style !== 'custom') {
      const styleInfo = styleThemes[theme.style];
      const selected = styleInfo?.backgrounds?.find(b => b.id === theme.backgroundId);
      if (selected) {
        let bgEl = document.getElementById('builtin-bg-layer');
        if (!bgEl) {
          bgEl = document.createElement('div');
          bgEl.id = 'builtin-bg-layer';
          // z-index -1 与 body::before 同层；由于是后插入的固定定位元素，会覆盖默认渐变
          bgEl.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;';
          document.body.insertBefore(bgEl, document.body.firstChild);
        }
        bgEl.style.backgroundImage = selected.css;
        // 图片背景（url）加白色半透明遮罩，保证文字可读性
        if (selected.css.startsWith('url(')) {
          let overlayEl = document.getElementById('builtin-bg-overlay');
          if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.id = 'builtin-bg-overlay';
            overlayEl.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;background:rgba(255,255,255,0.55);';
            if (bgEl.nextSibling) bgEl.parentNode?.insertBefore(overlayEl, bgEl.nextSibling);
            else bgEl.parentNode?.appendChild(overlayEl);
          }
        } else {
          const overlayEl = document.getElementById('builtin-bg-overlay');
          if (overlayEl) overlayEl.remove();
        }
      } else {
        const bgEl = document.getElementById('builtin-bg-layer');
        if (bgEl) bgEl.remove();
        const overlayEl = document.getElementById('builtin-bg-overlay');
        if (overlayEl) overlayEl.remove();
      }
    } else {
      const bgEl = document.getElementById('builtin-bg-layer');
      if (bgEl) bgEl.remove();
      const overlayEl = document.getElementById('builtin-bg-overlay');
      if (overlayEl) overlayEl.remove();
    }
    
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
    // 切换风格时：如果不是 custom，清掉 customBackground；保留 backgroundId 由 UI 选择
    if (style !== 'custom') {
      const { customBackground: _, ...rest } = theme;
      saveTheme({ ...rest, style, backgroundId: theme.backgroundId || undefined } as ThemeConfig);
    } else {
      saveTheme({ ...theme, style });
    }
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

  // 选择内置背景（自然/现代/南哪 风格下）
  const setBackgroundId = useCallback((id: string | null) => {
    if (id === null) {
      const { backgroundId: _, ...rest } = theme;
      saveTheme(rest as ThemeConfig);
    } else {
      saveTheme({ ...theme, backgroundId: id });
    }
  }, [theme, saveTheme]);

  // 原子化设置自定义背景：一次更新避免 setCustomBackground + setStyleTheme 互相覆盖
  const applyCustomBackground = useCallback((bg: string) => {
    const { backgroundId: _, ...rest } = theme;
    saveTheme({ ...rest, customBackground: bg, style: 'custom' } as ThemeConfig);
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
    backgroundId: theme.backgroundId,
    setColorScheme,
    setStyleTheme,
    setCustomBackground,
    setBlurLevel,
    setThemeColor,
    setThemeStyle,
    setCustomBlur,
    setCustomOverlay,
    setBackgroundId,
    applyCustomBackground,
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
