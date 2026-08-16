import React, { useState, useMemo } from 'react';
import { WordFreqItem } from '../types/kaoyan';

interface WordFreqSidebarProps {
  words: WordFreqItem[];
  onSelectWord: (item: WordFreqItem | null) => void;
  selectedWord: WordFreqItem | null;
  onToggleStatus: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
  theme?: 'dark' | 'light';
}

export const WordFreqSidebar: React.FC<WordFreqSidebarProps> = ({
  words,
  onSelectWord,
  selectedWord,
  onToggleStatus,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unfamiliar' | 'familiar' | 'unknown'>('all');

  // Counts
  const stats = useMemo(() => {
    let familiar = 0;
    let unfamiliar = 0;
    let unknown = 0;
    words.forEach(w => {
      if (w.status === 'familiar') familiar++;
      else if (w.status === 'unfamiliar') unfamiliar++;
      else unknown++;
    });
    return { familiar, unfamiliar, unknown };
  }, [words]);

  // Filtered list
  const filteredWords = useMemo(() => {
    return words.filter(w => {
      const matchSearch = w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.entry.definition_cn.includes(searchTerm);
      const matchType = filterType === 'all' || w.status === filterType;
      return matchSearch && matchType;
    });
  }, [words, searchTerm, filterType]);

  return (
    <aside className={`w-64 flex-shrink-0 border-r flex flex-col h-full overflow-hidden transition-colors duration-200 ${
      isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-gray-200 bg-white text-gray-900'
    }`}>
      {/* Top Banner Aligned with ExamWall */}
      <div className={`h-[53px] px-3.5 border-b flex items-center justify-between flex-shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-sm font-black tracking-tight flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          <span>📚</span> 重点词汇考频
        </h2>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
          isDark ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-blue-50 text-blue-600 border border-blue-100'
        }`}>
          762 词
        </span>
      </div>

      {/* Filter & Search Bar Section */}
      <div className={`p-2.5 border-b flex-shrink-0 ${isDark ? 'border-slate-800 bg-slate-850/90' : 'border-gray-200 bg-gray-50/70'}`}>
        {/* 3 Status Counters */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <button
            onClick={() => setFilterType(filterType === 'familiar' ? 'all' : 'familiar')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
              filterType === 'familiar'
                ? isDark
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-200'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-emerald-950/40'
                : 'bg-white border-gray-200 text-emerald-600 hover:bg-emerald-50/50'
            }`}
          >
            <div>熟词</div>
            <div className={`text-base font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.familiar}</div>
          </button>

          <button
            onClick={() => setFilterType(filterType === 'unfamiliar' ? 'all' : 'unfamiliar')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
              filterType === 'unfamiliar'
                ? isDark
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300 ring-2 ring-rose-500/50'
                  : 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-200'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-rose-950/40'
                : 'bg-white border-gray-200 text-rose-600 hover:bg-rose-50/50'
            }`}
          >
            <div>生词</div>
            <div className={`text-base font-black ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{stats.unfamiliar}</div>
          </button>

          <button
            onClick={() => setFilterType(filterType === 'unknown' ? 'all' : 'unknown')}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
              filterType === 'unknown'
                ? isDark
                  ? 'bg-slate-700 border-slate-500 text-slate-100 ring-2 ring-slate-400/50'
                  : 'bg-gray-100 border-gray-300 text-gray-800 ring-2 ring-gray-200'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <div>未标</div>
            <div className={`text-base font-black ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{stats.unknown}</div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-2 relative">
          <input
            type="text"
            placeholder="搜索高频词/中文..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full px-2.5 py-1 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Word Scroll List */}
      <div className="flex-1 overflow-y-auto">
        {filteredWords.length === 0 ? (
          <div className={`p-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>未搜到匹配单词</div>
        ) : (
          filteredWords.map(item => {
            const isSelected = selectedWord?.word === item.word;
            return (
              <div
                key={item.word}
                id={`word-item-${item.word}`}
                onClick={() => {
                  if (isSelected) {
                    onSelectWord(null);
                  } else {
                    onSelectWord(item);
                  }
                }}
                title={isSelected ? "已选定（再次点击取消选定）" : "点击选定并在真题库中高亮"}
                className={`relative p-2.5 pl-3.5 flex items-center justify-between cursor-pointer transition-all border-b ${
                  isSelected 
                    ? isDark 
                      ? 'bg-slate-800 text-blue-300 font-bold border-slate-700 shadow-sm' 
                      : 'bg-blue-50/90 text-blue-900 font-bold border-blue-100 shadow-2xs'
                    : isDark 
                    ? 'border-slate-850 hover:bg-slate-800/50 text-slate-300' 
                    : 'border-gray-100 hover:bg-blue-50/40 text-gray-700'
                }`}
              >
                {/* Unified Left Selection Indicator Bar */}
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 dark:bg-blue-500 rounded-r-xs" />
                )}

                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-extrabold truncate ${
                      isDark ? (isSelected ? 'text-blue-300' : 'text-slate-100') : (isSelected ? 'text-blue-900' : 'text-gray-900')
                    }`}>
                      {item.word}
                    </span>
                    {isSelected && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        isDark ? 'bg-blue-950 text-blue-300 border border-blue-700' : 'bg-blue-600 text-white'
                      }`}>
                        已选
                      </span>
                    )}
                    {item.status === 'familiar' && (
                      <span className={`text-[10px] px-1 rounded font-semibold ${isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' : 'bg-emerald-100 text-emerald-700'}`}>熟</span>
                    )}
                    {item.status === 'unfamiliar' && (
                      <span className={`text-[10px] px-1 rounded font-semibold ${isDark ? 'bg-rose-950 text-rose-300 border border-rose-800/50' : 'bg-rose-100 text-rose-700'}`}>生</span>
                    )}
                  </div>
                  <span className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                    {item.entry.definition_cn}
                  </span>
                </div>

                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400 group-hover:text-blue-400' : 'text-gray-500 group-hover:text-blue-600'}`}>
                    {item.paperCount}篇/{item.totalCount}次
                  </span>
                  
                  {/* Mark Actions */}
                  <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="标记为熟词"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(item.word, item.status === 'familiar' ? 'unknown' : 'familiar');
                      }}
                      className={`text-[10px] px-1 rounded border ${
                        item.status === 'familiar' ? 'bg-emerald-600 text-white' : isDark ? 'bg-slate-800 text-emerald-400 border-emerald-600/50' : 'bg-white text-emerald-600 border-emerald-300'
                      }`}
                    >
                      熟
                    </button>
                    <button
                      title="标记为生词"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(item.word, item.status === 'unfamiliar' ? 'unknown' : 'unfamiliar');
                      }}
                      className={`text-[10px] px-1 rounded border ${
                        item.status === 'unfamiliar' ? 'bg-rose-600 text-white' : isDark ? 'bg-slate-800 text-rose-400 border-rose-600/50' : 'bg-white text-rose-600 border-rose-300'
                      }`}
                    >
                      生
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
