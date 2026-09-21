import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Brain, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { WordFreqItem } from '../types/kaoyan';
import { EbbinghausWordRecord, STAGE_LABELS } from '../utils/ebbinghaus';

interface WordFreqSidebarProps {
  words: WordFreqItem[];
  onSelectWord: (item: WordFreqItem | null) => void;
  selectedWord: WordFreqItem | null;
  onToggleStatus: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
  onOpenEbbinghaus?: () => void;
  ebbinghausRecords?: Record<string, EbbinghausWordRecord>;
  dueReviewCount?: number;
  theme?: 'dark' | 'light';
}

export const WordFreqSidebar: React.FC<WordFreqSidebarProps> = ({
  words,
  onSelectWord,
  selectedWord,
  onToggleStatus,
  onOpenEbbinghaus,
  ebbinghausRecords,
  dueReviewCount,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unfamiliar' | 'due' | 'familiar' | 'unknown'>('all');

  // Collapse state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kaoyan_wordfreq_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = (nextState: boolean) => {
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('kaoyan_wordfreq_sidebar_collapsed', String(nextState));
    } catch (e) {
      console.error(e);
    }
  };

  const now = Date.now();

  // Counts & stats
  const { familiarCount, unfamiliarCount, unknownCount, calculatedDueCount } = useMemo(() => {
    let familiar = 0;
    let unfamiliar = 0;
    let unknown = 0;
    let due = 0;

    words.forEach(w => {
      if (w.status === 'familiar') familiar++;
      else if (w.status === 'unfamiliar') unfamiliar++;
      else unknown++;

      const rec = ebbinghausRecords?.[w.word];
      if (rec && rec.nextReviewTime <= now && rec.stage < 8) {
        due++;
      }
    });

    return { 
      familiarCount: familiar, 
      unfamiliarCount: unfamiliar, 
      unknownCount: unknown,
      calculatedDueCount: due
    };
  }, [words, ebbinghausRecords, now]);

  const effectiveDueCount = dueReviewCount !== undefined ? dueReviewCount : calculatedDueCount;

  // Filtered list
  const filteredWords = useMemo(() => {
    return words.filter(w => {
      const matchSearch = w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.entry.definition_cn.includes(searchTerm);
      
      let matchType = true;
      if (filterType === 'familiar') matchType = w.status === 'familiar';
      else if (filterType === 'unfamiliar') matchType = w.status === 'unfamiliar';
      else if (filterType === 'unknown') matchType = w.status === 'unknown';
      else if (filterType === 'due') {
        const rec = ebbinghausRecords?.[w.word];
        matchType = Boolean(rec && rec.nextReviewTime <= now && rec.stage < 8);
      }

      return matchSearch && matchType;
    });
  }, [words, searchTerm, filterType, ebbinghausRecords, now]);

  // COLLAPSED VIEW
  if (isCollapsed) {
    return (
      <aside className={`w-11 sm:w-12 flex-shrink-0 border-r flex flex-col items-center py-2.5 h-full select-none transition-all duration-300 ease-in-out ${
        isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-gray-200 bg-white text-gray-900'
      }`}>
        {/* Expand button at top */}
        <button
          onClick={() => toggleCollapse(false)}
          title="展开重点词汇侧边栏 (762词)"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
        >
          <ChevronRight className="w-4 h-4 text-blue-500" />
        </button>

        {/* Vertical rail trigger to expand */}
        <div
          onClick={() => toggleCollapse(false)}
          className={`flex-1 w-full flex flex-col items-center justify-start gap-3.5 py-4 cursor-pointer group transition-colors ${
            isDark ? 'hover:bg-slate-850' : 'hover:bg-gray-50'
          }`}
          title="点击展开重点词汇侧边栏"
        >
          <span className="text-sm">📚</span>
          
          <div className={`text-[11px] font-black tracking-widest flex flex-col items-center leading-4 select-none ${
            isDark ? 'text-slate-300 group-hover:text-blue-400' : 'text-gray-700 group-hover:text-blue-600'
          }`}>
            <span>重</span>
            <span>点</span>
            <span>词</span>
            <span>汇</span>
          </div>

          <span className={`text-[10px] font-mono font-black px-1 py-0.5 rounded-full ${
            isDark ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-blue-50 text-blue-600 border border-blue-200'
          }`}>
            762
          </span>

          {unfamiliarCount > 0 && (
            <div 
              className="mt-2 w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black flex items-center justify-center"
              title={`重点生词: ${unfamiliarCount}个`}
            >
              生{unfamiliarCount > 99 ? '99+' : unfamiliarCount}
            </div>
          )}

          {effectiveDueCount > 0 && (
            <div 
              className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-black flex items-center justify-center animate-pulse"
              title={`艾宾浩斯待复习: ${effectiveDueCount}个`}
            >
              复{effectiveDueCount > 99 ? '99+' : effectiveDueCount}
            </div>
          )}
        </div>

        {/* Ebbinghaus Quick Button at bottom */}
        {onOpenEbbinghaus && (
          <button
            onClick={onOpenEbbinghaus}
            title={`打开艾宾浩斯抗遗忘背词 (${effectiveDueCount} 待复习)`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-colors ${
              isDark 
                ? 'bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-300' 
                : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700'
            }`}
          >
            <Brain className="w-4 h-4" />
            {effectiveDueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-900" />
            )}
          </button>
        )}
      </aside>
    );
  }

  // EXPANDED VIEW
  return (
    <aside className={`w-72 sm:w-80 flex-shrink-0 border-r flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${
      isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-gray-200 bg-white text-gray-900'
    }`}>
      {/* Top Banner Aligned with ExamWall */}
      <div className={`h-[53px] px-3.5 border-b flex items-center justify-between flex-shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <h2 className={`text-sm font-black tracking-tight flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            <span>📚</span> 重点词汇考频
          </h2>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
            isDark ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
            762 词
          </span>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => toggleCollapse(true)}
          title="向左收起词汇侧边栏"
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-0.5 text-xs font-bold ${
            isDark 
              ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[11px]">收起</span>
        </button>
      </div>

      {/* Ebbinghaus Quick Link Bridge Banner */}
      {onOpenEbbinghaus && (
        <div className={`px-3 py-2 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? 'bg-indigo-950/40 border-indigo-950/70' : 'bg-indigo-50/70 border-indigo-100'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className={`text-xs font-bold truncate ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
              艾宾浩斯单词复习联动
            </span>
          </div>
          <button
            onClick={onOpenEbbinghaus}
            className="px-2 py-0.5 rounded-md text-[11px] font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors flex items-center gap-1 shrink-0"
            title="点击打开顶部艾宾浩斯抗遗忘背词"
          >
            <span>进入背词</span>
            {effectiveDueCount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                {effectiveDueCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filter & Search Bar Section */}
      <div className={`p-2.5 border-b flex-shrink-0 ${isDark ? 'border-slate-800 bg-slate-850/90' : 'border-gray-200 bg-gray-50/70'}`}>
        {/* Status Filter Tabs */}
        <div className="grid grid-cols-4 gap-1 text-center">
          <button
            onClick={() => setFilterType('all')}
            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              filterType === 'all'
                ? isDark
                  ? 'bg-blue-950/80 border-blue-500 text-blue-300 ring-2 ring-blue-500/40'
                  : 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-200'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div>全部</div>
            <div className={`text-sm font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>762</div>
          </button>

          <button
            onClick={() => setFilterType(filterType === 'unfamiliar' ? 'all' : 'unfamiliar')}
            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all ${
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
            <div className={`text-sm font-black ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{unfamiliarCount}</div>
          </button>

          <button
            onClick={() => setFilterType(filterType === 'due' ? 'all' : 'due')}
            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              filterType === 'due'
                ? isDark
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-2 ring-amber-500/50'
                  : 'bg-amber-50 border-amber-300 text-amber-700 ring-2 ring-amber-200'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-amber-950/40'
                : 'bg-white border-gray-200 text-amber-600 hover:bg-amber-50/50'
            }`}
          >
            <div>待复习</div>
            <div className={`text-sm font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{effectiveDueCount}</div>
          </button>

          <button
            onClick={() => setFilterType(filterType === 'familiar' ? 'all' : 'familiar')}
            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all ${
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
            <div className={`text-sm font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{familiarCount}</div>
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
          <div className={`p-6 text-center text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            未搜到匹配单词
          </div>
        ) : (
          filteredWords.map(item => {
            const isSelected = selectedWord?.word === item.word;
            const ebbinghausRec = ebbinghausRecords?.[item.word];
            const isDue = Boolean(ebbinghausRec && ebbinghausRec.nextReviewTime <= now && ebbinghausRec.stage < 8);
            const stageLabel = ebbinghausRec ? STAGE_LABELS[ebbinghausRec.stage] : null;

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
                className={`group relative p-2.5 pl-3.5 flex items-center justify-between cursor-pointer transition-all border-b ${
                  isSelected 
                    ? isDark 
                      ? 'bg-slate-800 text-blue-300 font-bold border-slate-700 shadow-sm' 
                      : 'bg-blue-50/90 text-blue-900 font-bold border-blue-100 shadow-2xs'
                    : isDark 
                    ? 'border-slate-850 hover:bg-slate-800/50 text-slate-300' 
                    : 'border-gray-100 hover:bg-blue-50/40 text-gray-700'
                }`}
              >
                {/* Left Selection Indicator Bar */}
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

                    {/* Ebbinghaus Stage Tag */}
                    {stageLabel && ebbinghausRec && (
                      <span className={`text-[9px] px-1 py-0.2 rounded border font-mono ${
                        ebbinghausRec.stage >= 8
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`} title={`艾宾浩斯阶段: ${stageLabel.name} (${stageLabel.desc})`}>
                        {stageLabel.name.slice(0, 2)}
                      </span>
                    )}

                    {/* Due Badge */}
                    {isDue && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold flex items-center gap-0.5" title="到期需复习">
                        <Clock className="w-2.5 h-2.5" />
                        复
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                    {item.entry.definition_cn}
                  </span>
                </div>

                {/* Right Side: Frequency and Quick Toggle Buttons */}
                <div className="flex flex-col items-end flex-shrink-0 gap-1">
                  <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {item.paperCount}篇/{item.totalCount}次
                  </span>
                  
                  {/* Instant Status Mark Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={item.status === 'familiar' ? "取消熟词标记" : "标记为熟词（同步设为已掌握）"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(item.word, item.status === 'familiar' ? 'unknown' : 'familiar');
                      }}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                        item.status === 'familiar' 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                          : isDark 
                          ? 'bg-slate-800/80 hover:bg-emerald-950 text-emerald-400 border-slate-700 hover:border-emerald-600' 
                          : 'bg-white hover:bg-emerald-50 text-emerald-700 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      熟
                    </button>
                    <button
                      type="button"
                      title={item.status === 'unfamiliar' ? "取消生词标记" : "标记为生词（同步加入今日背词）"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(item.word, item.status === 'unfamiliar' ? 'unknown' : 'unfamiliar');
                      }}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                        item.status === 'unfamiliar' 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                          : isDark 
                          ? 'bg-slate-800/80 hover:bg-rose-950 text-rose-400 border-slate-700 hover:border-rose-600' 
                          : 'bg-white hover:bg-rose-50 text-rose-700 border-gray-200 hover:border-rose-300'
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
