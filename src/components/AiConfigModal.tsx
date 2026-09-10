import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Key, 
  Globe, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { AiConfig } from '../types/ai';
import { 
  loadAiConfig, 
  saveAiConfig, 
  PROVIDER_PRESETS, 
  DEFAULT_AI_CONFIG 
} from '../utils/aiConfigStorage';
import { testAiConnection, ConnectionTestResult } from '../utils/aiClient';

interface AiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
  onSaved?: () => void;
}

export const AiConfigModal: React.FC<AiConfigModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  onSaved
}) => {
  const isDark = theme === 'dark';
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const modalBodyRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(loadAiConfig());
      setTestResult(null);
      setSaveSuccessToast(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (testResult && modalBodyRef.current) {
      setTimeout(() => {
        modalBodyRef.current?.scrollTo({ top: modalBodyRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [testResult]);

  if (!isOpen) return null;

  const currentPreset = PROVIDER_PRESETS.find(p => p.id === config.provider) || PROVIDER_PRESETS[PROVIDER_PRESETS.length - 1];

  const handleSelectProvider = (presetId: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setConfig(prev => ({
      ...prev,
      provider: preset.id,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection(config);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || '测试连接时发生未知错误',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveAiConfig(config);
    setSaveSuccessToast(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSaveSuccessToast(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border transition-colors overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-750 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4.5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/70'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>AI 批阅与大模型 API 配置</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  OpenAI 兼容协议
                </span>
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                支持 DeepSeek、OpenAI、Kimi、通义千问、智谱或任意兼容接口
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div ref={modalBodyRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Security Notice Card */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isDark 
              ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200' 
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}>
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">数据安全与隐私承诺：</span>
              您填写的 API Key <strong>100% 仅保存在您本机的浏览器本地缓存（localStorage）中</strong>，每次批阅直接由您的浏览器直连大模型官方服务器，绝无任何中间服务器中转或泄露风险。
            </div>
          </div>

          {/* Provider Presets */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
              isDark ? 'text-slate-400' : 'text-gray-600'
            }`}>
              <Globe className="w-3.5 h-3.5" />
              <span>选择大模型厂商与预设</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDER_PRESETS.map(preset => {
                const isSelected = config.provider === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectProvider(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-950/60 border-blue-500 text-blue-200 shadow-xs'
                          : 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs'
                        : isDark
                        ? 'bg-slate-800/50 border-slate-750 text-slate-300 hover:border-slate-600'
                        : 'bg-gray-50/50 border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">{preset.name.split(' ')[0]}</span>
                      {preset.tag && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          preset.tag === '强烈推荐'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {preset.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-70 truncate block">{preset.defaultModel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Credentials Input Form */}
          <div className="space-y-4">
            {/* Base URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-bold flex items-center gap-1.5 ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>API 接口完整地址 (Endpoint URL)</span>
                </label>
                {currentPreset.helpUrl && (
                  <a
                    href={currentPreset.helpUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <span>获取 API Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={config.baseUrl}
                onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="例如: https://token.sensenova.cn/v1/chat/completions 或完整接口地址"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-colors outline-none focus:ring-2 focus:ring-blue-500/30 ${
                  isDark 
                    ? 'bg-slate-950 border-slate-750 text-slate-100 placeholder-slate-600 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                }`}
              />
              <p className={`mt-1 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                系统将严格按照您输入的地址直接发送请求，不会在末尾自动追加任何路径。
              </p>
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-bold flex items-center gap-1.5 ${
                  isDark ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>API 密钥 (API Key)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={`text-[11px] flex items-center gap-1 ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKey ? '隐藏' : '显示明文'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="在此粘贴您的 API Key (如 sk-xxxxxxxx...)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-colors outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isDark 
                      ? 'bg-slate-950 border-slate-750 text-slate-100 placeholder-slate-600 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Model Selection & Custom Model Input */}
            <div>
              <label className={`text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                isDark ? 'text-slate-300' : 'text-gray-700'
              }`}>
                <Cpu className="w-3.5 h-3.5 text-purple-500" />
                <span>模型名称 (Model Name)</span>
              </label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.model}
                  onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="例如: deepseek-chat, gpt-4o-mini"
                  className={`flex-1 px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-colors outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isDark 
                      ? 'bg-slate-950 border-slate-750 text-slate-100 placeholder-slate-600 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Quick Model Tags */}
              {currentPreset.availableModels.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>常用模型快捷选择:</span>
                  {currentPreset.availableModels.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, model: m }))}
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-mono transition-colors ${
                        config.model === m
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : isDark
                          ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Temperature Slider (Advanced) */}
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50/50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>批阅严谨度 (Temperature: {config.temperature ?? 0.3})</span>
                </span>
                <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {(config.temperature ?? 0.3) <= 0.3 ? '推荐（评分标准严谨稳定）' : '较高（发散度更强）'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature ?? 0.3}
                onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-gray-300 rounded-lg dark:bg-slate-700"
              />
            </div>
          </div>

          {/* Test Connection Output Card */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed animate-in fade-in flex items-start gap-2.5 ${
              testResult.success
                ? isDark ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : isDark ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-bold">{testResult.message}</p>
                {testResult.modelResponse && (
                  <p className="opacity-80 font-mono text-[11px]">模型回执: "{testResult.modelResponse}"</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
          isDark ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/70'
        }`}>
          {/* Test Connection Button */}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-xs ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>正在测试连接...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>测试连接与可用性</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md flex items-center gap-1.5"
            >
              {saveSuccessToast ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>已保存！</span>
                </>
              ) : (
                <span>保存配置并启用</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
