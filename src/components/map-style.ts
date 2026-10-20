import type { StyleSpecification } from 'maplibre-gl';

export const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Recolour vector paint only. Geometry, glyphs, sprites and licences stay intact. */
export function qettyqMapStyle(original: StyleSpecification): StyleSpecification {
  const style = structuredClone(original);
  style.name = 'QETTYQ · Liberty';
  style.layers = style.layers.map(layer => {
    const key = `${layer.id} ${'source-layer' in layer ? layer['source-layer'] : ''}`.toLowerCase();
    switch (layer.type) {
      case 'background': return { ...layer, paint: { ...layer.paint, 'background-color': '#F4F6F2' } };
      case 'fill': {
        const colour = /water|ocean|lake/.test(key) ? '#b5d9d0' : /park|grass|wood|forest|green/.test(key) ? '#dce8d2' : /building/.test(key) ? '#e5e8df' : /residential|landuse/.test(key) ? '#eef0e8' : null;
        return colour ? { ...layer, paint: { ...layer.paint, 'fill-color': colour, ...(/park|grass|wood|forest/.test(key) ? { 'fill-outline-color': '#ccdcbc' } : {}) } } : layer;
      }
      case 'line': {
        const colour = /water|river/.test(key) ? '#b5d9d0' : /road|bridge|tunnel|highway|transportation/.test(key) ? /casing/.test(key) ? '#e3e8df' : '#ffffff' : null;
        return colour ? { ...layer, paint: { ...layer.paint, 'line-color': colour } } : layer;
      }
      case 'symbol': return { ...layer, paint: { ...layer.paint, 'text-color': '#42645b', 'text-halo-color': '#F4F6F2', 'text-halo-width': 1.2 } };
      case 'fill-extrusion': return { ...layer, paint: { ...layer.paint, 'fill-extrusion-color': '#e5e8df' } };
      // Liberty's optional low-zoom satellite backdrop is not part of our visual style.
      case 'raster': return { ...layer, paint: { ...layer.paint, 'raster-opacity': 0 } };
      default: return layer;
    }
  });
  return style;
}

export async function loadQettyqMapStyle(signal?: AbortSignal): Promise<StyleSpecification> {
  const response = await fetch(OPENFREEMAP_STYLE_URL, { signal });
  if (!response.ok) throw new Error('MAP_STYLE_UNAVAILABLE');
  const input: unknown = await response.json();
  if (!input || typeof input !== 'object' || !('version' in input) || input.version !== 8 || !('layers' in input) || !Array.isArray(input.layers) || !('sources' in input)) throw new Error('MAP_STYLE_INVALID');
  return qettyqMapStyle(input as StyleSpecification);
}
