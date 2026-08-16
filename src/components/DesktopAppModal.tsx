import React, { useState, useEffect } from 'react';
import { 
  X, 
  Laptop, 
  Sparkles, 
  Monitor, 
  Apple, 
  HelpCircle,
  Globe,
  CheckCircle
} from 'lucide-react';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  // Detect user OS
  const [activeTab, setActiveTab] = useState<'windows' | 'mac'>('windows');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect Mac vs Windows
    const platform = (navigator.userAgent || navigator.platform || '').toLowerCase();
    if (platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad')) {
      setActiveTab('mac');
    } else {
      setActiveTab('windows');
    }

    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("💡 提示：您可以在当前 Chrome / Edge 浏览器的地址栏右侧，直接点击【在应用中打开】或【安装应用】图标（或在右上角三点菜单中选择「安装考研英语一真题刷题系统」），即可将本系统安装为流畅的桌面独立 App！");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Chrome / Edge 桌面应用程序 (PWA)
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30">
                  轻量丝滑 · 0卡顿
                </span>
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                基于 Chrome & Edge 官方应用标准，自由在浏览器标签与独立窗口间无缝切换
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OS Tabs */}
        <div className={`flex border-b px-6 pt-3 gap-2 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'}`}>
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x relative -mb-[1px] ${
              activeTab === 'windows'
                ? isDark
                  ? 'bg-slate-900 border-slate-700 text-indigo-400 border-b-transparent z-10'
                  : 'bg-white border-slate-200 text-indigo-600 border-b-transparent z-10 shadow-sm'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4 text-blue-500" />
            <span>Windows 系统 (Chrome / Edge)</span>
          </button>

          <button
            onClick={() => setActiveTab('mac')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x relative -mb-[1px] ${
              activeTab === 'mac'
                ? isDark
                  ? 'bg-slate-900 border-slate-700 text-indigo-400 border-b-transparent z-10'
                  : 'bg-white border-slate-200 text-indigo-600 border-b-transparent z-10 shadow-sm'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Apple className="w-4 h-4 text-purple-500" />
            <span>macOS 系统 (Chrome / Safari / Edge)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === 'windows' ? (
            <div className="space-y-4">
              {/* Windows Option: Official Chrome PWA */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-indigo-50/40 border-indigo-100'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                      Windows 推荐
                    </span>
                    <h4 className={`text-sm font-bold flex items-center gap-1.5 pt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span>在 Chrome / Edge 浏览器中一键安装为独立应用</span>
                    </h4>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      生成原生独立应用窗口，地址栏右侧带有「在应用中打开」图标，极致轻量无黑框，随开随关。
                    </p>
                  </div>
                  <button
                    onClick={handleInstallPWA}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>立即安装应用</span>
                  </button>
                </div>

                {/* Mock Address Bar Visual Guide */}
                <div className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between font-mono ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
                }`}>
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-300">http://localhost:8085</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 flex items-center gap-1">
                      <Laptop className="w-3 h-3" /> 在应用中打开
                    </span>
                    <span className="text-amber-500">★</span>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800 shadow-sm'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-indigo-600 dark:text-indigo-400">方式 1（最快捷）</b>：直接点击上方 <b>「立即安装应用」</b> 按钮；
                    </div>
                  </div>
                  <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800 shadow-sm'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-indigo-600 dark:text-indigo-400">方式 2</b>：在 Chrome / Edge 地址栏右侧点击 <b>「在应用中打开」</b> 或 <b>「安装」</b> 按钮；
                    </div>
                  </div>
                  <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800 shadow-sm'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-indigo-600 dark:text-indigo-400">方式 3</b>：点击浏览器右上角三点菜单 ➔ <b>「保存并分享」 ➔ 「安装考研英语一真题库」</b>。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mac Option 1: Chrome PWA on macOS */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-purple-50/50 border-purple-100'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wide">
                      macOS 推荐 · Chrome / Edge / Safari
                    </span>
                    <h4 className={`text-sm font-bold flex items-center gap-1.5 pt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span>一键安装为 macOS 原生独立桌面应用</span>
                    </h4>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      生成无边框极简独立窗口，直接常驻 Dock 程序坞，全屏分屏体验丝滑。
                    </p>
                  </div>
                  <button
                    onClick={handleInstallPWA}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>立即安装应用</span>
                  </button>
                </div>

                {/* Visual Guide for Mac Chrome / Safari */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-purple-100/80 text-slate-800 shadow-sm'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-purple-600 dark:text-purple-400">方式 1（最快捷）</b>：直接点击上方 <b>「立即安装应用」</b> 按钮，或在 Chrome 地址栏右侧点击 <b>「在应用中打开」/「安装」</b> 图标。
                    </div>
                  </div>

                  <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-purple-100/80 text-slate-800 shadow-sm'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-purple-600 dark:text-purple-400">方式 2（Chrome 菜单）</b>：点击 Chrome 右上角 <b>「⋮」 ➔ 「投放、保存和分享」 ➔ 「创建快捷方式...」</b>（勾选「在单独窗口中打开」）。
                    </div>
                  </div>

                  <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-purple-100/80 text-slate-800 shadow-sm'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-purple-600 dark:text-purple-400">方式 3（Safari 浏览器）</b>：在 Safari 顶部菜单栏点击 <b>「文件」 ➔ 「添加到程序坞 (Add to Dock...)」</b>。
                    </div>
                  </div>
                </div>
              </div>

              {/* Mac Local Python Command Box */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>💻 Mac 终端一键极速启动命令</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('python3 server.py');
                      alert('已复制启动命令: python3 server.py');
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded font-bold transition-all border ${
                      isDark 
                        ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border-indigo-500/30' 
                        : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200 shadow-xs'
                    }`}
                  >
                    点击复制命令
                  </button>
                </div>
                <div className="mt-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between shadow-inner">
                  <span className="font-semibold select-all">python3 server.py</span>
                  <span className="text-[10px] text-slate-400">（在离线包文件夹中执行）</span>
                </div>
              </div>
            </div>
          )}

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className={`p-3 rounded-xl border text-center ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="text-lg mb-1">⚡</div>
              <div className="text-xs font-bold">轻量极速</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Chrome 核心 0 卡顿</div>
            </div>
            <div className={`p-3 rounded-xl border text-center ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="text-lg mb-1">🖥️</div>
              <div className="text-xs font-bold">独立无边框</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>沉浸式专心刷题</div>
            </div>
            <div className={`p-3 rounded-xl border text-center ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="text-lg mb-1">🔄</div>
              <div className="text-xs font-bold">双模自由切换</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>浏览器与应用无缝流转</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-100 bg-slate-50/90'
        }`}>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>支持在 Chrome、Edge 与 Safari 中随心安装与打开</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
