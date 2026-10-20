import { describe, expect, it } from 'vitest';
import { reactionOpacity, swipeChoice } from '../../src/client/swipe';

describe('release-position swipe', () => {
  it('does not commit when the finger returns to the centre', () => {
    expect(reactionOpacity(110, 1)).toBe(1);
    expect(reactionOpacity(0, 1)).toBe(0);
    expect(swipeChoice(0, 430)).toBeNull();
    expect(swipeChoice(70, 430)).toBeNull();
  });
  it('commits only beyond the release threshold in either direction', () => {
    expect(swipeChoice(104, 430)).toBe('like');
    expect(swipeChoice(-104, 430)).toBe('skip');
    expect(swipeChoice(Number.NaN, 430)).toBeNull();
    expect(swipeChoice(140, 0)).toBeNull();
  });
  it('shows only the reaction corresponding to drag direction', () => {
    expect(reactionOpacity(56, 1)).toBe(0.5);
    expect(reactionOpacity(56, -1)).toBe(0);
    expect(reactionOpacity(-56, -1)).toBe(0.5);
  });
});
