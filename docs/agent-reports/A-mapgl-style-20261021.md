# A5/A6 · 2GIS MapGL styling · 21 October 2026

Direction: preserve QETTYQ's pearl/jade/lime map controls and markers, with a calm
flat basemap and a genuine published 2GIS style as the only full-palette input.
The `design-intelligence` skill and its UI systems reference informed this work;
no third-party UI code or new dependencies were imported.

## Implemented

- `src/client/dgis-theme.ts`: immutable overlay palette; strict UUID validation
  for a real published Style Editor identifier; documented reserved style globals
  disable traffic, parking, navigator, immersive roads and terrain; zero initial
  pitch/rotation; pearl loading background via documented `defaultBackgroundColor`.
- `src/client/dgis-mapgl.ts`: extends the small constructor contract with the theme
  options. Existing SDK methods, pinned CDN, SRI and request lifecycle are unchanged.
- `src/components/DgisMapCanvas.tsx`: optional `styleId`, shared route palette,
  explicit ready/theme diagnostic attributes, resets loading state on SDK remount.
  Existing 44px glass controls, jade/lime markers, origin, clustering, selection,
  genuine route-only polylines and native provider attribution are preserved.
- `tests/unit/dgis-theme.test.ts`: offline validation/default/palette tests. A URL,
  newline, whitespace, inline payload or invented style name is not accepted.

## Verification

- `pnpm exec vitest run tests/unit/dgis-theme.test.ts tests/unit/dgis-map-loader.test.ts tests/unit/dgis-map-browser.test.ts`: **59/59 PASS**, synthetic/offline.
- `pnpm typecheck`: **PASS**, exit 0.
- `pnpm exec eslint src/components/DgisMapCanvas.tsx src/client/dgis-mapgl.ts src/client/dgis-theme.ts tests/unit/dgis-theme.test.ts`: **PASS**, exit 0.
- No API key was read; no live SDK/map/search/route request or paid provider call
  was made by this agent. Browser QA and deployment belong to the orchestrator/QA.

## Documented boundary

There is no universal default-map palette variable documented in the inspected
MapGL globals. Arbitrary object colors require a real style published through the
Style Editor. This implementation does not guess proprietary layer IDs, invent a
style UUID, put a CSS tint over the map, or claim that overlay styling recolors the
basemap. Without a configured published ID, `data-map-theme="qettyq-overlays"`
truthfully identifies the default cartography with QETTYQ overlays. The root agent
wires optional `QETTYQ_2GIS_MAP_STYLE_ID` into the public config and component.

## Primary sources checked

- [Creating map styles](https://docs.2gis.com/en/mapgl/map-style/create): constructor
  `style`, genuine Style Editor IDs, loading `defaultBackgroundColor`, runtime
  `setStyleById` supported.
- [Global style variables](https://docs.2gis.com/en/mapgl/map-style/global-style-variables):
  reserved visibility variables and styleState contract.
- [Runtime editing](https://docs.2gis.com/en/mapgl/map-style/modify): styleload timing,
  add/remove layer APIs; not a reason to infer internal basemap schemas.
- [Map reference](https://docs.2gis.com/en/mapgl/reference/class): `getCanvas()`
  returns HTMLCanvasElement; existing WebGL context-loss handler uses the correct API.

Server/browser credential approval, quota enforcement, console restrictions,
published style creation, real-map visual checks and deployment remain root-owned.

## Follow-up: invalid tile access after style load

- Official [release notes](https://docs.2gis.com/en/mapgl/releases), v1.61,
  document that generic `error` also handles `invalidtilekey`, `styleloaderror`,
  and `webglcontextlost`; the current interface reference omits these details.
- Added `view.on('error', fail)`. Any SDK error, including after successful style
  load, conservatively destroys the map and switches to the existing honest
  fallback. No provider payload is read, shown, logged or persisted; no automatic
  SDK retry occurs. This is not a provider-account hard quota or billing control.
- Three new synthetic post-styleload error cases cover all documented error
  names, teardown, fallback, a single map instance, and no payload/key URL in UI.
- `PORT=3037 pnpm exec playwright test tests/e2e/dgis-map.spec.ts --workers=2 --output=output/playwright/dgis-map-error-followup`: **9/9 PASS**, Chromium,
  mocked API/SDK; all external requests blocked, no real provider quota consumed.
- Scoped ESLint and `pnpm typecheck`: **PASS**, exit 0.

## Follow-up: native copyright above the dock

The orchestrator's live v9 inspection found the native 2GIS mark underneath the
bottom navigation. This is corrected through documented SDK control placement,
not an attribution clone or CSS targeting provider internals: `copyright: 'topLeft'`
and `setControlsLayoutPadding({ top: safeTop + 78, left: 16, ... })`. The padding
is applied immediately after construction and on subsequent render/resize.
The free band is below the global header and above map toolbar / route-back
controls, matching the product's existing attribution band.

Primary reference: [2GIS controls and copyright position](https://docs.2gis.com/en/mapgl/map/configuration/controls).
The native SDK owns and renders the mark; no hiding or replacement was introduced.

`PORT=3037 pnpm exec playwright test tests/e2e/dgis-map.spec.ts --workers=2 --output=output/playwright/dgis-credit-top-fix`:
**10/10 PASS**. Synthetic SDK geometry now models control padding and asserts the
mark is below the header and above the map toolbar, including a synthetic 58px
iPhone top inset, and above the route-back control. Scoped ESLint also passes.
Actual provider mark dimensions and live deployment verification remain root-owned.
