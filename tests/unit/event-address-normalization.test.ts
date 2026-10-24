import { describe, expect, it } from 'vitest';
import { createAddressMatcher, type AddressIndex } from '../../src/server/ingestion/address-match';

const now = Date.parse('2026-10-24T12:00:00Z');
const entry: AddressIndex['entries'][number] = { street: 'Ілияс Есенберлин көшесі', houseNumber: '10', lat: 51.19, lon: 71.4,
  sourceUrl: 'https://www.openstreetmap.org/way/123', quality: 'derived' };
const index = (entries = [entry]): AddressIndex => ({ source: { url: 'https://download.geofabrik.de/asia/kazakhstan-261019.osm.pbf',
  asOf: '2026-10-19T20:21:11Z', retrievedAt: '2026-10-20T20:00:00Z', license: 'ODbL-1.0' }, entries });

describe('mechanical street notation, synthetic address rows without guessed aliases', () => {
  it.each(['Ілияс Есенберлин көш., 10', 'Ілияс Есенберлин көшесі, 10', 'к. Ілияс Есенберлин, 10'])('recognizes equivalent street-type notation %s', value => {
    expect(createAddressMatcher(index(), now)(value)).toMatchObject({ sourceUrl: entry.sourceUrl, quality: 'derived', precision: 'building_or_address_point' });
  });
  it('accepts abbreviated Kazakh avenue type without changing the personal/place name', () => {
    const match = createAddressMatcher(index([{ ...entry, street: 'Мәңгілік Ел даңғылы' }]), now);
    expect(match('Мәңгілік Ел даңғ., 10')).not.toBeNull(); expect(match('Ел даңғ., 10')).toBeNull();
  });
  it('splits observed semicolon multilingual street names, not arbitrary invented words', () => {
    const match = createAddressMatcher(index([{ ...entry, street: 'Қалибек Қуанышбаев көшесі;\u200bулица Калибек Куанышбаев', houseNumber: '8/1' }]), now);
    for (const address of ['Қалибек Қуанышбаев көш., 8/1', 'улица Калибек Куанышбаев, 8/1']) expect(match(address)).not.toBeNull();
    for (const address of ['улица Куанышбаева, 8/1', 'Қуанышбаев көш., 8/1', 'Қалибек Калибек, 8/1']) expect(match(address)).toBeNull();
  });
  it('applies zero-width cleanup to observed aliases as well as publisher text', () => {
    const match = createAddressMatcher(index([{ ...entry, street: 'Other street', streetAliases: ['\u200bІлияс Есенберлин көшесі'] }]), now);
    expect(match('Ілияс Есенберлин көш., 10')).not.toBeNull();
  });
  it.each(['Ілияс Есенберлин көш., 10/2', 'Ілияс Есенберлин көш., 10-А', 'Ілияс Есенберлин көш., 10.2',
    'Ілияс Есенберлин көш., 10, блок 2', 'Ілияс Есенберлин көш., 10, корпус Б', 'Ілияс Есенберлин көш., 10 к2'])('does not truncate house/modifier in %s', value => {
    expect(createAddressMatcher(index(), now)(value)).toBeNull();
  });
  it('does not infer missing given names, inflections, transliterations or nearby buildings', () => {
    const match = createAddressMatcher(index(), now);
    for (const value of ['Есенберлин көш., 10', 'Илияс Есенберлина көш., 10', 'Ilyas Esenberlin Street, 10', 'Ілияс Есенберлин көш., 11']) expect(match(value)).toBeNull();
  });
  it('does not collapse nearby address-node/building centroids without same-building proof', () => {
    const match = createAddressMatcher(index([entry, { ...entry, sourceUrl: 'https://www.openstreetmap.org/node/124', lon: 71.40001, quality: 'observed' }]), now);
    expect(match('Ілияс Есенберлин көш., 10')).toBeNull();
  });
});
