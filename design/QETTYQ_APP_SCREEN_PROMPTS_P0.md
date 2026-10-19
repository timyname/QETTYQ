# QETTYQ — prompt set P0

Этот файл — короткий воспроизводимый prompt set для 28 визуальных эталонов.
Перед каждым delta использовать общий prefix из
`design/QETTYQ_APP_SCREEN_GENERATION_INSTRUCTION.md`.

Текст, карта и фактические данные на PNG не являются source of truth. Их всегда
заменяет React-слой согласно `design/QETTYQ_44_ARTBOARD_SPEC.md`.

| ID | Файл | Prompt delta |
|---|---|---|
| 02 | `02-home.png` | Home: 64 px header, 2×2 activity tiles, compact composer, one primary onboarding action. |
| 03 | `03-city-select.png` | Full-height city sheet: Astana selected, Almaty disabled as next city, current-location row. |
| 04 | `04-onboarding-intro.png` | Two-minute / fifteen-choice intro with one 3:4 demo card and two cards behind it. |
| 05 | `05-swipe.png` | Neutral swipe state: 342×456 card stack, X/undo/heart controls, progress and context dock. |
| 08 | `08-context-time.png` | Step 2: large time value, slider, presets, now/later segment; budget and geography collapsed. |
| 09 | `09-context-budget.png` | Budget form: editable amount, unknown and explicit zero as different states, scope and party stepper. |
| 10 | `10-context-geography.png` | Start point: browser geolocation vs manual point, optional B, return toggle, pale map grid. |
| 11 | `11-location-permission.png` | In-app location explainer over muted runtime map; allow once and manual-choice actions. |
| 12 | `12-manual-point.png` | Search plus movable runtime map under one fixed pin and a 156 px confirm sheet. |
| 13 | `13-search-progress.png` | Three-stage vertical verification line: done, active, pending; no percentage or global spinner. |
| 14 | `14-feed.png` | 386×520 hero recommendation, fact/source/why regions, horizontal alternatives, bottom nav. |
| 16 | `16-map.png` | Full map shell, search/filter/date controls, event markers, quiet attractions, collapsed sheet. |
| 17 | `17-map-selected.png` | Selected marker with one halo and 240 px preview sheet with image, facts and route action. |
| 18 | `18-map-list.png` | List parity: compact 386×132 rows using the same candidate order as the map. |
| 19 | `19-filters.png` | Near-full filters sheet ordered date→category→price→language→distance→accessibility→attractions. |
| 20 | `20-event-detail.png` | Event hero and overlapping detail surface; source, why, unknowns; route and external action. |
| 21 | `21-place-detail.png` | Permanent-place detail: opening-hours status and contacts, never ticket/start-time semantics. |
| 24 | `24-route.png` | Network route: A/1/2/B, real-road polyline slot, 290 px reorder sheet and navigation action. |
| 25 | `25-route-estimated.png` | Routing fallback: dashed straight-line relation, estimate badge and external verification. |
| 26 | `26-plan-ready.png` | Operational timeline: travel→buffer→event→travel→remaining time, start-plan action. |
| 27 | `27-assistant-empty.png` | Empty assistant: three example requests and composer; no robot, sparkle or invented results. |
| 28 | `28-assistant-clarify.png` | One user message, concise assistant response, editable condition chips, two answer choices. |
| 29 | `29-assistant-results.png` | One large sourced inline entity plus two compact alternatives; map/route/source actions. |
| 32 | `32-profile-memory.png` | Local preference memory: interests, tried, languages, assistant memory, defaults, clear/delete. |
| 33 | `33-sources.png` | Provider/source rows with mode, checked-at, coverage and external-link controls. |
| 34 | `34-privacy-delete.png` | Local-storage controls, privacy toggles, separated danger zone and confirmation sheet. |
| 42 | `42-no-results.png` | Empty state with exact reason slot, one recommended relaxation and manual-map action. |
| 43 | `43-degraded-states.png` | Four state cards: offline snapshot, map unavailable, routing fallback, assistant unavailable. |

## Не генерировать отдельным PNG

- 01 Bootstrap — SVG/CSS.
- 06 и 07 — motion variants экрана 05.
- 15 uncertain bucket — компонентный variant ленты 14.
- Реальная карта, attribution, полилиния, адреса и маркеры пользователя — только
  runtime map component.

