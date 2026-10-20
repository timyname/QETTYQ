# Source/storage expansion — reviewed 2026-10-20 UTC

## Actual evidence and boundary

[Sxodim terms](https://sxodim.com/polzovatelskoe-soglashenie) were reread on
2026-10-20 UTC: the opening permission permits noncommercial reuse with author
credit and links. It does not state a guaranteed automated-request quota.
[robots.txt](https://sxodim.com/robots.txt) returned actual HTTP200 at
`2026-10-20T18:59:23.066Z`, 24 bytes: wildcard user-agent and empty Disallow.
This is not a commercial/media license or permission to circumvent restrictions.
The preferred content-extraction CLI was unavailable; official page reader and
one direct bounded robots GET were used. No retries, authentication or bypass.

No live detail-page crawl was performed by this subtask. Existing bundled source
coverage remains **7 occurrences from 8 requested detail pages**, one rejected.
At the check, `data/places.json` still contained **80 POIs, 0 opening_hours tags**,
fetched 2026-10-19. Root's first new Overpass request returned502 and preserved
that snapshot; root owns any subsequent permitted retry and its actual counts.

## Implemented source budget, not a coverage claim

- Existing fixed `/astana` index only; no pagination or new donors.
- Detail cap **24 sequential same-origin public Event pages**, maximum **50
  normalized occurrences**. At most 27 GETs per refresh including robots,
  terms and index. Runtime still uses one shared durable hourly attempt lease
  and existing single-flight cache.
- Coverage reports **actual requested detail pages**, not the number initially
  selected. Reaching the occurrence bound stops further detail requests.
- Every refresh still checks current robots/terms; policy mismatch fails closed.
  A detail403 or429 aborts the refresh without retry/alternate host. Last-good
  snapshot fallback retains its expiry/data mode through the existing service.
- No event photographs copied/downloaded; unknown rights remain denied. No GPS
  guessing, address-geocoding, login harvesting, or inferred schedules/languages.
- `data/event-source-candidates.json` records this narrow reviewed operational
  budget and mandatory visible credit. Commercial use, broader crawling or
  separate poster rights need their own agreement/review.

## Durable OSM hours

`events-store.importPlaces` now passes only the actual optional `openingHours`
field through the existing conservative `parseWeeklyHours` subset. Parsed slots
and explicit/implicit closed weekdays are stored as source-backed weekly facts.
Missing metadata stays unknown; unsupported holiday/date/solar expressions create
unknown facts, not open ones. Provenance keeps source URL/fetched time/raw-value
hash and parser version. Interpretation expires after **at most 7 days**, also
bounded by the POI record expiry.

Newer imports replace only this importer's own derived hours rows; other sources
are not deleted. Missing/unsupported newer metadata cannot leave the previous
derived open schedule active. Older snapshots still cannot overwrite newer
facts; invalid transaction input preserves last-good data. Derived area-center
coordinates are marked estimated in provenance, not observed GPS.

Runtime's existing baseline import picks up the richer Place metadata when root's
export actually succeeds. No new provider or automatic Overpass job was enabled.
The database evaluator remains conservative for cross-day visits, conflicts and
partial coverage; this is reported weekly schedule, not live entry/inventory.

Tests use actual baseline length for coverage and a separate explicitly
metadata-free restaurant fixture for unknown-hours behavior. They do not assume
that a future richer 800-record snapshot must still contain exactly80 or have no
hours. Positive supported-hours, Sunday closure, stale7-day expiry, unsupported
PH, replacement/removal and preserved provenance are checked separately.

## Verification and remaining integration

- Scoped durable/runtime/live-source/weekly-hours tests: **78/78 PASS**.
- Scoped ESLint: PASS.
- Full run during root's simultaneous reasoner/catalog changes: **315 PASS,
  11 FAIL** in old public-chat/hosted-api/catalog contract tests. Reported to root;
  no tests disabled or source implementation changed to satisfy those unrelated
  expectations. Root assigned subsequent contract-test synchronization separately.
- Typecheck source-specific fixture typing corrected. Other in-progress UI
  errors were reported; a final whole-project check belongs to the coordinated
  freeze. No build/deploy/provider call by this subtask.

Next: root completes its bounded Overpass attempt, rebuilds/deploys the frozen
code, and checks actual live source count on the next permitted hourly refresh.
The caps24/50 are limits, not a promise of24 events or complete city coverage.

## Subsequent coordinated test freeze

Root granted synchronization of the public-chat/hosted-api/catalog tests to the
new two-call reasoner and reported public metadata contract. No production code
was changed to satisfy tests. All six unsupported generated-fact regressions
remain; extra assertions cover400+800 aggregate output limit, one quota reservation,
both requests' no-tools/no-GPS/store:false policy, original rock/date/budget
constraints, and an independent source LLM-transfer denial. Final coordinated
unit+integration run: **328/328 PASS**,31 files. TypeScript and scoped ESLint PASS.

## 2026-10-20 19:16 UTC — refresh deferred; official next-source research

Root could not verify the production hourly lease while temporary SSH access was
unavailable, and explicitly cancelled an independent local refresh. **No new
Sxodim detail fetch, fallback update, Overpass retry, media download or provider
activation occurred.** The existing dated fallback is unchanged; the earlier
7-occurrence count is not a new live measurement. The package command
`data:import:events` still points to `scripts/import-events.ts`, which is an
unavailable-source stub, not the current runtime importer. Do not run that command
and report a successful ingestion.

### Official government venue data: useful candidate, not current inventory

The [Astana sports-facilities dataset №730](https://data.egov.kz/datasets/view?index=sporttyk_keshender_turaly_dere1)
describes names, addresses, public contacts, working hours and sports. Its page
metadata reported annual updates and 27 January 2026 as the last update. The
reader accessed the metadata once; a later read timed out. No actual rows,
coordinates, current API version, record count or hours values were downloaded
or verified. The [culture-facilities dataset №729](https://data.egov.kz/datasets/view?index=madeniet_uiymdary)
was discovered through official indexed metadata: addresses and official sites,
annual updates, last update 3 July 2026. Its payload remains unverified; it does
not establish opening hours or individual events.

The portal's [about page](https://data.egov.kz/pages/about) expressly presents
open data for reuse in applications. Its [FAQ](https://data.egov.kz/pages/faq)
describes publicly reusable, machine-readable resources, including republication
in unchanged form. These are useful permission evidence, **not** a verified grant
for third-party photographs, large prose extracts or unrestricted LLM transfer.
The linked current placement rules at
[Adilet](https://adilet.zan.kz/rus/docs/V2500035957) returned only a JavaScript
shell; their contents were not reviewed. No legal conclusion was inferred from
that shell. The [official API-v4 documentation](https://data.egov.kz/pages/samples)
documents HTTPS JSON queries, bounded `size` and version/mapping discovery. The
developer-dashboard link leads to `/profile/apikeylist`, but its page timed out;
current authentication requirements for these specific datasets are unverified.

Practical next step: inspect the sports dataset's advertised export/mapping and
at most **five records** after confirming its current access conditions. Preserve
reported raw hours and source-updated time; exclude named directors and other
unneeded personal fields. Missing coordinates stay unknown. Annual metadata must
not become a freshly verified “open now” claim merely because it was fetched
today. Do not turn sports facilities into dated classes/events without evidence.

### First official event partner: National Museum

A new read of the [museum homepage](https://nmrk.kz/ru/) again showed Tuesday–Sunday
10:00–18:00, Monday closed, an Astana address, public institution contacts and a
separate dated late-opening notice for 13 October. The previously researched
exhibition article was inaccessible in this reader on this pass; no new exhibition
dates were imported. Building hours, exception dates and exhibition periods must
remain separate facts. The earlier [source audit](A-sources-vps-20261020.md)
contains the prior article evidence and its limitations.

Recommended next integration: request a small approved CSV/JSON feed of exhibition
periods, weekly hours, dated exceptions and booking URLs from the museum using its
published institutional contact. No message was sent. Until reuse/automation and
media permissions are confirmed, keep this source a candidate: no scheduled
scrape, images, assumed admission price, tour language or inventory.

### Clearly licensed supplementary POI metadata: Wikidata

[Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing) releases
structured entity data under CC0; this does not license linked external images.
Its [data-access guide](https://www.wikidata.org/wiki/Wikidata:Data_access)
documents entity JSON access and asks clients to identify themselves, limit load,
cache and stop/back off on429. A small reviewed set of known Astana venue IDs
could supplement labels, websites and explicit coordinate statements with
revision/provenance. No entity export or bulk query was executed. Wikidata is not
a Kazakhstan government feed and cannot guarantee current hours/events. Referenced
website content and Commons files retain their own separate rights checks.

### Release gate

No runtime/source-data files changed in this research pass; tests were not rerun
for a documentation-only update. Once SSH access is restored, root can execute
**one** permitted refresh through the deployed shared durable lease, then inspect
actual page/occurrence/rejection/geo counts and source timestamps before any dated
fallback update. Candidate research does not enlarge current production coverage.
