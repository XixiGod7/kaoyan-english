import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  RotateCcw, 
  Check, 
  ChevronRight, 
  Bookmark, 
  Award, 
  Volume2,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { VocabStatItem } from '../types/reading';
import { saveWordStatus } from '../utils/readingStorage';
import { BASIC_VOCAB_SET } from '../utils/vocabLemmatizer';

interface VocabBlindSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWordClick?: (word: string, rect: DOMRect) => void;
  onUpdateWordStatus?: (word: string, status: 'familiar' | 'unfamiliar') => void;
}

export const VocabBlindSpotModal: React.FC<VocabBlindSpotModalProps> = ({
  isOpen,
  onClose,
  onWordClick,
  onUpdateWordStatus
}) => {
  const [allWords, setAllWords] = useState<VocabStatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Test state
  const [testWords, setTestWords] = useState<VocabStatItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false); // whether current word's definition is shown
  const [results, setResults] = useState<Record<string, { known: boolean; word: VocabStatItem }>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [addedToNotebook, setAddedToNotebook] = useState<boolean>(false);

  // 1. Fetch vocab dataset once
  useEffect(() => {
    async function loadVocab() {
      try {
        setLoading(true);
        const res = await fetch('./data/vocab_stats/vocab_stats_all.json');
        if (res.ok) {
          const data: VocabStatItem[] = await res.json();
          setAllWords(data);
        }
      } catch (err) {
        console.error('Failed to load vocab stats for blind spot test:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVocab();
  }, []);

  // 2. Initialize or reset a 40-word test
  const initializeTest = (wordsSource: VocabStatItem[] = allWords) => {
    if (!wordsSource || wordsSource.length === 0) return;

    // 1. Filter out basic foundation words (BASIC_VOCAB_SET ~1500 words) so test is truly diagnostic
    const nonBasicWords = wordsSource.filter(w => {
      const low = (w.w || '').toLowerCase();
      return !BASIC_VOCAB_SET.has(low);
    });

    const pool = nonBasicWords.length >= 40 ? nonBasicWords : wordsSource;

    // 2. Stratified sample of 40 words across real exam frequency tiers (using w.rank 1~3149):
    // Tier 1: 10 from rank <= 1000 (core exam keywords)
    // Tier 2: 15 from rank 1001-2200 (medium-frequency academic/reading keywords)
    // Tier 3: 15 from rank > 2200 or advanced syllabus items (distinguishing words)
    const tier1 = pool.filter(w => (w.rank || 0) <= 1000 && (w.rank || 0) > 0);
    const tier2 = pool.filter(w => (w.rank || 0) > 1000 && (w.rank || 0) <= 2200);
    const tier3 = pool.filter(w => (w.rank || 0) > 2200 || !w.rank);

    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

    const sample1 = shuffle(tier1).slice(0, 10);
    const sample2 = shuffle(tier2).slice(0, 15);
    const sample3 = shuffle(tier3).slice(0, 15);

    const fullSample = shuffle([...sample1, ...sample2, ...sample3]);
    // Fallback in case sample is less than 40
    if (fullSample.length < 40) {
      const remaining = shuffle(pool.filter(w => !fullSample.includes(w))).slice(0, 40 - fullSample.length);
      fullSample.push(...remaining);
    }

    setTestWords(fullSample.slice(0, 40));
    setCurrentIndex(0);
    setRevealed(false);
    setResults({});
    setIsFinished(false);
    setAddedToNotebook(false);
  };

  useEffect(() => {
    if (isOpen && allWords.length > 0 && testWords.length === 0) {
      initializeTest(allWords);
    }
  }, [isOpen, allWords]);

  if (!isOpen) return null;

  const currentWord = testWords[currentIndex];

  // TTS helper
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

  // Action: Click [认识] -> Reveal definition and allow verification
  const handleChoiceKnown = () => {
    if (!currentWord) return;
    setResults(prev => ({
      ...prev,
      [currentWord.w]: { known: true, word: currentWord }
    }));
    setRevealed(true);
  };

  // Action: Click [不认识] -> Reveal definition
  const handleChoiceUnknown = () => {
    if (!currentWord) return;
    setResults(prev => ({
      ...prev,
      [currentWord.w]: { known: false, word: currentWord }
    }));
    setRevealed(true);
  };

  // Action: Toggle known/unknown status after definition is revealed
  const handleToggleKnownStatus = () => {
    if (!currentWord) return;
    const currentStatus = results[currentWord.w]?.known ?? true;
    setResults(prev => ({
      ...prev,
      [currentWord.w]: { known: !currentStatus, word: currentWord }
    }));
  };

  // Action: Click [下一个 →] to advance
  const handleNextWord = () => {
    if (currentIndex + 1 >= testWords.length) {
      setIsFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
    }
  };

  // Calculate assessment results
  const totalCount = testWords.length;
  const knownCount = Object.values(results).filter(r => r.known).length;
  const unknownList = Object.values(results).filter(r => !r.known).map(r => r.word);
  const accuracyPercent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
  
  // Estimated Kaoyan vocabulary size: basic 2000 + proportion of remaining 3500 words
  const estimatedVocab = Math.min(5500, Math.max(1800, Math.round(1800 + (knownCount / totalCount) * 3700)));

  // Add all unknown words to notebook
  const handleSaveAllUnknown = () => {
    unknownList.forEach(w => {
      saveWordStatus(w.w, 'unfamiliar');
      if (onUpdateWordStatus) {
        onUpdateWordStatus(w.w, 'unfamiliar');
      }
    });
    setAddedToNotebook(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header matching original site */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-baseline justify-between pr-8">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                词汇盲区自测
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                英语一 · 2 分钟摸一下词面底数
              </span>
            </div>
            {!isFinished && totalCount > 0 && (
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500 font-medium">
                {currentIndex + 1} / {totalCount}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            凭直觉判断这个词你认不认识（能说出大致意思就算认识），答完即显示释义。结果只代表词面熟悉度，不等同于真实阅读理解能力。
          </p>

          {/* Progress bar line */}
          {!isFinished && totalCount > 0 && (
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">正在抽取考纲阶梯词汇题库...</p>
            </div>
          ) : isFinished ? (
            /* Diagnostic Assessment Report */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center py-2 space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-1">
                  <Award className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  词汇底数摸底完成！
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  基于 40 题考纲抽样自测，精准生成您的词面底盘诊断报告
                </p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">认识词数</div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {knownCount} <span className="text-xs font-normal text-slate-400">/ {totalCount}</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">盲区生词</div>
                  <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {unknownList.length} <span className="text-xs font-normal text-slate-400">个</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60">
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">预估词面底数</div>
                  <div className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300">
                    约 {estimatedVocab.toLocaleString()} <span className="text-xs font-normal text-indigo-400">词</span>
                  </div>
                </div>
              </div>

              {/* Assessment note */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  精读备考建议：
                </div>
                {accuracyPercent >= 85 ? (
                  <span>
                    您的考纲词汇储备非常扎实（正确率 {accuracyPercent}%）！阅读真题时已基本消除大面积词面障碍。建议后续精读重点放在<b>长难句主从句修饰剥离</b>、<b>真题常考熟词僻义</b>与<b>做题逻辑推理</b>上。
                  </span>
                ) : accuracyPercent >= 70 ? (
                  <span>
                    您已具备良好的真题词汇框架（正确率 {accuracyPercent}%）。但在 3500-5000 梯队词汇中仍散落部分盲区。建议配合精读界面的<b>「词汇覆盖率 98% 顺读门槛」</b>，逐篇消灭高频生词！
                  </span>
                ) : (
                  <span>
                    当前考纲基础词汇底数仍有较多盲区（正确率 {accuracyPercent}%）。在做真题精读时可能会经常因生词卡壳。建议优先攻克 2000-3500 阶梯核心词，并充分利用精读自测模式建立语感！
                  </span>
                )}
              </div>

              {/* Unknown words list */}
              {unknownList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      本次自测发现的词汇盲区 ({unknownList.length} 个)
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveAllUnknown}
                      disabled={addedToNotebook}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        addedToNotebook
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }`}
                    >
                      {addedToNotebook ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      {addedToNotebook ? '已存入生词本' : '一键加入我的生词本'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                    {unknownList.map((w, idx) => (
                      <div 
                        key={w.w + idx}
                        onClick={(e) => {
                          if (onWordClick) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onWordClick(w.w, rect);
                          }
                        }}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {w.w}
                            {w.phonetic && <span className="font-sans font-normal text-[11px] text-slate-400">{w.phonetic}</span>}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {w.trans}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom buttons */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => initializeTest()}
                  className="px-5 py-2.5 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 再测一组 (40 词)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  完成退出
                </button>
              </div>
            </div>
          ) : currentWord ? (
            /* Active Test Card - seamlessly fills modal content without nested boxing */
            <div className="text-center py-6 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl sm:text-4xl font-bold font-serif text-slate-900 dark:text-slate-100 tracking-wide select-text">
                    {currentWord.w}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleSpeak(currentWord.w, e)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="朗读发音"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                {currentWord.phonetic && (
                  <div className="text-sm font-mono text-slate-400 dark:text-slate-500">
                    {currentWord.phonetic}
                  </div>
                )}
              </div>

              {/* State A: Not revealed yet (Initial choice buttons) */}
              {!revealed ? (
                <div className="flex items-center justify-center gap-5 mt-6 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={handleChoiceUnknown}
                    className="flex-1 py-3.5 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
                  >
                    不认识
                  </button>
                  <button
                    type="button"
                    onClick={handleChoiceKnown}
                    className="flex-1 py-3.5 px-6 rounded-2xl border border-emerald-500/80 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all shadow-2xs cursor-pointer"
                  >
                    认识
                  </button>
                </div>
              ) : (
                /* State B: Revealed with definition, status badge, undo option, and next button */
                <div className="mt-4 space-y-4 max-w-md mx-auto w-full animate-in fade-in duration-200">
                  {results[currentWord.w]?.known ? (
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-1">
                      <span>✓</span> 认识
                    </div>
                  ) : (
                    <div className="text-rose-500 dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-1">
                      <span>✕</span> 不认识
                    </div>
                  )}

                  <div className="text-sm font-sans text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                    {currentWord.trans || '考纲暂无详细释义'}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleToggleKnownStatus}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      {results[currentWord.w]?.known
                        ? '其实不认识？改回「不认识」'
                        : '其实认识？改回「认识」'}
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleNextWord}
                      className="w-full sm:w-auto px-10 py-3 rounded-2xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      下一个 →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
