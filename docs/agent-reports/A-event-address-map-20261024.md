# A1/A4 · Адрес события → производная точка · 24.10.2026

Status: narrow offline matcher fix implemented and tested. Root owns unified API/runtime/UI/plan integration, publication and route behavior. No key, paid geocoder, Google/OpenAI/2ГИС call, database schema, source index edit or deployment was performed here.

## Confirmed production gap

A read-only public `https://qettyqapp.anamai.kz/api/events` check initially returned 16 events with four coordinate pairs. A later check returned 15 events with the same four pairs; the changing count is an actual live-source snapshot change, not a test-fixture guarantee. The helper replay of that later public response produced **six** pairs, adding two independently indexed Жастар theatre events.

The confirmed defect is a mechanical notation mismatch. Current publisher addresses use `Жастар театры, Ілияс Есенберлин көш., 10`; the existing approved OSM index contains the complete street `Ілияс Есенберлин көшесі`, house `10`, source `https://www.openstreetmap.org/way/30014040`. The old normalizer removed `көшесі` but did not understand `көш.`. The old reviewed event-venue association was scoped to an older publisher address string, so it correctly did not silently approve a different string. No missing coordinates needed to be invented: the current source record already contains them.

Another index record has observed `addr:street` content `Қалибек Қуанышбаев көшесі;​улица Калибек Куанышбаев` and house `8/1`, source `https://www.openstreetmap.org/way/917348929`. Treating the two observed multilingual labels as one synthetic concatenated street prevented matching either complete label.

## Implemented safe change

`src/server/ingestion/address-match.ts` now:

- removes zero-width formatting characters from observed index labels as well as publisher address segments;
- recognizes bounded whole-token street-type variants `көш.`, `көш`, `көшесі`, `к.` and `даңғ.`, `даңғ`, `даңғылы`, alongside the existing RU/EN forms;
- splits observed semicolon-separated `addr:street` labels into the separately observed **whole** names;
- keeps personal names, inflections, exact house suffix/slash/decimal and building modifiers intact. No surname-only matching, transliteration, edit-distance, nearest-building choice or universal geocoder was added.

The result remains `quality: derived`, method `osm-exact-address-v1`, precision `building_or_address_point`, with the actual OSM source URL/as-of. It is an address/building point, not an organizer-confirmed entrance or a guarantee that a visitor can enter at that coordinate. The original event name/date/price/address remain untouched; event enrichment keeps the existing entrance-uncertainty warning.

No `event-geo-media.ts` semantics or stored index records were changed. Nearby point/centroid records remain ambiguous without a proven same-building relation. A single exact address source is sufficient for the two new Жастар markers; no “only theatre in Astana” inference is used.

## Unresolved records are deliberate, not filled with guesses

- `Мәңгілік Ел ... 41/1` has two distant different OSM objects in the index. Orta therefore remains unresolved rather than choosing the first point.
- Publisher `Кравцова`, `Габдуллина`, `Токпанов` are shortened or inflected labels, whereas the approved index observes full names. Cached approved OSM highway features were inspected: ways `24240238`, `109724996`, `165938230` contain their full `name`/`name:ru`/`name:en`, but no independently observed `short_name`/`alt_name` proving the exact publisher strings. No alias was added on assumption.
- The Bus publisher spellings differ from the observed `Коргалжинское шоссе` / `Қорғалжын тас жолы`. They were not merged by spelling similarity.
- Piligrim `мкр. Самал, 12` has no complete corresponding address row in the available index. Өnergy includes `блок 32`, which must not be silently reduced to the overall house 53. The current shortened Куанышбаев publisher address is not proven merely by the theatre being famous.

These may be resolved later by a bounded independently reviewed source association or an explicitly permitted geocoder, without weakening the complete-address checks.

## Actual verification

```text
pnpm exec vitest run tests/unit/event-address-normalization.test.ts tests/integration/event-address-index.test.ts tests/unit/address-match.test.ts tests/unit/event-geo-media.test.ts --maxWorkers=2
45/45 PASS, 4 files, 1.51 s

pnpm exec eslint src/server/ingestion/address-match.ts tests/unit/event-address-normalization.test.ts tests/integration/event-address-index.test.ts
PASS
```

The two new files exercise synthetic notation fixtures plus the actual dated OSM index: mechanical KK notation, complete semicolon labels, zero-width cleanup, preserved house modifiers, missing given names, nonobserved inflections, no point/building merge without proof, current Жастар source identity, distant Orta ambiguity, unresolved publisher addresses, enrichment provenance and age expiry. Composed event fixtures are explicitly synthetic; real source-coordinate values are read from the existing index rather than duplicated as claimed external observations.

The additional read-only production replay used the real current public response and local matcher: **15 current events / four existing coordinate pairs / six pairs after offline replay**. The only newly derived points were the two Жастар events, each with OSM way `30014040` and building/address-point precision. No claim is made that production was already redeployed with this fix, that all events now have markers, or that a computed road route was tested by this agent.
