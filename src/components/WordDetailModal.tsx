import React, { useState, useEffect } from 'react';
import { WordFreqItem } from '../types/kaoyan';
import { BookOpen, ExternalLink, Sparkles, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface SentenceInfo {
  id: number;
  year: string;
  taskId: number;
  taskName: string;
  category: string;
  en_text: string;
  cn_text: string;
  order_seq: string;
}

interface WordDetailModalProps {
  item: WordFreqItem | null;
  onClose: () => void;
  onToggleStatus: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
  onJumpToSentence?: (year: string, sentenceId: number) => void;
  theme?: 'dark' | 'light';
}

let cachedSentenceIndex: Record<string, SentenceInfo> | null = null;

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  item,
  onClose,
  onToggleStatus,
  onJumpToSentence,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [sentenceIndex, setSentenceIndex] = useState<Record<string, SentenceInfo>>(cachedSentenceIndex || {});
  const [loadingSentences, setLoadingSentences] = useState(!cachedSentenceIndex);

  useEffect(() => {
    if (cachedSentenceIndex) {
      setSentenceIndex(cachedSentenceIndex);
      return;
    }

    fetch('./data/sentences_index.json')
      .then(res => res.json())
      .then(data => {
        cachedSentenceIndex = data;
        setSentenceIndex(data);
        setLoadingSentences(false);
      })
      .catch(err => {
        console.error('Failed to load sentences index', err);
        setLoadingSentences(false);
      });
  }, []);

  if (!item) return null;

  const { word, entry, paperCount, totalCount, status } = item;
  const sentences = entry.sentence_ids || [];

  // Highlight keyword in sentence
  const renderHighlightedSentence = (text: string, targetWord: string) => {
    if (!text) return null;
    const cleanWord = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${cleanWord})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === targetWord.toLowerCase()) {
        return (
          <span
            key={index}
            className="bg-yellow-300 text-yellow-950 font-bold px-1.5 py-0.5 rounded shadow-sm ring-2 ring-yellow-400/80 mx-0.5"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className={`rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-850' : 'border-gray-100 bg-white'
        }`}>
          <div className="flex items-center gap-3.5">
            <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {word}
            </h3>
            {entry.phonetic && (
              <span className={`text-sm font-semibold font-mono px-2 py-0.5 rounded-md ${
                isDark ? 'text-blue-400 bg-slate-800' : 'text-blue-600 bg-blue-50'
              }`}>
                /{entry.phonetic}/
              </span>
            )}
            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              考频: {paperCount}篇/{totalCount}次
            </span>
          </div>

          <button
            onClick={onClose}
            className={`text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Status Actions */}
        <div className={`px-6 py-3 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50/80 border-gray-200/80'
        }`}>
          <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>标记背诵状态：</span>
          <div className="flex gap-2">
            <button
              onClick={() => onToggleStatus(word, 'familiar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                status === 'familiar'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/50'
                  : isDark ? 'bg-slate-800 text-emerald-400 border-emerald-700/50 hover:bg-emerald-950/50' : 'bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              熟词
            </button>

            <button
              onClick={() => onToggleStatus(word, 'unfamiliar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                status === 'unfamiliar'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-400/50'
                  : isDark ? 'bg-slate-800 text-rose-400 border-rose-700/50 hover:bg-rose-950/50' : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              生词
            </button>

            <button
              onClick={() => onToggleStatus(word, 'unknown')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                status === 'unknown'
                  ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              未标
            </button>
          </div>
        </div>

        {/* Sentences List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-slate-400' : 'text-gray-500'
            }`}>
              <BookOpen className="w-4 h-4 text-blue-500" />
              真题精选出处例句 (点击可直达文章对应段落)
            </h4>
            <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>共 {sentences.length} 处出现</span>
          </div>

          {sentences.length === 0 ? (
            <div className={`text-center py-10 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>暂无真题例句索引</div>
          ) : (
            sentences.map(([sentenceId, wordRef, translation], idx) => {
              const sInfo = sentenceIndex[String(sentenceId)];
              const year = sInfo ? sInfo.year : String(sentenceId).substring(0, 4);
              const taskTitle = sInfo ? sInfo.taskName : '阅读理解';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all group relative ${
                    isDark 
                      ? 'bg-slate-800/70 border-slate-700 hover:border-blue-500 hover:bg-slate-800' 
                      : 'bg-[#fbfcfd] border-gray-200/80 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        {year}年 · {taskTitle}
                      </span>
                      <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                        句段ID: {sentenceId}
                      </span>
                    </div>

                    {onJumpToSentence && (
                      <button
                        onClick={() => onJumpToSentence(year, sentenceId)}
                        className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-900 border border-blue-800 px-3 py-1 rounded-lg transition-all shadow-sm group-hover:scale-105"
                      >
                        <span>定位到真题此句</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* English Sentence with target word highlighted */}
                  <p className={`text-[1.02rem] leading-relaxed font-serif mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                    {sInfo?.en_text
                      ? renderHighlightedSentence(sInfo.en_text, wordRef || word)
                      : (
                        <span className="text-gray-400 italic">例句加载中...</span>
                      )}
                  </p>

                  {/* Chinese Translation */}
                  <p className={`text-sm font-medium p-2.5 rounded-lg leading-relaxed border ${
                    isDark 
                      ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200' 
                      : 'bg-green-50/70 border-green-100/80 text-green-800'
                  }`}>
                    {sInfo?.cn_text || translation || '参考翻译解析中...'}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/80' : 'border-gray-100 bg-gray-50'
        }`}>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            💡 点击【定位到真题此句】可直接切换到对应试卷并高亮显示该句
          </span>
          <button
            onClick={onClose}
            className={`px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'
            }`}
          >
            关闭面板
          </button>
        </div>
      </div>
    </div>
  );
};
