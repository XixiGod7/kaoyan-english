import React, { useState } from 'react';
import { PassageSentence } from '../types/reading';
import { 
  Bookmark, 
  Check, 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Layers,
  BookOpen,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Copy,
  CheckCheck,
  Bot,
  X
} from 'lucide-react';
import { isSentenceFavorited, saveFavoriteSentence, removeFavoriteSentence } from '../utils/readingStorage';
import { loadAiConfig } from '../utils/aiConfigStorage';
import { sendChatCompletion } from '../utils/aiClient';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FontSizeLevel, FONT_SIZE_CONFIGS } from '../utils/fontSize';

interface SentenceTreeViewProps {
  sentence: PassageSentence;
  year?: number;
  textNo?: number;
  index: number;
  onWordClick?: (word: string, rect: DOMRect) => void;
  isRead?: boolean;
  onToggleRead?: (sid: string) => void;
  defaultExpanded?: boolean;
  selfTestMode?: boolean;
  fontSizeLevel?: FontSizeLevel;
  inParagraphUnit?: boolean;
}

export const SentenceTreeView: React.FC<SentenceTreeViewProps> = ({
  sentence,
  year = 2025,
  textNo = 1,
  index,
  onWordClick,
  isRead = false,
  onToggleRead,
  defaultExpanded = true,
  selfTestMode = false,
  fontSizeLevel = 'base',
  inParagraphUnit = false
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [revealedTranslation, setRevealedTranslation] = useState<boolean>(!selfTestMode);
  const [isFavorited, setIsFavorited] = useState<boolean>(() => isSentenceFavorited(sentence.sid));

  // Sync defaultExpanded when parent collapses/expands all
  React.useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  React.useEffect(() => {
    setRevealedTranslation(!selfTestMode);
  }, [selfTestMode]);

  // AI Assistant state
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [isAiFolded, setIsAiFolded] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [copiedAi, setCopiedAi] = useState(false);

  const handleAskAi = async (customPrompt?: string) => {
    const q = customPrompt || aiQuestion;
    if (!q.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse('');
    setIsAiFolded(false);
    try {
      const config = loadAiConfig();
      if (config.provider === 'sensenova' && (!config.model || config.model === 'deepseek-chat')) {
        config.model = 'deepseek-v4-flash';
      }

      const systemPrompt = `你是一位拥有20年考研英语命题与长难句教学经验的顶级名师。
当前长难句信息：
【英文原句】：${sentence.s}
【全句精读译文】：${sentence.zh}
【句法核心主干】：主语: ${sentence.trunk?.['主语'] || '无'}, 谓语: ${sentence.trunk?.['谓语'] || '无'}, 宾语/表语: ${sentence.trunk?.['宾语或表语'] || '无'}, 主干翻译: ${sentence.trunk?.['主干翻译'] || '无'}
【修饰成分】：${sentence.components?.map(c => `[${c['成分类型']}] 原文: "${c['原文']}" -> 修饰: ${c['修饰对象']} (说明: ${c['说明']})`).join('; ') || '无'}

请针对考生的具体问题或翻译进行专业、切中要害、逻辑清晰的解答（重点剖析句子主从句关系、语序转换技巧或翻译得失）。请用规范的 Markdown 格式输出。`;

      await sendChatCompletion(
        config,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: q }
        ],
        (chunk, full) => {
          setAiResponse(full);
        }
      );
    } catch (err: any) {
      setAiResponse(`⚠️ AI 助教答疑请求遇到问题: ${err?.message || '请检查 AI 服务配置与网络连接'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAiResponse = () => {
    if (!aiResponse) return;
    navigator.clipboard.writeText(aiResponse);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  const handleToggleFavorite = () => {
    if (isFavorited) {
      removeFavoriteSentence(sentence.sid);
      setIsFavorited(false);
    } else {
      saveFavoriteSentence({
        sid: sentence.sid,
        s: sentence.s,
        zh: sentence.zh,
        trunk: sentence.trunk,
        components: sentence.components,
        year,
        text_no: textNo,
        addedAt: Date.now()
      });
      setIsFavorited(true);
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(sentence.s);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.error('TTS speech error:', err);
    }
  };

  const renderClickableTokens = (text: string) => {
    const tokens = text.split(/(\s+|[.,!?;:"'()[\]{}])/);
    return tokens.map((token, i) => {
      const isWord = /^[a-zA-Z]+(-[a-zA-Z]+)*$/.test(token);
      if (!isWord || !onWordClick) {
        return <span key={i}>{token}</span>;
      }
      return (
        <span
          key={i}
          className="cursor-pointer hover:text-indigo-400 hover:underline transition-colors select-text"
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            onWordClick(token, rect);
          }}
        >
          {token}
        </span>
      );
    });
  };

  const hasTrunk = sentence.trunk && (
    sentence.trunk['主语'] || 
    sentence.trunk['谓语'] || 
    sentence.trunk['宾语或表语'] || 
    sentence.trunk['主干翻译']
  );

  const hasComponents = sentence.components && sentence.components.length > 0;

  const fontConfig = FONT_SIZE_CONFIGS[fontSizeLevel || 'base'] || FONT_SIZE_CONFIGS['base'];

  return (
    <div 
      className={inParagraphUnit ? `group transition-all duration-200 py-3.5 sm:py-4 ${
        isRead ? 'bg-emerald-50/20 dark:bg-emerald-950/15 -mx-4 sm:-mx-5 px-4 sm:px-5' : ''
      }` : `group rounded-2xl border transition-all duration-200 mb-4 overflow-hidden ${
        isRead 
          ? 'border-emerald-500/20 bg-emerald-950/5 dark:border-emerald-500/15' 
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
      }`} 
      id={sentence.sid}
    >
      {/* Header bar of sentence */}
      <div className={`flex items-center justify-between gap-2 flex-wrap ${
        inParagraphUnit ? 'mb-2' : 'p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
            S{sentence.para_seq + 1}
          </span>
          <span className="text-[11px] font-sans text-slate-400 dark:text-slate-500">
            全篇第 {index + 1} 句
          </span>
          {hasComponents && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" />
              {sentence.components.length} 个语法修饰
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleSpeak}
            title="朗读原句"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFavorite}
            title={isFavorited ? '取消收藏难句' : '收入难句本'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFavorited
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>

          {onToggleRead && (
            <button
              type="button"
              onClick={() => onToggleRead(sentence.sid)}
              title={isRead ? '标记为未读' : '标记已精读'}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isRead
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">{isRead ? '已精读' : '打卡'}</span>
            </button>
          )}

          {/* AI Assistant Button */}
          <button
            type="button"
            onClick={() => setShowAiAssistant(!showAiAssistant)}
            title="AI 助教答疑 / 提问"
            className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              showAiAssistant
                ? 'text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 shadow-xs'
                : 'text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            <span className="hidden sm:inline">AI 答疑</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-0.5 cursor-pointer"
            title={expanded ? '折叠语法拆解' : '展开语法拆解'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* English Sentence Text with Global Font Size */}
      <div className={inParagraphUnit ? 'py-1' : 'p-4 pt-3 pb-3'}>
        <p className={`font-serif tracking-normal select-text text-slate-900 dark:text-slate-100 ${fontConfig.passageText}`}>
          {renderClickableTokens(sentence.s)}
        </p>
      </div>

      {/* Full Sentence Translation with Global Font Size */}
      <div className={inParagraphUnit ? 'pt-1.5 pb-2' : 'px-4 pb-3'}>
        {selfTestMode && !revealedTranslation ? (
          <button
            type="button"
            onClick={() => setRevealedTranslation(true)}
            className="w-full py-2 px-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-xl flex items-center justify-center gap-1.5 border border-dashed border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>自测模式已隐藏译文 · 点击展开查看全句译文</span>
          </button>
        ) : (
          <div className={`p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2 ${fontConfig.transText}`}>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5">
              译
            </span>
            <div className="flex-1 select-text font-sans">
              {sentence.zh}
            </div>
            {selfTestMode && (
              <button
                type="button"
                onClick={() => setRevealedTranslation(false)}
                title="重新遮挡译文"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI Assistant Interactive Q&A Card (Collapsible) */}
      {showAiAssistant && (
        <div className={`my-2.5 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 space-y-2.5 animate-in fade-in duration-200 ${
          inParagraphUnit ? '' : 'mx-4 mb-3'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                AI 考研长难句助教 (商汤日日新 / DeepSeek)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAiFolded(!isAiFolded)}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                title={isAiFolded ? '展开 AI 答疑面板' : '折叠 AI 答疑面板'}
              >
                <span>{isAiFolded ? '展开' : '收起'}</span>
                {isAiFolded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => setShowAiAssistant(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                title="关闭 AI 答疑"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isAiFolded && (
            <>
              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-1 text-[11px]">
                {[
                  '💡 剖析主从句修饰关系',
                  '✍️ 点评我的中文翻译',
                  '🔍 辨析句中考研重点难词',
                  '🎯 提炼长难句出题陷阱'
                ].map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={aiLoading}
                    onClick={() => {
                      setAiQuestion(prompt);
                      handleAskAi(prompt);
                    }}
                    className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors disabled:opacity-50 text-[11px] cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Question Input Row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAskAi();
                      }
                    }}
                    disabled={aiLoading}
                    placeholder="向 AI 老师提问（如：这个从句修饰谁？我这样翻译通顺吗？）... [Ctrl+Enter 发送]"
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAskAi()}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{aiLoading ? '解答中...' : '发送'}</span>
                </button>
              </div>

              {/* AI Response Output with MarkdownRenderer */}
              {(aiLoading || aiResponse) && (
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs text-slate-800 dark:text-slate-200 space-y-2 select-text leading-relaxed shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                      <Sparkles className="w-3 h-3" />
                      名师点拨回答
                    </span>
                    {aiResponse && (
                      <button
                        type="button"
                        onClick={handleCopyAiResponse}
                        className="flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer"
                      >
                        {copiedAi ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAi ? '已复制' : '复制内容'}</span>
                      </button>
                    )}
                  </div>

                  {aiResponse ? (
                    <MarkdownRenderer content={aiResponse} />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      <span>AI 助教正在深度剖析句子主干与语义结构...</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detailed Syntax Tree Breakdown (Expanded) */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
          {/* Trunk Card */}
          {hasTrunk && (
            <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/30 dark:bg-indigo-950/20 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>句子核心主干 (Trunk)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {sentence.trunk['主语'] && (
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <span className="block font-bold text-sky-600 dark:text-sky-400 mb-1">主语 (Subject)</span>
                    <span className="font-serif text-slate-800 dark:text-slate-200">{sentence.trunk['主语']}</span>
                  </div>
                )}
                {sentence.trunk['谓语'] && (
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <span className="block font-bold text-rose-600 dark:text-rose-400 mb-1">谓语 (Predicate)</span>
                    <span className="font-serif text-slate-800 dark:text-slate-200">{sentence.trunk['谓语']}</span>
                  </div>
                )}
                {sentence.trunk['宾语或表语'] && (
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <span className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">宾语/表语 (Object/Predicative)</span>
                    <span className="font-serif text-slate-800 dark:text-slate-200">{sentence.trunk['宾语或表语']}</span>
                  </div>
                )}
              </div>

              {sentence.trunk['主干翻译'] && (
                <div className="text-xs text-indigo-950 dark:text-indigo-200/90 pt-1 font-medium bg-indigo-100/50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg">
                  <span className="font-bold mr-1">主干译意：</span>
                  {sentence.trunk['主干翻译']}
                </div>
              )}
            </div>
          )}

          {/* Subordinate Components Card */}
          {hasComponents && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                <Layers className="w-3.5 h-3.5" />
                <span>修饰与从属结构拆解 ({sentence.components.length})</span>
              </div>

              <div className="space-y-2">
                {sentence.components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 p-3 text-xs space-y-1.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {comp['成分类型']}
                        </span>
                        {comp['修饰对象'] && (
                          <span className="text-slate-500 dark:text-slate-400">
                            修饰 → <code className="text-indigo-600 dark:text-indigo-400 font-mono px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{comp['修饰对象']}</code>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="font-serif text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 select-text">
                      {comp['原文']}
                    </div>

                    <div className="text-slate-600 dark:text-slate-300 select-text">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">译文：</span>
                      {comp['中文翻译']}
                    </div>

                    {comp['说明'] && (
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed pl-2 border-l-2 border-slate-300 dark:border-slate-700">
                        {comp['说明']}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
