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
  Bookmark
} from 'lucide-react';
import { 
  loadReadingProgress, 
  toggleSentenceRead, 
  saveWrongQuestion, 
  removeWrongQuestion 
} from '../utils/readingStorage';

interface IntensiveReadingViewProps {
  initialPassKey?: string;
  onWordClick?: (word: string, rect: DOMRect) => void;
  onNavigateToQuiz?: (year: string) => void;
}

export const IntensiveReadingView: React.FC<IntensiveReadingViewProps> = ({
  initialPassKey = '2025-t1',
  onWordClick,
  onNavigateToQuiz
}) => {
  const [indexList, setIndexList] = useState<PassageIndexItem[]>([]);
  const [currentKey, setCurrentKey] = useState<string>(initialPassKey);
  const [detail, setDetail] = useState<PassageDetail | null>(null);
  const [keywords, setKeywords] = useState<PassageKeywords | null>(null);
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View state
  const [selfTestMode, setSelfTestMode] = useState<boolean>(false);
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [showKeywordsDrawer, setShowKeywordsDrawer] = useState<boolean>(false);
  const [showQuizPanel, setShowQuizPanel] = useState<boolean>(true);
  const [highlightedSid, setHighlightedSid] = useState<string | null>(null);

  // Reading Progress
  const [readSentences, setReadSentences] = useState<string[]>([]);

  // Quiz state
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

  // Year selector dropdown
  const [isYearPickerOpen, setIsYearPickerOpen] = useState<boolean>(false);

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

  // Years list (2025 down to 2001)
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(indexList.map(x => x.year))).sort((a, b) => b - a);
    return years.length > 0 ? years : [2025, 2024, 2023, 2022, 2021, 2020];
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span>{currentYear} 年</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isYearPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 space-y-1">
                  {availableYears.map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleSelectPassage(yr, currentTextNo)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        yr === currentYear
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
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

      {/* Keywords Drawer / Bar (if toggled) */}
      {showKeywordsDrawer && keywords && (
        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              本篇考纲核心词与真题词组 (点击词条可查词释义)
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              共 {keywords.words?.length || 0} 个重点词 · {keywords.phrases?.length || 0} 个词组
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {keywords.words?.map((w, idx) => (
              <button
                key={w.w + idx}
                type="button"
                onClick={(e) => {
                  if (onWordClick) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onWordClick(w.w, rect);
                  }
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-serif bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <b>{w.w}</b>
                <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400">{w.trans}</span>
              </button>
            ))}
          </div>

          {keywords.phrases && keywords.phrases.length > 0 && (
            <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-800/40">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">真题短语：</div>
              <div className="flex items-center gap-2 flex-wrap">
                {keywords.phrases.map((p, idx) => (
                  <span
                    key={p.phrase + idx}
                    className="px-2.5 py-0.5 rounded-lg text-xs bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  >
                    <b className="font-serif">{p.phrase}</b>
                    <span className="text-slate-500 dark:text-slate-400">({p.trans})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Sentence List */}
      <div className="space-y-4">
        {detail?.sentences?.map((sentence, idx) => (
          <SentenceTreeView
            key={sentence.sid || idx}
            sentence={sentence}
            year={currentYear}
            textNo={currentTextNo}
            index={idx}
            onWordClick={onWordClick}
            isRead={readSentences.includes(sentence.sid)}
            onToggleRead={handleToggleReadSentence}
            defaultExpanded={allExpanded}
            selfTestMode={selfTestMode}
          />
        ))}
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
    </div>
  );
};
