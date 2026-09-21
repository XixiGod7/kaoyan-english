/**
 * Global Font Size management utility
 */

export type FontSizeLevel = 'sm' | 'base' | 'lg' | 'xl';

export interface FontSizeConfig {
  level: FontSizeLevel;
  label: string;
  name: string;
  // Tailwind text classes for various contexts
  passageText: string;
  passageLead: string;
  transText: string;
  quizTitle: string;
  quizOption: string;
}

export const FONT_SIZE_CONFIGS: Record<FontSizeLevel, FontSizeConfig> = {
  sm: {
    level: 'sm',
    label: 'SM',
    name: '标准 (小)',
    passageText: 'text-base sm:text-lg leading-relaxed',
    passageLead: 'text-sm',
    transText: 'text-sm sm:text-base',
    quizTitle: 'text-base sm:text-lg',
    quizOption: 'text-sm sm:text-base',
  },
  base: {
    level: 'base',
    label: 'BASE',
    name: '适中 (中)',
    passageText: 'text-base sm:text-lg leading-relaxed',
    passageLead: 'text-base',
    transText: 'text-sm sm:text-base',
    quizTitle: 'text-base sm:text-lg',
    quizOption: 'text-sm sm:text-base',
  },
  lg: {
    level: 'lg',
    label: 'LG',
    name: '清晰 (大)',
    passageText: 'text-base sm:text-lg leading-relaxed',
    passageLead: 'text-base',
    transText: 'text-sm sm:text-base',
    quizTitle: 'text-base sm:text-lg',
    quizOption: 'text-sm sm:text-base',
  },
  xl: {
    level: 'xl',
    label: 'XL',
    name: '特大 (超大)',
    passageText: 'text-base sm:text-lg leading-relaxed',
    passageLead: 'text-base',
    transText: 'text-sm sm:text-base',
    quizTitle: 'text-base sm:text-lg',
    quizOption: 'text-sm sm:text-base',
  },
};

const STORAGE_KEY = 'kaoyan_font_size';
const EVENT_NAME = 'kaoyan_font_size_changed';

export function getGlobalFontSize(): FontSizeLevel {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as FontSizeLevel;
    if (saved && FONT_SIZE_CONFIGS[saved]) {
      return saved;
    }
  } catch (e) {
    console.error('Failed to read font size from localStorage:', e);
  }
  return 'base';
}

export function setGlobalFontSize(level: FontSizeLevel): void {
  try {
    localStorage.setItem(STORAGE_KEY, level);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', level);
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: level }));
  } catch (e) {
    console.error('Failed to save font size to localStorage:', e);
  }
}

// Auto-initialize html attribute on import
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-font-size', getGlobalFontSize());
}

export function subscribeFontSizeChange(callback: (level: FontSizeLevel) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<FontSizeLevel>;
    if (custom.detail && FONT_SIZE_CONFIGS[custom.detail]) {
      callback(custom.detail);
    }
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
