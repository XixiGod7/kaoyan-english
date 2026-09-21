import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PhraseItem } from '../types/reading';
import { 
  Search, 
  Filter, 
  Volume2, 
  BookOpen, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import { recordPhraseDictateResult, loadPhraseDictateHistory } from '../utils/readingStorage';

interface PhrasesViewProps {
  onWordClick?: (word: string, rect: DOMRect) => void;
  onNavigateToReading?: (passKey: string) => void;
}

const PARTICLE_MAP: Record<string, string> = {
  other: '其他'
};

const PAGE_SIZE = 50;

function normalizePhrase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.．。]/g, '')
    .replace(/\bsomebody\b/g, 'sb')
    .replace(/\bsomething\b/g, 'sth')
    .replace(/[^a-z\s'/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const PhrasesView: React.FC<PhrasesViewProps> = ({
  onWordClick,
  onNavigateToReading
}) => {
  const [items, setItems] = useState<PhraseItem[]>([]);
  const [parts, setParts] = useState<{ k: string; n: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mode, setMode] = useState<'browse' | 'dictate'>('browse');
  const [selectedPart, setSelectedPart] = useState<string>('');
  const [realOnly, setRealOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedSents, setExpandedSents] = useState<Record<string, boolean>>({});

  // Dictate mode state
  const [dictateQueue, setDictateQueue] = useState<PhraseItem[]>([]);
  const [dictateIndex, setDictateIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [dictateScore, setDictateScore] = useState<number>(0);
  const [dictateFinished, setDictateFinished] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('./data/phrases/phrases_all.json');
        if (res.ok) {
          const json = await res.json();
          setItems(json.items || []);
          setParts(json.parts || []);
        }
      } catch (err) {
        console.error('Failed to load phrases data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedPart) {
      list = list.filter(it => it.part === selectedPart);
    }
    if (realOnly) {
      list = list.filter(it => !!it.sent);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(it => 
        (it.en && it.en.toLowerCase().includes(q)) ||
        (it.zh && it.zh.includes(q)) ||
        (it.sent && it.sent.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, selectedPart, realOnly, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

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

  const startDictation = useCallback(() => {
    let pool = filteredItems;
    if (pool.length === 0) pool = items;
    // Shuffle and pick 20
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
    setDictateQueue(shuffled);
    setDictateIndex(0);
    setUserInput('');
    setIsAnswerRevealed(false);
    setDictateScore(0);
    setDictateFinished(false);
  }, [filteredItems, items]);

  useEffect(() => {
    if (mode === 'dictate' && dictateQueue.length === 0 && items.length > 0) {
      startDictation();
    }
  }, [mode, items, dictateQueue.length, startDictation]);

  const handleDictateSubmit = () => {
    if (!userInput.trim() || isAnswerRevealed) return;
    const current = dictateQueue[dictateIndex];
    if (!current) return;

    const isMatch = normalizePhrase(userInput) === normalizePhrase(current.en);
    if (isMatch) {
      setDictateScore(s => s + 1);
    }
    recordPhraseDictateResult(current.en, isMatch);
    setIsAnswerRevealed(true);
  };

  const handleDictateNext = () => {
    if (dictateIndex + 1 >= dictateQueue.length) {
      setDictateFinished(true);
    } else {
      setDictateIndex(i => i + 1);
      setUserInput('');
      setIsAnswerRevealed(false);
    }
  };

  const getMaskedHint = (en: string) => {
    return en
      .split(/\s+/)
      .map(word => (word[0] || '') + '…')
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">正在加载高频真题词组库 (2540 词组)...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner & Mode Switch */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                考研英语一 · 历年高频词组
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {items.length} 词组
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              词组语义由小品词决定（如 give up / give in / give away 意义迥异）。按小品词横向分类记忆，击破阅读与翻译核心盲区。
            </p>
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('browse')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'browse'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> 📖 看表检索
            </button>
            <button
              type="button"
              onClick={() => { setMode('dictate'); startDictation(); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'dictate'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> ✍️ 默写自测
            </button>
          </div>
        </div>

        {/* Particles Filter Tabs */}
        {mode === 'browse' && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* Search and real-only filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="搜索英文短语、中文释义或真题出处例句..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => { setRealOnly(!realOnly); setCurrentPage(1); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  realOnly
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                只看真题出现过
              </button>
            </div>

            {/* Particle Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => { setSelectedPart(''); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedPart === ''
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                全部 ({items.length})
              </button>

              {parts.map(part => {
                const label = PARTICLE_MAP[part.k] || part.k;
                const isSelected = selectedPart === part.k;
                return (
                  <button
                    key={part.k}
                    type="button"
                    onClick={() => { setSelectedPart(part.k); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] ml-1 opacity-80`}>
                      {part.n}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mode 1: Browse Mode */}
      {mode === 'browse' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <div>
              找到 <b className="text-slate-800 dark:text-slate-200">{filteredItems.length}</b> 条词组
              {filteredItems.length > PAGE_SIZE && (
                <span> · 第 {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} 条</span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 120, behavior: 'smooth' }); }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  上一页
                </button>
                <span className="font-mono">{currentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 120, behavior: 'smooth' }); }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {pageItems.map((item, idx) => {
              const isSentOpen = !!expandedSents[item.en];
              return (
                <div
                  key={item.en + idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <b className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 tracking-wide select-text">
                        {item.en}
                      </b>
                      <button
                        type="button"
                        onClick={(e) => handleSpeak(item.en, e)}
                        title="朗读词组"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm text-slate-600 dark:text-slate-300 select-text">
                        {item.zh}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {item.part}
                      </span>
                      {item.sent && (
                        <button
                          type="button"
                          onClick={() => setExpandedSents(p => ({ ...p, [item.en]: !p[item.en] }))}
                          className={`text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors ${
                            isSentOpen
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                          }`}
                        >
                          <Award className="w-3 h-3" />
                          真题例句
                        </button>
                      )}
                    </div>
                  </div>

                  {isSentOpen && item.sent && (
                    <div className="mt-2 p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-lg text-xs space-y-1">
                      <div className="font-serif text-slate-800 dark:text-slate-200 leading-relaxed select-text">
                        {item.sent}
                      </div>
                      {item.sentZh && (
                        <div className="text-slate-600 dark:text-slate-400 select-text">
                          {item.sentZh}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 120, behavior: 'smooth' }); }}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                上一页
              </button>
              <span className="text-xs font-mono text-slate-500">
                第 {currentPage} 页 / 共 {totalPages} 页
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 120, behavior: 'smooth' }); }}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Dictation Mode */}
      {mode === 'dictate' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm max-w-2xl mx-auto space-y-6">
          {dictateFinished ? (
            <div className="text-center py-8 space-y-4">
              <Award className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                默写练习完成！
              </h3>
              <p className="text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {dictateScore} / {dictateQueue.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                默写比认读难得多，拼写有错的词组会自动强化记录。每天坚持一组，考场写作文和做翻译信手拈来！
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={startDictation}
                  className="px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5 mx-auto"
                >
                  <RotateCcw className="w-4 h-4" /> 再来一组 (20 词组)
                </button>
              </div>
            </div>
          ) : dictateQueue[dictateIndex] ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>默写自测 · 第 {dictateIndex + 1} / {dictateQueue.length} 条</span>
                <span>当前得分：{dictateScore}</span>
              </div>

              {/* Chinese Meaning */}
              <div className="text-center py-4">
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-2">
                  中文释义
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {dictateQueue[dictateIndex].zh}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-2">
                  提示首字母：{getMaskedHint(dictateQueue[dictateIndex].en)}
                </div>
              </div>

              {/* Input Box */}
              <div className="space-y-3">
                <input
                  type="text"
                  autoFocus
                  disabled={isAnswerRevealed}
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (!isAnswerRevealed) handleDictateSubmit();
                      else handleDictateNext();
                    }
                  }}
                  placeholder="在此输入英文词组（支持回车对答案）..."
                  className="w-full text-center text-lg font-serif py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {!isAnswerRevealed ? (
                  <button
                    type="button"
                    onClick={handleDictateSubmit}
                    disabled={!userInput.trim()}
                    className="w-full py-3 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-all"
                  >
                    对答案 (Enter)
                  </button>
                ) : (
                  <div className="space-y-4 pt-2">
                    {normalizePhrase(userInput) === normalizePhrase(dictateQueue[dictateIndex].en) ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>恭喜，完全正确！</span>
                      </div>
                    ) : (
                      <div className="space-y-2 text-center">
                        <div className="flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                          <XCircle className="w-5 h-5" />
                          <span>拼写有误</span>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          正确写法：<b className="font-serif text-base text-indigo-600 dark:text-indigo-400">{dictateQueue[dictateIndex].en}</b>
                        </div>
                      </div>
                    )}

                    {dictateQueue[dictateIndex].sent && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 text-left">
                        <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">真题出处例句：</div>
                        <div className="font-serif">{dictateQueue[dictateIndex].sent}</div>
                        {dictateQueue[dictateIndex].sentZh && (
                          <div className="mt-1 text-slate-500">{dictateQueue[dictateIndex].sentZh}</div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleDictateNext}
                      className="w-full py-3 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {dictateIndex + 1 >= dictateQueue.length ? '查看成绩' : '下一个词组 (Enter)'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
