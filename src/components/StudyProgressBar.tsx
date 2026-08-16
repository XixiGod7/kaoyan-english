import React from 'react';
import { Award, CheckCircle2, Flame, BarChart3, ChevronRight, BookOpen, Clock, Target } from 'lucide-react';
import { OverallStudyStats } from '../utils/ebbinghaus';

interface StudyProgressBarProps {
  stats: OverallStudyStats;
  onOpenDetailModal: () => void;
  theme?: 'dark' | 'light';
}

export const StudyProgressBar: React.FC<StudyProgressBarProps> = ({
  stats,
  onOpenDetailModal,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`mb-6 p-4 md:p-5 rounded-2xl border transition-all shadow-sm ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Stats Overview */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-500 flex items-center justify-center border border-blue-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className={`font-black text-sm md:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                真题学习总进度
              </span>
              <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
                {stats.overallProgressPercent}%
              </span>
            </div>

            <button
              onClick={onOpenDetailModal}
              className={`text-xs font-bold flex items-center gap-1 transition ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <span>查看详细刷题报告</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3 rounded-full bg-slate-800/80 overflow-hidden relative mb-2">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(stats.overallProgressPercent, 2)}%` }}
            />
          </div>

          {/* Quick Metrics Badges */}
          <div className={`flex flex-wrap items-center gap-4 text-xs font-medium ${
            isDark ? 'text-slate-400' : 'text-gray-600'
          }`}>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              已刷题型：<strong className={isDark ? 'text-slate-200' : 'text-gray-900'}>{stats.completedSectionsCount} / {stats.totalSections}</strong> 篇
            </span>

            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              已做真题：<strong className={isDark ? 'text-slate-200' : 'text-gray-900'}>{stats.testedPapersCount} / {stats.totalPapers}</strong> 套卷
            </span>

            {stats.totalQuestionsAnswered > 0 && (
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                综合正确率：<strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>{stats.averageAccuracyPercent}%</strong>
                <span className="text-[11px] opacity-75">({stats.totalQuestionsCorrect}/{stats.totalQuestionsAnswered}题)</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
