# RAG evaluation baseline · R1 · 24.10.2026

Status: **implemented, offline tested, independently reviewed and integrated**. This is a baseline, not evidence of improved retrieval or finished hybrid RAG. Existing matcher, source policy, budgets and production data were not changed.

Root adjudication24Oct: independent reviewer accepted all40 cases after neutralizing group-context presets and adding exact plan arithmetic. Reviewed judgment hash was `1323d4664bcdf00fdb64754e1bb8bed7b4d8b1029e1c9df39c44511b63e7d2be`. Root changed only40 annotation statuses from proposed to reviewed; final manifest hash is `ca73f28e49d02d335f52fc733e3a99a12ccad31ac589e0ac8b5ecad70ccb0917`. Grades, inputs, expected outputs and measured baseline are unchanged by that metadata step. See `agent-reports/A-rag-gold-review-20261024.md`. Earlier pending notes below describe the author's pre-adjudication checkpoint, not current review state. R2 trace is still not implemented; no advanced search flag was enabled.

## Reproduction and versions

- Command: `pnpm eval:rag` (equivalent: `pnpm exec tsx scripts/eval-rag.ts`).
- Baseline `existing-top3-v1`; fixture `rag-gold-v1-20261024`; frozen clock `2026-10-21T07:00:00Z`.
- corpus SHA256: `5fab697ea45c3630ef91c03e8cfd76a04eb86fc03be2ab253d0fdf56d8cec1e1`.
- golden SHA256: `ca73f28e49d02d335f52fc733e3a99a12ccad31ac589e0ac8b5ecad70ccb0917`.
- `tests/evals/manifest.json` pins both hashes. Mutation without manifest update fails closed; dataset/review changes must be recorded before comparison.
- No dotenv/config credential reads, provider clients, database access, network calls, production writes or paid calls. The evaluator temporarily makes global fetch throw and restores it. This protects the present dependency path, not an OS-level network sandbox for arbitrary future imports.
- CLI runs the same forty cases twice: **deterministicRepeat=true** for IDs/outcomes/metrics/assertions excluding timing.
- Holdout was measured as an **initial baseline**, not used to change a matcher or train weights. Future tuning uses dev only. The holdout is visible in this shared repository, not a cryptographically hidden benchmark.

## Corpus and annotation

40 cases:24 RU,8 KK,8 EN. Split:24 dev (14RU/5KK/5EN),16 holdout (10RU/3KK/3EN). All translation families remain in one split.

The relevance corpus is a deliberately bounded adjudicated pool:24 real OSM POI (three frozen IDs per category) +7 original bundled Sxodim occurrences. Synthetic safety uses5 place +11 event fixtures, clearly marked SYNTHETIC TEST and example.invalid provenance. Snapshot dates remain original; no event is moved to fit the clock. Real bundled events are stale snapshot, never called today's live inventory.

Each case names its entire pool, relevance grades0–3, explicit unjudged IDs, rationale and source/field references. All currently specified pool records are judged; an unjudged returned ID produces a null metric and explicit failure, not implicit relevance0. All40 annotations are **reviewed** after root and independent-agent adjudication.

Selection is category-balanced and small, not a random sample of all749 POI or a measurement of Astana coverage. The corpus must not be used to claim full-corpus semantic recall. No photo, Google no-store content, private message, precise personal GPS or new external source grant is included.

## Actual baseline results

Numbers below are macro averages over eligible cases; parentheses give the number of cases with a nonempty relevant-gold denominator. Empty gold, dialogue and preset-plan checks are not assigned perfect retrieval scores.

| Slice | Cases | Outcome correct | All assertions pass | Returned Recall@10 (n) | nDCG@3 (n) |
|---|---:|---:|---:|---:|---:|
| All | 40 | 34/40 | 29/40 | 0.7241 (29) | 0.7023 (29) |
| RU | 24 | 22/24 | 21/24 | 0.7692 (13) | 0.7974 (13) |
| KK | 8 | 5/8 | 3/8 | 0.6250 (8) | 0.5625 (8) |
| EN | 8 | 7/8 | 5/8 | 0.7500 (8) | 0.6875 (8) |
| Snapshot cases | 18 | 17/18 | 14/18 | 0.8667 (15) | 0.7667 (15) |
| Synthetic cases | 22 | 17/22 | 15/22 | 0.5714 (14) | 0.6333 (14) |
| Dev | 24 | 23/24 | 19/24 | 0.8684 (19) | 0.8947 (19) |
| Holdout | 16 | 11/16 | 10/16 | 0.4500 (10) | 0.3366 (10) |

There are **2 forbidden returned records** in direct synthetic retrieval checks: EN06 excluded concert and RU21 source-denied fixture. This is an audit finding at the evaluated function boundary, **not proof that the public API leaked a denied source**; the API has additional permission checks not exercised by this adapter.

Existing public retrievers return at most3, so this runner measures **returned Recall@10 over ≤3 results**. Internal candidate Recall@10 is `not_observable_existing_top3_boundary`. Do not bypass the matcher using the domain recommender's top12 or silently widen baseline retrieval to manufacture candidate metrics.

Local first-pass timing in the post-review rerun: p50 0.171ms, p95 17.481ms across40 adapter calls; fixture loading, network, LLM and routing excluded. Regex cold-start/order affect timing. This Mac result is not VPS/mobile latency or an SLA.

## Recorded failures and limitations

- EN05/KK05/RU05: outlet remains unproven but current result lacks the requested specific `amenity_power_outlet` unknown marker. This is an explanation/unknown coverage gap, **not evidence of a fabricated outlet claim**.
- EN06: English “no concerts” is not honored by the event matcher's RU-oriented negative-category logic.
- EN07/KK07/RU16: semantic “make something with my hands” phrasing misses the workshop. No embedding/search improvement has been made to conceal this.
- KK03: Kazakh event framing leaves lexical tokens unmatched despite a valid future event; date interpretation alone does not establish retrieval relevance.
- KK04: after independent review removed prefilled budget/party/basis, the real parser extracts amount and party but misses **group budget basis** in «Үшеумізге жалпы 6000 теңге». EN04/KK04/RU04 now begin with only goal/strictBudget; expected6000/group/3 must come from text. The failure is preserved; no parser change was made.
- KK06: Kazakh culture/exclusion phrase produces empty result rather than a useful admissible alternative.
- RU21: pure event retriever has no source policy gate. The explicit denied fixture demonstrates the missing shared boundary identified in R0, not a new permission.
- Exact-name cases retrieve the intended theatre in third position alongside other theatres; Recall=1 but nDCG=0.5. Correct outcome alone does not mean exact-name quality is good.
- RU14 checks preset coffee+unknown-duration lecture stops: expected visit/total/remaining=null, travel0 and buffer18. It does not evaluate natural-language extraction of that plan.
- RU19 checks preset two-stop order plus explicit numeric expectations: visit60, travel0, buffer18, total78, remaining42. Both30-minute stops and the origin have identical51.13/71.43 coordinates, so independently known distance/travel are0; no second copy of production Haversine is used as an oracle. A unit mutation to expected79 triggers PLAN_ARITHMETIC:totalMinutes. “By18:00/B” is **not represented as a parsed deadline in PilotContext** and is not counted as tested deadline feasibility.
- RU22 checks that injected-looking source text stays data in deterministic retrieval. No generation is executed; LLM injection/claim precision/citation entailment are **not evaluated**, not reported as passing.
- The closed museum in RU22 can be relevant to an untimed museum request. Relevance is not an assertion that it is open now.
- No route provider, budget ledger idempotency, persistent memory TTL/delete, source revoke integration, API parity or physical iPhone flow is tested by this runner; existing suites and R2/R3/R7 gates remain separate.

## Harness verification actually executed

- `pnpm exec vitest run tests/unit/rag-eval.test.ts`: **12/12 PASS** after independent-review strengthening.
- `pnpm typecheck`: PASS after correcting the harness outcome type to include real `infeasible` plan results.
- `pnpm exec eslint tests/evals/*.ts tests/unit/rag-eval.test.ts scripts/eval-rag.ts`: PASS.
- CLI twice-per-run baseline: PASS;40 cases, stable IDs/outcomes/metrics; existing retrieval failures preserved above.
- One earlier combined typecheck/lint shell invocation applied PATH only to the first command, so lint reported node-not-found; clean separately scoped lint rerun PASS. No checks were disabled.

## Gate and next step

R1 artifacts and independent gold/rationale review are integrated. Next: implement privacy-safe R2 trace with TTL and session deletion against this baseline. No semantic index enablement or paid canary is authorized by this baseline report.

