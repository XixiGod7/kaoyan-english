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
  EyeOff
} from 'lucide-react';
import { isSentenceFavorited, saveFavoriteSentence, removeFavoriteSentence } from '../utils/readingStorage';

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
  selfTestMode = false
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [revealedTranslation, setRevealedTranslation] = useState<boolean>(!selfTestMode);
  const [isFavorited, setIsFavorited] = useState<boolean>(() => isSentenceFavorited(sentence.sid));

  React.useEffect(() => {
    setRevealedTranslation(!selfTestMode);
  }, [selfTestMode]);

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

  return (
    <div className={`group rounded-xl border transition-all duration-200 mb-4 overflow-hidden ${
      isRead 
        ? 'border-emerald-500/20 bg-emerald-950/5 dark:border-emerald-500/15' 
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
    }`} id={sentence.sid}>
      {/* Header bar of sentence */}
      <div className="flex items-start justify-between p-4 pb-3 gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {index + 1}
          </span>
          <span className="text-xs px-2 py-0.5 rounded font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            P{sentence.para_no} · S{sentence.para_seq + 1}
          </span>
          {hasComponents && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {sentence.components.length} 个语法修饰
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSpeak}
            title="朗读原句"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFavorite}
            title={isFavorited ? '取消收藏难句' : '收入难句本'}
            className={`p-1.5 rounded-lg transition-colors ${
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
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                isRead
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">{isRead ? '已精读' : '打卡'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            title={expanded ? '折叠语法拆解' : '展开语法拆解'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* English Sentence Text */}
      <div className="p-4 pt-3 pb-3">
        <p className="text-base sm:text-lg font-serif leading-relaxed text-slate-900 dark:text-slate-100 tracking-normal select-text">
          {renderClickableTokens(sentence.s)}
        </p>
      </div>

      {/* Full Sentence Translation */}
      <div className="px-4 pb-3">
        {selfTestMode && !revealedTranslation ? (
          <button
            type="button"
            onClick={() => setRevealedTranslation(true)}
            className="w-full py-2 px-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-lg flex items-center justify-center gap-1.5 border border-dashed border-slate-300 dark:border-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>自测模式已隐藏译文 · 点击展开查看全句译文</span>
          </button>
        ) : (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
            <span className="text-xs font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5">
              译
            </span>
            <div className="flex-1 select-text">
              {sentence.zh}
            </div>
            {selfTestMode && (
              <button
                type="button"
                onClick={() => setRevealedTranslation(false)}
                title="重新遮挡译文"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

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
