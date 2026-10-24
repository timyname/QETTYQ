import { describe, expect, it } from 'vitest';
import index from '../../data/astana-address-index.json';
import places from '../../data/places.json';
import snapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';
import { createAddressMatcher, enrichEventAddresses, type AddressIndex } from '../../src/server/ingestion/address-match';
import { createEventVenueMatcher } from '../../src/server/ingestion/event-geo-media';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';

const now = Date.parse('2026-10-24T12:00:00Z');
const matchAddress = () => createAddressMatcher(index as AddressIndex, now);

describe('actual dated OSM index and observed public address spellings, no network', () => {
  it('resolves the two current Жастар address variants seen in public events API without duplicating coordinates', () => {
    const match = matchAddress();
    const source = index.entries.find(entry => entry.sourceUrl === 'https://www.openstreetmap.org/way/30014040')!;
    expect(source).toBeDefined();
    expect(match('Жастар театры, Ілияс Есенберлин көш., 10')).toMatchObject({ lat: source.lat, lon: source.lon,
      sourceUrl: source.sourceUrl, quality: 'derived', method: 'osm-exact-address-v1' });
  });
  it('recognizes independently observed multilingual compound street labels without shortening a surname', () => {
    const source = index.entries.find(entry => entry.sourceUrl === 'https://www.openstreetmap.org/way/917348929')!;
    for (const street of ['Қалибек Қуанышбаев көшесі', 'улица Калибек Куанышбаев']) {
      expect(matchAddress()(`${street}, 8/1`)).toMatchObject({ lat: source.lat, lon: source.lon, sourceUrl: source.sourceUrl });
    }
    expect(matchAddress()('Театр им. К. Куанышбаева, ул. Куанышбаева, 8/1')).toBeNull();
  });
  it('keeps the two far-conflicting Orta street/house records unresolved, not arbitrarily first', () => {
    const duplicates = index.entries.filter(entry => entry.street === 'Мәңгілік Ел даңғылы' && entry.houseNumber === '41/1');
    expect(duplicates).toHaveLength(2); expect(Math.abs(duplicates[0].lat - duplicates[1].lat)).toBeGreaterThan(0.005);
    expect(matchAddress()('Orta Community, Мәңгілік ел даңғылы, 41/1')).toBeNull();
  });
  it.each(['Garage music bar, ул. Кравцова, 6', 'Бар Pozitiv, ул. Габдуллина, 18', 'Harat’s Akbulak, ул. Токпанов, 10',
    'The Bus, шоссе Коргалжын, 3', 'Ресторан Piligrim, мкр. Самал, 12'])('does not invent an observed alias for unresolved current address %s', address => {
    expect(matchAddress()(address)).toBeNull();
  });
  it('enriches a replay of the current address spelling with derived provenance, retaining event facts', () => {
    // Synthetic composition of dated event fields and the address spelling
    // observed from /api/events on 24 October; never inserted into public data.
    const source = snapshot.items.find(event => event.contactUrl.endsWith('/mama-spektakli'))!;
    const input = { ...source, venueName: 'Жастар театры', address: 'Жастар театры, Ілияс Есенберлин көш., 10' } as LiveAstanaEvent;
    const output = enrichEventAddresses([input], matchAddress(), createEventVenueMatcher(places, matchAddress(), now))[0];
    expect(input.lat).toBeNull(); expect(input.lon).toBeNull();
    expect(output).toMatchObject({ address: input.address, name: input.name, startsAt: input.startsAt, price: input.price,
      coordinateQuality: 'derived', coordinateProvenance: { methodId: 'osm-exact-address-v1', sourceUrl: 'https://www.openstreetmap.org/way/30014040' } });
    expect(output.coordinateMatch?.precision).toBe('building_or_address_point');
    expect(output.warnings.join(' ')).toContain('вход уточняйте');
  });
  it('expires actual indexed address points even if the matcher remains in memory', () => {
    let clock = now; const match = createAddressMatcher(index as AddressIndex, () => clock);
    expect(match('Жастар театры, Ілияс Есенберлин көш., 10')).not.toBeNull(); clock += 36 * 86400_000;
    expect(match('Жастар театры, Ілияс Есенберлин көш., 10')).toBeNull();
  });
});
