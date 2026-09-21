import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PassageDetail, 
  PassageIndexItem, 
  PassageKeywords, 
  ReadingQuestion, 
  PassageSentence 
} from '../types/reading';
import { SentenceTreeView } from './SentenceTreeView';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Layers, 
  Award, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ListOrdered, 
  Check, 
  RotateCcw,
  Target,
  ExternalLink,
  ChevronDown,
  Bookmark,
  Volume2
} from 'lucide-react';
import { 
  loadReadingProgress, 
  toggleSentenceRead, 
  saveWrongQuestion, 
  removeWrongQuestion 
} from '../utils/readingStorage';
import { VocabBlindSpotModal } from './VocabBlindSpotModal';
import { extractPassageLemmas, isWordMastered, getLemmas } from '../utils/vocabLemmatizer';
import { FontSizeLevel } from '../utils/fontSize';

interface IntensiveReadingViewProps {
  initialPassKey?: string;
  onWordClick?: (word: string, rect: DOMRect) => void;
  onNavigateToQuiz?: (year: string) => void;
  wordStatuses?: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>;
  onUpdateWordStatus?: (word: string, status: 'familiar' | 'unfamiliar') => void;
  fontSizeLevel?: FontSizeLevel;
}

export const IntensiveReadingView: React.FC<IntensiveReadingViewProps> = ({
  initialPassKey = '2026-t1',
  onWordClick,
  onNavigateToQuiz,
  wordStatuses = {},
  onUpdateWordStatus,
  fontSizeLevel = 'base',
}) => {
  const [indexList, setIndexList] = useState<PassageIndexItem[]>([]);
  const [currentKey, setCurrentKey] = useState<string>(initialPassKey);
  const [detail, setDetail] = useState<PassageDetail | null>(null);
  const [keywords, setKeywords] = useState<PassageKeywords | null>(null);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Vocab stats & tiered coverage state
  const [vocabStats, setVocabStats] = useState<Record<string, { rank: number; trans: string; phonetic?: string }>>({});
  const [dictEntries, setDictEntries] = useState<Record<string, { definition_cn?: string; phonetic?: string }>>({});
  const [vocabTier, setVocabTier] = useState<'2000' | '3000' | '4000' | '5000' | 'custom'>('2000');
  const [showBlindSpotModal, setShowBlindSpotModal] = useState<boolean>(false);

  // View state
  const [selfTestMode, setSelfTestMode] = useState<boolean>(false);
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [showKeywordsDrawer, setShowKeywordsDrawer] = useState<boolean>(true);
  const [showQuizPanel, setShowQuizPanel] = useState<boolean>(true);
  const [highlightedSid, setHighlightedSid] = useState<string | null>(null);

  // Reading Progress
  const [readSentences, setReadSentences] = useState<string[]>([]);

  // Quiz state
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

  // Dropdown states & refs
  const [isYearPickerOpen, setIsYearPickerOpen] = useState<boolean>(false);
  const [isTierPickerOpen, setIsTierPickerOpen] = useState<boolean>(false);
  const tierPickerRef = useRef<HTMLDivElement>(null);
  const yearPickerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tierPickerRef.current && !tierPickerRef.current.contains(event.target as Node)) {
        setIsTierPickerOpen(false);
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target as Node)) {
        setIsYearPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load vocab stats dictionary and official syllabus dictionary
  useEffect(() => {
    async function loadVocabData() {
      try {
        const [statsRes, dictRes] = await Promise.all([
          fetch('./data/vocab_stats/vocab_stats_all.json'),
          fetch('./data/kaoyan1_dict.json')
        ]);
        if (statsRes.ok) {
          const list: any[] = await statsRes.json();
          const map: Record<string, { rank: number; trans: string; phonetic?: string }> = {};
          list.forEach(item => {
            if (item.w) {
              map[item.w.toLowerCase()] = {
                rank: item.rank || 9999, // Use real exam occurrence frequency rank (1~3149)
                trans: item.trans || '',
                phonetic: item.phonetic || ''
              };
            }
          });
          setVocabStats(map);
        }
        if (dictRes.ok) {
          const dictData = await dictRes.json();
          if (dictData && dictData.entries) {
            setDictEntries(dictData.entries);
          }
        }
      } catch (e) {
        console.error('Failed to load vocab stats or dict:', e);
      }
    }
    loadVocabData();
  }, []);

  // 1. Load passages index
  useEffect(() => {
    async function loadIndex() {
      try {
        const res = await fetch('./data/reading/index.json');
        if (res.ok) {
          const list = await res.json();
          setIndexList(list);
        }
      } catch (err) {
        console.error('Failed to load reading index:', err);
      }
    }
    loadIndex();
  }, []);

  // 2. Load detail, keywords, questions for current passage
  useEffect(() => {
    async function loadPassage() {
      try {
        setLoading(true);
        const [detailRes, kwRes, qRes] = await Promise.all([
          fetch(`./data/reading/passages/${currentKey}.json`),
          fetch(`./data/reading/keywords/${currentKey}.json`),
          fetch(`./data/reading/questions/${currentKey}.json`),
        ]);

        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setDetail(detailData);
        }
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          setKeywords(kwData);
        } else {
          setKeywords(null);
        }
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuestions(qData);
        } else {
          setQuestions([]);
        }

        // Load reading progress
        const prog = loadReadingProgress();
        setReadSentences(prog[currentKey]?.readSentences || []);
        setUserAnswers({});
        setQuizSubmitted({});
      } catch (err) {
        console.error('Failed to load passage detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPassage();
  }, [currentKey]);

  // Derived current year and text_no
  const currentItem = useMemo(() => {
    return indexList.find(x => x.key === currentKey);
  }, [indexList, currentKey]);

  const currentYear = currentItem?.year || 2025;
  const currentTextNo = currentItem?.text_no || 1;

  // Group passage sentences by paragraph number for unified reading layout
  const paragraphGroups = useMemo(() => {
    if (!detail?.sentences) return [];
    const map = new Map<number, { paraNo: number; sentences: PassageSentence[]; startIdx: number }>();
    detail.sentences.forEach((s, idx) => {
      const pNo = s.para_no || 1;
      if (!map.has(pNo)) {
        map.set(pNo, { paraNo: pNo, sentences: [], startIdx: idx });
      }
      map.get(pNo)!.sentences.push(s);
    });
    return Array.from(map.values());
  }, [detail]);

  // Tiers configuration for dropdown
  const TIER_OPTIONS = [
    { value: '2000', label: '假设已掌握 2000 词' },
    { value: '3000', label: '假设已掌握 3000 词' },
    { value: '4000', label: '假设已掌握 4000 词' },
    { value: '5000', label: '假设已掌握 5000 词' },
    { value: 'custom', label: '使用我的个性化生词本' }
  ] as const;

  // Word lemmas in current passage for tiered coverage analysis (canonical base lemma grouping)
  const passageLemmas = useMemo(() => {
    if (!detail?.sentences) return [];
    const allText = detail.sentences.map(s => s.s).join(' ');
    return extractPassageLemmas(allText, dictEntries, vocabStats).tokens;
  }, [detail, dictEntries, vocabStats]);

  // Tiered Coverage Analysis (98% reading fluency threshold)
  const coverageAnalysis = useMemo(() => {
    if (passageLemmas.length === 0) {
      return {
        coveragePercent: 100,
        totalTokens: 0,
        knownTokens: 0,
        unfamiliarWords: [] as { word: string; count: number; trans?: string }[],
        neededCount: 0,
        status: '顺读极佳',
        statusColor: 'emerald'
      };
    }

    let totalTokens = 0;
    let knownTokens = 0;
    const unfamiliarList: { word: string; count: number; trans?: string }[] = [];

    passageLemmas.forEach(item => {
      // Named entities / proper nouns are excluded from vocabulary obstacle calculation
      if (item.isProperNoun) return;

      totalTokens += item.count;
      const isKnown = isWordMastered(item.lemma, vocabTier, vocabStats, dictEntries, wordStatuses);

      if (isKnown) {
        knownTokens += item.count;
      } else {
        // Find best translation checking dictEntries and vocabStats
        let trans = dictEntries[item.lemma]?.definition_cn || vocabStats[item.lemma]?.trans;
        if (!trans) {
          const lemmas = getLemmas(item.lemma);
          for (const lem of lemmas) {
            if (dictEntries[lem]?.definition_cn) {
              trans = dictEntries[lem].definition_cn;
              break;
            }
            if (vocabStats[lem]?.trans) {
              trans = vocabStats[lem].trans;
              break;
            }
          }
        }

        unfamiliarList.push({
          word: item.lemma,
          count: item.count,
          trans
        });
      }
    });

    unfamiliarList.sort((a, b) => b.count - a.count);

    const coveragePercent = totalTokens > 0
      ? Math.round((knownTokens / totalTokens) * 1000) / 10
      : 100;

    const targetTokens = Math.ceil(totalTokens * 0.98);
    let neededTokens = Math.max(0, targetTokens - knownTokens);
    let neededCount = 0;
    for (const item of unfamiliarList) {
      if (neededTokens <= 0) break;
      neededTokens -= item.count;
      neededCount++;
    }

    let status = '顺读极佳';
    let statusColor = 'emerald';
    if (coveragePercent < 90) {
      status = '生词偏多';
      statusColor = 'amber';
    } else if (coveragePercent < 95) {
      status = '词汇达标';
      statusColor = 'indigo';
    }

    return {
      coveragePercent,
      totalTokens,
      knownTokens,
      unfamiliarWords: unfamiliarList,
      neededCount,
      status,
      statusColor
    };
  }, [passageLemmas, vocabTier, vocabStats, dictEntries, wordStatuses]);

  // Years list (2026 down to 2001)
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(indexList.map(x => x.year))).sort((a, b) => b - a);
    return years.length > 0 ? years : [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  }, [indexList]);

  // Navigation handlers
  const handleSelectPassage = (year: number, textNo: number) => {
    const key = `${year}-t${textNo}`;
    setCurrentKey(key);
    setIsYearPickerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleReadSentence = (sid: string) => {
    const isNowRead = toggleSentenceRead(currentKey, sid);
    setReadSentences(prev => {
      if (isNowRead) return [...prev, sid];
      return prev.filter(s => s !== sid);
    });
  };

  const scrollToSentence = (sid: string) => {
    setHighlightedSid(sid);
    const el = document.getElementById(sid);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add brief pulse highlight
      el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
      }, 2500);
    }
  };

  const handleQuizSubmit = (qId: number, q: ReadingQuestion) => {
    const myChoice = userAnswers[qId];
    if (!myChoice) return;

    setQuizSubmitted(prev => ({ ...prev, [qId]: true }));
    const isCorrect = q.answer ? myChoice.toUpperCase() === q.answer.toUpperCase() : true;

    if (!isCorrect && q.answer) {
      saveWrongQuestion({
        id: `rq_${qId}`,
        type: 'reading',
        title: `${currentYear} Text ${currentTextNo} · 第 ${q.qNo} 题`,
        stem: q.stem,
        choices: q.choices,
        myChoice,
        answer: q.answer,
        analysis: q.analysis,
        passKey: currentKey,
        year: currentYear,
        text_no: currentTextNo,
        timestamp: Date.now()
      });
    } else {
      removeWrongQuestion(`rq_${qId}`);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">正在加载长难句精读分析 ({currentKey})...</p>
      </div>
    );
  }

  const totalSentences = detail?.sentences?.length || 0;
  const readCount = readSentences.length;
  const progressPercent = totalSentences > 0 ? Math.round((readCount / totalSentences) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 2-Minute Blind Spot Quick Entrance Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-900 dark:text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>建议精读前摸底：40 道大纲真题词汇抽样速测，2 分钟快速摸清词面底盘</span>
        </div>
        <button
          type="button"
          onClick={() => setShowBlindSpotModal(true)}
          className="px-4 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
        >
          🎯 2 分钟摸一下词汇盲区 →
        </button>
      </div>

      {/* Top Header & Year/Text Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                {currentYear} 年 考研英语一 · 阅读 Text {currentTextNo}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {currentKey}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              逐句语法树拆解（主干提取 + 修饰成分分解）· 词汇覆盖度分析 · 原文定位自测
            </p>
          </div>

          {/* Passage Quick Switcher */}
          <div className="flex items-center gap-2">
            {/* Year Selector */}
            <div className="relative" ref={yearPickerRef}>
              <button
                type="button"
                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <span>{currentYear} 年</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isYearPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {isYearPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 max-h-72 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150">
                  {availableYears.map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleSelectPassage(yr, currentTextNo)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        yr === currentYear
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span>{yr} 年真题</span>
                      {yr === currentYear && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text 1 - Text 4 Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {[1, 2, 3, 4].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectPassage(currentYear, t)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    t === currentTextNo
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats & Tools Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-800 dark:text-slate-200">{readCount}</span>
              <span>/ {totalSentences} 句已精读</span>
            </div>
            <div className="w-24 sm:w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{progressPercent}%</span>
          </div>

          {/* Action switches */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelfTestMode(!selfTestMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                selfTestMode
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title="隐藏中文全句译文，读完点击再揭晓，检验独立看懂能力"
            >
              {selfTestMode ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
              自测模式 {selfTestMode ? '开' : '关'}
            </button>

            <button
              type="button"
              onClick={() => setAllExpanded(!allExpanded)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              {allExpanded ? '折叠全部拆解' : '展开全部拆解'}
            </button>

            {keywords && (
              <button
                type="button"
                onClick={() => setShowKeywordsDrawer(!showKeywordsDrawer)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
                  showKeywordsDrawer
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                词汇覆盖 ({keywords.words?.length || 0})
              </button>
            )}

            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowQuizPanel(!showQuizPanel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors ${
                  showQuizPanel
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                配套试题 ({questions.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tiered Vocabulary Coverage Card (词汇分级覆盖) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Percentage & 98% threshold alert */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {coverageAnalysis.coveragePercent}%
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                coverageAnalysis.statusColor === 'emerald'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : coverageAnalysis.statusColor === 'indigo'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                词汇覆盖 · {coverageAnalysis.status}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
              <span>
                {coverageAnalysis.neededCount > 0 ? (
                  <>再拿下 <b className="text-emerald-600 dark:text-emerald-400 font-bold">{coverageAnalysis.neededCount}</b> 个词成就 98%（即顺读门槛）</>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">已达到 98% 顺读门槛，阅读无大面积生词障碍！</span>
                )}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-[11px] text-slate-400">
                {vocabTier === 'custom' ? '已匹配您的个性化生词本' : '认识 98% 词汇（即生词 ≤ 2%）才能连贯理解全文'}
              </span>
            </div>
          </div>

          {/* Right: Progress bar & Tier dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-36 sm:w-44 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  coverageAnalysis.statusColor === 'emerald'
                    ? 'bg-emerald-500'
                    : coverageAnalysis.statusColor === 'indigo'
                    ? 'bg-indigo-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, coverageAnalysis.coveragePercent)}%` }}
              />
            </div>

            {/* Dropdown for tiers */}
            {/* Custom Glassmorphic Dropdown for tiers */}
            <div className="relative" ref={tierPickerRef}>
              <button
                type="button"
                onClick={() => setIsTierPickerOpen(!isTierPickerOpen)}
                className="px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-800/90 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
              >
                <span>
                  {TIER_OPTIONS.find(o => o.value === vocabTier)?.label || '假设已掌握 2000 词'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTierPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTierPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150">
                  {TIER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setVocabTier(opt.value as any);
                        setIsTierPickerOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        vocabTier === opt.value
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {vocabTier === opt.value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unfamiliar words chips (ordered descending by frequency) */}
        {coverageAnalysis.unfamiliarWords.length > 0 ? (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
              <span>未掌握考纲/难词 ({coverageAnalysis.unfamiliarWords.length} 个 · 按出现频次倒序 · 点击可查词)：</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap max-h-36 overflow-y-auto">
              {coverageAnalysis.unfamiliarWords.map((item, idx) => (
                <button
                  key={item.word + idx}
                  type="button"
                  onClick={(e) => {
                    if (onWordClick) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onWordClick(item.word, rect);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-serif bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400 text-slate-800 dark:text-slate-200 flex items-center gap-1 shadow-2xs hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title={item.trans || '点击查词'}
                >
                  <span>{item.word}</span>
                  {item.count > 1 && (
                    <span className="font-sans font-normal text-[10px] text-slate-400 dark:text-slate-500">
                      ×{item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-2 text-xs text-emerald-600 dark:text-emerald-400">
            🎉 本篇在此词汇掌握梯度下暂无生词，可流畅顺读！
          </div>
        )}

        {/* Keywords and phrases section (if toggled) */}
        {showKeywordsDrawer && keywords && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            {keywords.words && keywords.words.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  本篇考纲核心词 ({keywords.words.length} 个 · 点击查词释义)：
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {keywords.words.map((w, idx) => {
                    const trans = w.trans || w.zh || vocabStats[w.w.toLowerCase()]?.trans || '';
                    const count = w.n || w.count || 1;
                    return (
                      <button
                        key={w.w + idx}
                        type="button"
                        onClick={(e) => {
                          if (onWordClick) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onWordClick(w.w, rect);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-serif bg-indigo-50/40 dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <b>{w.w}</b>
                        {count > 1 && (
                          <span className="font-sans text-[10px] text-indigo-500 font-semibold">
                            ×{count}
                          </span>
                        )}
                        {trans && (
                          <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
                            {trans}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {keywords.phrases && keywords.phrases.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <span>真题短语与搭配 ({keywords.phrases.length} 个)：</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {keywords.phrases.map((p, idx) => {
                    const en = p.en || p.phrase || '';
                    const zh = p.zh || p.trans || '';
                    return (
                      <span
                        key={en + idx}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-help group relative"
                        title={p.note || `${en}: ${zh}`}
                      >
                        <b className="font-serif font-bold text-slate-900 dark:text-slate-100">{en}</b>
                        {zh && <span className="text-slate-500 dark:text-slate-400">({zh})</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Paragraph List (Grouped by Paragraph) */}
      <div className="space-y-6">
        {paragraphGroups.map(group => {
          const isAllRead = group.sentences.every(s => readSentences.includes(s.sid));
          const readCount = group.sentences.filter(s => readSentences.includes(s.sid)).length;

          return (
            <section
              key={group.paraNo}
              className="rounded-3xl border border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 shadow-sm overflow-hidden transition-all"
            >
              {/* Paragraph Header Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/80 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-indigo-600 text-white shadow-2xs">
                    Paragraph {group.paraNo}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    第 {group.paraNo} 段
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    · 共 {group.sentences.length} 句
                  </span>
                  {isAllRead ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      本段已读完
                    </span>
                  ) : readCount > 0 ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      已读 {readCount}/{group.sentences.length}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const paraText = group.sentences.map(s => s.s).join(' ');
                      window.speechSynthesis.cancel();
                      const utter = new SpeechSynthesisUtterance(paraText);
                      utter.lang = 'en-US';
                      utter.rate = 0.9;
                      window.speechSynthesis.speak(utter);
                    }}
                    className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title="连续朗读本段所有英文句子"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>朗读本段</span>
                  </button>
                </div>
              </div>

              {/* Paragraph Sentences Flow */}
              <div className="px-4 sm:px-6 divide-y divide-slate-100/90 dark:divide-slate-800/70">
                {group.sentences.map((sentence, sIdx) => {
                  const globalIdx = group.startIdx + sIdx;
                  return (
                    <SentenceTreeView
                      key={sentence.sid || globalIdx}
                      sentence={sentence}
                      year={currentYear}
                      textNo={currentTextNo}
                      index={globalIdx}
                      onWordClick={onWordClick}
                      isRead={readSentences.includes(sentence.sid)}
                      onToggleRead={handleToggleReadSentence}
                      defaultExpanded={allExpanded}
                      selfTestMode={selfTestMode}
                      fontSizeLevel={fontSizeLevel}
                      inParagraphUnit={true}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Reading Questions Section (配套真题) */}
      {showQuizPanel && questions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 mt-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                本篇真题考题 ({questions.length} 题)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                阅读理解实战对答案。做完错题可一键点击「定位原文」跳至对应句子的长难句拆解。
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q) => {
              const myChoice = userAnswers[q.id];
              const isSubmitted = !!quizSubmitted[q.id];
              const isCorrect = q.answer && myChoice ? myChoice.toUpperCase() === q.answer.toUpperCase() : false;

              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-5 space-y-4"
                >
                  {/* Stem */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-base leading-relaxed">
                      <b className="font-mono text-indigo-600 dark:text-indigo-400 mr-2">{q.qNo}.</b>
                      {q.stem}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-2">
                    {q.choices.map((choice, cIdx) => {
                      const letter = ['A', 'B', 'C', 'D'][cIdx];
                      const isPicked = myChoice === letter;
                      const isCorrectChoice = q.answer && q.answer.toUpperCase() === letter;

                      let optCls = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300';
                      if (isPicked && !isSubmitted) {
                        optCls = 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500';
                      } else if (isSubmitted) {
                        if (isCorrectChoice) {
                          optCls = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-medium ring-1 ring-emerald-500';
                        } else if (isPicked && !isCorrectChoice) {
                          optCls = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500';
                        } else {
                          optCls = 'opacity-60 border-slate-200 dark:border-slate-800';
                        }
                      }

                      return (
                        <label
                          key={cIdx}
                          onClick={() => {
                            if (!isSubmitted) {
                              setUserAnswers(prev => ({ ...prev, [q.id]: letter }));
                            }
                          }}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${optCls}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isPicked && !isSubmitted
                              ? 'bg-indigo-600 text-white'
                              : isSubmitted && isCorrectChoice
                              ? 'bg-emerald-600 text-white'
                              : isSubmitted && isPicked && !isCorrectChoice
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {letter}
                          </span>
                          <span className="text-sm font-serif leading-snug select-text">
                            {choice}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Submission and Feedback */}
                  <div className="flex items-center justify-between pt-1">
                    {!isSubmitted ? (
                      <button
                        type="button"
                        onClick={() => handleQuizSubmit(q.id, q)}
                        disabled={!myChoice}
                        className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-all"
                      >
                        提交答案
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        {isCorrect ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> 答对了！正确答案是 {q.answer}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> 遗憾答错。正确答案是 {q.answer}
                          </span>
                        )}

                        {/* Anchor button to jump to sentence */}
                        {q.anchors && q.anchors.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">定位原文：</span>
                            {q.anchors.map(sid => (
                              <button
                                key={sid}
                                type="button"
                                onClick={() => scrollToSentence(sid)}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                              >
                                <Target className="w-3 h-3" />
                                拆解定位 ↑
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Explanation / Analysis if submitted */}
                  {isSubmitted && q.analysis && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">试题解析：</div>
                      <div>{q.analysis}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2-Minute Vocabulary Blind Spot Test Modal */}
      <VocabBlindSpotModal
        isOpen={showBlindSpotModal}
        onClose={() => setShowBlindSpotModal(false)}
        onWordClick={onWordClick}
        onUpdateWordStatus={onUpdateWordStatus}
      />
    </div>
  );
};
