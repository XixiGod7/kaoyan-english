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
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                Chrome / Edge 桌面应用程序 (PWA)
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  轻量丝滑 · 0卡顿
                </span>
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                基于 Chrome & Edge 官方应用标准，自由在浏览器标签与独立窗口间无缝切换
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OS Tabs */}
        <div className={`flex border-b px-6 pt-3 gap-2 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-gray-100 bg-gray-50/40'}`}>
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x relative -mb-[1px] ${
              activeTab === 'windows'
                ? isDark
                  ? 'bg-slate-900 border-slate-700 text-indigo-400 border-b-transparent z-10'
                  : 'bg-white border-gray-200 text-indigo-600 border-b-transparent z-10 shadow-sm'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-gray-500 hover:text-gray-900'
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
                  : 'bg-white border-gray-200 text-indigo-600 border-b-transparent z-10 shadow-sm'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Apple className="w-4 h-4 text-purple-400" />
            <span>macOS 系统 (Chrome / Safari / Edge)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === 'windows' ? (
            <div className="space-y-4">
              {/* Windows Option: Official Chrome PWA */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-blue-50/40 border-blue-100'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase tracking-wide">
                      Windows 推荐
                    </span>
                    <h4 className="text-sm font-bold flex items-center gap-1.5 pt-1">
                      <span>在 Chrome / Edge 浏览器中一键安装为独立应用</span>
                    </h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
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
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-gray-200 text-gray-500'
                }`}>
                  <span className="truncate">http://localhost:8085</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30 flex items-center gap-1">
                      <Laptop className="w-3 h-3" /> 在应用中打开
                    </span>
                    <span>★</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span><b>方式 1</b>：直接点击上方「立即安装应用」按钮；</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span><b>方式 2</b>：在 Chrome / Edge 地址栏右侧点击 <b>「在应用中打开」</b> 或 <b>「安装」</b> 按钮；</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span><b>方式 3</b>：点击浏览器右上角三点菜单 ➔ <b>「保存并分享」 ➔ 「安装考研英语一真题刷题系统」</b>。</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mac Option 1: Chrome PWA on macOS */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-blue-50/40 border-blue-100'
              }`}>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase tracking-wide">
                  Mac 方式 1 · Google Chrome / Microsoft Edge
                </span>
                <h4 className="text-sm font-bold flex items-center gap-1.5 pt-1.5">
                  <span>在 Mac Chrome 浏览器中一键安装到 Dock 程序坞</span>
                </h4>
                <ol className={`mt-2 text-xs space-y-1.5 list-decimal list-inside ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <li>在 Mac 的 Chrome 浏览器地址栏右侧，点击 <b>「在应用中打开」</b> 或 <b>「安装」</b> 图标；</li>
                  <li>Mac 会自动在 <code className="px-1.5 py-0.5 rounded bg-black/20 text-indigo-400 font-mono">~/Applications/Chrome Apps/</code> 生成独立 App；</li>
                  <li>右键 Dock 图标选择 <b>「选项 ➔ 在程序坞中保留」</b>，支持原生全屏、分屏与快捷键！</li>
                </ol>
              </div>

              {/* Mac Option 2: Safari Add to Dock */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-emerald-50/40 border-emerald-100'
              }`}>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">
                  Mac 方式 2 · Safari 浏览器 (macOS Sonoma 14+)
                </span>
                <h4 className="text-sm font-bold flex items-center gap-1.5 pt-1.5">
                  <span>Safari 菜单栏一键「添加到程序坞」</span>
                </h4>
                <p className={`mt-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  在 Safari 中点击顶部菜单栏：<b>「文件 (File)」 ➔ 「添加到程序坞 (Add to Dock...)」</b>，即可秒变原生的 macOS 桌面应用！
                </p>
              </div>
            </div>
          )}

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className={`p-3 rounded-xl border text-center ${
              isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="text-lg mb-1">⚡</div>
              <div className="text-xs font-bold">轻量极速</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Chrome 核心 0 卡顿</div>
            </div>
            <div className={`p-3 rounded-xl border text-center ${
              isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="text-lg mb-1">🖥️</div>
              <div className="text-xs font-bold">独立无边框</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>沉浸式专心刷题</div>
            </div>
            <div className={`p-3 rounded-xl border text-center ${
              isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="text-lg mb-1">🔄</div>
              <div className="text-xs font-bold">双模自由切换</div>
              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>浏览器与应用无缝流转</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50/80'
        }`}>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>支持在 Chrome、Edge 与 Safari 中随心安装与打开</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
