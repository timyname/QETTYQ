# A3/A6 · Automatic multi-stop route follow-up · 2026-10-21

Implementation is complete and frozen for the orchestrator's integrated run. Baseline: the previous v11 route/UI release. No live routing, Google, OpenAI or paid provider calls were made by this agent.

## Implemented

- `RoutePlan.tsx` now starts one automatic pedestrian calculation when origin, default/retained calculation consent and an available routing status are ready and the parent plan is not busy. An attempted-signature set keys on provider plus ordered coordinates, preventing pending/failure/render/expand/consent-toggle retry loops. Explicit manual retry remains possible. The existing one-time 401 authentication renewal is retained; it is not a provider-failure retry.
- Automatic work is scheduled in a cancellable microtask; unmount, coordinate changes or consent withdrawal abort the in-flight request. Existing response validation rejects non-foot profiles and malformed geometry/legs. Geometry remains bound to its exact ordered coordinate signature, never reused for a different order.
- Up/down stop controls now live in the main timeline, not hidden parameters. The 320ms hold gesture, compact-sheet edge autoscroll, remove action and server-backed `onReorder` remain intact. Duplicate controls were removed from hidden details so accessible names remain unique.
- Each visible stop separately shows its walking leg (`A → B`, `B → C`, etc.) and visit duration. Street estimates and straight-line fallback are labelled differently. Unknown origin/visit duration is not invented. An explicit destination/return leg is shown with street or available estimated duration, otherwise unknown. Stop marker letters now follow the same sequence.
- Explicit `constraintViolations` are supported. A stale straight-line time-only failure no longer leaves an obsolete warning after street time fits; a confirmed budget violation and current negative remaining time still warn. Legacy plans without the field retain their previous infeasible warning.
- Share callback now receives the actual displayed total (nullable), allowing A0's share implementation to use current route time rather than the obsolete server estimate.
- Added Kazakh/English translations for the new standalone street/straight-line qualifiers.

## Tests updated

`tests/e2e/route-start-flow.spec.ts` now has seven focused mocked scenarios. Its multi-stop regression adds three catalogue places, presses Evaluate on the third, asserts all three plan IDs, then uses the visible down button and asserts the second street request contains the new ordered coordinates. The plan fixture maps requested IDs in their supplied order, never catalogue `filter` order. Synthetic leg metrics sum to their route totals.

Provider failure/disabled and unknown-origin cases retain no-fake-route assertions. A successful street route with an unknown visit duration retains an unknown total. The seventh scenario checks removal of a superseded time-only violation when streets fit.

Legacy updates: `street-routing.spec.ts`, `compact-route-location.spec.ts`, `iphone-glass-media.spec.ts`, `qa-language-memory.spec.ts`.

- Manual-calculation expectations now wait for automatic geometry/source.
- Explicit opt-out/re-enable/manual retry and one pre-provider authentication renewal remain tested.
- GPS/manual-origin and additional-stop invalidation tests pause the new synthetic routing response, assert the old geometry/source is absent while pending, then release and verify the new result. They do not weaken invalidation into a timing race.

## Executed commands and limits

Bundled Node/pnpm PATH:

- Intermediate focused automatic route regression: `PORT=3039 pnpm exec playwright test tests/e2e/route-start-flow.spec.ts --workers=1 --output=output/playwright/auto-route-focus --reporter=line` — **6/6 PASS**, 10 seconds. This was before adding the seventh obsolete-time-warning case and final timing callback/type edits; those require the orchestrator's full run.
- Final scoped ESLint over owned route source, translations and five affected route specs — **PASS**.
- Final `pnpm typecheck` — **PASS**.
- A0 requested exclusive ownership of the final Next/Playwright run. This agent's test-managed server stopped; no second Next instance or build was started afterwards.

The focused browser tests intercept all local APIs and abort non-local traffic. They prove UI/provider wiring with synthetic geometry, not live routing or physical iPhone behavior. A0 owns singular Evaluate entrypoint fixes in PilotApp, server constraint fields, share integration, full regression, immutable build and publication.
