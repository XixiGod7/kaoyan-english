export interface SavedQuizProgress {
  year: string;
  answers: Record<number, string>;
  activeTab?: string;
  elapsedSeconds: number;
  isSubmitted: boolean;
  lastUpdated: number;
}

export function loadQuizProgress(year: string): SavedQuizProgress | null {
  try {
    const raw = localStorage.getItem(`kaoyan_quiz_progress_${year}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load quiz progress:', e);
    return null;
  }
}

export function saveQuizProgress(progress: SavedQuizProgress): void {
  try {
    localStorage.setItem(`kaoyan_quiz_progress_${progress.year}`, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save quiz progress:', e);
  }
}

export function clearQuizProgress(year: string): void {
  try {
    localStorage.removeItem(`kaoyan_quiz_progress_${year}`);
  } catch (e) {
    console.error('Failed to clear quiz progress:', e);
  }
}
