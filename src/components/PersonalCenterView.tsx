import React, { useState, useMemo } from 'react';
import { FavoriteSentenceItem, WrongQuestionItem } from '../types/reading';
import { 
  Bookmark, 
  XCircle, 
  BarChart3, 
  BookOpen, 
  Trash2, 
  Volume2, 
  ExternalLink, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  TrendingUp,
  Award
} from 'lucide-react';
import { 
  loadFavoriteSentences, 
  removeFavoriteSentence, 
  loadWrongQuestions, 
  removeWrongQuestion,
  loadReadingProgress,
  loadParaphraseProgress
} from '../utils/readingStorage';

interface PersonalCenterViewProps {
  onWordClick?: (word: string, rect: DOMRect) => void;
  onNavigateToReading?: (passKey: string) => void;
  wordStatuses?: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>;
}

export const PersonalCenterView: React.FC<PersonalCenterViewProps> = ({
  onWordClick,
  onNavigateToReading,
  wordStatuses = {}
}) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'wrong' | 'insight'>('favorites');
  const [favoriteSentences, setFavoriteSentences] = useState<FavoriteSentenceItem[]>(() => loadFavoriteSentences());
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionItem[]>(() => loadWrongQuestions());
  const [wrongFilter, setWrongFilter] = useState<'all' | 'reading' | 'paraphrase'>('all');

  const readingProgress = useMemo(() => loadReadingProgress(), []);
  const paraphraseProgress = useMemo(() => loadParaphraseProgress(), []);

  const handleRemoveFavorite = (sid: string) => {
    const updated = removeFavoriteSentence(sid);
    setFavoriteSentences(updated);
  };

  const handleRemoveWrong = (id: string | number) => {
    const updated = removeWrongQuestion(id);
    setWrongQuestions(updated);
  };

  const filteredWrong = useMemo(() => {
    if (wrongFilter === 'all') return wrongQuestions;
    return wrongQuestions.filter(q => q.type === wrongFilter);
  }, [wrongQuestions, wrongFilter]);

  // Insight Calculations
  const insightStats = useMemo(() => {
    // Reading stats
    let totalReadSentences = 0;
    Object.values(readingProgress).forEach(p => {
      totalReadSentences += (p.readSentences || []).length;
    });

    // Paraphrase stats
    const paraEntries = Object.values(paraphraseProgress);
    const paraAnswered = paraEntries.length;
    const paraCorrect = paraEntries.filter(p => p.correct).length;
    const paraAccuracy = paraAnswered > 0 ? Math.round((paraCorrect / paraAnswered) * 100) : 0;

    // Word stats
    let familiarCount = 0;
    let unfamiliarCount = 0;
    Object.values(wordStatuses).forEach(st => {
      if (st === 'familiar') familiarCount++;
      if (st === 'unfamiliar') unfamiliarCount++;
    });

    return {
      totalReadSentences,
      paraAnswered,
      paraCorrect,
      paraAccuracy,
      familiarCount,
      unfamiliarCount
    };
  }, [readingProgress, paraphraseProgress, wordStatuses]);

  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (err) {
      console.error('TTS speech error:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Sub-tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              个人学习复习中心
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              集中复习收藏的真题长难句、攻坚错题本、查看薄弱点诊断画像。所有数据离线保存在本地。
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'favorites'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" /> 难句本 ({favoriteSentences.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wrong')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'wrong'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" /> 错题本 ({wrongQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('insight')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'insight'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> 薄弱点诊断
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab 1: Favorites (难句本) */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          {favoriteSentences.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 space-y-2">
              <Bookmark className="w-10 h-10 mx-auto text-amber-500 opacity-60 mb-2" />
              <p className="font-medium text-slate-700 dark:text-slate-300">难句本还是空的</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                在「长难句精读」或「语法点专练」中，点击句子右上角的书签按钮 ☆，即可收藏难以消化的长难句至此集中复习。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {favoriteSentences.map(item => {
                const passKey = `${item.year}-t${item.text_no}`;
                return (
                  <div
                    key={item.sid}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {item.year} 年 Text {item.text_no}
                        </span>
                        <span className="text-xs text-slate-400">
                          收藏于 {new Date(item.addedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleSpeak(item.s, e)}
                          title="朗读"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        {onNavigateToReading && (
                          <button
                            type="button"
                            onClick={() => onNavigateToReading(passKey)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg flex items-center gap-1"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> 查看原文
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFavorite(item.sid)}
                          title="移出难句本"
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="font-serif text-base sm:text-lg leading-relaxed text-slate-900 dark:text-slate-100 select-text">
                      {item.s}
                    </p>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 select-text">
                      <b>全句译文：</b>{item.zh}
                    </div>

                    {/* Trunk & Components */}
                    {item.trunk && (
                      <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs space-y-1.5">
                        <div className="font-bold text-indigo-700 dark:text-indigo-300">核心主干：</div>
                        <div className="text-slate-700 dark:text-slate-300">
                          {item.trunk['主干翻译'] || `${item.trunk['主语'] || ''} ${item.trunk['谓语'] || ''} ${item.trunk['宾语或表语'] || ''}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Wrong Questions (错题本) */}
      {activeTab === 'wrong' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">题型过滤：</span>
            <button
              type="button"
              onClick={() => setWrongFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                wrongFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              全部 ({wrongQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setWrongFilter('reading')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                wrongFilter === 'reading'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              阅读理解 ({wrongQuestions.filter(q => q.type === 'reading').length})
            </button>
            <button
              type="button"
              onClick={() => setWrongFilter('paraphrase')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                wrongFilter === 'paraphrase'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              同义替换 ({wrongQuestions.filter(q => q.type === 'paraphrase').length})
            </button>
          </div>

          {filteredWrong.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 space-y-2">
              <Award className="w-10 h-10 mx-auto text-emerald-500 opacity-60 mb-2" />
              <p className="font-medium text-slate-700 dark:text-slate-300">暂无错题记录</p>
              <p className="text-xs text-slate-400">目前没有错题，继续保持优异战绩！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWrong.map(q => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        {q.type === 'reading' ? '阅读真题' : '同义替换'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {q.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {q.passKey && onNavigateToReading && (
                        <button
                          type="button"
                          onClick={() => onNavigateToReading(q.passKey!)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" /> 回原文精读
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveWrong(q.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="已掌握，移出错题本"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 select-text">
                    {q.stem}
                  </p>

                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {q.choices.map((c, i) => {
                      const letter = ['A', 'B', 'C', 'D'][i];
                      const isMyWrongChoice = q.myChoice.toUpperCase() === letter;
                      const isCorrect = q.answer.toUpperCase() === letter;

                      return (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200 font-medium'
                              : isMyWrongChoice
                              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-900 dark:text-rose-200 line-through'
                              : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="font-bold">{letter}.</span>
                          <span>{c}</span>
                        </div>
                      );
                    })}
                  </div>

                  {q.analysis && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                      <b>解析：</b>{q.analysis}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Diagnosis & Insights (薄弱点诊断) */}
      {activeTab === 'insight' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                长难句精读打卡
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {insightStats.totalReadSentences} 句
              </div>
              <div className="text-xs text-slate-500">涵盖 2001-2025 年真题篇章</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                同义替换完成度
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {insightStats.paraAnswered} / 200 题
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                答题正确率 {insightStats.paraAccuracy}%
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                考纲生词攻坚
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {insightStats.unfamiliarCount} 生词
              </div>
              <div className="text-xs text-slate-500">已攻克熟词 {insightStats.familiarCount} 个</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              备考建议与攻坚指南
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100">1. 长难句主干优先法</div>
                <p>做阅读或翻译先找主谓宾，修饰从句后拆。遇到双重否定或虚拟语气多加留心。</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100">2. 同义替换考点强化</div>
                <p>真题命题点 80% 围绕同义词改写展开。注意反向排除「张冠李戴」与「过度推断」干扰项。</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
