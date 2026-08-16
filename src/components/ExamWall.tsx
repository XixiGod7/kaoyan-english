import React, { useState, useMemo } from 'react';
import { PaperGroup, WordFreqItem } from '../types/kaoyan';
import { BookOpen, Sparkles, Volume2, CheckCircle2, AlertTriangle, ExternalLink, X, Check } from 'lucide-react';
import { StudyProgressBar } from './StudyProgressBar';
import { QuizRecordItem, OverallStudyStats, computeOverallStudyStats } from '../utils/ebbinghaus';

interface ExamWallProps {
  papers: PaperGroup[];
  selectedWord: WordFreqItem | null;
  onSelectWord: (word: WordFreqItem | null) => void;
  onOpenWordModal: (word: WordFreqItem) => void;
  onSelectSection: (year: string, tabId: string, sectionId: number, sentenceId?: number | null) => void;
  onToggleStatus: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
  quizHistory?: Record<string, QuizRecordItem[]>;
  onOpenProgressModal?: () => void;
  theme?: 'dark' | 'light';
}

let cachedSentenceIndex: Record<string, any> | null = null;

export const ExamWall: React.FC<ExamWallProps> = ({
  papers,
  selectedWord,
  onSelectWord,
  onOpenWordModal,
  onSelectSection,
  onToggleStatus,
  quizHistory = {},
  onOpenProgressModal,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [sentenceIndex, setSentenceIndex] = useState<Record<string, any>>(cachedSentenceIndex || {});

  const studyStats = useMemo<OverallStudyStats>(() => {
    return computeOverallStudyStats(papers, quizHistory);
  }, [papers, quizHistory]);

  React.useEffect(() => {
    if (cachedSentenceIndex) {
      setSentenceIndex(cachedSentenceIndex);
      return;
    }
    fetch('./data/sentences_index.json')
      .then(res => res.json())
      .then(data => {
        cachedSentenceIndex = data;
        setSentenceIndex(data);
      })
      .catch(err => console.error('Failed to load sentences index', err));
  }, []);

  // Set of task IDs highlighted by the currently selected word
  const highlightedTaskIds = React.useMemo(() => {
    if (!selectedWord || !selectedWord.entry.task_ids) return new Set<number>();
    return new Set<number>(selectedWord.entry.task_ids);
  }, [selectedWord]);

  // Clean year & sort questions strictly by exam order (1 to 9)
  const yearColumns = React.useMemo(() => {
    return papers.map(p => {
      const rawYear = p.name || p.id;
      const cleanYear = rawYear.replace(/\(1\)/, '');
      const sortedQuestions = [...p.questions].sort((a, b) => a.id - b.id);
      return {
        rawYear,
        cleanYear,
        questions: sortedQuestions,
      };
    });
  }, [papers]);

  const mapSectionToTab = (sectionId: number) => {
    const idMod = sectionId % 1000;
    if (idMod === 1) return { tabId: 'cloze', label: 'Section I 完形填空' };
    if (idMod === 2) return { tabId: 'reading_1', label: 'Section II 阅读A Text 1 (21-25)' };
    if (idMod === 3) return { tabId: 'reading_2', label: 'Section II 阅读A Text 2 (26-30)' };
    if (idMod === 4) return { tabId: 'reading_3', label: 'Section II 阅读A Text 3 (31-35)' };
    if (idMod === 5) return { tabId: 'reading_4', label: 'Section II 阅读A Text 4 (36-40)' };
    if (idMod === 6) return { tabId: 'matching', label: 'Section II 阅读新题型' };
    if (idMod === 7) return { tabId: 'translation', label: 'Section II 翻译' };
    if (idMod === 8) return { tabId: 'writing_clinical', label: 'Section III 小作文' };
    if (idMod === 9) return { tabId: 'writing_essay', label: 'Section III 大作文' };
    return { tabId: 'cloze', label: '真题试卷' };
  };

  const handleThumbnailClick = (cleanYear: string, q: any) => {
    const { tabId } = mapSectionToTab(q.id);

    // If a word is selected and exists in this task, find the exact sentence ID
    let matchingSentenceId: number | null = null;
    if (selectedWord && selectedWord.entry.sentence_ids) {
      for (const [sId] of selectedWord.entry.sentence_ids) {
        const sInfo = sentenceIndex[String(sId)];
        if (sInfo && sInfo.taskId === q.id) {
          matchingSentenceId = sId;
          break;
        }
      }

      // Fallback: if not in index yet, check year prefix
      if (!matchingSentenceId) {
        for (const [sId] of selectedWord.entry.sentence_ids) {
          const sYear = String(sId).substring(0, 4);
          if (sYear === cleanYear) {
            matchingSentenceId = sId;
            break;
          }
        }
      }
    }

    onSelectSection(cleanYear, tabId, q.id, matchingSentenceId);
  };

  // Find first example sentence for bottom bar
  const firstSentenceInfo = React.useMemo(() => {
    if (!selectedWord || !selectedWord.entry.sentence_ids || selectedWord.entry.sentence_ids.length === 0) {
      return null;
    }
    const [sId, wordRef, translation] = selectedWord.entry.sentence_ids[0];
    return { sId, wordRef, translation };
  }, [selectedWord]);

  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-gray-900'
    }`}>
      {/* Top Banner Title */}
      <div className={`h-[53px] px-6 flex items-center justify-center z-10 border-b flex-shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-xs'
      }`}>
        <div className="text-center w-full">
          <h1 className={`text-xl font-black tracking-tight flex items-center justify-center gap-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            2010-2026考研英语一真题库
          </h1>
        </div>
      </div>

      {/* Main Wall Matrix Scroll Container */}
      <div className={`flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6 min-h-0 ${isDark ? 'scrollbar-thumb-slate-700' : 'scrollbar-thumb-gray-400'}`}>
          {/* Study Progress Overall Banner */}
          <StudyProgressBar 
            stats={studyStats} 
            onOpenDetailModal={onOpenProgressModal || (() => {})} 
            theme={theme} 
          />

          <div className="flex gap-2.5 min-w-max pb-4">
            {yearColumns.map(({ rawYear, cleanYear, questions }) => {
              const yearHistory = quizHistory[cleanYear] || [];
              const yearCompletedCount = yearHistory.length;
              const yearTotalCount = questions.length || 9;
              const isYearDone = yearCompletedCount >= yearTotalCount;

              return (
                <div
                  key={rawYear}
                  className={`w-24 md:w-28 flex flex-col flex-shrink-0 rounded-xl border overflow-hidden transition-all shadow-md ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-gray-200 shadow-sm'
                  }`}
                >
                  {/* Year Header Card */}
                  <button
                    onClick={() => onSelectSection(cleanYear, 'cloze', questions[0]?.id || 0)}
                    className={`py-2 px-1 text-center font-black text-sm border-b flex flex-col items-center justify-center transition-all shadow-sm group ${
                      isYearDone
                        ? isDark ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : isDark 
                        ? 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-blue-600 hover:to-blue-700 text-slate-100 border-slate-700' 
                        : 'bg-gradient-to-b from-gray-50 to-gray-100 hover:from-blue-600 hover:to-blue-700 text-gray-800 hover:text-white border-gray-200'
                    }`}
                  >
                    <span className="group-hover:scale-105 transition-transform">{cleanYear}</span>
                    {yearCompletedCount > 0 && (
                      <span className="text-[9.5px] font-mono font-bold mt-0.5 opacity-90">
                        {isYearDone ? '✓ 满套已做' : `已做 ${yearCompletedCount}/${yearTotalCount}`}
                      </span>
                    )}
                  </button>

                  {/* Thumbnails Column (Strictly 9 Sections per Year) */}
                  <div className={`p-1.5 flex flex-col gap-2 ${isDark ? 'bg-slate-950/60' : 'bg-slate-50/70'}`}>
                    {questions.map((q) => {
                      const thumbPath = `./thumbs/${q.thumbnail_id}.png`;
                      const isHighlighted = highlightedTaskIds.has(q.id);
                      const hasSelectedWord = selectedWord !== null;
                      const { tabId, label } = mapSectionToTab(q.id);
                      const isSectionDone = yearHistory.some(r => r.tabId === tabId);

                      let cardStyle = isDark 
                        ? "border-slate-800 opacity-90 hover:opacity-100 hover:border-slate-600" 
                        : "border-gray-200 opacity-90 hover:opacity-100 hover:border-blue-400";
                      if (hasSelectedWord) {
                        if (isHighlighted) {
                          cardStyle = "border-blue-400 ring-2 ring-blue-400 bg-blue-500/30 opacity-100 scale-[1.02] shadow-lg shadow-blue-500/40 z-10";
                        } else {
                          cardStyle = isDark 
                            ? "border-slate-900 opacity-25 grayscale-[60%]" 
                            : "border-gray-200 opacity-30 grayscale-[60%]";
                        }
                      }

                      return (
                        <div
                          key={q.id}
                          onClick={() => handleThumbnailClick(cleanYear, q)}
                          title={`${cleanYear}年 ${label} (点击直达作答)`}
                          className={`relative rounded-lg overflow-hidden border transition-all cursor-pointer ${isDark ? 'bg-slate-900' : 'bg-white'} ${cardStyle}`}
                        >
                          <img
                            src={thumbPath}
                            alt={`${cleanYear} ${q.section} ${q.part}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-auto object-cover transition-opacity"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />

                          {/* Completed Section Indicator Badge */}
                          {isSectionDone && (
                            <div className="absolute top-1 right-1 z-10">
                              <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                已答
                              </span>
                            </div>
                          )}

                          {/* Light Blue Tint Overlay on Match */}
                          {isHighlighted && (
                            <div className="absolute inset-0 bg-blue-500/25 pointer-events-none flex items-start justify-end p-1">
                              <span className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-white animate-ping"></span>
                            </div>
                          )}

                          <div className={`absolute bottom-0 inset-x-0 text-[8.5px] px-1 py-0.5 text-center truncate font-sans ${
                            isDark ? 'bg-black/80 text-slate-300' : 'bg-slate-900/80 text-white'
                          }`}>
                            {q.section} {q.part}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Dynamic Bottom Bar: Shows Selected Word Details or Default Guidelines */}
      {selectedWord ? (
        <div className={`flex-shrink-0 p-4 md:px-8 shadow-2xl z-20 backdrop-blur-md animate-slide-up border-t ${
          isDark 
            ? 'bg-slate-950/95 border-blue-900/60 text-white' 
            : 'bg-white/95 border-gray-200 text-gray-900 shadow-xl'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedWord.word}
                </span>
                {selectedWord.entry.phonetic && (
                  <span className={`text-sm font-semibold font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    /{selectedWord.entry.phonetic}/
                  </span>
                )}
                <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  考频: {selectedWord.paperCount} 篇 / {selectedWord.totalCount} 次
                </span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  高亮命中: {highlightedTaskIds.size} 篇文章
                </span>
              </div>

              <p className={`text-sm font-medium mt-1 line-clamp-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                {selectedWord.entry.definition_cn.replace(/\n/g, ' ')}
              </p>

              {firstSentenceInfo && (
                <p className={`text-xs mt-1.5 italic line-clamp-1 font-serif ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  📖 真题例句释义: <span className={`font-sans not-italic font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{firstSentenceInfo.translation}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Status Toggle */}
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-gray-100 border-gray-200'
              }`}>
                <button
                  onClick={() => onToggleStatus(selectedWord.word, 'familiar')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    selectedWord.status === 'familiar'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-gray-500 hover:text-emerald-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  熟词
                </button>
                <button
                  onClick={() => onToggleStatus(selectedWord.word, 'unfamiliar')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    selectedWord.status === 'unfamiliar'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-rose-400' : 'text-gray-500 hover:text-rose-600'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  生词
                </button>
              </div>

              <button
                onClick={() => onOpenWordModal(selectedWord)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <span>查看全部例句与词卡</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onSelectWord(null)}
                title="清除高亮"
                className={`p-2 rounded-xl border transition-colors ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 border-gray-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex-shrink-0 py-3.5 px-6 z-10 border-t ${
          isDark ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-white border-gray-200 text-gray-500 shadow-sm'
        }`}>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs gap-2">
            <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              共 17 套卷 · 153 篇文章 · 762 个大纲核心重点单词
            </span>
            <div className="flex items-center gap-4">
              <span>💡 点击左侧单词高亮真题出现位置</span>
              <span>👉 点击试卷卡片直接跳转该部分作答</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
