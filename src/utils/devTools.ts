import { isLocalDevHost } from './env';

export type DevStreakPreviewMode = 'zero' | 'waiting' | 'lit' | 'black' | null;

const DEV_STREAK_EVENT = 'lovia_dev_streak_preview_changed';

let currentStreakPreview: DevStreakPreviewMode = null;

export function getDevStreakPreview(): DevStreakPreviewMode {
  if (!isLocalDevHost()) return null;
  return currentStreakPreview;
}

export function setDevStreakPreview(mode: DevStreakPreviewMode): void {
  if (!isLocalDevHost()) return;
  currentStreakPreview = mode;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEV_STREAK_EVENT, { detail: mode }));
  }
}

export function subscribeDevStreakPreview(
  callback: (mode: DevStreakPreviewMode) => void
): () => void {
  if (!isLocalDevHost() || typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => callback(currentStreakPreview);
  window.addEventListener(DEV_STREAK_EVENT, handler);
  return () => window.removeEventListener(DEV_STREAK_EVENT, handler);
}
