import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shuffle, 
  Sparkles, 
  Send, 
  Volume2, 
  Bookmark, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Copy, 
  CheckCheck, 
  Loader2, 
  RotateCcw,
  BookOpen,
  Filter,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { loadAiConfig } from '../utils/aiConfigStorage';
import { sendChatCompletion } from '../utils/aiClient';
import { isSentenceFavorited, saveFavoriteSentence, removeFavoriteSentence } from '../utils/readingStorage';
import { PassageSentence } from '../types/reading';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FontSizeLevel, FONT_SIZE_CONFIGS } from '../utils/fontSize';

interface SentenceReviewViewProps {
  theme?: 'dark' | 'light';
  onWordClick?: (word: string, rect: DOMRect) => void;
  onNavigateToReading?: (passKey: string) => void;
  fontSizeLevel?: FontSizeLevel;
}

interface GrammarRow {
  sid: string;
  key: string;
  year: number;
  text_no: number;
  s: string;
  zh: string;
  cats: string[];
  labels: string[];
}

interface GrammarData {
  total: number;
  catCounts: Record<string, number>;
  rows: GrammarRow[];
}

export const SentenceReviewView: React.FC<SentenceReviewViewProps> = ({
  theme = 'dark',
  onWordClick,
  onNavigateToReading,
  fontSizeLevel = 'base',
}) => {
  const isDark = theme === 'dark';
  const [allRows, setAllRows] = useState<GrammarRow[]>([]);
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [yearFilter, setYearFilter] = useState<'all' | 'recent5' | 'recent10' | 'early'>('recent5');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [batchSize, setBatchSize] = useState<number>(5);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Sampled items
  const [sampledRows, setSampledRows] = useState<GrammarRow[]>([]);
  // User input translations: { [sid]: string }
  const [userTranslations, setUserTranslations] = useState<Record<string, string>>({});
  // Revealed translation / details: { [sid]: boolean }
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  // Loaded syntax details: { [sid]: PassageSentence }
  const [detailsMap, setDetailsMap] = useState<Record<string, PassageSentence>>({});
  const [loadingDetailSid, setLoadingDetailSid] = useState<string | null>(null);
  // Favorites
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // AI Q&A states
  const [activeAiSid, setActiveAiSid] = useState<string | null>(null);
  const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({});
  const [aiResponses, setAiResponses] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiFolded, setAiFolded] = useState<Record<string, boolean>>({});
  const [copiedSid, setCopiedSid] = useState<string | null>(null);

  // 1. Fetch grammar data
  useEffect(() => {
    fetch('./data/grammar/grammar_all.json')
      .then(res => res.json())
      .then((data: GrammarData) => {
        setAllRows(data.rows || []);
        setCatCounts(data.catCounts || {});
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load grammar data:', err);
        setLoading(false);
      });
  }, []);

  // 2. Filter available rows
  const filteredRows = useMemo(() => {
    return allRows.filter(r => {
      // Year filter
      if (yearFilter === 'recent5' && r.year < 2022) return false;
      if (yearFilter === 'recent10' && r.year < 2017) return false;
      if (yearFilter === 'early' && r.year >= 2017) return false;

      // Category filter
      if (selectedCat !== 'all') {
        const matchesCat = r.cats && r.cats.includes(selectedCat);
        const matchesLabel = r.labels && r.labels.includes(selectedCat);
        if (!matchesCat && !matchesLabel) return false;
      }

      return true;
    });
  }, [allRows, yearFilter, selectedCat]);

  // 3. Shuffle / Sample function
  const sampleBatch = () => {
    if (filteredRows.length === 0) {
      setSampledRows([]);
      return;
    }
    const shuffled = [...filteredRows].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, batchSize);
    setSampledRows(selected);
    setCurrentCardIndex(0);
    setRevealed({});
    setAiResponses({});
    setActiveAiSid(null);

    // check favorites
    const favMap: Record<string, boolean> = {};
    selected.forEach(r => {
      favMap[r.sid] = isSentenceFavorited(r.sid);
    });
    setFavorites(favMap);
  };

  // Resample when filtered pool or batch size changes
  useEffect(() => {
    if (!loading && filteredRows.length > 0) {
      sampleBatch();
    }
  }, [loading, yearFilter, selectedCat, batchSize]);

  // Load detailed syntax breakdown for a sentence
  const handleLoadDetails = async (row: GrammarRow) => {
    if (detailsMap[row.sid]) return;
    setLoadingDetailSid(row.sid);
    try {
      const res = await fetch(`./data/reading/details/${row.key}.json`);
      if (res.ok) {
        const data = await res.json();
        const found = (data.sentences || []).find((s: PassageSentence) => s.sid === row.sid);
        if (found) {
          setDetailsMap(prev => ({ ...prev, [row.sid]: found }));
        }
      }
    } catch (e) {
      console.error('Failed to load sentence syntax tree:', e);
    } finally {
      setLoadingDetailSid(null);
    }
  };

  // TTS audio playback
  const handleSpeak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  // Toggle favorite
  const handleToggleFav = (row: GrammarRow) => {
    const isFav = favorites[row.sid];
    if (isFav) {
      removeFavoriteSentence(row.sid);
      setFavorites(prev => ({ ...prev, [row.sid]: false }));
    } else {
      saveFavoriteSentence({
        sid: row.sid,
        s: row.s,
        zh: row.zh,
        year: row.year,
        text_no: row.text_no,
        addedAt: Date.now()
      });
      setFavorites(prev => ({ ...prev, [row.sid]: true }));
    }
  };

  // AI Q&A / translation feedback
  const handleAskAi = async (row: GrammarRow, customQuery?: string) => {
    const q = customQuery || aiPrompts[row.sid] || '请点评我的译文并剖析句子核心修饰主干';
    const userTrans = userTranslations[row.sid] || '（未输入作答）';
    const config = loadAiConfig();

    setAiLoading(prev => ({ ...prev, [row.sid]: true }));
    setAiResponses(prev => ({ ...prev, [row.sid]: '' }));

    try {
      const systemPrompt = `你是一位专注考研英语一的资深名师。
考生正在进行【考研长难句专项强化训练】。
当前长难句信息：
【出处】：${row.year} 年考研英语一 Text ${row.text_no}
【英文原句】：${row.s}
【官方参考译文】：${row.zh}
【考查语法标签】：${(row.labels || []).join('、')}
【考生自主翻译】：${userTrans}

请针对考生的作答与具体提问进行点拨：
1. 若考生提供了翻译，严格对比官方标准，明确指出得分点与失分点（漏译、错译、语序不当等）。
2. 拆解句中重点语法结构与主从句修饰关系。
3. 给出地道高分翻译及提分技巧点拨。
格式要求排版整洁清晰，采用 Markdown 格式。`;

      await sendChatCompletion(
        config,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: q }
        ],
        (_chunk, full) => {
          setAiResponses(prev => ({ ...prev, [row.sid]: full }));
        }
      );
    } catch (err: any) {
      setAiResponses(prev => ({
        ...prev,
        [row.sid]: `⚠️ AI 答疑请求失败: ${err?.message || '请检查 AI 接口与配置'}`
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [row.sid]: false }));
    }
  };

  // Render clickable tokens
  const renderTokens = (text: string) => {
    const tokens = text.split(/(\s+|[.,!?;:"'()[\]{}])/);
    return tokens.map((token, i) => {
      const isWord = /^[a-zA-Z]+(-[a-zA-Z]+)*$/.test(token);
      if (!isWord || !onWordClick) {
        return <span key={i}>{token}</span>;
      }
      return (
        <span
          key={i}
          className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors select-text"
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">正在加载考研长难句题库 (2000+ 真题句)...</p>
      </div>
    );
  }

  // Common single sentence card renderer
  const renderSentenceCard = (row: GrammarRow, index: number, totalCount: number) => {
    const isRevealed = revealed[row.sid];
    const details = detailsMap[row.sid];
    const isFav = favorites[row.sid];
    const aiResp = aiResponses[row.sid];
    const isAiBusy = aiLoading[row.sid];
    const isAiOpen = activeAiSid === row.sid;

    return (
      <div 
        key={row.sid}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden mb-6 transition-all"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {row.year} 年 Text {row.text_no}
            </span>
            {(row.labels || []).map((lbl, li) => (
              <span 
                key={li}
                className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40"
              >
                {lbl}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSpeak(row.s)}
              title="朗读原句"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToggleFav(row)}
              title={isFav ? '移出难句本' : '收藏到难句本'}
              className={`p-1.5 rounded-lg transition-colors ${
                isFav 
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' 
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
            {onNavigateToReading && (
              <button
                onClick={() => onNavigateToReading(row.key)}
                title="前往精读原文"
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* English Sentence Area */}
        <div className="p-5">
          <div className={`font-serif tracking-normal leading-relaxed text-slate-900 dark:text-slate-100 mb-4 select-text ${FONT_SIZE_CONFIGS[fontSizeLevel || 'base'].passageText}`}>
            {renderTokens(row.s)}
          </div>

          {/* User Translation Input Area */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
              <span>✍️ 自主翻译打卡 (限时自我检测)：</span>
              <span className="text-[11px] text-slate-400">
                {(userTranslations[row.sid] || '').length} 字
              </span>
            </label>
            <textarea
              rows={2}
              value={userTranslations[row.sid] || ''}
              onChange={(e) => setUserTranslations({ ...userTranslations, [row.sid]: e.target.value })}
              placeholder="在此输入你的中文翻译（支持双击句中生词查看词典释义）..."
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-y"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setRevealed(prev => ({ ...prev, [row.sid]: !prev[row.sid] }));
                  if (!revealed[row.sid]) {
                    handleLoadDetails(row);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isRevealed
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                {isRevealed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {isRevealed ? '收起参考答案' : '查看参考译文与拆解'}
              </button>

              <button
                onClick={() => setActiveAiSid(isAiOpen ? null : row.sid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                  isAiOpen 
                    ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                AI 助教答疑 / 批改
              </button>
            </div>
          </div>

          {/* Revealed Translation & Breakdown */}
          {isRevealed && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-sm leading-relaxed mb-3">
                <span className="font-semibold block text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                  【官方参考标准译文】：
                </span>
                {row.zh}
              </div>

              {/* Detailed syntax tree if available */}
              {loadingDetailSid === row.sid ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  正在解析长难句树状语法成分...
                </div>
              ) : details && (details.trunk || (details.components && details.components.length > 0)) ? (
                <div className="space-y-3 mt-3">
                  {/* Trunk */}
                  {details.trunk && (
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        句子核心骨干主干 (Core Trunk)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                        {details.trunk['主语'] && (
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 block text-[10px]">主语:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{details.trunk['主语']}</span>
                          </div>
                        )}
                        {details.trunk['谓语'] && (
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 block text-[10px]">谓语:</span>
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">{details.trunk['谓语']}</span>
                          </div>
                        )}
                        {details.trunk['宾语或表语'] && (
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 block text-[10px]">宾语/表语:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{details.trunk['宾语或表语']}</span>
                          </div>
                        )}
                      </div>
                      {details.trunk['主干翻译'] && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="text-slate-400">主干翻译：</span>
                          {details.trunk['主干翻译']}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modifiers */}
                  {details.components && details.components.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        修饰与附加从句 ({details.components.length} 个):
                      </div>
                      {details.components.map((comp, ci) => (
                        <div 
                          key={ci} 
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                              {comp['成分类型']}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                              修饰: {comp['修饰对象']}
                            </span>
                          </div>
                          <div className="font-mono text-slate-800 dark:text-slate-200">
                            "{comp['原文']}"
                          </div>
                          {comp['说明'] && (
                            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                              解析: {comp['说明']}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* AI Q&A Panel */}
          {isAiOpen && (
            <div className="mt-4 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/25 dark:bg-indigo-950/20 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100/80 dark:border-indigo-900/40">
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  AI 考研长难句名师答疑 (DeepSeek-V4-Flash)
                </span>

                <div className="flex items-center gap-1.5">
                  {aiResp && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiResp);
                        setCopiedSid(row.sid);
                        setTimeout(() => setCopiedSid(null), 2000);
                      }}
                      className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-indigo-500 mr-1 cursor-pointer"
                    >
                      {copiedSid === row.sid ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedSid === row.sid ? '已复制' : '复制'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAiFolded(prev => ({ ...prev, [row.sid]: !prev[row.sid] }))}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    title={aiFolded[row.sid] ? '展开 AI 答疑内容' : '折叠 AI 答疑内容'}
                  >
                    <span>{aiFolded[row.sid] ? '展开' : '收起'}</span>
                    {aiFolded[row.sid] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {!aiFolded[row.sid] && (
                <>
                  {/* Quick Prompt Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {[
                      '✍️ 点评我的自主翻译',
                      '🔍 剖析主从句修饰关系',
                      '🎯 提炼句中考研重点难词',
                      '💡 梳理长难句翻译避坑要点'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={isAiBusy}
                        onClick={() => {
                          setAiPrompts({ ...aiPrompts, [row.sid]: chip });
                          handleAskAi(row, chip);
                        }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition-colors shadow-xs cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Custom Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={aiPrompts[row.sid] || ''}
                      onChange={(e) => setAiPrompts({ ...aiPrompts, [row.sid]: e.target.value })}
                      placeholder="针对本句向 AI 老师提问（如：如何翻译其中的倒装结构？）..."
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isAiBusy) {
                          handleAskAi(row);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={isAiBusy}
                      onClick={() => handleAskAi(row)}
                      className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {isAiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      发送
                    </button>
                  </div>

                  {/* AI Output with MarkdownRenderer */}
                  {aiResp ? (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-xs">
                      <MarkdownRenderer content={aiResp} isDark={isDark} />
                    </div>
                  ) : isAiBusy ? (
                    <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 text-xs text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      AI 正在深度分析句子语序与修饰逻辑，请稍候...
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Top Filter & Settings Header */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              长难句专项复习与真题抽测
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              精选 2001-2026 年考研英语一真题中 2,000+ 道核心长难句，支持随机抽题、断句拆解与 AI 智能打分
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={sampleBatch}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all hover:scale-102 active:scale-98"
            >
              <Shuffle className="w-3.5 h-3.5" />
              换一批
            </button>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === 'card' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                单题卡片
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                试卷列表
              </button>
            </div>
          </div>
        </div>

        {/* Filters Controls */}
        <div className="pt-4 flex flex-wrap items-center gap-4 text-xs">
          {/* Year Range */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">年份范围:</span>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950">
              {[
                { id: 'recent5', label: '近5年 (22-26)' },
                { id: 'recent10', label: '近10年 (17-26)' },
                { id: 'all', label: '全部年份' },
                { id: 'early', label: '早年 (01-16)' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setYearFilter(item.id as any)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    yearFilter === item.id
                      ? 'bg-indigo-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grammar Category */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">语法考点:</span>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">全部考点 ({filteredRows.length} 句)</option>
              <option value="定语从句">定语从句</option>
              <option value="状语从句">状语从句</option>
              <option value="名词性从句">名词性从句 (主/宾/表/同位语)</option>
              <option value="非谓语动词">非谓语动词 (分词/不定式/动名词)</option>
              <option value="插入语">插入语</option>
              <option value="倒装">倒装句</option>
              <option value="强调">强调句</option>
              <option value="比较">比较结构</option>
            </select>
          </div>

          {/* Batch Size */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">抽题题量:</span>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950">
              {[5, 10, 15, 20].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setBatchSize(cnt)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    batchSize === cnt
                      ? 'bg-indigo-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {cnt} 题
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {sampledRows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <Filter className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
            未找到符合筛选条件的长难句
          </p>
          <p className="text-xs text-slate-400 mb-4">
            请尝试调整年份范围或选择“全部考点”以扩充题库
          </p>
          <button
            onClick={() => {
              setYearFilter('all');
              setSelectedCat('all');
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
          >
            重置筛选条件
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* Step-by-Step Card Mode */
        <div>
          {/* Card progress banner */}
          <div className="flex items-center justify-between px-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                第 {currentCardIndex + 1} / {sampledRows.length} 题
              </span>
              <div className="w-24 sm:w-36 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${((currentCardIndex + 1) / sampledRows.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentCardIndex === 0}
                onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                上一题
              </button>
              <button
                disabled={currentCardIndex >= sampledRows.length - 1}
                onClick={() => setCurrentCardIndex(prev => Math.min(sampledRows.length - 1, prev + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
              >
                下一题
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Render the current card */}
          {renderSentenceCard(sampledRows[currentCardIndex], currentCardIndex, sampledRows.length)}

          {/* Bottom Card Navigation Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {sampledRows.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentCardIndex(idx)}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                  idx === currentCardIndex
                    ? 'bg-indigo-600 text-white shadow-sm scale-110'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* List Mode: Render all cards */
        <div className="space-y-6">
          {sampledRows.map((row, idx) => renderSentenceCard(row, idx, sampledRows.length))}
        </div>
      )}
    </div>
  );
};
