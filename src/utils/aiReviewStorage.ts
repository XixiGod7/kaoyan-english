import { AiReviewReport } from '../types/ai';

export function getAiReviewStorageKey(year: string): string {
  return `kaoyan_ai_reviews_${year}`;
}

export function loadAiReviews(year: string): Record<number, AiReviewReport> {
  try {
    const raw = localStorage.getItem(getAiReviewStorageKey(year));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to load AI reviews for ${year}:`, e);
    return {};
  }
}

export function saveAiReview(year: string, review: AiReviewReport): void {
  try {
    const current = loadAiReviews(year);
    current[review.qid] = review;
    localStorage.setItem(getAiReviewStorageKey(year), JSON.stringify(current));
  } catch (e) {
    console.error(`Failed to save AI review for ${year} qid ${review.qid}:`, e);
  }
}

export function clearAiReviews(year: string): void {
  try {
    localStorage.removeItem(getAiReviewStorageKey(year));
  } catch (e) {
    console.error(`Failed to clear AI reviews for ${year}:`, e);
  }
}
