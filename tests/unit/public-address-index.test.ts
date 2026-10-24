import { describe, expect, it } from 'vitest';
import base from '../../data/astana-address-index.json';
import supplement from '../../data/astana-address-place-supplement.json';
import { publicAddressIndex } from '../../src/server/ingestion/public-address-index';
import { createAddressMatcher } from '../../src/server/ingestion/address-match';
const now = Date.parse('2026-10-24T18:00:00Z');
describe('reviewed addr:place omissions from the same approved OSM extract', () => {
  it('keeps the original source cutoff/retrieval and all original rows, not a fresh geocoder timestamp', () => {
    expect(supplement.source).toEqual(base.source); expect(publicAddressIndex.source).toEqual(base.source);
    expect(publicAddressIndex.entries).toHaveLength(base.entries.length + 2);
    expect(publicAddressIndex.entries.slice(0, base.entries.length)).toEqual(base.entries);
    expect(supplement.review.extractSha256).toBe('a767ae4bb5b0d6bed68e2148f8960178403813a19661f37edea1973beeb8b342');
    expect(supplement.review.observedAddressField).toBe('addr:place');
  });
  it.each(supplement.entries)('resolves the complete observed district label/house $houseNumber, not a neighbouring building', entry => {
    const match = createAddressMatcher(publicAddressIndex, now);
    expect(match(`${entry.street}, ${entry.houseNumber}`)).toMatchObject({ lat: entry.lat, lon: entry.lon,
      sourceUrl: entry.sourceUrl, quality: 'derived', precision: 'building_or_address_point' });
    expect(match(`${entry.street}, ${entry.houseNumber}/99`)).toBeNull();
  });
  it('does not strip the explicit block modifier from the publisher address', () => {
    const match = createAddressMatcher(publicAddressIndex, now);
    expect(match('Energy, Кабанбай батыра, 53, блок 32')).toBeNull();
    expect(match('Қабанбай Батыр даңғылы, 53к32')?.sourceUrl).toBe('https://www.openstreetmap.org/way/549300995');
  });
  it('expires these derived points with the original source, not the later review', () => {
    const match = createAddressMatcher(publicAddressIndex, now + 36 * 86400_000);
    for (const entry of supplement.entries) expect(match(`${entry.street}, ${entry.houseNumber}`)).toBeNull();
  });
});
