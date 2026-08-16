import { PaperGroup } from '../types/kaoyan';

export interface EbbinghausWordRecord {
  word: string;
  stage: number; // 0 to 8
  nextReviewTime: number; // timestamp in ms
  lastReviewTime: number; // timestamp in ms
  reviewCount: number;
  easeFactor: number; // default 2.5
  history: {
    time: number;
    rating: 'again' | 'hard' | 'good' | 'easy';
  }[];
}

export interface QuizRecordItem {
  year: string;
  tabId: string;
  sectionTitle?: string;
  score: number;
  totalQuestions: number;
  correctQuestions: number;
  timestamp: number;
  timeSpentSeconds: number;
  userAnswers?: Record<number, string>;
}

// Ebbinghaus review intervals (in minutes):
// Stage 0 -> Stage 1 (5m) -> Stage 2 (30m) -> Stage 3 (12h/720m) -> Stage 4 (1d/1440m)
// -> Stage 5 (2d/2880m) -> Stage 6 (4d/5760m) -> Stage 7 (7d/10080m) -> Stage 8 (15d/21600m)
export const STAGE_INTERVALS_MINUTES = [
  5,        // 0: 5 min
  30,       // 1: 30 min
  12 * 60,  // 2: 12 hours
  24 * 60,  // 3: 1 day
  2 * 24 * 60, // 4: 2 days
  4 * 24 * 60, // 5: 4 days
  7 * 24 * 60, // 6: 7 days
  15 * 24 * 60, // 7: 15 days
  30 * 24 * 60, // 8: 30 days (Mastered)
];

export const STAGE_LABELS: Record<number, { name: string; color: string; desc: string }> = {
  0: { name: '初识生词', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30', desc: '刚刚添加，需即刻复习' },
  1: { name: '记忆初现', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', desc: '30分钟后复习' },
  2: { name: '短期记忆', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', desc: '12小时后复习' },
  3: { name: '强化巩固', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30', desc: '1天后复习' },
  4: { name: '中期保持', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30', desc: '2天后复习' },
  5: { name: '深化记忆', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30', desc: '4天后复习' },
  6: { name: '长期保持', color: 'text-teal-500 bg-teal-500/10 border-teal-500/30', desc: '7天后复习' },
  7: { name: '稳固熟练', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', desc: '15天后复习' },
  8: { name: '永久掌握', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', desc: '已进入长期牢固记忆' },
};

// Calculate next review state based on rating
export function calculateNextReview(
  record: EbbinghausWordRecord,
  rating: 'again' | 'hard' | 'good' | 'easy'
): EbbinghausWordRecord {
  const now = Date.now();
  let nextStage = record.stage;
  let easeFactor = record.easeFactor || 2.5;

  if (rating === 'again') {
    // Forgot: reset to stage 0 or 1
    nextStage = Math.max(0, Math.min(record.stage - 2, 0));
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 'hard') {
    // Difficult: repeat current stage or advance slowly
    nextStage = Math.max(0, record.stage);
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 'good') {
    // Good: normal progression +1 stage
    nextStage = Math.min(8, record.stage + 1);
  } else if (rating === 'easy') {
    // Easy: accelerated progression +2 stages
    nextStage = Math.min(8, record.stage + 2);
    easeFactor = Math.min(3.0, easeFactor + 0.15);
  }

  const intervalMinutes = STAGE_INTERVALS_MINUTES[nextStage] || 30;
  const nextReviewTime = now + intervalMinutes * 60 * 1000;

  return {
    ...record,
    stage: nextStage,
    nextReviewTime,
    lastReviewTime: now,
    reviewCount: (record.reviewCount || 0) + 1,
    easeFactor,
    history: [
      ...(record.history || []),
      { time: now, rating }
    ]
  };
}

// LocalStorage helpers for Ebbinghaus
export const EBBINGHAUS_STORAGE_KEY = 'kaoyan_ebbinghaus_records';
export const QUIZ_HISTORY_STORAGE_KEY = 'kaoyan_quiz_history';
export const DAILY_REVIEW_LIMIT_KEY = 'kaoyan_daily_review_limit';
export const DAILY_SESSION_STORAGE_KEY = 'kaoyan_daily_session_state';

export interface DailySessionState {
  dateStr: string; // "YYYY-MM-DD"
  passedWords: string[];
  activeQueueWords: {
    word: string;
    sessionMistakes: number;
    sessionPassCount: number;
  }[];
  sessionTotalTarget: number;
}

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadDailySessionState(): DailySessionState | null {
  try {
    const raw = localStorage.getItem(DAILY_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: DailySessionState = JSON.parse(raw);
    if (parsed && parsed.dateStr === getTodayDateStr()) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.error('Failed to load daily session state', e);
    return null;
  }
}

export function saveDailySessionState(state: DailySessionState): void {
  try {
    localStorage.setItem(DAILY_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save daily session state', e);
  }
}

export function isTimestampToday(timestamp: number): boolean {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

export function loadDailyReviewLimit(): number {
  try {
    const saved = localStorage.getItem(DAILY_REVIEW_LIMIT_KEY);
    return saved ? parseInt(saved, 10) || 20 : 20;
  } catch {
    return 20;
  }
}

export function saveDailyReviewLimit(limit: number): void {
  try {
    localStorage.setItem(DAILY_REVIEW_LIMIT_KEY, String(limit));
  } catch (e) {
    console.error('Failed to save daily review limit', e);
  }
}

export function loadEbbinghausRecords(): Record<string, EbbinghausWordRecord> {
  try {
    const raw = localStorage.getItem(EBBINGHAUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load ebbinghaus records', e);
    return {};
  }
}

export function saveEbbinghausRecords(records: Record<string, EbbinghausWordRecord>): void {
  try {
    localStorage.setItem(EBBINGHAUS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save ebbinghaus records', e);
  }
}

// Sync all core 762 words & user-marked statuses into Ebbinghaus review database
export function syncAllWordsToEbbinghaus(
  allWords: { word: string; totalCount?: number; paperCount?: number }[],
  wordStatuses: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>,
  ebbinghaus: Record<string, EbbinghausWordRecord>
): Record<string, EbbinghausWordRecord> {
  const updated = { ...ebbinghaus };
  const now = Date.now();

  // 1. First ensure all 762 core focus words are registered
  allWords.forEach(({ word }) => {
    const status = wordStatuses[word] || 'unknown';
    if (!updated[word]) {
      if (status === 'familiar') {
        updated[word] = {
          word,
          stage: 8,
          nextReviewTime: now + 30 * 24 * 60 * 60 * 1000,
          lastReviewTime: now,
          reviewCount: 1,
          easeFactor: 2.5,
          history: []
        };
      } else {
        updated[word] = {
          word,
          stage: 0,
          nextReviewTime: now,
          lastReviewTime: now,
          reviewCount: 0,
          easeFactor: 2.5,
          history: []
        };
      }
    }
  });

  // 2. Apply user-marked statuses
  Object.entries(wordStatuses).forEach(([word, status]) => {
    if (status === 'unfamiliar') {
      if (!updated[word]) {
        updated[word] = {
          word,
          stage: 0,
          nextReviewTime: now,
          lastReviewTime: now,
          reviewCount: 0,
          easeFactor: 2.5,
          history: []
        };
      } else {
        // If marked unfamiliar, prioritize immediate review if mastered
        if (updated[word].stage >= 8) {
          updated[word].stage = 0;
          updated[word].nextReviewTime = now;
        }
      }
    } else if (status === 'familiar') {
      if (!updated[word]) {
        updated[word] = {
          word,
          stage: 8,
          nextReviewTime: now + 30 * 24 * 60 * 60 * 1000,
          lastReviewTime: now,
          reviewCount: 1,
          easeFactor: 2.5,
          history: []
        };
      } else {
        updated[word].stage = Math.max(updated[word].stage, 7);
      }
    }
  });

  return updated;
}

// Generate daily review queue according to priority & user's daily quota:
// Priority 1: User-marked "生词" (unfamiliar) that are due
// Priority 2: Other words that are due according to Ebbinghaus intervals
// Priority 3: User-marked "生词" (unfamiliar) in early stages
// Priority 4: Core exam focus words not yet mastered (stage 0), ordered by exam frequency
export function generatePrioritizedDailyQueue(
  allWords: { word: string; totalCount?: number; paperCount?: number }[],
  wordStatuses: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>,
  ebbinghaus: Record<string, EbbinghausWordRecord>,
  dailyLimit: number = 20
): {
  queue: EbbinghausWordRecord[];
  dueUnfamiliarCount: number;
  dueCoreCount: number;
  totalDueCount: number;
} {
  const now = Date.now();
  const freqMap = new Map<string, number>();
  allWords.forEach(w => freqMap.set(w.word, w.totalCount || 1));

  // Category 1: User marked "unfamiliar" and due
  const group1_dueUnfamiliar: EbbinghausWordRecord[] = [];
  // Category 2: Core focus words that are due (stage < 8)
  const group2_dueCore: EbbinghausWordRecord[] = [];
  // Category 3: User marked "unfamiliar" not due today
  const group3_unfamiliarUpcoming: EbbinghausWordRecord[] = [];
  // Category 4: New / Stage 0 Core words not yet studied
  const group4_newCore: EbbinghausWordRecord[] = [];
  // Category 5: In progress words upcoming
  const group5_upcoming: EbbinghausWordRecord[] = [];

  Object.values(ebbinghaus).forEach(r => {
    if (r.stage >= 8) return; // Mastered words excluded from daily queue
    const isUnfamiliar = wordStatuses[r.word] === 'unfamiliar';
    const isDue = r.nextReviewTime <= now;

    if (isUnfamiliar && isDue) {
      group1_dueUnfamiliar.push(r);
    } else if (isDue) {
      group2_dueCore.push(r);
    } else if (isUnfamiliar) {
      group3_unfamiliarUpcoming.push(r);
    } else if (r.stage === 0) {
      group4_newCore.push(r);
    } else {
      group5_upcoming.push(r);
    }
  });

  // Sort groups:
  // group 1: by review count / frequency
  group1_dueUnfamiliar.sort((a, b) => (freqMap.get(b.word) || 0) - (freqMap.get(a.word) || 0));
  // group 2: by exam frequency
  group2_dueCore.sort((a, b) => (freqMap.get(b.word) || 0) - (freqMap.get(a.word) || 0));
  // group 4: by exam frequency (highest first)
  group4_newCore.sort((a, b) => (freqMap.get(b.word) || 0) - (freqMap.get(a.word) || 0));
  // upcoming: by nextReviewTime ascending
  group3_unfamiliarUpcoming.sort((a, b) => a.nextReviewTime - b.nextReviewTime);
  group5_upcoming.sort((a, b) => a.nextReviewTime - b.nextReviewTime);

  const dueUnfamiliarCount = group1_dueUnfamiliar.length;
  const dueCoreCount = group2_dueCore.length;
  const totalDueCount = dueUnfamiliarCount + dueCoreCount;

  // Build combined prioritized list
  const fullList = [
    ...group1_dueUnfamiliar,
    ...group2_dueCore,
    ...group4_newCore,
    ...group3_unfamiliarUpcoming,
    ...group5_upcoming,
  ];

  const queue = dailyLimit > 0 ? fullList.slice(0, dailyLimit) : fullList;

  return {
    queue,
    dueUnfamiliarCount,
    dueCoreCount,
    totalDueCount,
  };
}

// Quiz history storage helpers
export function loadQuizHistory(): Record<string, QuizRecordItem[]> {
  try {
    const raw = localStorage.getItem(QUIZ_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load quiz history', e);
    return {};
  }
}

export function saveQuizHistoryRecord(record: QuizRecordItem): void {
  try {
    const history = loadQuizHistory();
    const yearList = history[record.year] || [];
    // Replace if same tabId exists or append
    const existingIdx = yearList.findIndex(r => r.tabId === record.tabId);
    if (existingIdx >= 0) {
      yearList[existingIdx] = record;
    } else {
      yearList.push(record);
    }
    history[record.year] = yearList;
    localStorage.setItem(QUIZ_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save quiz history', e);
  }
}

// Calculate study statistics for Dashboard
export interface OverallStudyStats {
  totalPapers: number;
  testedPapersCount: number;
  totalSections: number;
  completedSectionsCount: number;
  overallProgressPercent: number;
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  averageAccuracyPercent: number;
  yearProgressMap: Record<string, {
    completedSections: number;
    totalSections: number;
    percent: number;
    score: number;
    maxScore: number;
  }>;
}

export function computeOverallStudyStats(
  papers: PaperGroup[],
  quizHistory: Record<string, QuizRecordItem[]>
): OverallStudyStats {
  const totalPapers = papers.length || 17;
  let testedPapersCount = 0;
  let totalSections = 0;
  let completedSectionsCount = 0;
  let totalQuestionsAnswered = 0;
  let totalQuestionsCorrect = 0;

  const yearProgressMap: OverallStudyStats['yearProgressMap'] = {};

  papers.forEach(p => {
    const yStr = String(p.name.match(/\d{4}/)?.[0] || p.id || '');
    const questionsCount = p.questions?.length || 9;
    totalSections += questionsCount;

    const historyItems = quizHistory[yStr] || [];
    const completedCount = historyItems.length;
    if (completedCount > 0) testedPapersCount++;

    completedSectionsCount += completedCount;

    let yearScore = 0;
    let yearMaxScore = 100;

    historyItems.forEach(item => {
      totalQuestionsAnswered += item.totalQuestions || 0;
      totalQuestionsCorrect += item.correctQuestions || 0;
      yearScore += item.score || 0;
    });

    const percent = Math.min(100, Math.round((completedCount / questionsCount) * 100));
    yearProgressMap[yStr] = {
      completedSections: completedCount,
      totalSections: questionsCount,
      percent,
      score: yearScore,
      maxScore: yearMaxScore
    };
  });

  const overallProgressPercent = totalSections > 0 
    ? Math.min(100, Math.round((completedSectionsCount / totalSections) * 100)) 
    : 0;

  const averageAccuracyPercent = totalQuestionsAnswered > 0
    ? Math.round((totalQuestionsCorrect / totalQuestionsAnswered) * 100)
    : 0;

  return {
    totalPapers,
    testedPapersCount,
    totalSections,
    completedSectionsCount,
    overallProgressPercent,
    totalQuestionsAnswered,
    totalQuestionsCorrect,
    averageAccuracyPercent,
    yearProgressMap
  };
}
