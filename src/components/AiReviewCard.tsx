import React, { useState } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Loader2, 
  Cpu, 
  Clock,
  Settings
} from 'lucide-react';
import { AiReviewReport } from '../types/ai';

interface AiReviewCardProps {
  report?: AiReviewReport;
  isEvaluating?: boolean;
  streamText?: string;
  error?: string;
  onReEvaluate: () => void;
  onOpenConfig?: () => void;
  theme?: 'dark' | 'light';
  title?: string;
}

export const AiReviewCard: React.FC<AiReviewCardProps> = ({
  report,
  isEvaluating = false,
  streamText = '',
  error,
  onReEvaluate,
  onOpenConfig,
  theme = 'dark',
  title = '考研英语 AI 阅卷诊断报告'
}) => {
  const isDark = theme === 'dark';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayMarkdown = isEvaluating ? streamText : report?.rawMarkdown || '';

  const handleCopy = () => {
    if (!displayMarkdown) return;
    navigator.clipboard.writeText(displayMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render markdown-like text smoothly
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 3 ###
      if (trimmed.startsWith('### ')) {
        const text = trimmed.replace(/^###\s*/, '');
        return (
          <h4 
            key={idx} 
            className={`font-bold text-base mt-4 mb-2 flex items-center gap-1.5 pb-1 border-b ${
              isDark ? 'text-teal-300 border-slate-800' : 'text-teal-800 border-emerald-100'
            }`}
          >
            {text}
          </h4>
        );
      }

      // Heading 2 ##
      if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^##\s*/, '');
        return (
          <h3 
            key={idx} 
            className={`font-black text-lg mt-5 mb-2.5 flex items-center gap-2 ${
              isDark ? 'text-emerald-300' : 'text-emerald-900'
            }`}
          >
            {text}
          </h3>
        );
      }

      // Blockquote >
      if (trimmed.startsWith('> ')) {
        const text = trimmed.replace(/^>\s*/, '');
        return (
          <div 
            key={idx} 
            className={`p-3 my-2.5 rounded-xl border-l-4 text-xs md:text-sm italic ${
              isDark 
                ? 'bg-slate-900/90 border-teal-500 text-slate-200' 
                : 'bg-teal-50/70 border-teal-600 text-teal-950'
            }`}
          >
            {text}
          </div>
        );
      }

      // Bullet points - or *
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-*]\s*/, '');
        // Highlight bold **bold**
        const formatted = text.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} className={isDark ? 'text-amber-300' : 'text-amber-900'}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        return (
          <li key={idx} className="ml-4 list-disc text-xs md:text-sm my-1 leading-relaxed">
            {formatted}
          </li>
        );
      }

      // Empty line
      if (!trimmed) {
        return <div key={idx} className="h-2"></div>;
      }

      // Normal paragraph with bold highlights
      const formatted = line.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className={isDark ? 'text-amber-300 font-bold' : 'text-amber-900 font-bold'}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <p key={idx} className="text-xs md:text-sm my-1 leading-relaxed">
          {formatted}
        </p>
      );
    });
  };

  // If there's an error and not evaluating
  if (error && !isEvaluating) {
    return (
      <div className={`mt-4 rounded-2xl border p-4 shadow-sm animate-in fade-in ${
        isDark ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h4 className="font-bold text-sm">AI 批阅服务请求异常</h4>
            <p className="text-xs leading-relaxed opacity-90">{error}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onReEvaluate}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>重试批阅</span>
              </button>
              {onOpenConfig && (
                <button
                  onClick={onOpenConfig}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    isDark ? 'border-rose-700 bg-rose-900/40 hover:bg-rose-800/60' : 'border-rose-300 bg-white hover:bg-rose-50'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>检查 API 配置</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If nothing to display and not evaluating
  if (!report && !isEvaluating) {
    return null;
  }

  return (
    <div className={`mt-4 rounded-2xl border shadow-md transition-all overflow-hidden animate-in fade-in duration-300 ${
      isDark 
        ? 'bg-slate-900 border-teal-900/60 text-slate-100' 
        : 'bg-[#f4fbf8] border-emerald-200 text-gray-900'
    }`}>
      {/* Top Banner & Action Controls */}
      <div className={`px-4 md:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2.5 ${
        isDark ? 'bg-slate-950/70 border-teal-950' : 'bg-emerald-100/50 border-emerald-200/60'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs md:text-sm flex items-center gap-1.5">
            <span>{title}</span>
            {isEvaluating && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-blue-500 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                正在深度阅卷评分中...
              </span>
            )}
          </span>
        </div>

        {/* Right Info Tags & Buttons */}
        <div className="flex items-center gap-2">
          {report?.modelUsed && (
            <span className={`hidden sm:flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md border ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-emerald-200 text-emerald-800'
            }`}>
              <Cpu className="w-3 h-3 text-purple-400" />
              <span>{report.modelUsed}</span>
            </span>
          )}

          {report?.evaluatedAt && (
            <span className={`hidden md:flex items-center gap-1 text-[10px] opacity-70 ${
              isDark ? 'text-slate-400' : 'text-gray-500'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{new Date(report.evaluatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          )}

          {/* Copy Button */}
          {displayMarkdown && !isEvaluating && (
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700' 
                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
              title="复制完整批阅报告"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copied ? '已复制' : '复制'}</span>
            </button>
          )}

          {/* Re-evaluate Button */}
          {!isEvaluating && (
            <button
              onClick={onReEvaluate}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700' 
                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
              title="重新向 AI 发起批阅"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px]">重新批阅</span>
            </button>
          )}

          {/* Collapse/Expand */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-emerald-100 text-gray-500'
            }`}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Report Content Body */}
      {!isCollapsed && (
        <div className="p-4 md:p-6 text-sm font-sans leading-relaxed select-text space-y-1">
          {displayMarkdown ? (
            <div className="prose max-w-none dark:prose-invert">
              {renderFormattedContent(displayMarkdown)}
            </div>
          ) : isEvaluating ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-xs text-blue-500 font-medium">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>考研阅卷专家正在针对您的作答进行细致分析、采分点切分与范文润色...</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
