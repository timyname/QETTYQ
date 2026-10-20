# 2GIS browser map adapter — prepared, not live

21 October 2026. This subtask prepares a MapGL renderer; it does not publish a browser credential, enable the provider, alter an account, change billing, call a paid endpoint, or claim that the demo Search key grants MapGL/Directions/photos.

## Credential boundary

`GET /api/maps/config` returns `enabled:false, provider:openstreetmap` unless both **dedicated** `QETTYQ_2GIS_BROWSER_KEY` and exact `QETTYQ_2GIS_BROWSER_KEY_APPROVED=true` are present. It never falls back to `2GIS_API_KEY`, Google or another environment credential. Accidentally copying the server key to the dedicated variable is also rejected when their trimmed values match. Malformed credentials are rejected without printing them. The response has private/no-store and CDN no-store headers.

The approval flag is an operator gate, **not** automatic verification of provider account restrictions. Before enabling, the owner/operator must approve a separate browser-visible key, verify MapGL entitlement and domain restrictions for the actual web/native origins, and verify quota/expiry. A browser SDK key is necessarily visible in its authorized runtime requests; no proxy obscurity claim is made. This task did not inspect or change real key values or account restrictions.

MapCanvas obtains config once per mounted component with `cache:no-store`, abort on unmount, and a three-second timeout. Until that response, it shows a map loading surface. Disabled/failed config uses the existing MapLibre→Leaflet fallback. It does not load the 2GIS script or initialize MapGL on the disabled path. The key lives only in mounted React state/SDK initialization, never in application localStorage, SQLite, the script URL or Git.

## Adapter

- Existing MapLibre body is preserved; it was renamed `MapLibreCanvas`. The wrapper chooses the new `DgisMapCanvas` only for the approved config shape. Provider failure selects the existing OSM renderer and states that it is a fallback, not active 2GIS.
- Fixed SDK URL `https://mapgl.2gis.com/api/js/v1.78.0`, exact published SHA-512 SRI, anonymous CORS, no key query. Script timeout is ten seconds, concurrent loads deduplicate, error removes the failed script and does not automatically retry. No dependency/package/lockfile changes.
- The pinned version/SRI were read from [official release notes](https://docs.2gis.com/en/mapgl/releases): v1.78.0 dated 13 September 2026, advertised support until 23 December 2026. SRI prevents silently substituting another response; a changed/missing release fails to the old renderer. Future version maintenance is required.
- The documented [MapGL classes](https://docs.2gis.com/en/mapgl/reference/class), [options/events](https://docs.2gis.com/en/mapgl/reference/interface), [fit-bounds guide](https://docs.2gis.com/en/mapgl/map/configuration/fitbounds) and [popups/HtmlMarker guide](https://docs.2gis.com/en/mapgl/objects/popups) were checked. Actual API class is `HtmlMarker`, not `HTMLMarker`. No undocumented MapLibre-style `load/error/moveend` event names are assumed.
- Preserves the shared point/active/select/pick/origin/fitPoints/routeGeometry/routeAttribution props. It renders safe DOM category buttons and source data through textContent, screen-space clusters, expanded coincident-place lists with close button, origin marker, and validated lon/lat street polylines. A route needs at least two valid coordinates; an unknown/invalid route does not become a straight invented line.
- Existing jade/pearl control styling, 44px tap areas, reduced-motion preference, current language and measured safe/map-panel fit padding are reused. Frontend-design guidance influenced restraint/reuse rather than adding new decorative chrome.
- Native SDK copyright control remains enabled at bottom-left, positioned using documented controls padding. No CSS hides/relabels provider attribution; low-zoom provider credits may still be required. Route credit is a separate source link.
- `styleloaderror`, 15-second style startup timeout, DOM WebGL context loss or adapter exceptions cause fallback. Unmount destroys markers, line objects, popups, timer and map; disposed async loads cannot mount a map after navigation.

This renderer is not a Search importer, permanent 2GIS POI/photo database, geocoder, Directions entitlement, background tracker or consent to background location. Those are separate provider/privacy contracts.

## Checks

Executed using the bundled Node runtime on PATH:

```sh
node_modules/.bin/vitest run tests/unit/dgis-map-browser.test.ts tests/unit/dgis-map-loader.test.ts
node_modules/.bin/tsc --noEmit --pretty false
node_modules/.bin/eslint src/client/dgis-mapgl.ts src/components/DgisMapCanvas.tsx src/components/MapCanvas.tsx src/server/pilot/browser-map-config.ts src/app/api/maps/config/route.ts tests/unit/dgis-map-browser.test.ts tests/unit/dgis-map-loader.test.ts
```

Unit checks: **42/42 PASS**, synthetic/offline only; combined map+event geo/media regression run **115/115 PASS**, five files. They cover default/server-key denial, exact approval, duplicate-key denial, malformed keys, no-store route, restricted client DTO, no key in SDK URL, lon/lat bounds/route validity, fixed SRI, loader deduplication, onload API validation, CDN/SRI failure, timeout/no retry and reuse. Final scoped ESLint **PASS**. Initial full TypeScript check **PASS**; the final rerun encountered a concurrent `PilotApp.tsx:438` missing-brace edit and was reported to root without modifying that other owner's file. A coordinated typecheck after UI freeze remains necessary.

No browser integration or physical iPhone proof is claimed by these unit tests. The Playwright CLI prerequisite `npx` was absent from the available bundled PATH, so this subtask did not install global tooling or silently switch automation workflows. Root's existing browser QA can run a mock SDK fixture without a real browser key; after owner approval, a tightly bounded live MapGL render should verify actual entitlement, domain restrictions, attribution placement and iPhone behavior. Until then this integration remains **prepared, disabled by default, not live verified**.
