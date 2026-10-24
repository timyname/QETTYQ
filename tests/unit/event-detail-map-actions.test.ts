import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventDetail, eventPlanUnavailableReason } from '../../src/components/LiveEvents';
import { translateText } from '../../src/client/i18n';
import snapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';

const now = Date.parse('2026-10-24T12:00:00Z');
const event = { ...snapshot.items[0], id: 'synthetic-event-detail', name: 'SYNTHETIC TEST event', startsAt: '2026-10-25T12:00:00Z',
  lat: 51.19, lon: 71.4, freshness: 'fresh' } as LiveAstanaEvent;
function render(value = event) {
  return renderToStaticMarkup(createElement(EventDetail, { event: value, saved: false, onBack: () => {}, onSave: () => {},
    onAddToPlan: () => {}, onBuildPlan: () => {}, onShowOnMap: () => {} }));
}
function button(html: string, label: string) {
  const value = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0]).find(value => value.includes(label));
  expect(value).toBeDefined(); return value!;
}
beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(now));
afterEach(() => vi.restoreAllMocks());
describe('event detail map/plan actions: rendered markup and honest guards', () => {
  it('offers the explicit in-app map action while preserving source and external destination links', () => {
    const html = render();
    for (const label of ['Показать на карте', 'В мой план', 'Оценить путь']) expect(button(html, label)).not.toContain('disabled');
    expect(html).toContain('Маршрут в 2ГИС'); expect(html).toContain(event.bookingUrl ?? event.contactUrl);
    expect(html).toContain(event.requiredCredit.url); expect(eventPlanUnavailableReason(event, now)).toBeNull();
  });
  it.each([
    [{ lat: null, lon: null }, 'Нет подтверждённой точки'],
    [{ freshness: 'stale' }, 'Данные события устарели'],
    [{ startsAt: '2026-10-20T12:00:00Z' }, 'Дата события уже прошла'],
    [{ status: 'cancelled' }, 'Событие не подтверждено'],
  ] as const)('keeps unavailable actions disabled with a visible reason: %j', (patch, expected) => {
    const html = render({ ...event, ...patch } as LiveAstanaEvent);
    for (const label of ['Показать на карте', 'В мой план', 'Оценить путь']) {
      expect(button(html, label)).toContain('disabled'); expect(button(html, label)).toContain('aria-describedby="event-plan-unavailable"');
    }
    expect(html).toContain(expected); expect(html).toContain('role="status"');
    expect(html).toContain('Подробности и запись');
  });
  it('has independent localized text for every new unavailable state', () => {
    for (const value of [{ ...event, lat: null }, { ...event, freshness: 'stale' }, { ...event, startsAt: '2026-10-20T12:00:00Z' }, { ...event, status: 'cancelled' }]) {
      const reason = eventPlanUnavailableReason(value as LiveAstanaEvent, now)!;
      for (const language of ['kk', 'en'] as const) expect(translateText(reason, language)).not.toBe(reason);
    }
    expect(translateText('Показать на карте', 'en')).toBe('Show on map');
  });
});
