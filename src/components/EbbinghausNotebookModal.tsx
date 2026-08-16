import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Brain, 
  Volume2, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  ChevronRight, 
  Search, 
  Flame, 
  Layers, 
  Clock, 
  Award, 
  BookOpen, 
  X, 
  Check, 
  ChevronLeft,
  Calendar,
  Zap,
  TrendingUp,
  AlertTriangle,
  Target,
  Plus,
  RefreshCw,
  Link2
} from 'lucide-react';
import { KaoyanDict, WordFreqItem } from '../types/kaoyan';
import { 
  EbbinghausWordRecord, 
  STAGE_LABELS, 
  calculateNextReview, 
  saveEbbinghausRecords,
  loadEbbinghausRecords,
  syncAllWordsToEbbinghaus,
  generatePrioritizedDailyQueue,
  loadDailyReviewLimit,
  saveDailyReviewLimit,
  loadDailySessionState,
  saveDailySessionState,
  getTodayDateStr,
  isTimestampToday
} from '../utils/ebbinghaus';
import { findRelatedWords } from '../utils/wordRelations';

interface EbbinghausNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict: KaoyanDict | null;
  words: WordFreqItem[];
  wordStatuses: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>;
  onToggleStatus: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
  onOpenWordDetail?: (item: WordFreqItem) => void;
  theme?: 'dark' | 'light';
}

// Session-level Card Item for active in-memory review loop
interface SessionCardItem {
  word: string;
  record: EbbinghausWordRecord;
  sessionMistakes: number; // how many times user clicked 'again' or 'hard' today
  sessionPassCount: number; // consecutive 'good' count after mistakes
}

export const EbbinghausNotebookModal: React.FC<EbbinghausNotebookModalProps> = ({
  isOpen,
  onClose,
  dict,
  words,
  wordStatuses,
  onToggleStatus,
  onOpenWordDetail,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'review' | 'list' | 'curve'>('review');
  const [records, setRecords] = useState<Record<string, EbbinghausWordRecord>>({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'unfamiliar' | 'due' | 'early' | 'mid' | 'mastered'>('all');
  
  // Daily Quota state
  const [dailyQuota, setDailyQuota] = useState<number>(() => loadDailyReviewLimit());
  const [isCustomQuota, setIsCustomQuota] = useState(false);
  const [customQuotaInput, setCustomQuotaInput] = useState('');

  // Active in-session review queue (persisted to localStorage)
  const [sessionQueue, setSessionQueue] = useState<SessionCardItem[]>([]);
  const [sessionTotalTarget, setSessionTotalTarget] = useState<number>(0);
  const [passedWords, setPassedWords] = useState<Set<string>>(new Set());
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'again' | 'hard' | 'good' | 'easy' } | null>(null);

  // Initialize and restore daily review progress on open
  useEffect(() => {
    if (!isOpen) return;
    const loaded = loadEbbinghausRecords();
    const synced = syncAllWordsToEbbinghaus(words, wordStatuses, loaded);
    setRecords(synced);
    saveEbbinghausRecords(synced);

    // Check if there is already saved daily review progress for TODAY
    const savedSession = loadDailySessionState();
    if (savedSession) {
      const restoredPassed = new Set(savedSession.passedWords);
      setPassedWords(restoredPassed);
      
      const restoredQueue: SessionCardItem[] = savedSession.activeQueueWords
        .map(item => ({
          word: item.word,
          record: synced[item.word] || {
            word: item.word,
            stage: 0,
            nextReviewTime: Date.now(),
            lastReviewTime: Date.now(),
            reviewCount: 0,
            easeFactor: 2.5,
            history: []
          },
          sessionMistakes: item.sessionMistakes,
          sessionPassCount: item.sessionPassCount
        }))
        .filter(item => !restoredPassed.has(item.word));
      
      setSessionQueue(restoredQueue);
      setSessionTotalTarget(savedSession.sessionTotalTarget || Math.max(dailyQuota, restoredPassed.size + restoredQueue.length));
    } else {
      // Find words that were already reviewed and passed TODAY
      const todayPassed: string[] = [];
      const nowMs = Date.now();
      Object.values(synced).forEach(r => {
        if (isTimestampToday(r.lastReviewTime) && r.nextReviewTime > nowMs) {
          todayPassed.push(r.word);
        }
      });

      const alreadyPassedCount = todayPassed.length;
      const neededExtra = dailyQuota === 0 ? 0 : Math.max(0, dailyQuota - alreadyPassedCount);

      // Build prioritized daily queue with only the needed extra words
      const fullBatch = generatePrioritizedDailyQueue(words, wordStatuses, synced, 0).queue;
      const extraWords = fullBatch
        .filter(r => !todayPassed.includes(r.word))
        .slice(0, dailyQuota === 0 ? fullBatch.length : neededExtra);

      const initialQueue: SessionCardItem[] = extraWords.map(r => ({
        word: r.word,
        record: r,
        sessionMistakes: 0,
        sessionPassCount: 0
      }));

      const totalTarget = Math.max(dailyQuota, alreadyPassedCount + initialQueue.length);
      setSessionQueue(initialQueue);
      setSessionTotalTarget(totalTarget);
      setPassedWords(new Set(todayPassed));

      saveDailySessionState({
        dateStr: getTodayDateStr(),
        passedWords: todayPassed,
        activeQueueWords: initialQueue.map(c => ({
          word: c.word,
          sessionMistakes: c.sessionMistakes,
          sessionPassCount: c.sessionPassCount
        })),
        sessionTotalTarget: totalTarget
      });
    }

    setIsFlipped(false);
    setActionFeedback(null);
  }, [isOpen, words, wordStatuses]);

  // Audio player
  const playAudio = useCallback((word: string) => {
    if (!word) return;
    setIsPlayingAudio(true);
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`);
    audio.play().catch(() => {});
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  }, []);

  // Update daily quota with smart incremental calculation:
  // If user already passed P words today and sets quota to N:
  // - If P >= N, remaining needed is 0 (goal already accomplished!)
  // - If P < N, only pull (N - P) additional new words!
  const handleSetQuota = (num: number) => {
    setDailyQuota(num);
    saveDailyReviewLimit(num);
    setIsCustomQuota(false);

    const currentPassedArr = Array.from(passedWords);
    const alreadyPassedCount = currentPassedArr.length;

    // Keep any unfinished in-session mistake retries from current queue
    const unfinishedMistakeCards = sessionQueue.filter(c => c.sessionMistakes > 0 && !passedWords.has(c.word));
    const currentUnfinishedWords = new Set(unfinishedMistakeCards.map(c => c.word));

    let newQueue: SessionCardItem[] = [];
    let newTarget = num;

    if (num === 0) {
      // "全部" mode: fetch all remaining due words
      const allBatch = generatePrioritizedDailyQueue(words, wordStatuses, records, 0).queue;
      const extraBatch = allBatch.filter(r => !currentPassedArr.includes(r.word) && !currentUnfinishedWords.has(r.word));
      newQueue = [
        ...unfinishedMistakeCards,
        ...extraBatch.map(r => ({
          word: r.word,
          record: r,
          sessionMistakes: 0,
          sessionPassCount: 0
        }))
      ];
      newTarget = currentPassedArr.length + newQueue.length;
    } else {
      // Fixed or custom number (e.g. 10, 20, 30, 50, custom):
      // Calculate how many more words are needed beyond what's already passed today
      const neededExtra = Math.max(0, num - alreadyPassedCount - unfinishedMistakeCards.length);

      if (neededExtra > 0) {
        // Pull exactly `neededExtra` new words from unlearned/due curriculum
        const fullBatch = generatePrioritizedDailyQueue(words, wordStatuses, records, 0).queue;
        const extraWords = fullBatch
          .filter(r => !currentPassedArr.includes(r.word) && !currentUnfinishedWords.has(r.word))
          .slice(0, neededExtra);

        newQueue = [
          ...unfinishedMistakeCards,
          ...extraWords.map(r => ({
            word: r.word,
            record: r,
            sessionMistakes: 0,
            sessionPassCount: 0
          }))
        ];
      } else {
        // Already met or exceeded the requested quota today!
        newQueue = unfinishedMistakeCards;
      }
      newTarget = Math.max(num, alreadyPassedCount + newQueue.length);
    }

    setSessionQueue(newQueue);
    setSessionTotalTarget(newTarget);

    saveDailySessionState({
      dateStr: getTodayDateStr(),
      passedWords: currentPassedArr,
      activeQueueWords: newQueue.map(c => ({
        word: c.word,
        sessionMistakes: c.sessionMistakes,
        sessionPassCount: c.sessionPassCount
      })),
      sessionTotalTarget: newTarget
    });

    setIsFlipped(false);
    setActionFeedback(null);
  };

  const handleCustomQuotaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customQuotaInput, 10);
    if (!isNaN(val) && val > 0) {
      handleSetQuota(val);
    }
  };

  // Restart current session (reset today's progress for this set)
  const handleRestartSession = () => {
    const batch = generatePrioritizedDailyQueue(words, wordStatuses, records, dailyQuota).queue;
    const newQueue = batch.map(r => ({
      word: r.word,
      record: r,
      sessionMistakes: 0,
      sessionPassCount: 0
    }));

    setSessionQueue(newQueue);
    setSessionTotalTarget(batch.length);
    setPassedWords(new Set());
    setIsFlipped(false);
    setActionFeedback(null);

    saveDailySessionState({
      dateStr: getTodayDateStr(),
      passedWords: [],
      activeQueueWords: newQueue.map(c => ({
        word: c.word,
        sessionMistakes: c.sessionMistakes,
        sessionPassCount: c.sessionPassCount
      })),
      sessionTotalTarget: batch.length
    });
  };

  // Add more words to today's batch
  const handleAddMoreBatch = (extra: number = 20) => {
    const currentPassedArr = Array.from(passedWords);
    const newQuota = Math.max(dailyQuota, currentPassedArr.length) + extra;
    handleSetQuota(newQuota);
  };

  // Total saved / in-progress words across all 762
  const allSavedWords = useMemo(() => {
    return Object.values(records).sort((a, b) => {
      const aUnfam = wordStatuses[a.word] === 'unfamiliar';
      const bUnfam = wordStatuses[b.word] === 'unfamiliar';
      if (aUnfam && !bUnfam) return -1;
      if (!aUnfam && bUnfam) return 1;
      if (a.stage !== b.stage) return a.stage - b.stage;
      return a.word.localeCompare(b.word);
    });
  }, [records, wordStatuses]);

  const markedUnfamiliarTotal = useMemo(() => {
    return Object.values(wordStatuses).filter(s => s === 'unfamiliar').length;
  }, [wordStatuses]);

  // Filtered vocabulary list for Tab 2
  const now = Date.now();
  const filteredList = useMemo(() => {
    return allSavedWords.filter(r => {
      const isUnfam = wordStatuses[r.word] === 'unfamiliar';
      const matchSearch = r.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dict?.entries?.[r.word]?.definition_cn || '').includes(searchTerm);
      
      let matchStage = true;
      if (stageFilter === 'unfamiliar') matchStage = isUnfam;
      else if (stageFilter === 'due') matchStage = r.nextReviewTime <= now && r.stage < 8;
      else if (stageFilter === 'early') matchStage = r.stage >= 0 && r.stage <= 2;
      else if (stageFilter === 'mid') matchStage = r.stage >= 3 && r.stage <= 6;
      else if (stageFilter === 'mastered') matchStage = r.stage >= 7;

      return matchSearch && matchStage;
    });
  }, [allSavedWords, searchTerm, stageFilter, dict, wordStatuses, now]);

  // Current Active Card in the Session Queue
  const currentCard = sessionQueue[0] || null;
  const currentDueWord = currentCard ? currentCard.record : null;
  const currentEntry = currentDueWord && dict?.entries ? dict.entries[currentDueWord.word] : null;
  const isCurrentUnfamiliar = currentDueWord ? wordStatuses[currentDueWord.word] === 'unfamiliar' : false;

  // Find similar, derivative, and confusable words for the current card
  const relatedWords = useMemo(() => {
    return currentDueWord ? findRelatedWords(currentDueWord.word, dict) : [];
  }, [currentDueWord?.word, dict]);

  const passedCount = passedWords.size;
  const progressPercent = sessionTotalTarget > 0 ? Math.min(100, Math.round((passedCount / sessionTotalTarget) * 100)) : 0;

  // Keyboard shortcut listener for Flashcards
  useEffect(() => {
    if (!isOpen || activeTab !== 'review' || !currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        else if (e.key === '2') handleRate('hard');
        else if (e.key === '3') handleRate('good');
        else if (e.key === '4') handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, isFlipped, currentCard]);

  // Interactive Rate Action with in-session retry loop and permanent daily state persistence
  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard || !currentDueWord) return;

    const cardWord = currentCard.word;
    const remaining = sessionQueue.slice(1);
    let newQueue: SessionCardItem[] = [];
    const updatedPassed = new Set(passedWords);
    let updatedFeedback: { text: string; type: 'again' | 'hard' | 'good' | 'easy' } = { text: '', type: rating };

    if (rating === 'again') {
      // 1. 完全忘记:
      // Must repeat today! Insert back into queue 2~3 cards later.
      const updatedRecord = calculateNextReview(currentDueWord, 'again');
      const updatedCard: SessionCardItem = {
        ...currentCard,
        record: updatedRecord,
        sessionMistakes: currentCard.sessionMistakes + 1,
        sessionPassCount: 0
      };

      const insertIdx = Math.min(3, remaining.length);
      newQueue = [...remaining.slice(0, insertIdx), updatedCard, ...remaining.slice(insertIdx)];

      // Update in storage
      const newRecords = { ...records, [cardWord]: updatedRecord };
      setRecords(newRecords);
      saveEbbinghausRecords(newRecords);

      updatedFeedback = {
        text: '❌ 模糊/忘记：已排入今日巩固重练队列（稍后将再次考查）',
        type: 'again'
      };
    } else if (rating === 'hard') {
      // 2. 模糊困难:
      // Must repeat today! Insert back into queue 3~4 cards later.
      const updatedRecord = calculateNextReview(currentDueWord, 'hard');
      const updatedCard: SessionCardItem = {
        ...currentCard,
        record: updatedRecord,
        sessionMistakes: currentCard.sessionMistakes + 1,
        sessionPassCount: 0
      };

      const insertIdx = Math.min(4, remaining.length);
      newQueue = [...remaining.slice(0, insertIdx), updatedCard, ...remaining.slice(insertIdx)];

      // Update in storage
      const newRecords = { ...records, [cardWord]: updatedRecord };
      setRecords(newRecords);
      saveEbbinghausRecords(newRecords);

      updatedFeedback = {
        text: '⚠️ 模糊不熟：已排入今日巩固循环（稍后将再次考查）',
        type: 'hard'
      };
    } else if (rating === 'good') {
      // 3. 记得/良好:
      if (currentCard.sessionMistakes > 0) {
        // If this word had mistakes previously in THIS session, require 1 more recognition to pass
        const nextPassCount = currentCard.sessionPassCount + 1;
        if (nextPassCount < 2 && remaining.length > 0) {
          const updatedCard: SessionCardItem = {
            ...currentCard,
            sessionPassCount: nextPassCount
          };
          const insertIdx = Math.min(3, remaining.length);
          newQueue = [...remaining.slice(0, insertIdx), updatedCard, ...remaining.slice(insertIdx)];

          updatedFeedback = {
            text: '👍 记忆恢复中！稍后进行最后一次验证即可过关',
            type: 'good'
          };
        } else {
          // Passed today!
          updatedPassed.add(cardWord);
          setPassedWords(updatedPassed);
          newQueue = remaining;

          const updatedRecord = calculateNextReview(currentDueWord, 'good');
          if (updatedRecord.stage >= 8) onToggleStatus(cardWord, 'familiar');
          const newRecords = { ...records, [cardWord]: updatedRecord };
          setRecords(newRecords);
          saveEbbinghausRecords(newRecords);

          updatedFeedback = {
            text: '✨ 恭喜过关！今日已掌握，下次复习已延后！',
            type: 'good'
          };
        }
      } else {
        // First time seeing it today and remembered!
        updatedPassed.add(cardWord);
        setPassedWords(updatedPassed);
        newQueue = remaining;

        const updatedRecord = calculateNextReview(currentDueWord, 'good');
        if (updatedRecord.stage >= 8) onToggleStatus(cardWord, 'familiar');
        const newRecords = { ...records, [cardWord]: updatedRecord };
        setRecords(newRecords);
        saveEbbinghausRecords(newRecords);

        updatedFeedback = {
          text: '✨ 掌握良好！今日已过关，下次复习已延后！',
          type: 'good'
        };
      }
    } else if (rating === 'easy') {
      // 4. 轻松秒杀:
      // Immediately passed today and accelerated progression!
      updatedPassed.add(cardWord);
      setPassedWords(updatedPassed);
      newQueue = remaining;

      const updatedRecord = calculateNextReview(currentDueWord, 'easy');
      if (updatedRecord.stage >= 8) onToggleStatus(cardWord, 'familiar');
      const newRecords = { ...records, [cardWord]: updatedRecord };
      setRecords(newRecords);
      saveEbbinghausRecords(newRecords);

      updatedFeedback = {
        text: '⚡ 轻松秒杀！今日直接过关，已延后多日复习！',
        type: 'easy'
      };
    }

    setSessionQueue(newQueue);
    setIsFlipped(false);
    setActionFeedback(updatedFeedback);

    // Permanently persist today's updated session state
    saveDailySessionState({
      dateStr: getTodayDateStr(),
      passedWords: Array.from(updatedPassed),
      activeQueueWords: newQueue.map(c => ({
        word: c.word,
        sessionMistakes: c.sessionMistakes,
        sessionPassCount: c.sessionPassCount
      })),
      sessionTotalTarget
    });
  };

  if (!isOpen) return null;

  const currentStageInfo = currentDueWord ? STAGE_LABELS[currentDueWord.stage] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className={`rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border transition-colors overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Top Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-850' : 'border-gray-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                单词复习
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Selectors */}
            <div className={`flex items-center p-1 rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <button
                onClick={() => { setActiveTab('review'); setIsFlipped(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                  activeTab === 'review'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>今日复习</span>
                {sessionQueue.length > 0 && (
                  <span className="bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                    {sessionQueue.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'list'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>全词库 ({allSavedWords.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('curve')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'curve'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>遗忘曲线</span>
              </button>
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
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Daily Flashcard Review Mode */}
          {activeTab === 'review' && (
            <div className="h-full flex flex-col items-center justify-between max-w-2xl mx-auto py-1">
              {/* Daily Quota Setting Bar */}
              <div className={`w-full p-3 rounded-2xl border mb-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold">每日复习目标：</span>
                  <div className="flex items-center gap-1">
                    {[10, 20, 30, 50].map(amt => (
                      <button
                        key={amt}
                        onClick={() => handleSetQuota(amt)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          dailyQuota === amt && !isCustomQuota
                            ? 'bg-indigo-600 text-white shadow'
                            : isDark ? 'bg-slate-850 hover:bg-slate-800 text-slate-300' : 'bg-white hover:bg-gray-100 text-gray-700 border'
                        }`}
                      >
                        {amt}词
                      </button>
                    ))}
                    <button
                      onClick={() => handleSetQuota(0)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        dailyQuota === 0 && !isCustomQuota
                          ? 'bg-indigo-600 text-white shadow'
                          : isDark ? 'bg-slate-850 hover:bg-slate-800 text-slate-300' : 'bg-white hover:bg-gray-100 text-gray-700 border'
                      }`}
                      title="复习全部已到期与待学习核心词"
                    >
                      全部
                    </button>

                    {isCustomQuota ? (
                      <form onSubmit={handleCustomQuotaSubmit} className="flex items-center gap-1 ml-1">
                        <input
                          type="number"
                          min="1"
                          max="762"
                          value={customQuotaInput}
                          onChange={e => setCustomQuotaInput(e.target.value)}
                          placeholder="数量"
                          autoFocus
                          className="w-14 px-2 py-0.5 rounded-md border text-center text-xs font-bold outline-none bg-slate-900 text-white border-indigo-500"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-indigo-600 text-white rounded-md text-[11px] font-bold"
                        >
                          确定
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => { setIsCustomQuota(true); setCustomQuotaInput(String(dailyQuota || 20)); }}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                          isDark ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        自定义
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                    isDark ? 'bg-indigo-950/80 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}>
                    今日已过关: {passedCount} / {sessionTotalTarget}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                    sessionQueue.length === 0
                      ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                      : isDark ? 'bg-amber-950/80 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    待攻克: {sessionQueue.length}
                  </span>
                </div>
              </div>

              {/* Session Completed View */}
              {sessionQueue.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4 shadow-inner animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black mb-2 text-emerald-400">
                    🎉 完美通关！今日目标 {passedCount} / {sessionTotalTarget} 词已全部达成！
                  </h4>
                  <p className={`text-sm max-w-lg mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    您已完成设定的背词计划！待攻克单词为 0。
                    进度已永久为您保存在本地，系统已根据艾宾浩斯曲线自动延后 1~7 天进行下一次复习。
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAddMoreBatch(20)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-indigo-900/30 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      再来一组 (+20词)
                    </button>

                    <button
                      onClick={handleRestartSession}
                      className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      重新巩固本组
                    </button>

                    <button
                      onClick={() => setActiveTab('list')}
                      className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Layers className="w-4 h-4" />
                      查看762全词库
                    </button>
                  </div>
                </div>
              ) : currentCard && currentDueWord ? (
                <div className="w-full flex flex-col items-center">
                  {/* Progress Header & Action Feedback Bar */}
                  <div className="w-full flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500" />
                      今日复习掌握进度
                    </span>
                    <span className="font-mono text-sm font-bold text-indigo-400">
                      已过关 {passedCount} / {sessionTotalTarget} 词 ({progressPercent}%)
                    </span>
                  </div>

                  {/* Real-time Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden mb-3 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Toast Feedback on Previous Action */}
                  {actionFeedback && (
                    <div className={`w-full py-1.5 px-4 mb-2 rounded-xl text-xs font-bold flex items-center justify-center animate-fade-in ${
                      actionFeedback.type === 'again' 
                        ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                        : actionFeedback.type === 'hard'
                        ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                        : actionFeedback.type === 'good'
                        ? 'bg-blue-950/80 border border-blue-800 text-blue-300'
                        : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                    }`}>
                      {actionFeedback.text}
                    </div>
                  )}

                  {/* Interactive Flashcard */}
                  <div
                    onClick={() => setIsFlipped(prev => !prev)}
                    className={`w-full min-h-[350px] rounded-3xl p-6 md:p-8 border shadow-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 transform select-none relative group ${
                      isDark 
                        ? 'bg-gradient-to-b from-slate-850 to-slate-900 border-slate-750 hover:border-indigo-500/80 shadow-indigo-950/20' 
                        : 'bg-gradient-to-b from-white to-slate-50 border-gray-200 hover:border-indigo-300 shadow-xl'
                    }`}
                  >
                    {/* Top Status Badges on Card */}
                    <div className="absolute top-5 left-6 flex items-center gap-2 flex-wrap">
                      {/* Priority Tag: Marked Unfamiliar vs Core Key Word */}
                      {isCurrentUnfamiliar ? (
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          🔴 生词
                        </span>
                      ) : (
                        <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          核心词
                        </span>
                      )}

                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${currentStageInfo?.color || ''}`}>
                        阶段 {currentDueWord.stage}: {currentStageInfo?.name}
                      </span>

                      {currentCard.sessionMistakes > 0 && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          重练第 {currentCard.sessionMistakes} 轮
                        </span>
                      )}
                    </div>

                    <div className="absolute top-5 right-6 text-xs text-indigo-400 font-semibold flex items-center gap-1">
                      <span>{isFlipped ? '点击收起释义' : '点击或按空格翻转'}</span>
                    </div>

                    {/* Word Title & Audio */}
                    <div className="flex flex-col items-center my-4">
                      <div className="flex items-center gap-3">
                        <h2 className={`text-4xl md:text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {currentDueWord.word}
                        </h2>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(currentDueWord.word);
                          }}
                          className={`p-2 rounded-full hover:scale-110 active:scale-95 transition-all ${
                            isPlayingAudio 
                              ? 'bg-indigo-500 text-white animate-pulse' 
                              : isDark ? 'text-indigo-400 hover:bg-slate-800' : 'text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title="听发音"
                        >
                          <Volume2 className="w-6 h-6" />
                        </button>
                      </div>

                      {currentEntry?.phonetic && (
                        <p className="text-base font-mono font-semibold text-slate-400 mt-2">
                          /{currentEntry.phonetic}/
                        </p>
                      )}
                    </div>

                    {/* Flipped Card Content: Definitions & Real Exam Sentences & Similar/Derivative Words */}
                    {isFlipped && (
                      <div className="w-full mt-3 pt-3 border-t border-slate-700/60 animate-fade-in flex flex-col items-center">
                        <div className="max-w-xl text-left space-y-1.5 mb-3 w-full">
                          {currentEntry?.definition_cn ? (
                            currentEntry.definition_cn.split('\n').map((def, i) => (
                              <p key={i} className={`text-sm leading-relaxed font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                                {def}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 italic">暂无释义</p>
                          )}
                        </div>

                        {/* Exam Example Sentence Preview */}
                        {currentEntry?.sentence_ids && currentEntry.sentence_ids.length > 0 && (
                          <div className={`p-3 rounded-2xl border text-xs text-left max-w-xl w-full mb-3 ${
                            isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-100 border-gray-200 text-gray-700'
                          }`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-indigo-400 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>真题考点语境</span>
                              </span>
                              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                {currentEntry.sentence_ids.length} 处历年真题出现
                              </span>
                            </div>
                            <p className="italic text-slate-300 font-serif line-clamp-2">
                              "{currentEntry.sentence_ids[0][1]}"
                            </p>
                          </div>
                        )}

                        {/* Similar, Derivative, and Confusable Words Section */}
                        {relatedWords.length > 0 && (
                          <div className={`p-3 rounded-2xl border text-xs text-left max-w-xl w-full animate-scale-in ${
                            isDark ? 'bg-slate-950/90 border-slate-800/90' : 'bg-amber-50/50 border-amber-200/80 text-gray-800'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" />
                                <span>形近词 / 派生变形串记</span>
                              </div>
                              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                同源辨析 · 联想记忆
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {relatedWords.map((rel, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2 rounded-xl border flex items-start justify-between gap-1.5 transition ${
                                    isDark ? 'bg-slate-900/90 border-slate-750' : 'bg-white border-amber-100 shadow-sm'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {rel.word}
                                      </span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                        rel.relationship === '反义对照'
                                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                          : rel.relationship === '派生变形'
                                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                          : rel.relationship === '形近辨析'
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      }`}>
                                        {rel.relationship}
                                      </span>
                                    </div>
                                    <p className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                                      {rel.definition_cn}
                                    </p>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playAudio(rel.word);
                                    }}
                                    className={`p-1 rounded-md transition ${
                                      isDark ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'
                                    }`}
                                    title="发音"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4 Ebbinghaus Reaction Rating Buttons */}
                  {isFlipped && (
                    <div className="w-full grid grid-cols-4 gap-3 mt-4 animate-scale-in">
                      <button
                        onClick={() => handleRate('again')}
                        className="py-3 px-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex flex-col items-center gap-1 shadow-lg shadow-rose-900/30 transition-all border border-rose-500"
                        title="完全忘记，今天将循环考查多次直至认得"
                      >
                        <span className="text-sm">❌ 模糊/忘记</span>
                        <span className="text-[10px] opacity-80">今日重练 (按 1)</span>
                      </button>

                      <button
                        onClick={() => handleRate('hard')}
                        className="py-3 px-2 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex flex-col items-center gap-1 shadow-lg shadow-amber-900/30 transition-all border border-amber-500"
                        title="印象模糊，今天将再次出现巩固"
                      >
                        <span className="text-sm">⚠️ 模糊不熟</span>
                        <span className="text-[10px] opacity-80">稍后再考 (按 2)</span>
                      </button>

                      <button
                        onClick={() => handleRate('good')}
                        className="py-3 px-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex flex-col items-center gap-1 shadow-lg shadow-blue-900/30 transition-all border border-blue-500"
                        title="认得掌握，过关并延后1~2天复习"
                      >
                        <span className="text-sm">👍 认得/良好</span>
                        <span className="text-[10px] opacity-80">过关延后 (按 3)</span>
                      </button>

                      <button
                        onClick={() => handleRate('easy')}
                        className="py-3 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex flex-col items-center gap-1 shadow-lg shadow-emerald-900/30 transition-all border border-emerald-500"
                        title="轻松秒杀，直接过关并延后4~7天复习"
                      >
                        <span className="text-sm">⚡ 轻松秒杀</span>
                        <span className="text-[10px] opacity-80">秒杀延后 (按 4)</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: Vocabulary List & Stage Filter */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className={`relative flex-1 w-full flex items-center rounded-xl border px-3 py-2 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
                }`}>
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="搜索762真题核心词、中文释义..."
                    className="w-full bg-transparent text-xs outline-none"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white">
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                  <button
                    onClick={() => setStageFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      stageFilter === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    全部 ({allSavedWords.length})
                  </button>

                  <button
                    onClick={() => setStageFilter('unfamiliar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 ${
                      stageFilter === 'unfamiliar'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : isDark ? 'bg-slate-800 text-rose-400 border-slate-700' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    重点生词 ({markedUnfamiliarTotal})
                  </button>

                  <button
                    onClick={() => setStageFilter('due')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 ${
                      stageFilter === 'due'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : isDark ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    今日待复习 ({allSavedWords.filter(w => w.nextReviewTime <= now && w.stage < 8).length})
                  </button>

                  <button
                    onClick={() => setStageFilter('early')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      stageFilter === 'early'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    萌芽期(0-2)
                  </button>

                  <button
                    onClick={() => setStageFilter('mid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      stageFilter === 'mid'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isDark ? 'bg-slate-800 text-blue-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    强化期(3-6)
                  </button>

                  <button
                    onClick={() => setStageFilter('mastered')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      stageFilter === 'mastered'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isDark ? 'bg-slate-800 text-emerald-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    稳固掌握(7-8)
                  </button>
                </div>
              </div>

              {/* Words Table */}
              <div className={`rounded-2xl border overflow-hidden ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-800/60">
                  {filteredList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      未检索到匹配的词汇记录
                    </div>
                  ) : (
                    filteredList.map(item => {
                      const entry = dict?.entries?.[item.word];
                      const stageInfo = STAGE_LABELS[item.stage];
                      const isUnfam = wordStatuses[item.word] === 'unfamiliar';
                      const isDue = item.nextReviewTime <= now && item.stage < 8;

                      return (
                        <div
                          key={item.word}
                          className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                            isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {item.word}
                              </span>
                              {entry?.phonetic && (
                                <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                  /{entry.phonetic}/
                                </span>
                              )}
                              {isUnfam && (
                                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  🔴 重点生词
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageInfo?.color}`}>
                                {stageInfo?.name}
                              </span>
                              {isDue && (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  待复习
                                </span>
                              )}
                            </div>

                            <p className={`text-xs mt-1 line-clamp-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                              {entry?.definition_cn?.replace(/\n/g, '； ') || '暂无释义'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => playAudio(item.word)}
                              className={`p-2 rounded-lg border transition ${
                                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-700'
                              }`}
                              title="发音"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>

                            {onOpenWordDetail && entry && (
                              <button
                                onClick={() => {
                                  onOpenWordDetail({
                                    word: item.word,
                                    entry,
                                    paperCount: entry.task_ids?.length || 1,
                                    totalCount: entry.sentence_ids?.length || 1,
                                    status: wordStatuses[item.word] || 'unknown'
                                  });
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-400 bg-blue-950/60 hover:bg-blue-900 border border-blue-800 transition"
                              >
                                查看例句
                              </button>
                            )}

                            {isUnfam ? (
                              <button
                                onClick={() => onToggleStatus(item.word, 'familiar')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 transition"
                                title="标为熟词"
                              >
                                标为熟词
                              </button>
                            ) : (
                              <button
                                onClick={() => onToggleStatus(item.word, 'unfamiliar')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 transition"
                                title="标为重点生词"
                              >
                                标为生词
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Ebbinghaus Forgetting Curve Diagram & Stages Theory */}
          {activeTab === 'curve' && (
            <div className="space-y-6 max-w-3xl mx-auto py-2">
              <div className={`p-5 rounded-2xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>艾宾浩斯记忆遗忘规律与当日循环闭环设计</span>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  系统采用<strong>当日循环过关、形近词串记与目标增量推进</strong>机制：
                  复习时选择“模糊”或“忘记”的单词，会在今日队列中自动反复考查，直到您牢固“认得”为止；
                  一旦选择“认得/良好”或“轻松秒杀”，该词今日立即过关，并按照科学遗忘曲线（1天、2天、4天、7天、15天）延后复习；
                  即使关闭弹窗或刷新页面，<strong>当日学习进度完全持久化保留</strong>，随时打开随时接着背！
                </p>
              </div>

              {/* 8-Stage Progression Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(STAGE_LABELS).map(([stageNum, info]) => {
                  const s = parseInt(stageNum, 10);
                  const count = allSavedWords.filter(w => w.stage === s).length;

                  return (
                    <div 
                      key={stageNum}
                      className={`p-4 rounded-2xl border flex flex-col justify-between ${
                        isDark ? 'bg-slate-850 border-slate-750' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${info.color}`}>
                            阶段 {s}
                          </span>
                          <span className="font-mono text-sm font-black text-indigo-400">
                            {count} 词
                          </span>
                        </div>
                        <h5 className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {info.name}
                        </h5>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {info.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
