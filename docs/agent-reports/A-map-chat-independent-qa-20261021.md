# Independent map/chat regression QA — 2026-10-21

Scope: tests only after initial keyboard/toast implementation. No paid calls, credentials, deployment or root configuration changes.

## New scenarios

- `keyboard-overlay.spec.ts`: synthetic Safari visual viewport panning and WKWebView resized layout, keyboard restore, city overlay/no feed shift, close and 2-second automatic fade.
- `multistop-real-api.spec.ts`: real local HTTP catalog/session/context/plan endpoints. Three actual catalog IDs added through UI, button reorder verified against request order and backend response, arithmetic checked, removal to two stops, 320 ms hold/drop verified through a second real plan response. Chat, street routing, live events, OpenAI and Google providers mocked off.
- `live-events.spec.ts`: isolated synthetic event with coordinates appears as a map marker, opens internal event detail, enters a plan, retains unknown/null duration and has one 2GIS walking-navigation URL. Empty event media has no generated event photo. The marker fixture intentionally has an empty POI catalog to avoid confusing an unexpanded cluster with an individual event marker.

The new event + multistop scenarios passed **3/3** in `output/playwright/qa-route-refresh/new-scenarios` (5.5 seconds). This is not live 2GIS API proof or a live event import.

## Existing regression changes

- Provider disclosure must be absent from chat and present in settings; default switches and opt-out assertions remain.
- Route circle is tested when collapsed; sheet/CTA are tested after explicit expansion. Parameter assertions explicitly open “Время и параметры”. Timeline counts target the timeline rather than an additional parameters list.
- One official HTTPS 2GIS walking deep link replaces four external-map buttons. Origin and destination coordinate assertions remain; no Google-to-OSM content transfer is introduced.
- Routing permission default now enabled, with explicit opt-out disabling the calculation. Provider-call count, 401 session recovery, timeout/no automatic retries, street geometry, durations, source attribution and stale geometry invalidation remain asserted.
- Neutral “Фото пока нет” / “Без фото” / “Афиша пока не добавлена” replaces obsolete assertions requiring generated illustrations.

## Findings and verification history

- Original compact rows exposed only one stop, so long-hold could not reach the next stop under the CTA. Reported to orchestrator; compact route rows and parameters were separated. The same hold/drop test then passed with a real backend response.
- Unknown total duration with known origin incorrectly said a start point was missing. Reported; source now distinguishes unknown time from missing origin.
- Intermediate full runs caught ongoing source writes / Turbopack parse overlays and obsolete UI assertions. These are not reported as final acceptance. A frozen full run is pending below.
- Scoped ESLint for modified/new E2E files passed. `tsc --noEmit` passed after source integration.
- Screenshots opened and inspected: `output/playwright/keyboard-overlay/city-toast.png`, `safari-offset.png`, `output/playwright/iphone-glass-media/route-expanded-430.png`, `route-expanded-landscape.png`, `output/playwright/qa-route-refresh/real-api-three-stops-reordered.png`, `event-unknown-duration.png`.

## Final frozen run

`PORT=3037 node node_modules/@playwright/test/cli.js test --workers=2 --output=output/playwright/qa-route-refresh/accepted-results` — **61/61 passed, exit 0, 2.5 minutes**.

The prior frozen run was 60/61: one test still tried to reopen the circle after the map’s “My plan” action already opened the sheet. Updated that selector to assert the sheet is visible and open only the parameters; all arithmetic/geometry invalidation assertions remain.

Visual review additionally found Leaflet copyright covered by the expanded landscape sheet. The compact-plan owner added scoped CSS moving attribution into the free left area; a new explicit copyright hit-test and non-overlap assertion was added to the portrait/landscape route test. Final targeted rerun **1/1 passed, exit 0, 1.9 seconds**, output `output/playwright/qa-route-refresh/landscape-credit-final`. Updated screenshot `output/playwright/iphone-glass-media/route-expanded-landscape.png` opened and inspected; the full copyright link is visible to the left of the expanded sheet.

Physical iPhone keyboard behavior, 2GIS live map/routing entitlement and actual arrival are not proven by these browser tests. Real local HTTP/SQLite checks and synthetic browser geometry are explicitly separated.
