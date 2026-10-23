# A8 · Real publisher-photo browser regression · 2026-10-24

## Implemented and browser-tested

Owned files only:

- `tests/e2e/real-publisher-photos.spec.ts` — five scenarios.
- This report.

The fixture binds the actual bundled `«Мама!» спектаклі` occurrence on **29 October 2026, 13:00 UTC**, exact publisher event URL `https://sxodim.com/astana/event/mama-spektakli`, and its approved `data/publisher-event-media.json` record. It calls the production publisher-media resolver with the fixed browser-test instant **24 October 2026, 07:00 UTC**.

Four viewport scenarios — **360×800, 390×844, 430×932 and 1440×900** — inspect feed and detail. Assertions cover:

- Real decoded natural dimensions match the manifest (1522×570).
- The image uses the local gated media path, returns actual JPEG bytes whose SHA-256 matches the manifest, and responds with `no-store`.
- `object-fit: contain`; complete source event titles have no element-level vertical/horizontal clipping; no document horizontal overflow.
- Exact publisher credit and original event-source link remain in both contexts.
- Publisher/local-gated photos are not requested through the Next image optimizer; no attempted publisher, Google or OpenAI request occurs.

A fifth scenario changes only the fixture's asset identifier to an unknown SHA, exercises the **real local handler's 404**, and requires an honest placeholder while event facts, detail navigation and publisher/source credit remain accessible.

## Data and network boundaries

`/api/media/events/<sha>` requests deliberately use `route.continue()` and reach the **real application handler**. No JPEG is fabricated, fulfilled from a one-pixel image or fetched live from a publisher. The known approved cache file exists locally and is 82,124 bytes.

All other `/api/*` endpoints are explicitly mocked or fail closed with a QA-only 503. All non-local browser traffic is aborted. Event/feed API delivery is an explicit **snapshot fixture**, not evidence of current event availability, live ingestion, pricing, AI quality or paid provider integration. Browser time is fixed; the server handler still enforces its real current rights expiry, so an expired/revoked manifest cannot silently pass the positive image check.

## Executed checks

With bundled Node/pnpm PATH:

- `pnpm exec eslint tests/e2e/real-publisher-photos.spec.ts` — **PASS**.
- `pnpm typecheck` — **PASS**.

After A0 coordinated exclusive port 3039:

- `PORT=3039 pnpm exec playwright test tests/e2e/real-publisher-photos.spec.ts --workers=1 --output=output/playwright/real-publisher-photos-results --reporter=line` — **5/5 PASS**, 14.8 seconds.
- A0's first run found four strict-src assertion mismatches: Next 16 emitted an absolute same-origin image URL instead of a relative path. The test now canonicalizes both URLs, requires exact full href equality and independently requires the application origin; no external-host allowance was added. The real 404 scenario already passed.
- Opened and visually inspected `output/playwright/real-publisher-photos/feed-390.png`, `detail-390.png` and `real-handler-404.png`. The real publisher poster is decoded in feed/detail with contain fitting; the failed asset shows the honest placeholder. A subsequent screenshot-position-only improvement scrolls the feed card fully into view before saving its proof; all image/source/handler assertions are unchanged.
- Final rerun including that screenshot positioning: **5/5 PASS**, 11.2 seconds; improved feed proof opened and visually inspected again.

No build, paid call, credential operation, shared/root configuration edit or source component change was made here. Only the coordinated test-managed Next server was used.

Playwright skill instructions were read; the explicitly assigned deliverable is a repository test file, so the existing `@playwright/test` workflow is used rather than introducing a CLI dependency or changing the project's browser tooling.
