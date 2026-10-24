# A6 · Событие → карта → упорядоченный план · 24.10.2026

Status: implemented, source frozen for A0 release integration. No deployment, physical iPhone test, provider or paid request by this agent. Existing glass styles and destination/source links are preserved; no CSS, dependency, root configuration or media asset changed.

## Working increment

- The actual component is `EventDetail` in `src/components/LiveEvents.tsx`, not a separate EventDetail.tsx file. It now accepts explicit `onShowOnMap` and shows an in-app “Показать на карте” button.
- PilotApp switches to the map, clears stale text-search/origin/organizer-pick state, selects the new “События” filter and focuses the eligible event's verified coordinates. The current event remains highlighted. The marker opens the event detail again.
- The map event pool merges source-validated feed/chat/current event records by ID so a current event opened from chat is not focused on an otherwise empty map. Current feed records take precedence over an older selected version. Only records passing the same `eventPlanStop` guard participate in event markers and plan actions.
- Add/evaluate buttons are shown disabled rather than silently disappearing for an ineligible event, with RU/KK/EN reasons covering stale source, expired/unconfirmed date, unscheduled status and missing verified coordinates. Eligibility refreshes every thirty seconds, and every action also rechecks at click time. Backend guard remains authoritative.
- Adding an event now calls the existing `includePlanStop`, preserves ordered venue/event IDs, refuses capacity overflow and reports it honestly instead of slicing away a sixth stop and claiming success. Evaluation keeps the existing ordered plan rather than replacing it with a single event. Existing venue add uses the same order-preserving helper.
- Direct 2ГИС destination and original organizer/booking/credit links remain available as before. A stale event's in-app map action is conservatively disabled together with its plan action; this does not invent a usable event marker from an expired listing.

## A real map bug found by the new E2E

The initial offline test correctly switched to the event filter and focused the map, but clicking the marker failed: a second same-event marker intercepted the click. This was **not** waived with `force` or JavaScript clicks.

Read-only inspection showed `MapCanvas.render()` calling zero-duration `fitBounds` inside marker rebuilding. MapLibre synchronously emits `moveend`, reentering render and appending a nested marker batch; the outer pass then appends another. A0 approved a narrow `MapCanvas.tsx` fix: a try/finally reentrancy guard around marker rendering. The normal moveend listener remains, and asynchronous real moves still update clusters. Projection in the original pass uses the newly focused bounds.

The new regression now asserts exactly **one** event button before a normal actionable click. After the guard, the same flow completed and `/api/plans` received precisely the two original venue IDs followed by the selected event ID.

## Files owned at this checkpoint

```text
src/components/LiveEvents.tsx
src/components/PilotApp.tsx
src/components/MapCanvas.tsx                 # narrow approved reentrancy guard
src/client/i18n-dictionary.ts
tests/unit/event-detail-map-actions.test.ts
tests/e2e/event-detail-map-plan.spec.ts
tests/e2e/live-events.spec.ts                # narrowly corrected existing fixture
docs/agent-reports/A-event-detail-map-ui-20261024.md
```

The existing geocoded-event E2E had an October 20 event but no fixed clock and a stale feed fixture. It now explicitly fixes the browser clock and marks that routable fixture fresh; a **separate new stale case** proves that stale coordinates do not enable plan actions. No production validation or assertion was disabled.

## Actual checks

```text
pnpm exec vitest run tests/unit/event-detail-map-actions.test.ts tests/unit/i18n-interface.test.ts tests/unit/plan-selection.test.ts tests/unit/event-plan-stop.test.ts --maxWorkers=2
24/24 PASS, 4 files, 342 ms

pnpm typecheck
PASS

pnpm exec eslint src/components/LiveEvents.tsx src/components/PilotApp.tsx src/components/MapCanvas.tsx src/client/i18n-dictionary.ts tests/unit/event-detail-map-actions.test.ts tests/e2e/event-detail-map-plan.spec.ts tests/e2e/live-events.spec.ts
PASS

PORT=3068 pnpm exec playwright test tests/e2e/event-detail-map-plan.spec.ts tests/e2e/live-events.spec.ts --workers=1
4/4 PASS, 12.8 s, mobile Chromium reduced motion

git diff --check -- src/components/LiveEvents.tsx src/components/PilotApp.tsx src/components/MapCanvas.tsx src/client/i18n-dictionary.ts tests/e2e/live-events.spec.ts
PASS
```

The first E2E run was 3/4 with the duplicate-marker failure. A first retry failed before test execution with a Next web-server startup timeout, not a functional assertion failure. The final port-3068 run completed all four. The new cases exercise detail → event-filtered map → exactly one actionable marker → detail → add/evaluate without losing two prior venues, and stale event disabling with retained source link. Plans, ingestion and provider data in browser fixtures are explicitly synthetic. No real road geometry, organizer availability or entrance precision is asserted.

Screenshots: `output/playwright/event-map-plan/ordered-event-plan.png` was visually inspected but captures navigation while the route map is still loading, with the three-stop count visible; it is **not** proof of a fully rendered plan sheet or street map. The ordered-ID proof is the request assertion. The earlier failed marker screenshot was also visually inspected to diagnose the duplicate. A0 performs the isolated full-suite/release verification independently and should capture final presentation after the map/sheet finishes loading if needed.
