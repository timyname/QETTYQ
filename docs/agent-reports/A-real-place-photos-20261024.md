# A8 · Real restaurant-photo regression · 2026-10-24

Owned files: `tests/e2e/real-place-photos.spec.ts` and this report. No application, registry, cache, API-handler or configuration file was changed.

## Four focused cases, ready for the coordinated browser run

The actual catalogue objects are selected through `pilotPlaces` and `publicPlace` for:

- **RIBAMBELLE**, `osm:node:12041597269`, exact reviewed source `https://sxodim.com/astana/place/ribambelle`.
- **Саксаул**, `osm:node:4953253121`, exact reviewed source `https://sxodim.com/astana/place/restoran-saksaul`.

Each venue is tested at **390×844** and **430×932**, four browser cases total. The last case additionally exercises the unknown-SHA 404 path in both feed and detail.

Checks require:

- Catalogue media resolves to `publisher_place_photo`; the real feed card has `data-photo-state="real"`.
- Actual private `/api/media/places/<sha>` handler returns a JPEG whose SHA matches the reviewed manifest; status 200, `no-store`, and decoded natural width/height match the actual file (1522×570).
- Image source stays exactly same-origin with the expected gated path, not a publisher URL or optimizer URL.
- Real venue titles, visible image and exact photo-source/terms links are retained in feed and detail.
- Unknown photographer is not attributed as an author: publisher details must say **Источник фото**, not **Автор фото**.
- A real-handler 404 produces an honest no-photo placeholder while keeping venue name, detail navigation and source credit accessible. No fake image bytes are supplied.
- No horizontal viewport overflow, Next optimizer request for publisher assets or attempted external request.

## Boundaries

The catalogue and recommendation delivery are **mocked snapshot fixtures**, not live restaurant availability, live recommendations or new venue/rights verification. The photos and their gated handler are real checked-in reviewed data. Only media requests use `route.continue`; every other API is mocked or fails closed, and every non-local request is aborted. No model/Google/ingestion/provider key or paid call is used.

Browser time is fixed at 24 October 2026. The actual handler retains its current-time expiry/rights/hash checks. Existing publisher identity and noncommercial permission are taken from the reviewed manifest, not fabricated by the fixture; the tests do not assert photographer identity or that a 2023 interior photo depicts today's furnishings.

## Executed commands

With bundled Node/pnpm PATH:

- `pnpm exec eslint tests/e2e/real-place-photos.spec.ts` — **PASS**.
- `pnpm typecheck` — **PASS**.

Browser execution is pending A0 coordination of a single Next server on port 3039. This agent has not started Next or Playwright for this assignment. Screenshot paths are prepared under `output/playwright/real-place-photos/` but are not claimed as produced or inspected yet.
