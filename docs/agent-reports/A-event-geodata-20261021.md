# Event geography and publisher media — 21 October 2026

Scope: offline event→venue linking, existing VPS enrichment wiring, independent rights check. No paid provider call, poster download, email, public deployment or global configuration change was performed by this subtask.

## Observed production inventory

One ordinary GET of `https://qettyqapp.anamai.kz/api/events` returned 16 upcoming events, with publisher `fetchedAt=2026-10-20T22:20:27.072Z`. Six had coordinate pairs; ten did not. This is a dated response, not complete city coverage or a newly crawled independent source snapshot.

The two Жастар theatre performances carried the address `Астана қаласы, Жастар театры, к. Илияс Есенберлина, 10` but no coordinates. The independent OSM baseline already contains Жастар театры at `Ілияс Есенберлин көшесі, 10`, object [way/30014040](https://www.openstreetmap.org/way/30014040), coordinates 51.1905938, 71.4057965. Source baseline was retrieved 20 October; the building position is derived, not an organizer-confirmed entrance.

The publisher event pages linked by that production response are [Мама](https://sxodim.com/astana/event/mama-spektakli) and [Өліара](https://sxodim.com/astana/event/liara-spektakli). Their exact publisher address and named OSM building/house correspondence were reviewed together. This is not a global spelling/transliteration rule, and not a claim of “100% accuracy”.

## Implemented

- `event-geo-media.ts`: pure offline `createEventVenueMatcher()`. A unique exact observed venue name/translation or whole comma-delimited address segment is required. Famous/unique-sounding categories alone never establish an identity.
- Explicit street addresses must resolve to the same point independently, or pass a bounded, source-page-specific reviewed correspondence. Only the two reviewed Жастар event URLs and their exact current address qualify for that narrow exception; changing house, venue record address or source URL removes it.
- Same-name branches, multiple exact venue candidates, unknown/conflicting addresses, out-of-city records, mismatched OSM IDs/URLs, future/stale timestamps fail closed. Source and reviewed correspondence expire after 35 days; the running matcher rechecks age without restart.
- No network, LLM, Google data or personal location enters this matcher. No synthetic address is written into an event. Source event facts and source cache remain unchanged; enriched copies carry `coordinateQuality=derived`, OSM URL/time and `method=osm-exact-venue-v1`.
- `enrichEventAddresses()` tries the existing exact-address matcher first, then the exact venue matcher. Any publisher-provided coordinate or half-known pair is preserved, not silently repaired.
- VPS runtime invokes the matcher against its existing licensed OSM baseline. Shared type widening and runtime wiring were explicitly authorized by the root orchestrator.

Real dated bundled snapshot regression: 7 events, initially 0 coordinate pairs → existing address resolution contributes 1, exact reviewed Жастар matches contribute 2 → 3 coordinate pairs. For the observed production inventory, the expected incremental gain is 6→8/16 if that same response remains current. This expectation is **not** a deployed result.

The existing baseline's exact `Театр кукол` and `Столичный Цирк` names can resolve an address-free event when it explicitly names that venue. An invented alias such as generic `Цирк` does not. Their missing public addresses are not fabricated.

## Why some addresses remain unresolved

- HAS SANAT explicitly says house **14-Д**. The current index contains ambiguous house **14**, not the requested suffix. Substituting 14 is not safe.
- Garage gives Кравцова 6; the index has three distinct coordinate records at the full observed street/house. It remains ambiguous even though points are near each other.
- Other street-name variants, absent venues and explicit building/block identifiers need source-backed resolution/review. Presence of a readable address is useful evidence, not an automatic guarantee of a geocoded entrance.

## Sxodim photographs/posters

The [current publisher terms](https://sxodim.com/polzovatelskoe-soglashenie) were reread on 20 October 2026 UTC / 21 October locally. The opening permission still allows noncommercial reuse with author credit and links. This does not independently identify the rights holder/grant of every third-party poster. Project policy therefore remains item-level fail-closed: no downloaded or hotlinked Sxodim posters until an applicable grant/ownership review is recorded. This is a conservative project decision, not a legal assertion that all publisher images are forbidden.

`approvedOrganizerMedia` is still empty. Previously sent outreach is not a received permission. Existing image-candidate discovery can record URLs from already obtained Event JSON-LD, without another image request; an image URL is not a grant. Existing approved local-poster resolver is ready once actual scope, expiry/revocation, attribution, checked raster MIME/dimensions and SHA-256 are supplied. Public API must not expose administrative grant references.

By explicit root delegation, `resolveEventMedia()` now accepts `allowCategoryIllustration:false`; the public events API always uses it. Valid approved organizer posters remain eligible, but unapproved events return `kind:none, src:null`, not generated category art. Internal default illustration behavior remains available for genuinely illustrative contexts and its legacy resolver tests. Two old API expectations were updated to the new explicit no-art contract without removing their null-image, source-credit, raw-cache and freshness assertions. Root owns the neutral no-image event UI. No new poster grant or real-image coverage is claimed here.

## Verification

Executed with the bundled Node runtime on PATH:

```sh
node_modules/.bin/vitest run tests/unit/event-geo-media.test.ts tests/unit/address-match.test.ts tests/unit/live-events.test.ts
node_modules/.bin/eslint src/server/ingestion/event-geo-media.ts src/server/ingestion/address-match.ts src/server/ingestion/sxodim-live.ts src/server/vps/runtime.ts tests/unit/event-geo-media.test.ts
node_modules/.bin/tsc --noEmit --pretty false
```

Final combined geo/address/live-events run: **73/73 PASS**, three files. Scoped ESLint: **PASS**. Initial whole-project TypeScript check encountered a concurrent `RoutePlan.tsx:144` unclosed `<details>` edit; reported to root, unrelated code was not altered. A later check exposed optional translation typing in this subtask, now corrected by explicit string filtering; concurrent root route/test typing remained in progress. Final coordinated typecheck/build/public map-route verification belongs to root after UI freeze. Synthetic tests are explicitly labeled; the dated baseline regression is separately labeled as real snapshot data.
