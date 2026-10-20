import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import { qettyqMapStyle } from '../../src/components/map-style';

const original: StyleSpecification = { version: 8, glyphs: 'https://example.invalid/{fontstack}/{range}.pbf', sprite: 'https://example.invalid/sprite', sources: { osm: { type: 'vector', url: 'https://example.invalid/tiles.json', attribution: 'Required source attribution' } }, layers: [
  { id: 'background', type: 'background', paint: { 'background-color': '#000000' } },
  { id: 'park', type: 'fill', source: 'osm', 'source-layer': 'park', paint: { 'fill-color': '#000000' } },
  { id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water' },
  { id: 'road', type: 'line', source: 'osm', 'source-layer': 'transportation', paint: { 'line-width': 3 } },
  { id: 'label', type: 'symbol', source: 'osm', 'source-layer': 'place', layout: { 'text-field': ['get', 'name'] } },
] };

describe('QETTYQ vector-map paint, synthetic style fixture', () => {
  it('uses ivory, sage, jade water and white roads', () => {
    const style = qettyqMapStyle(original);
    expect(style.layers[0].paint).toMatchObject({ 'background-color': '#F4F6F2' });
    expect(style.layers[1].paint).toMatchObject({ 'fill-color': '#dce8d2' });
    expect(style.layers[2].paint).toMatchObject({ 'fill-color': '#b5d9d0' });
    expect(style.layers[3].paint).toMatchObject({ 'line-color': '#ffffff', 'line-width': 3 });
    expect(style.layers[4].paint).toMatchObject({ 'text-color': '#42645b' });
  });
  it('keeps provider geometry sources, attribution, glyphs, sprite and text fields', () => {
    const style = qettyqMapStyle(original);
    expect(style.sources).toEqual(original.sources);
    expect(style.glyphs).toBe(original.glyphs);
    expect(style.sprite).toBe(original.sprite);
    expect(style.layers[4].layout).toEqual(original.layers[4].layout);
  });
  it('does not mutate the original provider JSON', () => {
    const before = structuredClone(original);
    const result = qettyqMapStyle(original);
    expect(original).toEqual(before);
    expect(result).not.toBe(original);
    expect(result.sources).not.toBe(original.sources);
  });
});
