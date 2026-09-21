import React, { useState, useEffect, useMemo } from 'react';
import { VocabStatItem } from '../types/reading';
import { 
  Search, 
  Filter, 
  Volume2, 
  Sparkles, 
  Award, 
  BookOpen, 
  Check, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { VocabBlindSpotModal } from './VocabBlindSpotModal';

interface VocabStatsViewProps {
  onWordClick?: (word: string, rect: DOMRect) => void;
  wordStatuses?: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>;
  onUpdateWordStatus?: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
}

const PAGE_SIZE = 50;

export const VocabStatsView: React.FC<VocabStatsViewProps> = ({
  onWordClick,
  wordStatuses = {},
  onUpdateWordStatus
}) => {
  const [words, setWords] = useState<VocabStatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'high_freq' | 'recent' | 'unfamiliar'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Vocab Test Modal State
  const [isTestActive, setIsTestActive] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('./data/vocab_stats/vocab_stats_all.json');
        if (res.ok) {
          const json = await res.json();
          setWords(json);
        }
      } catch (err) {
        console.error('Failed to load vocab stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredWords = useMemo(() => {
    let list = words;
    if (filterMode === 'high_freq') {
      list = list.filter(w => w.n >= 10);
    } else if (filterMode === 'recent') {
      list = list.filter(w => w.recent > 0);
    } else if (filterMode === 'unfamiliar') {
      list = list.filter(w => wordStatuses[w.w] === 'unfamiliar');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(w => 
        (w.w && w.w.toLowerCase().includes(q)) ||
        (w.trans && w.trans.includes(q))
      );
    }
    return list;
  }, [words, filterMode, searchQuery, wordStatuses]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const pageWords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredWords.slice(start, start + PAGE_SIZE);
  }, [filteredWords, currentPage]);

  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">正在加载考纲真题词汇统计 (3149 考纲词)...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                考研英语一 · 历年真题词汇统计
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                3149 考纲词分布
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              全量收录英语一历年真题出现过的 3149 个大纲核心词汇，精准统计真题出现频次、年份跨度与近五年考向。
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTestActive(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> 测词汇盲区 (40 题快测)
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="搜索英文单词或中文释义..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { setFilterMode('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              全部 ({words.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterMode('high_freq'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterMode === 'high_freq'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              高频核心 (出现 ≥10 次)
            </button>
            <button
              type="button"
              onClick={() => { setFilterMode('recent'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterMode === 'recent'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              近五年常考
            </button>
            <button
              type="button"
              onClick={() => { setFilterMode('unfamiliar'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterMode === 'unfamiliar'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              我的生词 ({Object.values(wordStatuses).filter(s => s === 'unfamiliar').length})
            </button>
          </div>
        </div>
      </div>

      {/* Words Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <div>共找到 <b>{filteredWords.length}</b> 个词条</div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                上一页
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {pageWords.map((item, idx) => {
            const status = wordStatuses[item.w] || 'unknown';

            return (
              <div
                key={item.w + idx}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400 w-8 pt-1">
                    {(currentPage - 1) * PAGE_SIZE + idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <b
                        className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-indigo-600 transition-colors select-text"
                        onClick={(e) => {
                          if (onWordClick) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onWordClick(item.w, rect);
                          }
                        }}
                      >
                        {item.w}
                      </b>
                      {item.phonetic && (
                        <span className="text-xs font-mono text-slate-400">{item.phonetic}</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleSpeak(item.w, e)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 select-text">
                      {item.trans}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {item.n} 次 <span className="font-normal text-slate-400">· {item.years} 年真题</span>
                    </div>
                    {item.recent > 0 && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        近五年 {item.recent} 次
                      </div>
                    )}
                  </div>

                  {onUpdateWordStatus && (
                    <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => onUpdateWordStatus(item.w, status === 'familiar' ? 'unknown' : 'familiar')}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          status === 'familiar'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        title="标记为熟词"
                      >
                        熟
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateWordStatus(item.w, status === 'unfamiliar' ? 'unknown' : 'unfamiliar')}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          status === 'unfamiliar'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        title="标记为生词"
                      >
                        生
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 40-word Blind Spot Test Modal */}
      <VocabBlindSpotModal
        isOpen={isTestActive}
        onClose={() => setIsTestActive(false)}
        onWordClick={onWordClick}
        onUpdateWordStatus={onUpdateWordStatus}
      />
    </div>
  );
};
