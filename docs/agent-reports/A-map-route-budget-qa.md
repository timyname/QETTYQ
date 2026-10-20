# Map, route and budget QA — 20 October 2026

## Scope and result

Local Next app at `http://127.0.0.1:3000/`. Updated only the old map-engine locator in `tests/e2e/qettyq.spec.ts`; existing functional assertions are unchanged. Added `tests/e2e/map-route-budget.spec.ts` (two tests).

Executed the complete Playwright suite with `PORT=3000 node_modules/.bin/playwright test --workers=1` using the bundled Node runtime. **10 tests passed in 14.6 seconds**, process exit code 0. This includes the previous eight tests: main onboarding/feed/map/profile flow, zero budget, provider failure, actual swipe, mobile layout, organizer flow, local chat, and the explicitly synthetic live-events fixture.

## New coverage

- Budget 0 means confirmed-free only; unlimited is `null`, an empty custom field and `strictBudget=false`, including in the actual chat request context. A custom amount works; an amount above 1,000,000 is rejected with an alert and the previous value preserved.
- Astana route time remains UTC+5 when the browser timezone is America/New_York. A synthetic fixed clock at `2026-10-20T05:00:00Z` displays `2026-10-20T10:00`. Changing departure updates the date and timeline.
- Synthetic browser geolocation produces a Google walking-navigation link with the selected origin. No personal location was used.
- Route sheet expands/collapses, scrolls internally, leaves the CTA above the dock, and has no horizontal overflow at 360, 390 and 430 px widths (height 932).
- Map fills the viewport at all three widths. Automated tests accept MapLibre or the documented Leaflet fallback; they are not proof that external vector tiles have loaded.
- `/api/events` is explicitly stubbed as unavailable in these two UI tests. They do not certify live event ingestion or external provider uptime.

## Actual Chrome visual smoke

Separate CUA checks at 360×932, 390×932 and 430×932 confirmed `data-map-engine="maplibre"` and a visible MapLibre canvas, **with loaded vector roads, water, parks and labels**, category markers and cluster counts. No horizontal overflow was observed. These were real external map tiles, not screenshots used as a map and not the Leaflet fallback.

Saved actual Chrome proofs:

- `exports/screenshots/v6/map-live-vector-{360,390,430}.jpg`
- `exports/screenshots/v6/budget-chrome-{360,390,430}.jpg`

Saved automated regression proofs:

- `exports/screenshots/v6/budget-{360,390,430}.png`
- `exports/screenshots/v6/route-{360,390,430}.png`
- `exports/screenshots/v6/map-{360,390,430}.png`

Automated map/route PNGs can show the loading state; use the separate live-vector JPGs as external map-render evidence. The route itself was also visually inspected with loaded vector tiles, but final route Chrome screenshot export did not complete.

## Issues reported to the main integrator

1. **Route destination can initially be under the bottom sheet.** The initial camera fit does not reserve the actual 54%-height sheet plus dock. At the inspected no-origin route, the active destination marker was hidden under the sheet. Suggested fix: camera-fit padding derived from the overlay geometry, not a fixed 200 px bottom pad. No UI source edits made by QA.
2. Attribution is visible and includes all required credits, but the custom and provider credits repeat on two lines. Cosmetic consolidation is possible without removing mandatory credit.

## Browser cleanup limitation

The dedicated QA Chrome tab is `862553317` in browser `1`; no unrelated tabs or user data were closed or cleared. The final route screenshot/viewport-reset/close sequence timed out, as did an isolated `viewport.reset()` call. Therefore reset and closure are **not confirmed**. The integrator has the tab ID and was informed. The root's separate tab `862553318` must not be closed by this cleanup.

## Boundaries

No push, deploy, paid AI requests, presentation edits, production source changes or application submission were performed by this QA task. Passing these tests does not imply connected external AI, live booking, road-routing geometry or guaranteed provider availability.
