# A8 · Localized card identity race · 2026-10-24

## Evidence

The en/360 full-flow failure did not involve a carousel auto-advance. The trace at `output/playwright/media-memory-r1-clean-20261024/qa-language-memory-localiz-bcaff-e-user-text-and-delete-gate-mobile-chromium-reduced-motion/trace.zip` records:

- `1-trace.trace` rows 359–363: `innerText` reads **Национальная академическая библиотека Республики Казахстан** from `article >> nth=0`.
- The Save action repeatedly waits because the transient notification intercepts pointer events.
- Row 439: **[Fast Refresh] rebuilding**, time 225112.623. Row 450: refresh completes, time 225229.856.
- During that interval, a bootstrap `/api/chat` response replaces the feed with theatre results, with unknown origin.
- Row 455: the originally resolved Save element detaches. Playwright retries the index-based locator and resolves the new first card. Details then opens the theatre while the test still expects the library's original title.

This proves a development HMR/feed replacement plus index-locator retargeting race; it does not prove who or what triggered the rebuild. No product auto-carousel timer was found in PilotApp. A clean full rerun must keep source frozen.

## Change

Only the localized block in `tests/e2e/qa-language-memory.spec.ts` was changed:

- Read the initial source title once, then bind the candidate article to that exact title within the personal-feed main.
- Require exactly one matching article.
- Await the transient notification's disappearance using an assertion, not an arbitrary delay or forced click.
- Save that exact article and require its matching Remove-from-saved button to be pressed, then reassert its unchanged title before Details.
- Preserve the original exact detail-heading check.

The test can no longer silently choose a different venue after a rerender. If the chosen identity actually disappears, it fails rather than weakening the expected title.

## Validation

- `pnpm exec eslint tests/e2e/qa-language-memory.spec.ts` — **PASS**.
- No browser/Next process was started by this agent; A0 has an active focused run and will perform the full frozen-source regression afterwards.
- No application code, shared configuration, global setting or unrelated test was modified.
