export type SwipeChoice = 'like' | 'skip';

/** Only the release position commits. Velocity and crossing the threshold earlier do not. */
export function swipeChoice(offset: number, width: number): SwipeChoice | null {
  if (!Number.isFinite(offset) || !Number.isFinite(width) || width <= 0) return null;
  const threshold = Math.max(80, Math.min(120, width * 0.24));
  return offset >= threshold ? 'like' : offset <= -threshold ? 'skip' : null;
}

export function reactionOpacity(offset: number, direction: 1 | -1): number {
  return Math.max(0, Math.min(1, (offset * direction - 12) / 88));
}
