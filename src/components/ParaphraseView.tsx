import React, { useState, useEffect, useMemo } from 'react';
import { ParaphraseItem } from '../types/reading';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft,
  BookOpen, 
  HelpCircle,
  Filter,
  Layers,
  Sparkles,
  Award
} from 'lucide-react';
import { 
  loadParaphraseProgress, 
  saveParaphraseRecord, 
  saveWrongQuestion, 
  removeWrongQuestion 
} from '../utils/readingStorage';

interface ParaphraseViewProps {
  onWordClick?: (word: string, rect: DOMRect) => void;
  onNavigateToReading?: (passKey: string) => void;
}

export const ParaphraseView: React.FC<ParaphraseViewProps> = ({
  onWordClick,
  onNavigateToReading
}) => {
  const [items, setItems] = useState<ParaphraseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [progress, setProgress] = useState<Record<string, { myChoice: string; correct: boolean }>>(() => {
    return loadParaphraseProgress();
  });
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'unattempted'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('./data/paraphrase/paraphrase_all.json');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch (err) {
        console.error('Failed to load paraphrase questions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    if (filterMode === 'all') return items;
    if (filterMode === 'wrong') {
      return items.filter(item => progress[item.id] && !progress[item.id].correct);
    }
    if (filterMode === 'unattempted') {
      return items.filter(item => !progress[item.id]);
    }
    return items;
  }, [items, filterMode, progress]);

  const currentItem: ParaphraseItem | undefined = filteredItems[currentIndex];

  useEffect(() => {
    if (currentItem && progress[currentItem.id]) {
      setSelectedChoice(progress[currentItem.id].myChoice);
      setSubmitted(true);
    } else {
      setSelectedChoice(null);
      setSubmitted(false);
    }
  }, [currentItem, progress]);

  const stats = useMemo(() => {
    const total = items.length;
    let answered = 0;
    let correct = 0;
    items.forEach(it => {
      if (progress[it.id]) {
        answered++;
        if (progress[it.id].correct) correct++;
      }
    });
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { total, answered, correct, accuracy };
  }, [items, progress]);

  const handleSubmit = () => {
    if (!currentItem || !selectedChoice || submitted) return;

    const isCorrect = selectedChoice.toUpperCase() === currentItem.answer.toUpperCase();
    saveParaphraseRecord(currentItem.id, selectedChoice, isCorrect);
    setProgress(prev => ({
      ...prev,
      [currentItem.id]: { myChoice: selectedChoice, correct: isCorrect }
    }));
    setSubmitted(true);

    if (!isCorrect) {
      saveWrongQuestion({
        id: currentItem.id,
        type: 'paraphrase',
        title: `同义替换 · ${currentItem.passKey}`,
        stem: currentItem.stem,
        choices: currentItem.choices,
        myChoice: selectedChoice,
        answer: currentItem.answer,
        zh: currentItem.zh,
        passKey: currentItem.passKey,
        timestamp: Date.now()
      });
    } else {
      removeWrongQuestion(currentItem.id);
    }
  };

  const handleRedo = () => {
    setSelectedChoice(null);
    setSubmitted(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
        <p className="text-sm">正在加载同义替换真题库 (200 题)...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p>暂无同义替换数据，请检查数据加载。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Stats Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                同义替换专练
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                200 题全量收录
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              精选历年考研英语一阅读命题眼同义改写题。练透改写规律，快速识别干扰项陷阱。
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-center px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="text-slate-400 text-[11px]">已完成</div>
              <div className="font-bold text-slate-700 dark:text-slate-200">{stats.answered} / {stats.total}</div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <div className="text-emerald-500 text-[11px]">正确率</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">{stats.accuracy}%</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> 筛选：
          </span>
          <button
            type="button"
            onClick={() => { setFilterMode('all'); setCurrentIndex(0); }}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            全部 ({items.length})
          </button>
          <button
            type="button"
            onClick={() => { setFilterMode('wrong'); setCurrentIndex(0); }}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              filterMode === 'wrong'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            错题 ({items.filter(x => progress[x.id] && !progress[x.id].correct).length})
          </button>
          <button
            type="button"
            onClick={() => { setFilterMode('unattempted'); setCurrentIndex(0); }}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              filterMode === 'unattempted'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            未做 ({items.filter(x => !progress[x.id]).length})
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
          <Award className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
          <p className="font-medium text-slate-700 dark:text-slate-300">当前筛选暂无题目</p>
          <p className="text-xs text-slate-400 mt-1">太棒了！所有错题已全部攻克或该项下无题。</p>
        </div>
      ) : currentItem ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Question Meta Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                第 {currentIndex + 1} / {filteredItems.length} 题
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {currentItem.passKey} · Q{currentItem.qNo}
              </span>
              {onNavigateToReading && (
                <button
                  type="button"
                  onClick={() => onNavigateToReading(currentItem.passKey)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <BookOpen className="w-3 h-3" /> 查看原篇精读
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="上一题"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === filteredItems.length - 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="下一题"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context English Paragraph / Sentence */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              真题原句上下文 (可点击任意单词查词)
            </div>
            <p className="font-serif text-base sm:text-lg leading-relaxed text-slate-900 dark:text-slate-100 select-text">
              {renderClickableTokens(currentItem.text)}
            </p>
          </div>

          {/* Question Stem */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">题干 (Stem)</div>
            <p className="text-base font-medium text-slate-800 dark:text-slate-200 select-text">
              {renderClickableTokens(currentItem.stem)}
            </p>
          </div>

          {/* Choices A, B, C, D */}
          <div className="space-y-2.5">
            {currentItem.choices.map((choice, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const isPicked = selectedChoice === letter;
              const isCorrectAnswer = currentItem.answer.toUpperCase() === letter;

              let style = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700';
              if (isPicked && !submitted) {
                style = 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500';
              } else if (submitted) {
                if (isCorrectAnswer) {
                  style = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium ring-1 ring-emerald-500';
                } else if (isPicked && !isCorrectAnswer) {
                  style = 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500';
                } else {
                  style = 'opacity-60 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
                }
              }

              return (
                <label
                  key={idx}
                  onClick={() => !submitted && setSelectedChoice(letter)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${style}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                    isPicked && !submitted
                      ? 'bg-indigo-600 text-white'
                      : submitted && isCorrectAnswer
                      ? 'bg-emerald-600 text-white'
                      : submitted && isPicked && !isCorrectAnswer
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {letter}
                  </span>
                  <div className="flex-1 text-sm sm:text-base leading-snug font-serif text-slate-800 dark:text-slate-200 select-text">
                    {choice}
                  </div>
                  {submitted && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  {submitted && isPicked && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                </label>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            {!submitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedChoice}
                className="px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow transition-all"
              >
                提交对答案
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRedo}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> 重做本题
                </button>
                {currentIndex < filteredItems.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    下一题 <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Analysis & Translation Feedback Card */}
          {submitted && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5 space-y-4">
              <div className="flex items-center gap-2">
                {selectedChoice?.toUpperCase() === currentItem.answer.toUpperCase() ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>回答正确！正确答案是 {currentItem.answer}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
                    <XCircle className="w-5 h-5" />
                    <span>遗憾答错。正确答案是 {currentItem.answer}（已自动收入错题本）</span>
                  </div>
                )}
              </div>

              {currentItem.zh && (
                <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    上下文全句参考译文：
                  </div>
                  <p className="leading-relaxed bg-white/80 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 select-text">
                    {currentItem.zh}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
