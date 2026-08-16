import React from 'react';
import { 
  X, 
  BarChart3, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Award, 
  Target, 
  BookOpen, 
  ArrowRight, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { OverallStudyStats, QuizRecordItem } from '../utils/ebbinghaus';
import { PaperGroup } from '../types/kaoyan';

interface StudyProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: OverallStudyStats;
  papers: PaperGroup[];
  quizHistory: Record<string, QuizRecordItem[]>;
  onSelectYear: (year: string) => void;
  theme?: 'dark' | 'light';
}

export const StudyProgressModal: React.FC<StudyProgressModalProps> = ({
  isOpen,
  onClose,
  stats,
  papers,
  quizHistory,
  onSelectYear,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className={`rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border transition-colors overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-850' : 'border-gray-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                考研英语真题刷题进度档案
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                全景记录已刷年份、各题型完成率与做题正确率统计
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`text-lg font-bold w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Overview Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                <span>总完成度</span>
              </div>
              <div className="text-2xl font-black text-blue-500 font-mono">
                {stats.overallProgressPercent}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                已完成 {stats.completedSectionsCount}/{stats.totalSections} 篇
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>已刷试卷</span>
              </div>
              <div className="text-2xl font-black text-emerald-500 font-mono">
                {stats.testedPapersCount} <span className="text-sm font-normal text-slate-400">/ {stats.totalPapers}套</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                覆盖 2010–2026 年
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>综合正确率</span>
              </div>
              <div className="text-2xl font-black text-amber-500 font-mono">
                {stats.averageAccuracyPercent}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                答对 {stats.totalQuestionsCorrect}/{stats.totalQuestionsAnswered} 题
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>累计刷题</span>
              </div>
              <div className="text-2xl font-black text-purple-500 font-mono">
                {stats.totalQuestionsAnswered} <span className="text-sm font-normal text-slate-400">道</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                客观选择与主观作答
              </div>
            </div>
          </div>

          {/* Yearly Completion Progress Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`text-sm font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Calendar className="w-4 h-4 text-blue-500" />
                历年真题做题明细 (2010–2026)
              </h4>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                点击卡片快速进入该年份做题
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {papers.map(p => {
                const yStr = String(p.name.match(/\d{4}/)?.[0] || p.id || '');
                const cleanYear = p.name.replace(/\(1\)/g, '').trim();
                const yearProg = stats.yearProgressMap[yStr] || { completedSections: 0, totalSections: 9, percent: 0, score: 0, maxScore: 100 };
                const isFinished = yearProg.percent === 100;
                const isStarted = yearProg.completedSections > 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectYear(yStr);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                      isFinished
                        ? isDark ? 'bg-emerald-950/30 border-emerald-800/60 hover:border-emerald-500' : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-400'
                        : isStarted
                        ? isDark ? 'bg-slate-850 border-slate-750 hover:border-blue-500' : 'bg-blue-50/40 border-blue-200 hover:border-blue-400'
                        : isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-black text-sm md:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {cleanYear} 年真题
                        </span>

                        {isFinished ? (
                          <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            已全部完成 (100%)
                          </span>
                        ) : isStarted ? (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                            已完成 {yearProg.completedSections}/{yearProg.totalSections} 题型 ({yearProg.percent}%)
                          </span>
                        ) : (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            未作答 (0%)
                          </span>
                        )}
                      </div>

                      {/* Year Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFinished 
                              ? 'bg-emerald-500' 
                              : isStarted 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${yearProg.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                        {isStarted ? `累计得分: ${yearProg.score} 分` : '9 大题型全部就绪'}
                      </span>
                      <span className="text-blue-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 font-bold">
                        <span>{isStarted ? '继续刷题' : '开始做题'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
