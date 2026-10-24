# A1/A4 · Проверенные соответствия событий и OSM, волна 2 · 24.10.2026

Status: implemented and tested locally, not a deployment claim. Existing budgets unchanged; paid API calls zero. No Google/OpenAI/2ГИС key, geocoder, source index, global configuration, API handler, public-event-locations/runtime or Git history was changed by this agent.

## Actual coverage and why the earlier six became four

Read-only current production `/api/events` returned **15 events / four coordinate pairs**. Those four already include both Жастар theatre events fixed in the prior release, plus Harat's Grand Alatau and Uly Dala Fest. The earlier six-coordinate prediction also included two October-24 quizzes which subsequently left the current live selection. Comparing total counts across different selected events was not evidence that the Жастар fix failed.

The first replay of the **same current response** produced eight / fifteen mapped events. After the approved full-PBF omission check and root's tiny same-source `addr:place` supplement, the final actual public-response/local-code replay produced **twelve / fifteen** mapped events. Eight new correspondences cover Garage quiz #806, “Счастливые Поют”, two The Bus events, two gallery events, Piligrim and Energy. This is not a claim that the hosted release already contains the new code.

## Documentary evidence used, not guessed geocoding

1. [Publisher Garage quiz #806](https://sxodim.com/astana/event/kviz-pliz-806) gives Garage Music Bar and the complete Russian street/house. The approved cached OSM [node 1843876243](https://www.openstreetmap.org/node/1843876243) is named `Гараж`, has English `Music bar "Garage"`, and carries the same house on the independently observed KK street. The corresponding highway [way 24240238](https://www.openstreetmap.org/way/24240238) contains the RU/KK street names. A competing pharmacy node at house 6 is not selected by proximity: the reviewed business identity points to the exact restaurant/music-bar OSM node.
2. [Publisher theatre event](https://sxodim.com/astana/event/muzykalnyy-spektakl-schastlivye-poyut-v-astane), the [official theatre website](https://kaztheatre.kz/ru) and approved [OSM theatre building](https://www.openstreetmap.org/way/917348929) independently connect the abbreviated theatre name and house 8/1 with the full institutional name and complete KK street. The official website footer was read after its ordinary language redirect; no access check was bypassed.
3. [Publisher stand-up event](https://sxodim.com/astana/event/shou-komiki-reshayut-problemy-v-astane) and [publisher IntroVert event](https://sxodim.com/astana/event/solnyy-koncert-introvert-v-astane) give the two precise The Bus labels/addresses. The [official SMART business-centre site](https://bcsmart.kz/) identifies The BUS Music Pub as its tenant and gives the building's address. Its embedded public map position corroborates the approved [OSM building 508001056](https://www.openstreetmap.org/way/508001056) at the complete indexed street/house. The returned point is the existing OSM building centroid, not the website coordinate or a fabricated entrance.

Only a few public factual fields/links were manually recorded. No full website text, private account, cookie, browser OAuth, hidden endpoint or paid geocoder was used. The defuddle skill was read; its CLI was unavailable, so bounded public HTML reads and primary-page web reads were used without installing a global tool.

## Implementation boundary

New `src/server/ingestion/reviewed-event-venues.ts` contains eight exact documentary records with:

- canonical event URL;
- entire current publisher venue label and address;
- expected OSM ID/URL plus complete canonical source address and, for a POI, its observed name;
- primary evidence URLs;
- actual review time `2026-10-24T17:43:00Z` for the first four or `2026-10-24T17:53:00Z` for the four follow-ups, and the existing 35-day maximum-age rule enforced by the matcher.

No coordinates are copied into the review module. `event-geo-media.ts` resolves a record only when all three event fields match exactly after existing formatting normalization. A POI must be the unique current approved record with that source ID, source URL, complete address and observed name. A building correspondence must still resolve the exact canonical address in the current approved index and return the expected OSM URL, valid city coordinates, derived address method and unexpired source date. Missing/changed/ambiguous objects fail closed. Reviews are rejected before review time and after expiration. Existing OSM display permission/revocation gates remain owned by the shared public boundary; the module does not bypass them.

Results retain `quality: derived`, `osm-exact-venue-v1` and `precision: building_or_address_point`, plus the current OSM source/as-of. They are not “100% confirmed entrances”, organizer guarantees or automatically inferred permanent venue aliases. Another event URL, same-name branch, changed house or block does not inherit the correspondence.

## All eleven initially unmapped current events

| Publisher event / primary reference | Current address issue | This wave |
| --- | --- | --- |
| [Kinusaiga](https://sxodim.com/astana/event/tvorcheskaya-vstrecha-kinusaiga) | Самал 9 was omitted by the `addr:street`-only import, but exists as exact `addr:place` in approved full PBF | Resolved through scoped address review and root's same-source supplement, OSM way 158630926 |
| [«Исцеление»](https://sxodim.com/astana/event/kinoklub-iscelenie-1997g) | Same gallery/Самал 9 with separately observed publisher punctuation | Resolved by its separate URL/address review to the same source building |
| [Квиз #806](https://sxodim.com/astana/event/kviz-pliz-806) | House 6 has multiple address objects; business identity must distinguish Garage from pharmacy/building | Resolved to exact reviewed OSM music-bar node |
| [Кино/музыка изи #24](https://sxodim.com/astana/event/kviz-pliz-kino-i-muzyka-izi-24) | Harat's Europe City, Акмешит 1/3: no complete corresponding current index house record found | Unresolved; no first-branch choice |
| [Cancel culture](https://sxodim.com/astana/event/expert-talk-cancel-culture-kak-kultura-otmeny-vliyaet-na-biznes) | Publisher 53 block 32 versus observed `addr:housenumber=53к32`, `addr:unit=32` | Resolved to exact OSM way 549300995; modifier preserved, not dropped |
| [Qargyn](https://sxodim.com/astana/event/qargyn-o-yrmandar-klubyny-kezdesui-1) | Мәңгілік Ел 41/1 corresponds to two distant different OSM objects | Unresolved; not first/nearest |
| [Dizngo carnival](https://sxodim.com/astana/event/vecherinka-dizngo-carnival) | Самал 12 was also an `addr:place` omission, not absent from approved OSM | Resolved through exact building way 240391706 and separate publisher review |
| [«Комики решают проблемы»](https://sxodim.com/astana/event/shou-komiki-reshayut-problemy-v-astane) | Different publisher street spelling, no direct matching POI | Resolved through URL-scoped official tenant/building correspondence |
| [Ronins / Nirvana](https://sxodim.com/astana/event/tribyut-ot-the-ronins-nirvana-unplugged) | Harat's Akbulak, shortened Токпанов 10 versus observed full street; the expected branch identity is not independently proven in available catalog | Unresolved; no broad surname alias |
| [«Счастливые Поют»](https://sxodim.com/astana/event/muzykalnyy-spektakl-schastlivye-poyut-v-astane) | Abbreviated theatre and street labels | Resolved through official theatre and exact existing OSM building |
| [IntroVert](https://sxodim.com/astana/event/solnyy-koncert-introvert-v-astane) | The Bus Music Pub, another publisher street spelling | Resolved through the second separately URL-scoped tenant/building correspondence |

Three events intentionally remain unmapped after this wave: Europe City (no complete house 1/3 record found), Orta (two conflicting distant objects), and Harat's Akbulak (branch/abbreviated-street correspondence not independently proven). These need additional independently approved source evidence, not a wider fuzzy matcher.

## Approved full-PBF omission check

Read-only export used the already installed `qettyq-poi-extract:20261021` image with no network, a read-only source mount, dropped capabilities and no install/download. SHA-256 of `astana-261019-bbox-verified.osm.pbf` was independently verified as `a767ae4bb5b0d6bed68e2148f8960178403813a19661f37edea1973beeb8b342`.

- Way `158630926`: observed `addr:place=Микрорайон Самал`, `addr:housenumber=9`, residential building polygon.
- Way `240391706`: observed `addr:place=микрорайон Самал`, `addr:housenumber=12`, commercial building polygon.
- Way `549300995`: observed `addr:street=Қабанбай Батыр даңғылы`, `addr:housenumber=53к32`, `addr:unit=32`, building polygon; its point already existed in the original address index.

Root separately owns the tiny supplemental JSON/shared `publicAddressIndex` wiring. This agent added only the four exact URL/venue/address correspondences and updated focused tests to consume that shared index. No 2.8-MB base-index rewrite, new broad alias or fabricated fresh source date was made. Polygon centroids are computed by the existing importer and retain the original October-19 source cutoff and October-20 retrieval time, not the review time. Public publisher event JSON-LD for Piligrim has only an address and no GeoCoordinates; no unobserved publisher coordinate is claimed.

## Actual verification

```text
pnpm exec vitest run tests/unit/reviewed-event-venues.test.ts tests/unit/event-geo-media.test.ts tests/unit/event-address-normalization.test.ts tests/integration/event-address-index.test.ts --maxWorkers=2
Final with all eight reviews and shared same-source supplement: 60/60 PASS, four files, 12.92 s

pnpm exec eslint src/server/ingestion/event-geo-media.ts src/server/ingestion/reviewed-event-venues.ts tests/unit/reviewed-event-venues.test.ts
PASS

pnpm typecheck
PASS
```

New checks include all eight exact current source identities; changed URL/name/address/house/modifier/branch rejection; duplicate conflicting source ID rejection; changed observed source name/address; absent or different canonical address point; invalid/outside-city/expired/future points; dynamic source aging and pre-review-time rejection. Existing legacy reviewed Жастар/address tests remain green. Root is independently testing public API → source-permission boundary → ordered plan, including denied OSM and expired review behavior.
