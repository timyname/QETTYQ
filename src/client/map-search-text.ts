/** Tolerant spelling for search only; never an address/venue identity join. */
export function mapSearchText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ru').replace(/[ёәғқңөұүһі]/gu, ch => ({ ё: 'е', ә: 'а', ғ: 'г', қ: 'к', ң: 'н', ө: 'о', ұ: 'у', ү: 'у', һ: 'х', і: 'и' })[ch]!)
    .replace(/[^\p{L}\p{N}/-]+/gu, ' ').trim().replace(/\s+/gu, ' ');
}
export function mapSearchMatches(value: string, query: string) {
  const haystack = mapSearchText(value), tokens = haystack.split(' ');
  const wanted = mapSearchText(query).split(' ').filter(Boolean);
  return wanted.length > 0 && wanted.every(token => /^\d/u.test(token) ? tokens.includes(token) : haystack.includes(token));
}

export type MapSearchResult = { id: string; kind: 'place' | 'address' | 'event'; title: string; address: string | null;
  lat: number; lon: number; sourceUrl: string; quality: 'observed' | 'derived'; asOf: string };
