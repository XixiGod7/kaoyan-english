import React, { useState, useEffect, useMemo } from 'react';
import { GrammarRow, GrammarResult } from '../types/reading';
import { 
  Search, 
  Filter, 
  Layers, 
  Sparkles, 
  Bookmark, 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  ArrowRight,
  Check
} from 'lucide-react';
import { isSentenceFavorited, saveFavoriteSentence, removeFavoriteSentence } from '../utils/readingStorage';

interface GrammarDrillViewProps {
  onWordClick?: (word: string, rect: DOMRect) => void;
  onNavigateToReading?: (passKey: string) => void;
}

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'attr', label: '定语从句' },
  { key: 'adv', label: '状语从句' },
  { key: 'nounclause', label: '名词性从句' },
  { key: 'coord', label: '并列结构' },
  { key: 'appos', label: '同位/插入语' },
  { key: 'special', label: '特殊结构' },
  { key: 'nonfinite', label: '非谓语动词' },
];

const PAGE_SIZE = 40;

export const GrammarDrillView: React.FC<GrammarDrillViewProps> = ({
  onWordClick,
  onNavigateToReading
}) => {
  const [data, setData] = useState<GrammarResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedSids, setExpandedSids] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('./data/grammar/grammar_all.json');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load grammar data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    if (!data || !data.rows) return [];
    let rows = data.rows;

    if (selectedCat !== 'all') {
      rows = rows.filter(r => (r as any).cats && (r as any).cats.includes(selectedCat));
    }

    if (debouncedQuery) {
      rows = rows.filter(r => 
        (r.s && r.s.toLowerCase().includes(debouncedQuery)) ||
        (r.zh && r.zh.includes(debouncedQuery)) ||
        (r.comp_type && r.comp_type.toLowerCase().includes(debouncedQuery)) ||
        (r.comp_note && r.comp_note.includes(debouncedQuery))
      );
    }

    return rows;
  }, [data, selectedCat, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const toggleExpand = (sid: string) => {
    setExpandedSids(prev => ({ ...prev, [sid]: !prev[sid] }));
  };

  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
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
          className="cursor-pointer hover:text-indigo-500 hover:underline transition-colors select-text"
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">正在加载语法点精析长难句库 (2009 句)...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner & Category Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              语法点专项检索与专练
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              共 2009 句拆解
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            按英语一核心考纲语法结构精选长难句。支持按分类专练、中英关键字全文检索及完整语法树剖析。
          </p>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜英文单词、从句关键词、中文释义或语法点说明..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              清空
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {CATEGORIES.map(cat => {
            const count = cat.key === 'all' 
              ? (data?.total || 2009) 
              : (data?.catCounts[cat.key] || 0);
            const isSelected = selectedCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => { setSelectedCat(cat.key); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Meta & Pager */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <div>
          找到 <b className="text-slate-800 dark:text-slate-200">{filteredRows.length}</b> 句长难句
          {filteredRows.length > PAGE_SIZE && (
            <span> · 第 {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} 句</span>
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

      {/* Grammar Row Cards */}
      <div className="space-y-4">
        {pageRows.map((row, idx) => {
          const passKey = `${row.year}-t${row.text_no}`;
          const isExpanded = !!expandedSids[row.sid];
          const isFavorited = isSentenceFavorited(row.sid);

          return (
            <div
              key={row.sid || idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              {/* Row Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {(row as any).labels?.join(' · ') || (row as any).cats?.join(' · ') || '长难句'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {row.year} 年 Text {row.text_no}
                  </span>
                  {row.comp_target && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                      修饰 → <code className="text-indigo-600 dark:text-indigo-400 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{row.comp_target}</code>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleSpeak(row.s, e)}
                    title="朗读"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isFavorited) {
                        removeFavoriteSentence(row.sid);
                      } else {
                        saveFavoriteSentence({
                          sid: row.sid,
                          s: row.s,
                          zh: row.zh,
                          trunk: row.trunk || {},
                          components: row.components || [],
                          year: row.year,
                          text_no: row.text_no,
                          addedAt: Date.now()
                        });
                      }
                      // force re-render
                      setData(prev => prev ? { ...prev } : null);
                    }}
                    title={isFavorited ? '取消收藏' : '收入难句本'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFavorited
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>

                  {onNavigateToReading && (
                    <button
                      type="button"
                      onClick={() => onNavigateToReading(passKey)}
                      title="去原文精读"
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 transition-colors ml-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">回原文</span>
                    </button>
                  )}
                </div>
              </div>

              {/* English Sentence */}
              <p className="font-serif text-base sm:text-lg leading-relaxed text-slate-900 dark:text-slate-100 select-text">
                {renderClickableTokens(row.s)}
              </p>

              {/* Chinese Translation */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 shrink-0">
                  全译
                </span>
                <span className="select-text">{row.zh}</span>
              </div>

              {/* Component breakdown snippet */}
              {row.comp_orig && (
                <div className="text-xs bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/40 space-y-1">
                  <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    考点结构片段：
                  </div>
                  <div className="font-serif text-slate-800 dark:text-slate-200 select-text">
                    {row.comp_orig}
                  </div>
                  {row.comp_zh && (
                    <div className="text-slate-600 dark:text-slate-400 select-text">
                      片段译文：{row.comp_zh}
                    </div>
                  )}
                  {row.comp_note && (
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] pt-0.5">
                      解析：{row.comp_note}
                    </div>
                  )}
                </div>
              )}

              {/* Toggle complete syntax tree if available */}
              {(row.trunk || (row.components && row.components.length > 0)) && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(row.sid)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{isExpanded ? '收起完整语法树拆解' : '查看完整语法树拆解 (主谓宾 + 其它修饰)'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2.5 text-xs">
                      {row.trunk && (
                        <div className="space-y-1.5">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 block">主干结构 (Trunk):</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {row.trunk['主语'] && (
                              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900/40">
                                <span className="font-bold text-sky-600 dark:text-sky-400 block mb-0.5">主语</span>
                                <span className="font-serif text-slate-800 dark:text-slate-200">{row.trunk['主语']}</span>
                              </div>
                            )}
                            {row.trunk['谓语'] && (
                              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900/40">
                                <span className="font-bold text-rose-600 dark:text-rose-400 block mb-0.5">谓语</span>
                                <span className="font-serif text-slate-800 dark:text-slate-200">{row.trunk['谓语']}</span>
                              </div>
                            )}
                            {row.trunk['宾语或表语'] && (
                              <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-indigo-100 dark:border-indigo-900/40">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">宾语/表语</span>
                                <span className="font-serif text-slate-800 dark:text-slate-200">{row.trunk['宾语或表语']}</span>
                              </div>
                            )}
                          </div>
                          {row.trunk['主干翻译'] && (
                            <div className="text-indigo-950 dark:text-indigo-200 pt-1">
                              <b>主干翻译：</b>{row.trunk['主干翻译']}
                            </div>
                          )}
                        </div>
                      )}

                      {row.components && row.components.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                          <span className="font-bold text-slate-600 dark:text-slate-400 block">从属与修饰成分:</span>
                          {row.components.map((c, i) => (
                            <div key={i} className="bg-white/80 dark:bg-slate-800/80 p-2 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="font-bold text-amber-600 dark:text-amber-400 mr-2">[{c['成分类型']}]</span>
                              {c['修饰对象'] && <span className="text-slate-400 mr-2">修饰: {c['修饰对象']}</span>}
                              <div className="font-serif text-slate-800 dark:text-slate-200">{c['原文']}</div>
                              <div className="text-slate-600 dark:text-slate-300">{c['中文翻译']}</div>
                              {c['说明'] && <div className="text-slate-400 text-[11px]">{c['说明']}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Pager */}
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
  );
};
