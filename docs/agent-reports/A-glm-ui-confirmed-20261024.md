# GLM UI findings: independent confirmation and narrow fixes

Date: 2026-10-24. Scope: B1, B4, B5 from the completed ZCode audit relayed by the orchestrator. No provider calls, keys, paid requests, public deployment, routing or memory changes by this agent.

## Confirmation

- B4 confirmed: `accessibleActions` used absolutely positioned 1 × 1 px buttons with `clip-path: inset(50%)`; they appeared only after keyboard focus. Swipe and keyboard handlers existed, but a pointer user had no explicit visible like/skip targets.
- B5 clarified, not a data bug: the profile displayed `likedTags.length` as “интересы”. The first culture card has two runtime tags (`culture`, `museum`), not one saved interest card. Two likes can legitimately create four distinct tags. The count must name categories, not imply a count of likes. No ranking or tag data changed.
- B1 not confirmed as a 286 × 382 original. `sips -g pixelWidth -g pixelHeight` reports the actual first runtime JPEG as 720 × 960; the existing category illustration master is 1086 × 1448. The manifest labels it synthetic category artwork, not a real venue photo. A `srcset` width descriptor and density-corrected `naturalWidth` can differ from the actual encoded pixel dimensions; the GLM report did not include an exact source URL. No guessed replacement, generative upscale, new image expense or claim of a confirmed 286 px original.

## Implemented

- Existing QETTYQ glass/green visual language preserved using its current palette, typography and CSS variables. No new design system or dependency.
- Explicit “Не сейчас” and “Интересно” buttons with icons, visible without hover/focus, minimum 44 px high, using the existing guarded `commit` handler. Buttons are disabled during commit. Undo, skip-onboarding, swipe gestures and keyboard interaction remain separate and unchanged.
- Reading area raised to avoid the new controls; short-height rules preserve that separation.
- Profile now explicitly says “Категорий в предпочтениях: N”, with Kazakh and English equivalents. This is a taxonomy count, not a like counter.

## Files

- `src/components/PilotApp.tsx`
- `src/components/PilotApp.module.css`
- `src/components/preference-category-summary.ts`
- `tests/unit/preference-category-summary.test.ts`
- `tests/e2e/glm-confirmed-ui.spec.ts`

## Verification

- `pnpm exec vitest run tests/unit/preference-category-summary.test.ts`: 3/3 passed, 151 ms. All three interface languages.
- `pnpm exec playwright test tests/e2e/glm-confirmed-ui.spec.ts --workers=1`: initial four viewport action tests passed. Adding the profile case initially expected four tags from one card; source and rendered profile proved two (`culture`, `museum`), so the fixture expectation was corrected, not product behavior. The five-case rerun passed in 12.8 seconds. Final expanded matrix result recorded below after completion.
- Screenshots at 390 × 844 and 1280 × 720 opened and visually inspected: text, action row and undo/continue row do not overlap; no horizontal overflow.
- Final expanded E2E matrix: **6/6 passed in 12.3 seconds**, including 360 × 600 short viewport; profile shows exactly two categories after one culture-card like. Scoped ESLint on both TS component files and both new test files passed.
- API/provider failure guards are synthetic/offline. These checks do not assert source availability, live Google/2GIS behavior or physical iPhone behavior.

## Skills and references

Read `frontend-design`, `design-intelligence` and its `references/ui-systems.md`; their preservation-first rule kept changes small and compatible with the existing interface. Read the installed Next image optimization guide before evaluating B1. The Windows-only `C:\Users\boostseller\.codex\DESIGN_ARSENAL.md` is not present in this macOS workspace; no replacement source bank or external component was fetched/copied. Playwright repository checks used the existing test framework and offline guards; no global installation.

## Remaining

- B1 needs exact asset/network evidence if still visibly soft. Existing higher-resolution original masters are available for a separate legitimate runtime export, not artificial upscaling. Such a change is not necessary to prove B4/B5 fixed.
- B6 public navigation was subsequently delegated by the orchestrator and implemented below.
- No Git commit/deploy by this subagent. Orchestrator owns final integration and broad regression.

## B6 follow-up: public navigation

The orchestrator provided `src/client/public-navigation.ts` and its pure parsing/privacy tests. UI integration adds `src/components/use-public-navigation.ts`, uses the existing browser History API, and does not introduce another router or modify Next configuration. The installed Next linking/navigation guide explicitly documents native History API support.

- Public hashes cover `feed`, `chat`, `map`, `profile`, `saved`, `settings`, onboarding screens and encoded public place/event IDs.
- Initial URL processing waits for the existing catalogue and, for events, the existing feed. The language gate leaves the requested hash untouched until selection. A separate pending/expected hash avoids stale initial-screen effects overwriting a deep link.
- Browser Back/Forward and manual hash changes select the existing catalogue/feed object, not an arbitrary fetch URL. Unknown IDs and malformed routes give an honest notice and normalize to the feed rather than rendering empty details.
- UI navigation explicitly cancels a still-loading initial link; a late feed cannot override the user's new screen.
- URL contains no plan, draft, coordinates, preferences, budget, conversation or exact location. Query parameters are not copied into new entries. Deletion resets the route to welcome before the language gate reopens.
- Both new static accessibility/notice strings have Kazakh and English translations in the existing dictionary. Category-count copy has explicit RU/KK/EN variants. No i18n assertions were weakened.
- Optional OS-share/clipboard button was not added; the public place/event URL itself is shareable. There is no claim that a private route plan is shareable or restored.

Additional files: `src/components/use-public-navigation.ts`, `src/client/i18n-dictionary.ts`, `tests/e2e/public-navigation.spec.ts`; root owns the public-navigation helper/unit file. `LiveEvents.tsx` unchanged.

Checks before final expanded pending-cancellation assertion: **11/11 combined UI/navigation E2E passed in 18.8 seconds**. Final rerun result appended after completion. Event fixtures are explicitly synthetic; the known-place reload uses the existing local catalogue API. No paid provider calls.

Further results: i18n coverage, public-route parser and category-summary unit tests **17/17 passed in 616 ms**. The pending-navigation assertion initially used `goto` with the exact current URL, which need not reload a document; it was corrected to `reload` to exercise a new mount with blocked feed. Public navigation then passed **5/5 in 22.5 seconds**, including late-feed cancellation. The hook also guards queued work with a revision token so a newer URL/UI action cannot be overwritten by an older queued request. No test assertions were removed.

Final frozen-hook rerun: `pnpm exec playwright test tests/e2e/public-navigation.spec.ts --workers=1` **5/5 passed in 11.6 seconds**. Scoped ESLint passed after the final revision-token change; TypeScript `pnpm exec tsc --noEmit` passed during integration.
