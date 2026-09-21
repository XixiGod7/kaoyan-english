import { FavoriteSentenceItem, WrongQuestionItem } from '../types/reading';

const STORAGE_KEYS = {
  FAVORITE_SENTENCES: 'kaoyan_favorite_sentences',
  WRONG_QUESTIONS: 'kaoyan_wrong_questions',
  PARAPHRASE_PROGRESS: 'kaoyan_paraphrase_progress',
  PHRASE_DICTATE_HISTORY: 'kaoyan_phrase_dictate_history',
  READING_PROGRESS: 'kaoyan_reading_progress',
};

// --- 1. Favorite Sentences (难句本) ---

export function loadFavoriteSentences(): FavoriteSentenceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_SENTENCES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load favorite sentences:', e);
    return [];
  }
}

export function saveFavoriteSentence(item: FavoriteSentenceItem): FavoriteSentenceItem[] {
  try {
    const list = loadFavoriteSentences();
    const existingIdx = list.findIndex(x => x.sid === item.sid);
    let updated: FavoriteSentenceItem[];
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = item;
    } else {
      updated = [item, ...list];
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITE_SENTENCES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save favorite sentence:', e);
    return [];
  }
}

export function removeFavoriteSentence(sid: string): FavoriteSentenceItem[] {
  try {
    const list = loadFavoriteSentences();
    const updated = list.filter(x => x.sid !== sid);
    localStorage.setItem(STORAGE_KEYS.FAVORITE_SENTENCES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove favorite sentence:', e);
    return [];
  }
}

export function isSentenceFavorited(sid: string): boolean {
  const list = loadFavoriteSentences();
  return list.some(x => x.sid === sid);
}

// --- 2. Wrong Questions (错题本) ---

export function loadWrongQuestions(): WrongQuestionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WRONG_QUESTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load wrong questions:', e);
    return [];
  }
}

export function saveWrongQuestion(item: WrongQuestionItem): WrongQuestionItem[] {
  try {
    const list = loadWrongQuestions();
    const filtered = list.filter(x => String(x.id) !== String(item.id));
    const updated = [item, ...filtered];
    localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save wrong question:', e);
    return [];
  }
}

export function removeWrongQuestion(id: string | number): WrongQuestionItem[] {
  try {
    const list = loadWrongQuestions();
    const updated = list.filter(x => String(x.id) !== String(id));
    localStorage.setItem(STORAGE_KEYS.WRONG_QUESTIONS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove wrong question:', e);
    return [];
  }
}

// --- 3. Paraphrase Progress (同义替换作答记录) ---

export interface ParaphraseRecord {
  myChoice: string;
  correct: boolean;
  timestamp: number;
}

export function loadParaphraseProgress(): Record<string, ParaphraseRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARAPHRASE_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load paraphrase progress:', e);
    return {};
  }
}

export function saveParaphraseRecord(id: string, myChoice: string, correct: boolean): void {
  try {
    const current = loadParaphraseProgress();
    current[id] = { myChoice, correct, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEYS.PARAPHRASE_PROGRESS, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save paraphrase record:', e);
  }
}

// --- 4. Phrase Dictate History (词组默写历史) ---

export interface PhraseDictateRecord {
  correctCount: number;
  wrongCount: number;
  lastTested: number;
}

export function loadPhraseDictateHistory(): Record<string, PhraseDictateRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PHRASE_DICTATE_HISTORY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load phrase dictate history:', e);
    return {};
  }
}

export function recordPhraseDictateResult(phrase: string, correct: boolean): void {
  try {
    const history = loadPhraseDictateHistory();
    const cur = history[phrase] || { correctCount: 0, wrongCount: 0, lastTested: 0 };
    if (correct) cur.correctCount += 1;
    else cur.wrongCount += 1;
    cur.lastTested = Date.now();
    history[phrase] = cur;
    localStorage.setItem(STORAGE_KEYS.PHRASE_DICTATE_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to record phrase dictate result:', e);
  }
}

// --- 5. Reading Progress (精读标记) ---

export interface ReadingProgressRecord {
  readSentences: string[];
  isCompleted?: boolean;
}

export function loadReadingProgress(): Record<string, ReadingProgressRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load reading progress:', e);
    return {};
  }
}

export function toggleSentenceRead(passKey: string, sid: string): boolean {
  try {
    const progress = loadReadingProgress();
    const entry = progress[passKey] || { readSentences: [] };
    const idx = entry.readSentences.indexOf(sid);
    let isRead = false;
    if (idx >= 0) {
      entry.readSentences.splice(idx, 1);
      isRead = false;
    } else {
      entry.readSentences.push(sid);
      isRead = true;
    }
    progress[passKey] = entry;
    localStorage.setItem(STORAGE_KEYS.READING_PROGRESS, JSON.stringify(progress));
    return isRead;
  } catch (e) {
    console.error('Failed to toggle sentence read:', e);
    return false;
  }
}

// --- 6. Word Statuses (生词本 / 熟词本) ---

export function loadWordStatuses(): Record<string, 'familiar' | 'unfamiliar' | 'unknown'> {
  try {
    const raw = localStorage.getItem('kaoyan_word_statuses');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load word statuses:', e);
    return {};
  }
}

export function saveWordStatus(word: string, status: 'familiar' | 'unfamiliar' | 'unknown'): Record<string, 'familiar' | 'unfamiliar' | 'unknown'> {
  try {
    const current = loadWordStatuses();
    const clean = word.toLowerCase().trim();
    current[clean] = status;
    localStorage.setItem('kaoyan_word_statuses', JSON.stringify(current));
    return current;
  } catch (e) {
    console.error('Failed to save word status:', e);
    return {};
  }
}
