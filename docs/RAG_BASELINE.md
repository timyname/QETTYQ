# RAG baseline · R0 · 21.10.2026

Status: **code/source audit completed; runtime values require the orchestrator's same-window read-only confirmation**. This document records existing scope; it does not grant rights, enable an index, or claim R1–R9 are implemented.

## Release boundary

The UI/map/search checkpoint is frozen before this backend package:

Update from root during this audit: a newly identified route P0 (`buildPlan([selected.id])` replacing the current stop list) reopens the UI checkpoint. **vps12 is pending, not published/verified here. R1/R2 implementation is on hold until that route fix and its release gate finish.** Keep vps11 below as the audited baseline; replace it with actual vps12 commit/tree/image only after verification. Do not run or claim R1/R2 in parallel with this reopened P0.

Root follow-up after the audit: route P0 is now verified and published as `qettyq:vps-20261021-12`, immutable build tree `f37cb450e835102733652b18ce3334fd64e98e8f`, manifest `0b88e0c71d96c192df78c60359a215a3de686d2958e148d62756595c022cdb5e`, healthy.646 unit/integration and83 E2E PASS; actual production three-stop evaluate/reorder/street line verified. Source data/policies and audit findings below are unchanged. R1/R2 remain **not implemented**, next gate after this route checkpoint; see `A-multistop-release-20261021.md`. The preceding pending note is historical context, not current deployment state.

| Item | Baseline |
|---|---|
| Git checkpoint, independently read locally | `a0e5bf81e9ed2559142cd28e29402f3a663c4325` |
| Published image, reported by release owner / current STATUS | `qettyq:vps-20261021-11` |
| Immutable source tree, reported by release owner / STATUS | `87f62e3b482eb7ba1d51b1e0e2c55a68b3677874` |
| Image manifest SHA256, reported by release owner / STATUS | `ae27b47e3df44d2fb11a4fda54555b9825ead1c5119107ac5af317ce74654c11` |
| Public service | <https://qettyqapp.anamai.kz/> |
| Previously executed release checks, not rerun by this audit | 641 unit/integration; 81 E2E; typecheck, scoped lint, immutable image build PASS |
| iPhone | Native temp bundle build is not proof of installation or physical keyboard/tile behavior |

Foreign native/PWA/root config and presentation changes exist in the shared working tree. They are **not** part of this R0 audit or proof of the deployed image. Do not archive the whole working directory as a release.

## Frozen data identities

These are **local bundled files**, not live inventory counts. SHA256 was computed from file bytes using Node's `crypto`, without network or credentials.

| File | Size/count or version | SHA256 |
|---|---|---|
| `data/places.json` | 749 OSM POI; dated snapshot | `8d46b8b4e01944f872e8a24bd401b0359a58d2511f69c241c986a79717cd86c0` |
| `data/astana-address-index.json` | Dated OSM address index | `4c00ab638979e6184490b4d86acc81c7d675d051d7207f2f20b98ea0eecab979` |
| `data/livedata/sxodim-astana-2026-10-20.json` | **7 bundled** occurrences; fetched `2026-10-20T11:02:28.509Z`, expired `2026-10-20T12:02:28.509Z` | `7caf530d50a95b78713b279f4fa6cadb0f4a37fabf130f1e780effeaba5fcae6` |
| `data/source-registry.json` | 1 source, explicit six-capability registry | `7f27df936727cdb27a1a52cd26820bd04a9f0dfa128de28d6f62e9228e4b5bdb` |
| `data/event-source-candidates.json` | schemaVersion 2; research/scoped approval, not a job switch | `b6c25e7455e775ddd8abc06763e5c9782530fa9b27f32011116ab918fef50e0f` |
| `data/place-media.json` | 2 curated Commons photos | `4aa58e9034a9a0916240fdd8165f0f004df95d9e9bc62f9ca74ebe3a8e6c6136` |
| `data/place-media-candidates.json` | 12 discovery/review candidates, not approved assets | `99977813f76fa8de4a6003d5d947ca5b62b2458a322de5acfbc9fac950331ab3` |
| `data/media-policy.json` | schemaVersion 1; 0 approved organizer posters | `76a03681f93887bdc143c02f6a2b440746abf15f44bede823049a22da4732081` |

The release owner's preceding runtime observation was **16 cached Sxodim occurrences, 8 geocoded**. This differs legitimately from the seven-item build seed. Refresh and time filtering can change runtime counts; neither number is a claim of complete Astana coverage. R1 must pin its own fixture and clock, not fetch this mutable feed during evaluation.

## Source/capability matrix

This matrix describes **configured application scope**, not a fresh legal interpretation. `deny/missing` means no current application approval; it does not assert that the law forbids the operation. Facts, media and map tiles are separate scopes. A person's consent cannot approve a source.

| Source/content | Fetch | Persist | Display | send_to_llm | Embed | Redistribute | Current expiry/revocation and scope |
|---|---|---|---|---|---|---|---|
| `osm-overpass-poi`: geographic/tag facts | Registry yes, bounded import; VPS source `allowFetch:false` | Yes | Yes + OSM credit | Yes, short selected facts | **false explicitly** | Yes under recorded ODbL scope/attribution | VPS technical POI expiry: latest bundled retrievedAt +30d; hours max7d. Static `pilotPlaces` itself is not DB expiry-gated; see gaps below |
| OSM address index / derived event point | Existing bounded snapshot only; no per-request provider fetch | Existing dated file | Yes, sourced derived building/address point | No separate grant inferred; preserve field minimization | deny/missing | Same recorded OSM data scope, not third-party media | Exact address/curated venue match has independent OSM provenance; not entrance precision and not proof a venue is unique |
| `sxodim-astana` → runtime `sxodim-astana-noncommercial`: normalized facts | Yes, fixed Astana index +≤24 details, ≤50 occurrences, shared ≥60min refresh lease; terms/robots checks | Yes, approved short facts | Yes, active source link/credit | Yes in VPS runtime for short normalized facts, not descriptions/photos | deny/missing | No separate bulk redistribution grant recorded | One-hour freshness. Ordinary provider failure may show labeled stale snapshot; policy-review error suppresses current service display. Future dates are not silently moved |
| Commons POI photos, 2 reviewed records | Existing curated local assets; no request-time fetch | Yes, per item `allowStore` | Yes, per item author/license/source/changes | No media LLM scope recorded | deny/missing | Yes only approved per-item resolver records | Resolver requires approved/non-revoked state and valid review time/optional expiry, identity and subject-rights review; unsupported records return none |
| OSM media candidate links, 12 | **Not authorized by candidate discovery** | Review metadata only | No candidate image display | No | No | No media grant | `allowDownload:false`, `allowDisplay:false`; OSM tag is identity/discovery lead, not photo license |
| Sxodim posters | Automatic download false in tracked policy; one owner-requested private review download reported separately | Private ignored review only unless item approved | **No approved public poster** | No | No | No | `approvedOrganizerMedia:[]`; hotlink false. Owner pilot request is recorded but does not change external rights. A downloaded file is not a public grant |
| Project-generated idea illustrations | Already owned local assets | Yes | Idea/category scope with mandatory distinction, not fabricated place photo | Not in retrieval source corpus | Not enabled | Project asset distribution, not publisher-photo rights | They do not establish a real venue, menu, atmosphere or event image; current event/place missing-media UI must not silently substitute them |
| Google Places + photos | Bounded opt-in server search, existing budget/ledger | **No store** for content/photo bytes | Separate mapless Google-attributed cards; external Google Maps only | **No** | **No** | No copied dataset/assets | `storage:no_store`, `mapDisplay:external_google_only`; not merged into persistent OSM/2GIS index or map. Existing bundle≤5 photos is covered by existing reservation, not new budget |
| 2GIS MapGL / tiles | Owner-approved browser demo scope; domain/native origin controls | No application tile cache | SDK map with mandatory attribution | No | No | No map dataset/assets | Existing demo expires Nov21; app expiry `2026-11-20T19:00:00Z`; 1000 monthly tiles/Block as reported by owner. Native-origin approval is not physical tile-load proof |
| 2GIS Search / Directions | API capability/probe is not a new production ingestion approval | No new persistent corpus | No new catalog integration in baseline | No | No | No | Keep separate from MapGL permission. Current street route provider is existing FOSSGIS, not automatically 2GIS Routing |
| Data Hub reviewed source facts | Producer push, not server URL crawl; producer token does not grant source scope | Requires `data_sources.allow_persist=1` | Requires allow_display plus accepted, unexpired row | Requires allow_llm, including `forLlm` feed and chat check | deny/missing | deny/missing | Places max7d, events/occurrences/offers max1d; expired rows excluded. Purge strips bodies; independently reviewed source only |
| Data Hub media | Incoming URL is metadata, never an automatic download | Metadata / existing grant rules only | Separate per-asset current `allow_display` grant | Separate current per-asset allow_llm grant required | deny/missing | deny/missing | Live join to unexpired media grant; a source facts grant is not a media grant |
| Threads (`threads-official` research / runtime producer `threads-candidate`) | No source scrape/feed approval; authenticated candidate push can quarantine | Only source-approved normalized facts may be retained | No publication merely because producer configured | No absent explicit source scope | No | No | `QETTYQ_HUB_THREADS_TOKEN_SHA256` can configure producer, not approve source. Official API, author/organizer review and rights remain separate gates |
| Ticketon (`link_only`) | No automated fetch approval | No imported corpus | External source links only | No | No | No | No feed/media grant; do not use purchaser terms as a data license |
| Kino.kz (`link_only`) | No automated fetch approval | No imported corpus | External link only | No | No | No | No reusable screening feed; language/occurrence and media scope unknown |
| Visit Astana (`candidate`) | No | No imported corpus | No imported facts/media | No | No | No | Calendar/source review needed; historical search snippets are not current inventory |
| Astana Opera (`candidate`) | No | No imported corpus | No imported facts/media | No | No | No | Reliable organizer feed and scope needed |
| Astana Ballet (`candidate`) | No | No imported corpus | No imported facts/media | No | No | No | Year/timezone/session and media rights need explicit review |
| National Museum (`candidate`) | No automatic continuing import | No imported corpus from this source | No imported source facts/media | No | No | No | A readable dated notice is not a standing metadata/media grant; OSM-derived museum place is a separate source |
| `osm-opening-hours` research entry | No new fetch enabled | Existing OSM snapshot | Existing sourced parser result with uncertainty | Within existing selected OSM facts, not invented event schedule | false via OSM source | Existing ODbL scope | Candidate prose says not imported, but actual catalog already parses bundled openingHours. Unsupported expressions remain unknown |
| Organizer-provided feed (`candidate`) | No new feed until scope review | No new grant | No new grant | No | No | No | Best next path is explicit field/media/storage/LLM/expiry/takedown agreement; do not accept arbitrary URLs |

## Runtime gates and current architecture

- `src/server/vps/runtime.ts` registers OSM and normalized Sxodim facts separately, preserves the existing D1-ledger migration proof, creates durable budget adapters and optional Data Hub. Its `canSendToLlm` requires persist/display/LLM source permissions.
- Public `src/app/api/chat/route.ts` keeps source approval separate from user consent and filters candidate/event evidence before generation. The special local-test path is a separate execution scope, not permission to widen public ingestion.
- `src/server/pilot/catalog.ts` reads the bundled OSM array and returns top3. The reasoned `places` branch re-queries only IDs from that admissible top3; `semanticText` in event evidence is an additional **lexical** matcher. No semantic/vector index, embedder or FTS5 retrieval implementation was found in the audited server/scripts at R0.
- `src/server/data-hub/repository.ts` enforces accepted/source/city/expiry/status gates and media-grant joins. The public feed exports hub places; current event bridge only joins hub events into legacy event retrieval. Hub place presence is not proof of membership in `pilotPlaces`.
- Existing strict/soft budget, unknown price/duration, exclusions, source freshness, event schedules and final multistop checks remain authoritative. R0 does not loosen them.
- Public AI requires key availability, `QETTYQ_AI_ENABLED`, `QETTYQ_AI_PUBLIC_ENABLED`, `QETTYQ_AI_PUBLIC_BUDGET_APPROVED` and a valid durable ledger proof. Public hosted web search remains off. Google requires separate enabled/approved flags, session consent and durable reservation.
- Map browser configuration explicitly distinguishes approved public demo key from server Google/OpenAI credentials. `QETTYQ_2GIS_NATIVE_ORIGIN_APPROVED` controls the separately approved Capacitor origin; this is unrelated to ingestion/LLM rights.
- Memory remains opt-in, session24h/persistent30d with existing isolation/deletion. RAG trace must not turn optional memory into silent persistent query/GPS logging.

## Budget boundary

No paid/provider calls were made by this audit. Existing caps remain **$10 OpenAI / $10 Google**, without new keys, resets or subscriptions. Code reserves $0.50 per public AI request and $0.10 per Google search/photo bundle. Reserves are not provider-invoiced cost.

Last release-owner snapshot supplied to this agent: OpenAI15 reservations/$7.50, Google4/$0.40. **These are not a fresh independent runtime read and cannot authorize a new paid canary.** The orchestrator must insert its same-window read-only ledger observation and flag status before any real new call. Do not infer zero consumption from absent usage output.

## Gaps and reconciliations before later gates

1. **No first-class embedding capability in SQLite source schema or Hub review contract.** Registry OSM explicitly says embed:false; other scopes are missing. There is currently no index to leak into, but R0's stronger “false excludes rows” index test cannot truthfully be marked passed. Before R5, add one fail-closed capability adapter and tests: missing/false/expired/revoked policy must prevent provider invocation **and** index rows/reads. Do not treat allow_llm as embed permission.
2. **Policy is distributed.** Six-capability OSM JSON, event candidate approval, VPS hardcoded normalized-fact policy and per-asset policies are separate. Unify adapters, not grants; record policy versions/hashes in evidence/index. No source can be enabled from a producer token alone.
3. **Static catalog bypasses runtime display/expiry gating.** VPS source DB can gate events/hub, but `pilotPlaces` is imported directly. Revoking SQLite OSM display does not automatically remove bundled catalog results. R3/R4 must apply the common policy/expiry gate before candidate generation; do not claim existing universal revocation.
4. **Stale event fallback is deliberate and labeled, not a fresh snapshot.** Policy-change errors suppress the current service; persistent/global revocation and any future index/cache purge need explicit regression tests. VPS startup re-registers built-in policies, so ad-hoc SQL permission edits are not a durable source revocation workflow.
5. **Research prose can lag implementation.** OSM hours are already used despite candidate text; seven seed events vs sixteen prior runtime events are different layers. Plan's “MapGL disabled” statement is superseded by vps11. Do not rebuild existing map, memory, multistop or keyboard UI during RAG work.
6. **Photos remain a separate product gap.** Current missing photographs reflect 2 approved assets, not evidence that all remote URLs fail to load. Twelve leads and one private poster are not public-photo coverage. Rights/identity review and source-specific permitted download adapters are required; no generic scraper/hotlink/index escalation in R0.

## Ownership and next gate

- A0/root: common API contracts, schema/migrations/config/package/lock, paid-call authority, fresh runtime checks, deployment, source-policy integration and shared status docs.
- A1/A2 R0: this baseline and `agent-reports/A-rag-r0-20261021.md` only; no policy values changed.
- A7/A8 R1: independent frozen gold40/runner/report and adjudication; no retrieval rewrites to fit expected output.
- A4/A0 R2: minimal trace contract, trusted local diagnostics, TTL/isolation/delete tests; no raw query/history/GPS/provider dump.

R0 is a documented baseline with the embedding/index capability gap explicitly open, not a blanket statement of R0–R9 completion. After root closes the reopened route P0 and refreshes this release identity, proceed with offline R1/R2 while preserving all missing-capability denies. Later semantic enablement is blocked until source scope is represented and proven at the actual index boundary.
