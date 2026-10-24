# A6 · События с одинаковыми координатами · 24.10.2026

Status: narrow UI fix implemented and independently tested locally; source frozen for root release. No data, coordinates, public contract, API, budget, dependency or deployment changed here. Existing glass/popup styles are reused without a redesign, spider layout or artificial coordinate displacement.

## Confirmed defect

Root's live CUA check found that selecting Kinusaiga and showing it on the map could open the other gallery event at the exact same building coordinate. `clusterMapPoints` previously always isolated the active point from its neighbours, including an exact-coordinate peer. Two individual markers therefore overlapped and the last marker intercepted the actual click.

## Implemented

- Active points stay individual when their neighbours are merely nearby, as before. An active point with an **exact** same-latitude/same-longitude peer participates in the cluster instead. No rounding, geographic jitter or coordinate mutation is used.
- Exact-coordinate clusters open the existing occurrence picker immediately at any zoom. Zooming cannot separate identical coordinates, so pointless repeated zoom was removed for this precise case only. Ordinary nearby clusters still zoom normally.
- The existing MapLibre, Leaflet fallback and 2ГИС popup paths all use the same exact-coordinate predicate. Each picker item includes the original title **and** existing date/time label, renders as text, and selects that occurrence's own ID.
- Co-located clusters now advertise “Мест: N. Выбрать” and the Leaflet tooltip says “Нажмите, чтобы выбрать”. Root added the two dictionary entries; this agent did not edit translations outside the approved ownership. Nearby-cluster zoom wording is unchanged.

## Owned paths

```text
src/components/CityMap.tsx
src/components/MapCanvas.tsx
src/components/DgisMapCanvas.tsx
tests/unit/city-map.test.ts
tests/e2e/co-located-events.spec.ts
docs/agent-reports/A-co-located-events-20261024.md
```

## Actual checks

```text
pnpm exec vitest run tests/unit/city-map.test.ts tests/unit/i18n-interface.test.ts --maxWorkers=1
13/13 PASS, 2 files, 409 ms

PORT=3068 pnpm exec playwright test tests/e2e/co-located-events.spec.ts tests/e2e/event-detail-map-plan.spec.ts --workers=1
3/3 PASS, 12.7 s (before final accurate picker wording)

PORT=3068 pnpm exec playwright test tests/e2e/co-located-events.spec.ts --workers=1
Final after picker wording and both-choice visibility assertions: 1/1 PASS, 6.1 s

pnpm exec eslint src/components/CityMap.tsx src/components/MapCanvas.tsx src/components/DgisMapCanvas.tsx tests/unit/city-map.test.ts tests/e2e/co-located-events.spec.ts
PASS

pnpm typecheck
PASS
```

The original nearby-active-isolation test remains unchanged and passing. New unit cases check reversed input order, both exact-peer IDs retained in one cluster, unchanged source coordinates, exact versus near-but-not-exact grouping and title/date plain-text labels.

The mobile Chromium E2E uses two explicitly synthetic occurrences at one coordinate. It opens the first detail, shows the event map, normally clicks the single cluster (no force/dispatch bypass), verifies **both** titled/date-labelled choices are visible, chooses Kinusaiga and verifies the correct heading/ID, adds it, repeats for Healing, then verifies `/api/plans` receives the ordered IDs `[Kinusaiga, Healing]`. This test does not assert a real street route, availability or physical entrance. MapLibre is used with the browser map key mocked off; no paid map/API request is made. Leaflet and 2ГИС share the updated helper/code path but were not separately exercised against their external SDKs in this focused run.

## Popup placement follow-up

The first screenshot captured the popup before MapLibre applied its projected transform. A fresh read-only DOM probe measured native CSS `position:absolute`, inline `translate(-50%, -100%) translate(195px, 442px)`, computed matrix `(1,0,0,1,60,280)`, popup bounds `(60,280,270,162)` and map bounds `(0,0,390,844)`. Its bottom centre is exactly the projected marker `(195,442)`. The global MapLibre stylesheet was already imported; no production CSS or popup placement override was justified or added.

The E2E now waits for actual popup geometry: below the header, above navigation, horizontal centre and bottom anchor within 2 px of the real marker centre. This replaces the insufficient visibility-only screenshot timing without forced clicks or longer timeouts. A local synthetic background-style fixture preserves the real MapLibre engine/projection while removing external tile-network startup timing from this offline UI test. One intermediate unmocked run failed because the second map was still displaying its loading status after the standard assertion window; this was not an absent-event-data claim.

Final command after the geometry regression: `PORT=3068 pnpm exec playwright test tests/e2e/co-located-events.spec.ts --workers=1` — **1/1 PASS, 4.9 s**. The refreshed `output/playwright/co-located-events/occurrence-picker.png` was visually inspected: both title/time choices sit immediately above the shared marker, below the toolbar and clear of the header/navigation. The intentionally blank synthetic background is not evidence of production tile rendering. Source remains frozen; only the test/report changed in this follow-up. Root remains responsible for the new production image, publication and final live replay.
