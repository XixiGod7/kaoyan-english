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

  // Vocab Test (Blind Spot Test - 40 questions)
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [testWords, setTestWords] = useState<VocabStatItem[]>([]);
  const [testIndex, setTestIndex] = useState<number>(0);
  const [testResults, setTestResults] = useState<Record<string, 'known' | 'unknown'>>({});
  const [testFinished, setTestFinished] = useState<boolean>(false);

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

  // Start 40-word Blind Spot Test
  const startBlindSpotTest = () => {
    if (words.length === 0) return;
    // Stratified sample of 40 words: 15 high freq, 15 mid freq, 10 low freq
    const high = words.filter(w => w.n >= 10).sort(() => Math.random() - 0.5).slice(0, 15);
    const mid = words.filter(w => w.n >= 4 && w.n < 10).sort(() => Math.random() - 0.5).slice(0, 15);
    const low = words.filter(w => w.n < 4).sort(() => Math.random() - 0.5).slice(0, 10);
    const sample = [...high, ...mid, ...low].sort(() => Math.random() - 0.5);

    setTestWords(sample);
    setTestIndex(0);
    setTestResults({});
    setTestFinished(false);
    setIsTestActive(true);
  };

  const handleTestChoice = (known: boolean) => {
    const current = testWords[testIndex];
    if (!current) return;

    setTestResults(prev => ({
      ...prev,
      [current.w]: known ? 'known' : 'unknown'
    }));

    if (onUpdateWordStatus) {
      onUpdateWordStatus(current.w, known ? 'familiar' : 'unfamiliar');
    }

    if (testIndex + 1 >= testWords.length) {
      setTestFinished(true);
    } else {
      setTestIndex(i => i + 1);
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

  // Active Blind Spot Test UI
  if (isTestActive) {
    const currentTestWord = testWords[testIndex];
    const knownCount = Object.values(testResults).filter(v => v === 'known').length;
    const unknownCount = Object.values(testResults).filter(v => v === 'unknown').length;
    const estimatedCoverage = testWords.length > 0 ? Math.round((knownCount / testWords.length) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              考研词汇盲区快速自测
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsTestActive(false)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            退出摸底
          </button>
        </div>

        {testFinished ? (
          <div className="text-center py-6 space-y-5">
            <Award className="w-12 h-12 text-amber-500 mx-auto" />
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">摸底测验完成！</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">40 题抽样摸底分析报告</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs text-emerald-600">熟词</div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{knownCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <div className="text-xs text-rose-600">盲区生词</div>
                <div className="text-xl font-bold text-rose-700 dark:text-rose-300">{unknownCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <div className="text-xs text-indigo-600">估计掌握率</div>
                <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{estimatedCoverage}%</div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              测出的盲区词汇已自动标记为「生词」，可前往「生词本」或「今日复习」进行抗遗忘攻坚。
            </p>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={startBlindSpotTest}
                className="px-5 py-2.5 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> 再测一组
              </button>
              <button
                type="button"
                onClick={() => setIsTestActive(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                返回词汇统计
              </button>
            </div>
          </div>
        ) : currentTestWord ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>第 {testIndex + 1} / {testWords.length} 词</span>
              <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${((testIndex + 1) / testWords.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Word Card */}
            <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
                {currentTestWord.w}
              </div>
              {currentTestWord.phonetic && (
                <div className="text-xs font-mono text-slate-400">
                  {currentTestWord.phonetic}
                </div>
              )}
              <div className="text-xs text-slate-400">
                真题考频：出现 {currentTestWord.n} 次 · 涉及 {currentTestWord.years} 年真题
              </div>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTestChoice(true)}
                className="py-4 px-6 rounded-xl font-bold text-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> 认识 (熟词)
              </button>
              <button
                type="button"
                onClick={() => handleTestChoice(false)}
                className="py-4 px-6 rounded-xl font-bold text-sm bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" /> 不认识 (盲区)
              </button>
            </div>
          </div>
        ) : null}
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
            onClick={startBlindSpotTest}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap"
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
    </div>
  );
};
