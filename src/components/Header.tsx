import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  Database, 
  Brain, 
  BarChart3, 
  Laptop, 
  Sparkles, 
  BookOpen, 
  FileText, 
  Layers, 
  ChevronDown,
  Check,
  Bookmark,
  Target,
  Type,
  Home
} from 'lucide-react';
import { FontSizeLevel, FONT_SIZE_CONFIGS } from '../utils/fontSize';

export type AppTab = 
  | 'home'
  | 'reading' 
  | 'quiz' 
  | 'paraphrase' 
  | 'translation' 
  | 'sentence-review' 
  | 'essay' 
  | 'grammar' 
  | 'phrases' 
  | 'vocab' 
  | 'personal';

interface HeaderProps {
  onGoHome: () => void;
  currentYear?: number | string | null;
  currentTab?: AppTab;
  onSelectTab?: (tab: AppTab) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenDataBackup?: () => void;
  onOpenEbbinghaus?: () => void;
  onOpenProgress?: () => void;
  onOpenDesktopApp?: () => void;
  onOpenAiConfig?: () => void;
  dueReviewCount?: number;
  fontSizeLevel?: FontSizeLevel;
  onSetFontSize?: (level: FontSizeLevel) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onGoHome, 
  currentYear,
  currentTab = 'reading',
  onSelectTab,
  theme = 'dark',
  onToggleTheme,
  onOpenDataBackup,
  onOpenEbbinghaus,
  onOpenProgress,
  onOpenDesktopApp,
  onOpenAiConfig,
  dueReviewCount = 0,
  fontSizeLevel = 'base',
  onSetFontSize,
}) => {
  const isDark = theme === 'dark';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isAiConfigured, setIsAiConfigured] = useState<boolean>(false);
  
  // Dropdown states
  const [isPracticeDropdownOpen, setIsPracticeDropdownOpen] = useState<boolean>(false);
  const [isVocabDropdownOpen, setIsVocabDropdownOpen] = useState<boolean>(false);
  const practiceDropdownRef = useRef<HTMLDivElement>(null);
  const vocabDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (practiceDropdownRef.current && !practiceDropdownRef.current.contains(event.target as Node)) {
        setIsPracticeDropdownOpen(false);
      }
      if (vocabDropdownRef.current && !vocabDropdownRef.current.contains(event.target as Node)) {
        setIsVocabDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kaoyan_ai_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        setIsAiConfigured(Boolean(parsed.provider === 'ollama' || (parsed.apiKey && parsed.apiKey.length > 5)));
      } else {
        setIsAiConfigured(false);
      }
    } catch {
      setIsAiConfigured(false);
    }
  }, []);

  useEffect(() => {
    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleTabClick = (tab: AppTab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    setIsPracticeDropdownOpen(false);
    setIsVocabDropdownOpen(false);
  };

  const isPracticeActive = 
    currentTab === 'quiz' || 
    currentTab === 'paraphrase' || 
    currentTab === 'translation' || 
    currentTab === 'sentence-review' || 
    currentTab === 'essay';

  const isVocabGrammarActive = 
    currentTab === 'grammar' || 
    currentTab === 'phrases' || 
    currentTab === 'vocab';

  return (
    <header className={`${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'} border-b sticky top-0 z-40 shadow-sm transition-colors duration-200`}>
      <div className="w-full px-3 sm:px-4 md:px-6 h-14 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 text-base sm:text-xl font-extrabold text-blue-600 hover:opacity-90 transition-all group shrink-0 cursor-pointer"
            title="点击返回网站首页"
          >
            <img 
              src="./icons/favicon.svg" 
              alt="Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm object-contain group-hover:scale-105 transition-transform" 
            />
            <span className={`tracking-tight font-black flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              真题库 <span className={`text-xs font-normal ${isDark ? 'text-slate-400 border-slate-700' : 'text-gray-400 border-gray-300'} border-l pl-2 ml-1.5 hidden xs:inline`}>考研英语一</span>
            </span>
          </button>

          {/* Navigation Tabs */}
          {onSelectTab && (
            <nav className="flex items-center gap-1 sm:gap-1.5 text-xs font-medium">
              {/* Tab 0: 首页 */}
              <button
                type="button"
                onClick={() => handleTabClick('home')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  currentTab === 'home'
                    ? isDark
                      ? 'bg-blue-950/90 text-blue-300 border border-blue-700/80 shadow-xs'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-blue-500" />
                <span>首页</span>
              </button>

              {/* Tab 1: 长难句精读 */}
              <button
                type="button"
                onClick={() => handleTabClick('reading')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  currentTab === 'reading'
                    ? isDark
                      ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 shadow-xs'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>精读</span>
              </button>

              {/* Tab 2: 练习 (Dropdown) */}
              <div className="relative" ref={practiceDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPracticeDropdownOpen(!isPracticeDropdownOpen);
                    setIsVocabDropdownOpen(false);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                    isPracticeActive
                      ? isDark
                        ? 'bg-blue-950/90 text-blue-300 border border-blue-700/80 shadow-xs'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 text-blue-500" />
                  <span>练习</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {isPracticeDropdownOpen && (
                  <div className={`absolute left-0 top-full mt-1.5 w-52 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
                  }`}>
                    {/* 1. 全真真题卷 */}
                    <button
                      type="button"
                      onClick={() => handleTabClick('quiz')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'quiz'
                          ? 'bg-blue-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📝</span>
                        <span>全真真题卷 (模考)</span>
                      </div>
                      {currentTab === 'quiz' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* 2. 同义替换 */}
                    <button
                      type="button"
                      onClick={() => handleTabClick('paraphrase')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'paraphrase'
                          ? 'bg-blue-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🎯</span>
                        <span>同义替换专练 (200题)</span>
                      </div>
                      {currentTab === 'paraphrase' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* 3. 翻译真题 */}
                    <button
                      type="button"
                      onClick={() => handleTabClick('translation')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'translation'
                          ? 'bg-blue-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🌐</span>
                        <span>翻译真题 (Part C + AI点评)</span>
                      </div>
                      {currentTab === 'translation' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* 4. 长难句复习 */}
                    <button
                      type="button"
                      onClick={() => handleTabClick('sentence-review')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'sentence-review'
                          ? 'bg-blue-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>⚡</span>
                        <span>长难句复习 (随机抽句)</span>
                      </div>
                      {currentTab === 'sentence-review' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* 5. 作文批改 */}
                    <button
                      type="button"
                      onClick={() => handleTabClick('essay')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'essay'
                          ? 'bg-blue-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>✍️</span>
                        <span>作文批改 (Part A/B + AI批阅)</span>
                      </div>
                      {currentTab === 'essay' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Tab 3: 词汇语法 (Dropdown) */}
              <div className="relative" ref={vocabDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsVocabDropdownOpen(!isVocabDropdownOpen);
                    setIsPracticeDropdownOpen(false);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                    isVocabGrammarActive
                      ? isDark
                        ? 'bg-teal-950/90 text-teal-300 border border-teal-700/80 shadow-xs'
                        : 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-teal-500" />
                  <span>词汇语法</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {isVocabDropdownOpen && (
                  <div className={`absolute left-0 top-full mt-1.5 w-52 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
                  }`}>
                    <button
                      type="button"
                      onClick={() => handleTabClick('grammar')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'grammar'
                          ? 'bg-teal-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📐</span>
                        <span>语法点专练 (2009句)</span>
                      </div>
                      {currentTab === 'grammar' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabClick('phrases')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'phrases'
                          ? 'bg-teal-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📚</span>
                        <span>高频词组默写 (2540条)</span>
                      </div>
                      {currentTab === 'phrases' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabClick('vocab')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentTab === 'vocab'
                          ? 'bg-teal-600 text-white font-bold'
                          : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📊</span>
                        <span>历年真题词汇统计 (3149词)</span>
                      </div>
                      {currentTab === 'vocab' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Tab 4: 个人中心 */}
              <button
                type="button"
                onClick={() => handleTabClick('personal')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                  currentTab === 'personal'
                    ? isDark
                      ? 'bg-purple-950/90 text-purple-300 border border-purple-700/80 shadow-xs'
                      : 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline">复习中心</span>
                <span className="sm:hidden">复习</span>
              </button>
            </nav>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* AI Settings Button */}
          {onOpenAiConfig && (
            <button
              onClick={onOpenAiConfig}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-xs ${
                isDark
                  ? 'bg-slate-850 hover:bg-slate-800 text-teal-300 border-teal-800/80 hover:border-teal-600'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200'
              }`}
              title="AI 批阅与大模型 API 配置中心"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="hidden lg:inline">AI批阅</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isAiConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </button>
          )}

          {/* Ebbinghaus Vocabulary Notebook & Review Button */}
          {onOpenEbbinghaus && (
            <button
              onClick={onOpenEbbinghaus}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border relative ${
                isDark
                  ? 'bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border-indigo-800/80 shadow-sm'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
              title="艾宾浩斯抗遗忘背词"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden lg:inline">背词</span>
              {dueReviewCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {dueReviewCount}
                </span>
              )}
            </button>
          )}

          {/* Study Progress Dashboard Button */}
          {onOpenProgress && (
            <button
              onClick={onOpenProgress}
              className={`hidden md:flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
              title="查看真题刷题进度档案"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden xl:inline">刷题进度</span>
            </button>
          )}

          {/* Data Backup / Import & Export Button */}
          {onOpenDataBackup && (
            <button
              onClick={onOpenDataBackup}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700 shadow-sm'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
              title="学习数据导入与导出备份"
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">备份</span>
            </button>
          )}

          {/* Font Size Adjuster (A- / A+) - 真题卷经典风格 */}
          {onSetFontSize && (
            <div 
              className={`flex items-center p-0.5 rounded-lg border text-xs font-bold transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-700'
              }`} 
              title={`当前正文字号：${fontSizeLevel.toUpperCase()}，点击 A- / A+ 调节`}
            >
              <button
                type="button"
                onClick={() => {
                  if (fontSizeLevel === 'xl') onSetFontSize('lg');
                  else if (fontSizeLevel === 'lg') onSetFontSize('base');
                  else if (fontSizeLevel === 'base') onSetFontSize('sm');
                }}
                disabled={fontSizeLevel === 'sm'}
                className="px-1.5 py-1 rounded hover:bg-slate-700/50 disabled:opacity-40 cursor-pointer"
                title="缩小字号 (A-)"
              >
                A-
              </button>
              <span className="text-[10px] px-1 font-mono">{fontSizeLevel.toUpperCase()}</span>
              <button
                type="button"
                onClick={() => {
                  if (fontSizeLevel === 'sm') onSetFontSize('base');
                  else if (fontSizeLevel === 'base') onSetFontSize('lg');
                  else if (fontSizeLevel === 'lg') onSetFontSize('xl');
                }}
                disabled={fontSizeLevel === 'xl'}
                className="px-1.5 py-1 rounded hover:bg-slate-700/50 disabled:opacity-40 cursor-pointer"
                title="放大字号 (A+)"
              >
                A+
              </button>
            </div>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-slate-700 border-gray-200'
              }`}
              title={isDark ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
