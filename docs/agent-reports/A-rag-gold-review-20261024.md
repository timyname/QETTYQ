# Independent R1 gold review · 24 October 2026

Reviewer: `multistop_review`. Scope: frozen corpus, all 40 case labels, rationales and evidence references; schema, metrics, baseline adapter, runner and reported claims. Read-only review of implementation; only this report was written. No provider, API key, network, database, production or matcher changes.

## Decision

**Accept the revised relevance labels and harness as a bounded, source-grounded offline baseline.** No further factual relabel is requested after the corrected RU14 lecture fixture and the two measurement fixes below. This is not acceptance of production retrieval quality, source-policy integration or an advanced RAG implementation. The eleven observed assertion failures remain findings, not annotation errors.

Reviewed corpus SHA256: `5fab697ea45c3630ef91c03e8cfd76a04eb86fc03be2ab253d0fdf56d8cec1e1`.
Final reviewed gold SHA256: `1323d4664bcdf00fdb64754e1bb8bed7b4d8b1029e1c9df39c44511b63e7d2be`. Initial reviewed gold was `7cf1558ba0a8424bf317729fa99870d3967a82bda86b424195aae1a9818f3c17`; the reviewed delta is limited to neutral group context and explicit plan arithmetic expectations/rationales.

If corpus/labels change, this acceptance does not automatically transfer to the new hashes. Root owns annotation/manifest status updates and report integration.

## Case adjudication

All omitted records in the explicitly named pools were also checked as grade zero, not silently treated as unjudged.

| Cases | Decision and evidence |
|---|---|
| EN01, KK01, RU01 | Accept: the three cafe-tagged POI are direct category matches; the other 21 records are not cafe-category matches. This does not prove menus, open status or availability. |
| EN02, KK02, RU02 | Accept: three museum-tagged POI match; other categories do not. Opening status is separate from untimed museum relevance. |
| EN03, KK03, RU03 | Accept: frozen local date is 21 October; only Sxodim occurrence 77801 starts on 22 October, at 17:00 Astana. The other six original occurrences are later. Real records remain stale snapshots. |
| EN04, KK04, RU04 | Accept: known 2,000 KZT per-person price times three equals the requested 6,000 group budget; unknown price is excluded under supplied strict-budget mode. After review, only goal and strict mode are preset: amount, party and basis must now be extracted. KK04 correctly exposes the current missing group-basis extraction. |
| EN05, KK05, RU05 | Accept grade two cafe partial matches: power outlet availability is not present in the records. Specific outlet unknown marker is appropriately required; missing marker is not proof that the system claimed outlets exist. |
| EN06, KK06, RU15 | Accept: concerts are explicitly excluded; ballet and exhibitions are direct culture matches, education/workshop alternatives weaker grade two. No date restriction excludes the next-day workshop. |
| EN07, KK07, RU16 | Accept: only the clay-making workshop supports making something with one's hands. Watching ballet, concerts or exhibitions does not satisfy the active-participation intent. |
| EN08, KK08, RU17 | Accept: named puppet-theatre identity is node 2349675581, not every theatre. Preserving its Russian proper name in English/Kazakh requests is legitimate, but is not an English/Kazakh alias-resolution benchmark. |
| RU06 | Accept: exact zero-price exhibit qualifies as free; price-from-zero, unknown price and nonzero prices do not establish free admission. |
| RU07 | Accept: known exact 2,000 qualifies; unknown price does not satisfy strict 2,000 budget. |
| RU08 | Accept: both cafes remain relevant under soft approximate budget, with unknown price still unknown. |
| RU09 | Accept: six future same-day synthetic events qualify; workshop is next day. With six positive IDs and top-three output, maximum returned recall is 0.5 for this pool, not a ranking defect by itself. |
| RU10 | Accept empty: 30 February is invalid; it must not silently become an unrestricted date search. |
| RU11 | Accept empty: checks the explicit unsupported-cinema branch, not movie inventory coverage or candidate ranking. |
| RU12 | Accept empty under the project's total-window interpretation: 30-minute visits plus required buffer cannot fit the supplied 30-minute window even with zero-distance origin. This interpretation should remain explicit in the rationale. |
| RU13 | Accept empty because the feed is unavailable; it says nothing about the intrinsic relevance of those otherwise cultural records. |
| RU14 | Accept corrected preset coffee plus unknown-duration lecture: explicit visit/total/remaining expectations are null, zero-distance travel is zero and the buffer is 18. Natural-language stop extraction, a confirmed route and event waiting are not measured. |
| RU18 | Accept empty: no event names the requested nonexistent group; merely returning another concert is not a match. |
| RU19 | Accept the preset ordered stops and revised arithmetic oracle: visit 60, zero-distance travel 0, buffer 18, total 78 and remaining 42. The 18:00 deadline and natural-language stop extraction are not asserted. |
| RU20 | Accept empty: ballet began at 11:45 Astana and the frozen clock is 12:00; remaining performance time is not a fresh admission guarantee. |
| RU21 | Accept forbidden/zero judgments for past, unverified-status and source-denied fixtures. The denied-source return is a real failure of this pure-function boundary, not evidence of public API leakage. The fixture named cancelled has status `unknown`, so this exercises unverified status, not a distinct cancellation enum. |
| RU22 | Accept both museum relevance labels for an untimed category query. Closed-on-Wednesday is not intrinsically irrelevant to an untimed museum search. No generator is run, so this is not an LLM injection-defense pass. |
| RU23 | Accept the narrow invariant: prior ballet exclusion must survive a date follow-up. The test does not assert a parsed tomorrow window. |
| RU24 | Accept the narrow invariant: new-topic reset keeps supplied strict budget 2,000 rather than historical 3,000. This is not persisted memory or database reset testing. |

## Evidence, temporal boundaries and leakage

- Every evidence reference resolves to its corpus entity, has the matching source URL, and names existing fields; checked programmatically for all 40 cases, with no mismatches. All record IDs belong to the versioned corpus, all pools are fully adjudicated, and all reference rationales were inspected (most are deliberately shared templates).
- Some reference field lists are less explanatory than the case requires: RU12 lists name/tags/price rather than duration and origin/buffer assumptions; RU21's status and source-scope distinction requires the corpus policy table as well as event fields. Labels are supportable from the full frozen records, but these rationales should be made more specific before describing annotations as richly justified field-level adjudication.
- Frozen clock `2026-10-21T07:00:00Z` is 12:00 Astana. Today, tomorrow, past and already-started examples are coherent. Snapshot timestamps were not shifted to manufacture future events.
- All translation families stay within one split. Reuse of the same corpus entities across families is ordinary closed-corpus evaluation, not translation leakage. Holdout is visible in the repository and has now been inspected by both author and reviewer: it is a baseline holdout, not a secret untouched future benchmark.
- Metrics do not coerce unjudged IDs to relevance zero; they produce null and an explicit failure. Empty relevant gold has no recall denominator. Dialogue and preset-plan checks do not inflate retrieval scores.
- Relevance and feasibility are distinct. Grade three does not confirm photos, inventory, admission, opening hours or source rights.

## Two review findings, corrected and independently rerun

1. Initially RU19 only checked order/feasibility, so an incorrect 79-minute total could pass. The revised schema and adapter assert five explicit `expectedPlan` fields, with a mutation test proving a 79 expectation fails. The independent oracle is simple: both 30-minute stops and origin share coordinates; travel is zero, buffer is 18, total is 78, remaining is 42. RU14 additionally pins known zero travel/18 buffer while visit/total/remaining stay null. This corrects the arithmetic coverage claim without implementing another copy of Haversine.
2. Initially EN04/KK04/RU04 preset the exact expected group fields. Revised initial context removes amount, party and basis, preserving only food goal/strict mode. Expected 6,000/group/3 now comes from the text. Rerun exposes `KK04 CONTEXT:budgetBasis`, retained as a baseline failure rather than changing the matcher to green.

`forbiddenClaims` is descriptive only in the current adapter, and generation is explicitly marked not executed. This is correctly disclosed in the report; no claim-precision, citation-entailment, secret-exfiltration or generator-safety rate should be inferred. Likewise, an empty outcome is not a semantic refusal explanation score.

## Executed verification

- Initial `pnpm exec vitest run tests/unit/rag-eval.test.ts`: 11/11 PASS. Revised independent rerun: **12/12 PASS**, 24 October local start 00:33:29, 1.50 seconds reported duration.
- Revised `pnpm exec tsx scripts/eval-rag.ts`, streamed to an in-memory JSON summary: 40 cases, deterministic repeat true, 34 outcome-correct, **29 assertion-pass**, 2 forbidden returned records. Returned Recall@10 = 0.7241379310 over 29 eligible cases; nDCG@3 = 0.7022731160 over 29. These reproduce the revised authored report's rounded values. Timing is observational and varies with concurrent load, not a product SLA.
- Revised failures reproduced: EN05, EN06, EN07, KK03, **KK04**, KK05, KK06, KK07, RU05, RU16, RU21. No failure was removed or relabeled to improve a score.
- Eval path uses existing pure functions and blocks global fetch during cases. No live/paid call or credential read was observed. This is not an OS-level network sandbox for arbitrary future imports.
- One initial inspection command lacked Node on PATH, and one ad hoc metadata-inspection command had a syntax error; corrected read-only commands were rerun successfully. These were not failed product checks and no validation was disabled.

## Gate boundary

This review supplies independent label adjudication for the final pinned R1 snapshot and verifies the two corrections. Root may mark that specific annotation revision reviewed after integration. It does not close R0 source-capability/revoke gaps, R2 trace/privacy work, R3 unified retrieval, semantic indexing, routing gates, production integration or physical-device validation. Do not enable an index or increase a provider budget based on these scores.
