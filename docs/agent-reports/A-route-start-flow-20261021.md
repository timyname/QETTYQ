# A3/A6 · Route start flow · 2026-10-21

Implemented and frozen for orchestration. No external provider calls, credentials, billing changes or deployment were performed by this agent.

## Changes

- `src/components/RoutePlan.tsx`: initial primary action is **Проложить маршрут**, using the existing validated pedestrian `/api/routing` adapter. Only a successful street-route response reveals **Начать маршрут**, which opens the existing 2GIS walking link.
- Missing origin opens the manual start picker. Unavailable/failing provider has an explicitly labelled **Открыть в 2ГИС без расчёта** alternative. It never claims a street route, and no automatic provider-error retry occurs. Existing one-time authentication renewal remains before provider traffic. An in-flight request ref also prevents duplicate synchronous clicks.
- Existing geometry/leg/profile validation, unknown visit duration, schedule waits/lateness, drag-and-hold reordering and accessible up/down controls remain intact. Reordering/geographic changes invalidate the route by point signature without issuing another provider call.
- The return-to-all-map action is a 48px circular control beside the collapsed plan bubble, accessible name **На карту**, descriptive title **Все места и события на карте**. It calls existing `onBack`; the old upper-left pill is gone.
- `src/client/format-duration.ts` exports `formatDurationMinutes(number|null, 'ru'|'kk'|'en') : string|null`. Examples: `202 → 3 ч 22 мин / 3 сағ 22 мин / 3 h 22 min`; invalid/unknown is null, never zero. Hours also appear in visit/leg/wait/remaining/buffer details. Numeric estimates round up rather than understate travel time.
- `src/client/i18n-route.ts`: translated new action, error, summary fragments and return-map description.
- `src/components/RoutePlan.module.css`: existing pearl/jade/lime glass retained; compact circular return-map and accessible primary button/failure action styling added. Frontend-design skill was consulted; no new design library, copied pattern or icon system was introduced.

## Files

Owned implementation: `src/components/RoutePlan.tsx`, `src/components/RoutePlan.module.css`, `src/client/i18n-route.ts`, `src/client/format-duration.ts`.

Owned tests: `tests/unit/format-duration.test.ts`, `tests/e2e/route-start-flow.spec.ts`.

## Executed checks

With bundled Node/pnpm PATH:

- `pnpm exec vitest run tests/unit/format-duration.test.ts tests/unit/route-event-timeline.test.ts` — **24/24 PASS** (15 duration + 9 existing schedule tests).
- `pnpm typecheck` — **PASS**, including after final duration-detail edits.
- `pnpm exec eslint src/components/RoutePlan.tsx src/client/format-duration.ts src/client/i18n-route.ts tests/unit/format-duration.test.ts tests/e2e/route-start-flow.spec.ts` — **PASS**.
- `PORT=3038 pnpm exec playwright test tests/e2e/route-start-flow.spec.ts --workers=1 --output=output/playwright/route-start-results --reporter=line` — **5/5 PASS**, 8.2 seconds. All `/api/*` endpoints mocked, non-local network requests aborted. Covers explicit two-step flow, 202→3h22m summary, updated street ETA, compact return-all-map, unavailable provider, failed provider/no retry, absent origin and unknown visit duration after a successful route calculation.
- Synthetic screenshot `output/playwright/route-start-flow/calculated-synthetic.png` was opened and visually inspected. It proves compact panel/CTA composition only; map tiles were intentionally blocked, so its grey fallback is not a live-map claim.

## Initial failures and remaining integration checks

- Initial new-spec run: 4/5 passed; unknown-duration exact text locator failed because arrival and duration share a `<small>` element. Locator corrected to match the actual combined copy; clean isolated rerun passed all five.
- Combined new spec + existing `dgis-map.spec.ts` was attempted: 12/15 reported pass, two failures were concurrent shared Playwright `test-results` artifact collisions (`ENOENT`/`EINVAL` at browser-context close), and a native safe-inset credit positioning assertion failed (credit y78, header bottom130). The latter belongs to map/header inset integration and was reported to A0; no map test or map/header file was edited here. Route-geometry and halo assertion passed.
- Legacy tests expecting **Начать маршрут** before any street calculation need contract updates: they must explicitly build a route, or assert the clearly named external-without-calculation fallback when the routing provider is disabled. No test assertion was weakened by this agent.
- Physical iPhone keyboard/status-bar rendering, live provider geometry and native 2GIS intermediate-stop support are not verified here. A0 owns integrated release and live checks.

## Sources and boundaries

Read project execution rules and PRD sections 1, 8, 11, 12 and role/contract section 14. Read the local Next server/client-component guide for existing client-only state and effects. No provider API contract or endpoint was added or changed; the existing pedestrian adapter and 2GIS deep link were reused.

## Integrated QA follow-up — completed

A0 explicitly assigned updates to seven legacy specs: `qettyq.spec.ts`, `street-routing.spec.ts`, `map-route-budget.spec.ts`, `live-events.spec.ts`, `iphone-glass-media.spec.ts`, `compact-route-location.spec.ts`, `qa-language-memory.spec.ts`.

- Updated the intended workflow rather than weakening tests: street success is calculated before asserting the start link; unavailable/error states assert the explicitly labelled external fallback and its full pedestrian origin/stop URL; unknown-origin scenarios obtain a synthetic location before validating the href. The old missing-origin start link is explicitly asserted absent.
- Updated duration expectations (`108 мин` → `1 ч 48 мин` and localized equivalents); retained clock/timezone, date persistence, feasible/unknown and API-response arithmetic assertions. Returning to the complete map now first collapses the sheet and uses its circular map button.
- The first full integrated run was **76/81 PASS**, identifying five real/integration failures. A0 fixed the two actual-header/2GIS copyright positioning failures in its owned map component without loosening the attribution assertions. This agent fixed the remaining three:
  - A constant-ID event fixture retains the same expanded plan after GPS refresh, so its test must not wait for a nonexistent collapsed bubble.
  - The landscape route-source credit overlapped Leaflet copyright. Its route-panel-specific top offset is now 188px; the existing `elementFromPoint` accessibility/visibility assertion passes unchanged.
  - Dragging to a second stop hidden below the compact sheet footer produced no reorder. The drag handler now scrolls near the top/bottom edges and clamps hit-testing into the exposed scroll viewport. The existing deliberate 320ms hold and real local `/api/plans` reorder assertions pass unchanged.
- Targeted rerun of those three scenarios: **3/3 PASS**, 10.9 seconds.
- Clean complete run: `PORT=3039 pnpm exec playwright test --workers=2 --output=output/playwright/iphone-ui-pass-results --reporter=line` — **81/81 PASS**, 2.9 minutes, exit 0. No concurrent Next build/dev run was used. The test-managed Next server stopped at completion.
- Final scoped ESLint over RoutePlan and the seven owned legacy specs — **PASS**.

The complete suite combines synthetic provider/UI fixtures with real loopback HTTP/catalogue/SQLite plan and memory checks. It is not evidence of physical iPhone behavior, live AI quality, live provider quota or new real street geometry. Browser screenshots remain synthetic or catalogue/snapshot checks according to their individual tests. Files are frozen for A0 release integration.
