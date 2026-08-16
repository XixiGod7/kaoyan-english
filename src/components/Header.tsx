import React, { useState, useEffect } from 'react';
import { Sun, Moon, Database, Brain, BarChart3, Laptop } from 'lucide-react';

interface HeaderProps {
  onGoHome: () => void;
  currentYear?: number | string | null;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenDataBackup?: () => void;
  onOpenEbbinghaus?: () => void;
  onOpenProgress?: () => void;
  onOpenDesktopApp?: () => void;
  dueReviewCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onGoHome, 
  currentYear,
  theme = 'dark',
  onToggleTheme,
  onOpenDataBackup,
  onOpenEbbinghaus,
  onOpenProgress,
  onOpenDesktopApp,
  dueReviewCount = 0,
}) => {
  const isDark = theme === 'dark';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

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

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("💡 提示：您可以在 Chrome/Edge 浏览器地址栏右侧点击【安装应用】或【在应用中打开】图标（或在桌面双击《考研英语真题刷题系统》快捷方式），即可随时以极简无边框的独立桌面应用模式运行！");
    }
  };

  return (
    <header className={`${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'} border-b sticky top-0 z-40 shadow-sm transition-colors duration-200`}>
      <div className="w-full px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 text-xl font-extrabold text-blue-600 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow">
              库
            </div>
            <span className={`tracking-tight font-black text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              真题库 <span className={`text-xs font-normal ${isDark ? 'text-slate-400 border-slate-700' : 'text-gray-400 border-gray-300'} border-l pl-2 ml-1`}>考研英语一</span>
            </span>
          </button>

          {/* Feature Pills */}
          <div className="hidden md:flex items-center gap-5 text-xs font-medium">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/60' : 'bg-blue-50/80 text-blue-700 border-blue-100'}`}>
              <span>👁️</span> 可视化学习，效率翻倍
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isDark ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60' : 'bg-indigo-50/80 text-indigo-700 border-indigo-100'}`}>
              <span>㗊</span> 高频词汇一目了然
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50/80 text-emerald-700 border-emerald-100'}`}>
              <span>📋</span> AI批阅作文翻译
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Ebbinghaus Vocabulary Notebook & Review Button */}
          {onOpenEbbinghaus && (
            <button
              onClick={onOpenEbbinghaus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border relative ${
                isDark
                  ? 'bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border-indigo-800/80 shadow-sm'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
              title="艾宾浩斯遗忘曲线单词本与每日背词复习"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>单词复习</span>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
              title="查看真题刷题进度档案"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>学习进度</span>
            </button>
          )}

          {/* Data Backup / Import & Export Button */}
          {onOpenDataBackup && (
            <button
              onClick={onOpenDataBackup}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700 shadow-sm'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
              title="学习数据导入与导出备份"
            >
              <Database className="w-3.5 h-3.5" />
              <span>数据备份</span>
            </button>
          )}

          {/* Standalone Desktop App / Install PWA Button */}
          {onOpenDesktopApp && (
            <button
              onClick={onOpenDesktopApp}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDark
                  ? 'bg-purple-950/70 hover:bg-purple-900 text-purple-300 border-purple-800/80 shadow-sm'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
              }`}
              title="生成 Windows / Mac 桌面独立应用程序或在应用中打开"
            >
              <Laptop className="w-3.5 h-3.5 text-purple-400" />
              <span>桌面应用</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-slate-700 border-gray-200'
              }`}
              title={isDark ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>浅色模式</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>深色模式</span>
                </>
              )}
            </button>
          )}

          {currentYear && (
            <button
              onClick={onGoHome}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              ← 返回真题矩阵
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

