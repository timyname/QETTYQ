# A6 · Afisha media layout · 2026-10-24

Status: implemented and tested locally; not a deployment report.

## Scope and design

Preserve the existing QETTYQ dark-green event cards, lime action and glass navigation. Normalize media geometry rather than redesign the feed. Used `frontend-design` and `design-intelligence` (existing-product preservation), plus the local Next CSS and Image guides. PRD sections 1, 5, 11 and 14 were read explicitly. No third-party assets, dependencies or copied UI were added.

Previously the event artwork CSS reserved a fixed 220 px for real images but only 88 px for missing images, while the rail aligned cards at their top edge. There was no explicit min-width boundary on event cards/body. Thus mixed media and title lengths had inconsistent geometry; the reported phone drift itself was not independently reproduced on a physical iPhone.

The event rail now uses one snap viewport per card, with `min-width:0`/`max-width:100%`. The media standard is responsive **16:10**, independent of natural image dimensions, missing media or failed requests. `object-fit:contain` preserves complete publisher posters instead of cropping their text; dark letterboxing is intentional. Cards stretch to a consistent rail height; titles/credit wrap within the card. Source credit and detail action remain visible. This standard concerns the event rail only; venue photos and event detail heroes retain their established layouts.

## Changed files

- `src/components/event-artwork.module.css`
- `tests/e2e/afisha-media-sizing.spec.ts`
- This report.

No root page/layout, common schemas, config, dependencies or lockfiles were edited.

## Actual checks

- `pnpm exec playwright test tests/e2e/afisha-media-sizing.spec.ts --workers=1`: 3/3 passed, 14.6 s (initial regression).
- `pnpm exec playwright test tests/e2e/afisha-media-sizing.spec.ts tests/e2e/live-events.spec.ts --workers=1`: **5/5 passed, 24.6 s**, after strengthening image-load checks.
- `pnpm exec eslint tests/e2e/afisha-media-sizing.spec.ts`: passed.
- `git diff --check -- src/components/event-artwork.module.css tests/e2e/afisha-media-sizing.spec.ts`: passed.

New regression covers mobile widths 360, 390 and 430 px; synthetic 4000×100 landscape and 100×4000 portrait images, an HTTP 404, missing artwork and a long unbroken title. It asserts actual natural image width, contain behavior, exact rail/card width, 16:10 slot, equal card/frame heights, snap alignment after each navigation action, visible credit/action and no document horizontal overflow. The two existing event tests additionally cover filtering, saving, detail credit and map selection/routing with unknown duration.

Screenshots are synthetic QA evidence, not real event content: `output/playwright/afisha-media-sizing-{360,390,430}-{0,1,2,3}.png`. The 390 px landscape and portrait screenshots were opened and visually inspected: consistent frame/card edges and actions, long title clamped without pushing the rail. No physical device, production CSS build or deployment was performed by this agent. Native keyboard/safe-area issues are outside this narrow fix.
