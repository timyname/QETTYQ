# Compact route plan — 2026-10-21

Implemented by the compact-plan subagent. Scope: `RoutePlan.tsx`, its CSS module, two client helpers, and helper tests. No paid requests, deploy, root configs, map-provider migration, or background location tracking.

## Interaction

- Existing jade/pearl/lemon glass language preserved using design-intelligence and frontend-design guidance: map is the primary surface; a 56 px round plan button is bottom-right above navigation.
- Plan starts collapsed. Tapping opens a bottom sheet from the navigation area; close icon returns to the circle. Sheet is capped at 44% portrait height (52% on wider screens); stop list scrolls independently while navigation CTA remains visible.
- Stops appear first. Date/time, budget, provider details, street-route calculation, sharing and condition editing are in the “Время и параметры” disclosure.
- Every interactive icon keeps at least 44 px tap area. Motion honors reduced-motion preference. Unknown duration is explicitly shown, not substituted with 90 minutes.
- Existing user-controlled route calculation permission defaults on per owner request; it is editable inside details. No automatic routing POST was added. Provider attribution and estimation labels remain visible; legal attribution was not removed.

## Ordering contract

`onReorder?: (ids: string[]) => void` sends the complete reordered stop IDs to the parent; parent must call its existing deterministic plan builder, so time, distance, budget and feasibility recalculate. Component does not invent new leg durations locally.

Hold the dedicated drag handle for 320 ms and move vertically to another stop; releasing submits one move. Pointer cancel/lost capture clears the gesture. Up/down buttons provide equivalent accessible actions. Busy state blocks edits. Helper preserves IDs and rejects invalid/duplicate moves without mutating input.

`onStartNavigation?: () => void` is invoked on explicit external navigation. It does not itself claim a visit occurred.

## 2GIS navigation

Only one default “Начать маршрут” CTA remains. It uses the official HTTPS `directions/tab/pedestrian/points/` format with longitude/latitude, optional origin, all ordered stops, and optional explicit return destination. No API key is required or exposed. HTTPS permits the installed app or web fallback.

Primary documentation checked 2026-10-21: [2GIS developer deeplinks](https://help.2gis.ru/question/razrabotchikam-zapusk-ideystviya-vmobilnom-prilozhenii-cherez-deeplink). It explicitly documents intermediate waypoints for Android. iPhone preservation of every waypoint is not guaranteed; a short caveat remains in the details disclosure. No paid 2GIS API capability is claimed from possession of a demo key.

## Verification

- `pnpm exec vitest run tests/unit/compact-route-plan.test.ts`: 6/6 passed. Covers three ordered stops, unknown origin, explicit return, coordinate rejection, immutable reorder, invalid/no-op/duplicate moves.
- `pnpm exec eslint src/components/RoutePlan.tsx src/client/2gis-navigation.ts src/client/reorder-route-stops.ts tests/unit/compact-route-plan.test.ts`: passed, no output.
- Initial full `pnpm typecheck` encountered concurrent event-duration and ingestion changes, including the old `arrivalLabels(number[])` signature while root was upgrading nullable duration support. This is not reported as a full-project pass. Root must rerun after integration.
- Browser/physical-device geometry verification is pending integration QA. No screenshot or physical iPhone claim is made by this report.
