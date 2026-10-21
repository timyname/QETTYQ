import { describe, expect, it } from 'vitest';
import { includePlanStop } from '../../src/client/plan-selection';

describe('evaluate an existing multi-stop draft', () => {
  it('keeps all three stops and their order when evaluating one of them', () => {
    expect(includePlanStop(['a', 'b', 'c'], 'c')).toEqual(['a', 'b', 'c']);
    expect(includePlanStop(['c', 'a', 'b'], 'a')).toEqual(['c', 'a', 'b']);
  });
  it('appends a new stop, without mutating the existing draft', () => {
    const draft = ['a', 'b'];
    expect(includePlanStop(draft, 'c')).toEqual(['a', 'b', 'c']);
    expect(draft).toEqual(['a', 'b']);
  });
  it('does not evict a selected stop from a full plan', () => {
    expect(includePlanStop(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
