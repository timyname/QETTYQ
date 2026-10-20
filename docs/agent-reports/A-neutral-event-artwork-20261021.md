# Event and place artwork correction — 2026-10-21

Scope: `LiveEvents.tsx`, `CatalogPhoto.tsx`, `event-artwork.module.css`, additive neutral fallback styles in `place-photo.module.css`.

- Removed all generated/category-image fallbacks from event preview, carousel and event detail. `eventImage()` now returns only an `organizer_poster` from the reviewed `/assets/event-posters/` local path allowlist, otherwise `null`. Remote, traversal, query-string and arbitrary category assets are not rendered.
- Missing or failed event artwork is a simple jade calendar/category panel, not a substitute photograph. Empty carousel artwork is 88 px, empty detail hero is content-sized, rather than the old photo-sized region. Approved posters retain visible organizer credit and contain-fit.
- Catalog places render only an existing licensed `real_place_photo`, otherwise a neutral map-pin/category panel. The compatibility `fallback` prop is no longer rendered; no synthetic place photo is substituted. Visible text says “Фото пока нет”. Failed real photos also switch to the neutral state.
- “О событии” remains an internal `onOpen` button, with a directional icon rather than browser-link icon.
- `EventDetail` supports `onAddToPlan` and `onBuildPlan`: “В мой план” and “Оценить путь” appear only when validated known coordinates produce a navigation destination. Root owns the parent wiring and plan API.
- Optional external route uses the shared official 2GIS pedestrian HTTPS helper. Source booking/details remain secondary links. Unknown event location does not show route actions or invent coordinates.
- Existing attribution, coordinate provenance and unknown-duration disclosures remain. No new posters were downloaded or copyright permission inferred from public URLs.

Verification:

1. `pnpm exec eslint src/components/LiveEvents.tsx src/components/CatalogPhoto.tsx` — passed, no output.
2. `pnpm typecheck` — passed after parallel event-duration integration.

No deployment, paid provider call or physical-device validation was performed by this subagent. Integrated carousel/detail screenshots and licensing-media fixture QA remain root acceptance work.
