import { describe, expect, it } from 'vitest';
import { createAddressMatcher, type AddressIndex } from '../../src/server/ingestion/address-match';

const now = Date.parse('2026-10-21T00:00:00Z');
const entry: AddressIndex['entries'][number] = { street: 'Кунаева', houseNumber: '14-Д', lat: 51.13, lon: 71.43,
  sourceUrl: 'https://www.openstreetmap.org/way/123', quality: 'derived' };
const index = (entries = [entry]): AddressIndex => ({ source: { url: 'https://download.geofabrik.de/asia/kazakhstan-261019.osm.pbf',
  asOf: '2026-10-19T20:21:11Z', retrievedAt: '2026-10-20T20:00:00Z', license: 'ODbL-1.0' }, entries });

describe('offline exact public address matching (synthetic fixtures)', () => {
  it('matches street+full house suffix and returns derived OSM provenance', () => {
    expect(createAddressMatcher(index(), now)('Галерея, улица Кунаева, 14-Д, ЖК Нурсая-1')).toMatchObject({ lat: 51.13, quality: 'derived', method: 'osm-exact-address-v1' });
  });
  it('never guesses another house, wing, vague place or transliteration', () => {
    const match = createAddressMatcher(index(), now);
    for (const address of ['Кунаева 14', 'Кунаева 14/2', 'Кунаева 14-Д2', 'Кунаева 140-Д', 'Кунаева', 'Qonaev 14-Д', null]) expect(match(address)).toBeNull();
  });
  it('quarantines ambiguous addresses even if both coordinates are nearby', () => {
    expect(createAddressMatcher(index([entry, { ...entry, lon: 71.4301 }]), now)('Кунаева 14-Д')).toBeNull();
  });
  it('never truncates a wing, decimal, corpus or numeric hyphen to another building', () => {
    const match = createAddressMatcher(index([{ ...entry, houseNumber: '14' }]), now);
    for (const value of ['Кунаева 14.2', 'Кунаева 14 А', 'Кунаева 14 корпус 2', 'Кунаева 14 к2', 'Кунаева 14-2',
      'Кунаева 14 (корпус 2)', 'Кунаева 14 (строение Б)', 'Кунаева 14, корпус 2', 'Кунаева, 14, к2', 'Кунаева 14 (2)']) expect(match(value)).toBeNull();
    expect(createAddressMatcher(index([{ ...entry, houseNumber: '142' }]), now)('Кунаева 14-2')).toBeNull();
  });
  it('requires a full observed street name or observed alias, not a substring', () => {
    const match = createAddressMatcher(index([{ ...entry, houseNumber: '14' }]), now);
    for (const value of ['Новая Кунаева 14', 'не Кунаева 14 адрес будет позже', 'Динмухамеда Кунаева 14']) expect(match(value)).toBeNull();
    expect(createAddressMatcher(index([{ ...entry, streetAliases: ['Динмухамеда Кунаева'] }]), now)('улица Динмухамеда Кунаева, 14-Д')).not.toBeNull();
  });
  it('rejects stale, unlicensed, outside-city and untrusted source records', () => {
    expect(createAddressMatcher({ ...index(), source: { ...index().source, asOf: '2026-01-01T00:00:00Z' } }, now)('Кунаева 14-Д')).toBeNull();
    expect(createAddressMatcher({ ...index(), source: { ...index().source, license: 'unknown' } }, now)('Кунаева 14-Д')).toBeNull();
    expect(createAddressMatcher(index([{ ...entry, lat: 52 }]), now)('Кунаева 14-Д')).toBeNull();
    expect(createAddressMatcher(index([{ ...entry, sourceUrl: 'https://evil.example/way/123' }]), now)('Кунаева 14-Д')).toBeNull();
  });
});
