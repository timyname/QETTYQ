# A0 · Multi-stop route correction · 2026-10-21

## Root cause and implementation

`PilotApp` evaluated map/detail/event cards with `buildPlan([selected.id])`, replacing the displayed itinerary with a single stop even though the draft retained more IDs. The new `evaluateStop → includePlanStop` preserves the ordered draft, deduplicates, appends only within the existing five-stop cap and never evicts a stop silently. Removal/reordering still submit exact replacement lists.

`RoutePlan` now automatically requests the existing walking adapter once for the ordered point/provider signature when origin, consent and availability are ready. Failed provider calls do not retry automatically. Origin/order changes discard the previous geometry and recalculate. Explicit retry is still available; absent origin does not send a routing request. Revoking routing consent aborts a pending request.

The main timeline exposes A→B/B→C walking estimates separately from visit duration, arrival, source-backed event wait/lateness, and visible up/down controls. Hold-drag remains supported. Unknown event duration stays unknown. The 2GIS external pedestrian link preserves all stops.

Server plans expose separate `constraintViolations.time/budget`, so obsolete straight-line timing warnings do not survive a successful street recalculation while budget warnings remain. Sharing receives the same displayed total, including street time and event waits, rather than the original estimate.

## Boundaries

- No new provider, billing, API key, media permission, database migration or source grant.
- Existing authorized $10 Google / $10 OpenAI ceilings unchanged; no paid Google/OpenAI calls made for this fix.
- Source/rights R0 audit is documentation only: `docs/RAG_BASELINE.md`. R1/R2 have not been implemented. Universal source revocation/embedding gates and public photo coverage remain separate open work.
- Native Vite compilation is not a physical iPhone install, keyboard or touch validation.

## Checks and release evidence

- Final `pnpm test`: 646/646 PASS, 57 files.
- Scoped ESLint and TypeScript: PASS (root + route agent); immutable Docker Next build: PASS.
- Private native `pnpm --dir mobile exec vite build --outDir …/native-www`: PASS, 7.48s; existing large-chunk warning retained.
- Full `PORT=3039 pnpm exec playwright test --workers=2 --output=output/playwright/multistop-v12-results --reporter=line`: **83/83 PASS**, 2.5min, exit0. Includes synthetic provider contracts, all languages/viewports, real loopback three-stop plans/reorder/hold-drag and SQLite memory/deletion. No assertions disabled. Expected synthetic safe-area hydration notices and existing MapLibre missing-sprite warnings remain; these are not represented as physical-device or live AI tests.
- Immutable build tree: `f37cb450e835102733652b18ce3334fd64e98e8f`.
- Image: `qettyq:vps-20261021-12`; manifest `0b88e0c71d96c192df78c60359a215a3de686d2958e148d62756595c022cdb5e`; size 108749712 bytes.
- Foreign native/PWA/root configuration/presentation changes excluded from build inputs by private Git index/archive. Retained SSH access is not removed.

## Production verification

- SQLite verified backup completed before app-only Compose recreation. Production image vps12 healthy; memory observed211.1MiB/640MiB. Authorized-keys digest unchanged. Other projects/proxy were not modified.
- Actual Chrome UI: added Военно-исторический музей → Музей истории железных дорог Казахстана → Музей Сакена Сейфуллина, then evaluated the third card. The expanded production plan retained3 stops. No browser fixture or injected route geometry was used.
- Start chosen through sourced public address search (Государственный военно-исторический музей, Республика даңғылы2), **not personal GPS**. Automatic FOSSGIS Foot response produced a real street line on 2GIS,22.4km, displayed8h17m including three estimated60m visits and existing buffer. Before reordering, legs were approximately3m/2h14m/2h43m.
- Inline down-arrow moved railway museum ahead of military museum. During recalculation old street geometry was discarded, estimates clearly labeled straight-line; after response, street quality returned with legs approximately2h17m/2h14m/29m. Three stops persisted. The long route correctly retains the time-limit warning; this is not a recommendation that these distant museums fit a120m window or are open at dawn.
- Two actual free FOSSGIS requests for the initial and reordered plan; no Google/OpenAI paid calls, no external navigation launched. This verifies desktop browser production behavior, not physical iPhone hold gesture or native install.
- Screenshot: `exports/screenshots/multistop-v12/live-three-stops-reordered.png` (actual published map, cropped only to430px application canvas).
