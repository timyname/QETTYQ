import type { Place } from '../../domain/types';

const normalized = (text: string) => text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('ru-RU');

/** Exact current utterance only. No guessed intent from assistant prose, fuzzy
 * aliasing, coordinates, arbitrary IDs or choosing a branch of a chain. */
export function resolveCurrentNamedPlace(text: string, places: readonly Place[]):
  { name: string; goal: 'food' | 'walk' | 'activity' } | undefined {
  const current = normalized(text);
  if (!current || current.length < 3) return;
  const matches = places.filter(place => [place.name, ...Object.values(place.nameTranslations ?? {})]
    .some(name => normalized(name) === current));
  if (matches.length !== 1) return;
  const place = matches[0];
  const goal = place.tags.some(tag => ['food', 'cafe', 'restaurant', 'fast_food'].includes(tag)) ? 'food'
    : place.tags.some(tag => ['park', 'garden', 'viewpoint'].includes(tag)) ? 'walk'
      : place.tags.some(tag => ['culture', 'museum', 'theatre', 'arts_centre', 'library'].includes(tag)) ? 'activity' : null;
  return goal ? { name: place.name, goal } : undefined;
}
