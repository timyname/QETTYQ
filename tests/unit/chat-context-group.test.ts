import { describe, expect, it } from 'vitest';
import { parseContext } from '../../src/server/pilot/chat';
import { pilotContextSchema } from '../../src/server/pilot/contracts';

describe('explicit Kazakh group budgets, deterministic no provider', () => {
  it.each(['not like food', 'not want food', 'not in a restaurant', 'not to a restaurant', 'not like a restaurant', 'not want a restaurant'])('preserves negative framing: %s', text => {
    expect(parseContext(text, pilotContextSchema.parse({ goal: 'activity' })).goal).toBe('activity');
  });
  it.each(['not only food', 'not a museum, restaurant please', 'not food; restaurant please'])('does not negate a positive clause: %s', text => {
    expect(parseContext(text, pilotContextSchema.parse({ goal: 'activity' })).goal).toBe('food');
  });
  it('does not read the separator in “без еда” as a positive dining request', () => {
    expect(parseContext('стендап вместо ? без еда 2026-10-25', pilotContextSchema.parse({ goal: 'activity' })).goal).toBe('activity');
    expect(parseContext('standup instead of dinner', pilotContextSchema.parse({ goal: 'activity' })).goal).toBe('activity');
  });
  it.each(['Үшеумізге жалпы 6000 теңге', 'Бәрімізге жалпы бюджет 6000 теңге'])('%s keeps the total as group, not per person', text => {
    expect(parseContext(text, pilotContextSchema.parse({}))).toMatchObject({ budget: 6000, budgetBasis: 'group' });
  });
  it('keeps an explicit per-person correction independent', () => {
    expect(parseContext('адам басына 2000 теңге', pilotContextSchema.parse({ budgetBasis: 'group', partySize: 3 })))
      .toMatchObject({ budget: 2000, budgetBasis: 'person', partySize: 3 });
  });
});
