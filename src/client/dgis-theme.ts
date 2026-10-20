/** QETTYQ overlay palette. These are not undocumented MapGL basemap variables. */
export const QETTYQ_DGIS_PALETTE = Object.freeze({
  pearl: '#F4F6F2',
  jade: '#0B6E5D',
  ink: '#0B332D',
  lime: '#CFFC55',
});

/** A real, published Style Editor ID only. Never accept URLs or inline styles. */
export function approvedDgisStyleId(value: unknown): string | null {
  return typeof value === 'string' && value.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)
    ? value.toLowerCase() : null;
}

/** Official reserved globals control visual density, not the default palette.
 * Custom cartographic colors must be published in the 2GIS Style Editor and
 * supplied through `style`; guessing the vendor's internal layer IDs is unsafe.
 * https://docs.2gis.com/en/mapgl/map-style/global-style-variables
 */
export function dgisThemeOptions(styleId?: unknown) {
  const style = approvedDgisStyleId(styleId);
  return {
    ...(style ? { style } : {}),
    defaultBackgroundColor: QETTYQ_DGIS_PALETTE.pearl,
    pitch: 0,
    rotation: 0,
    styleState: {
      trafficOn: false,
      parkingOn: false,
      navigatorOn: false,
      immersiveRoadsOn: false,
      terrainEnabled: false,
    },
  };
}
