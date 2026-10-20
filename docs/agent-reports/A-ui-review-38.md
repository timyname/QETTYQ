# UI review: 38 comments · 20 October 2026

Scope: components and browser tests only. Source brief: `design/review/browser-comments-20261020.json`. Existing jade / pearl / lime / Manrope language retained using frontend-design and design-intelligence guidance. No new poster rights, API capability, price or transport estimate invented.

## Result by original comment ID

| ID | Status | Implemented / remaining |
|---|---|---|
| 1 | done | Welcome fills the viewport; no header/footer slab. |
| 2 | done | Short requested copy over the image, with a continuous contrast gradient, no text panel. |
| 3 | done | Welcome map shortcut removed. |
| 4 | done | Welcome bottom footnote removed; artwork remains labelled as an illustration in accessible alt text. |
| 5 | done | Artwork covers the complete display, including behind the logo and CTA. |
| 6 | done | Transparent QETTYQ wordmark over the light part of the artwork. |
| 7 | done | All 15 interests have different, concrete category examples. Illustration disclosure remains. |
| 8 | done | 15 grey segments; lime current segment; jade completed segments. No visible numeric counter. Accessible step count retained. |
| 9 | done | Header strips transparent; individual glass controls retain their own surfaces. Detail screens start at the top without a header row. |
| 10 | done | Removed “К интересам” and step eyebrow from conditions. |
| 11 | done | Smaller amount field, panels and spacing; origin controls are inside the same conditions panel. |
| 12 | done | Rounded, styled native checkbox, keyboard focus and checked indicator. |
| 13 | done | Goal chooser removed. Existing/default context semantics retained; no arbitrary replacement filter. |
| 14 | done | Feed conditions control is in the top header beside the city. No duplicate heading button. |
| 15 | blocked | Approved-poster rendering path remains supported (contain fit + credit), but no new licensed real poster was supplied. Generated category illustrations are not relabelled as posters. Requires rights approval/media ingestion. |
| 16 | done, safe alternative | Removed feed-footer block; required OSM credit is now compactly attached to the personal catalogue cards. Not deleted. |
| 17 | done | Large feed heading, eyebrow and context chips removed. Only a screen-reader page heading remains. |
| 18 | done | Cache/timestamp/coverage details collapsed under “Актуальность подборки”. A stale/unavailable warning remains visible. |
| 19 | done | “Листай события вбок…” paragraph removed. |
| 20 | done | Event carousel has overlay segments; active segment follows native scroll/swipe and segments can be clicked. |
| 21 | done | Personal matches/empty state first, general city afisha second. General afisha explicitly does not promise to match the selected constraints. |
| 22 | done | Numeric carousel/arrow row removed; segment controls replace it. |
| 23 | done | Round back icon over the detail image. |
| 24 | done | Full-width top hero, lower gradient, content continuing underneath. |
| 25 | done | Title overlays hero; three separate facts: date/time, language, price. Unknown remains unknown. |
| 26 | done | Venue/address immediately below facts. Identical address and venue strings are not repeated. |
| 27 | done | Short factual category/availability explanation and critical unknowns; no invented editorial event description. |
| 28 | done | Round overlay bookmark on feed/detail heroes; lime saved state; saved/removed toast. Long detail save button removed. |
| 29 | done, safe alternative | Large fetch/booking footer removed; registration/source action, compact mandatory credit and important unknowns retained. |
| 30 | done | Dock highlight follows pointer drag and snaps on release. Normal clicks, keyboard activation after drag and reduced motion tested. |
| 31 | done | Composer only contains input and round send; quick chips and permanent Kino note removed. VisualViewport resizing reduces chat height; dock is hidden while the keyboard is detected, message scroller remains separate. Physical iOS keyboard QA still needs a device. |
| 32 | partial | Honest assistant/memory explanation, persistent dialogue, place/event cards and source links are present. Future visit-memory, collaborative plans, arbitrary web-search cards and chat mini-map are not claimed or fabricated. Backend feature work is a separate scope. |
| 33 | done, safe alternative | Attribution is compact and visible above map controls, not hidden under the dock. Toast relocated away from it; non-overlap asserted. |
| 34 | done | Add-to-plan becomes a compact selected check; adjacent “Мой план” appears and opens the actual plan. |
| 35 | blocked | Existing OSM address/unknown price shown honestly. No authorized Google Places integration or verified average-check data in this UI scope. No invented average bill, and no mixing restricted Google data onto OSM. |
| 36 | done | Consistent SVG paths for verified fast_food, coffee, cafe, restaurant, theatre, culture, park and music categories; unknown category gets a neutral pin. No unverified “doner” claim. |
| 37 | done, scoped | “Твой маршрут”; walking selected, car/taxi/bus disabled with plain explanation. Existing external walking navigation preserved. No fake transport ETA/fare. |
| 38 | done | Collapsed route sheet reduced from 45% to 36%, inset increased, route camera padding adjusted; internal scrolling and expand control preserved. |

35 completed (including constrained safe alternatives), 1 partially implemented, 2 blocked by missing data/rights/provider authority.

## Additional safeguards

- Whole chat POST is bounded by UTF-8 bytes to **14 KiB** before fetch, below the server’s 16 KiB limit. Newest six history messages retained; oldest dropped to fit. Current message is not silently truncated; impossible payload gets a clear error.
- AI consent and AI availability are separate. “AI-объяснение разрешено” is not a claim of a successful model response. Unavailable provider with retained consent is labelled unavailable.
- Fixed a real post-swipe painting failure: do not animate an off-screen excursion with zero duration in reduced-motion mode; keep the motion wrapper stable and explicit layer order. New tests check actual viewport intersection, not just DOM presence, in normal and reduced-motion modes.
- Fixed dock drag suppressing the next keyboard activation.
- User-facing catalogue category labels are Russian instead of internal `theatre` / `fast_food` strings.
- A map toast no longer covers source attribution. Route navigation disclosure does not claim to transmit an absent origin.

## Files and verification

Main changes: `PilotApp.tsx/.module.css`, `LiveEvents.tsx`, `BudgetControl.module.css`, `MapCanvas.tsx`, `RoutePlan.tsx/.module.css`. New small components/helpers: `GlassDock.tsx`, `ProgressRail.tsx`, `chat-payload.ts`, `map-marker-icons.ts`.

Executed with the installed Node + pnpm runtime:

```text
pnpm exec tsc --noEmit
pnpm exec eslint src/components/PilotApp.tsx src/components/LiveEvents.tsx src/components/GlassDock.tsx src/components/ProgressRail.tsx src/components/RoutePlan.tsx src/components/MapCanvas.tsx src/components/chat-payload.ts src/components/map-marker-icons.ts tests/unit/ui-review-38.test.ts tests/e2e
pnpm exec vitest run tests/unit/ui-review-38.test.ts
pnpm exec playwright test --workers=2
```

TypeScript PASS. Scoped ESLint PASS, no findings. New UI unit tests **4/4 PASS**. Full browser suite **16/16 PASS (15.6 s)**. Existing tests were updated for intentionally removed controls/copy, not relaxed for data, pricing, privacy, route failures or navigation assertions.

Final follow-up: `pnpm exec playwright test tests/e2e/ui-review-38.spec.ts -g 'map check' --workers=1` **1/1 PASS (9.4 s)**, after adding an explicit wait for map startup to finish before the final route screenshot. Repeated `pnpm exec tsc --noEmit` PASS and `git diff --check` PASS. `route-390.png` was re-inspected with loaded vector map, visible credits, one real catalogue point, no origin and no invented road line.

Visual inspection: `exports/screenshots/ui-review-38/`. Welcome, conditions and chat at 360/390/430; swipe, personal feed and place detail; event detail at 360/390/430; map/plan at 390. Native browser width/height, overflow, active segment paint, title intersection, CTA/dock separation and attribution/toast separation checked. Event/chat screenshots with `synthetic` in the filename contain explicitly synthetic fixtures and must not be used as evidence of real events or a live model. Route UI tests using fixture road geometry are likewise not proof of production street routing.

No production provider requests, paid calls, deployment, push, credential access or changes outside owned UI/test/report files. Orchestrator retains final production build, real-device keyboard QA and deployment verification.
