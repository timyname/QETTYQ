# A4 · Bounded multilingual lexical retrieval · 24 October 2026

Status: implemented and offline tested; final combined holdout/release acceptance belongs to A0. No API, browser, paid provider, deployment, index or embedding calls were made.

## Scope and runtime path

The actual event matcher is `retrieveEventEvidence` in `src/server/ingestion/event-evidence.ts`, not the ingest/media parser `sxodim-live.ts`. A0 explicitly approved that corrected ownership boundary. Only these runtime files and a pure helper were changed:

- `src/server/retrieval/lexical-query.ts`: version `multilingual-lexical-v2`; NFKC/lowercase normalization, bounded local RU/KK/EN negation, observed POI category aliases, literal whole-name matching.
- `src/server/pilot/catalog.ts`: excludes explicitly negated categories; known literal full name or recorded `nameTranslations` narrows the candidate pool before the existing budget/time/goal/preference constraints. Branch IDs are not merged. No inferred translation, address, cuisine, menu, hours or venue identity is created.
- `src/server/ingestion/event-evidence.ts`: shared local negation, KK request/date framing and category aliases (`мәдени`, `шеберлік сабағы`), `немесе` alternatives. Existing event city/status/schedule/date/price/semantic-original conjunction gates are unchanged.
- `tests/unit/multilingual-lexical.test.ts`: independent synthetic fixtures dated 3 November, not derived from holdout objects or answers.

The shared helper is also imported by the separately owned dialogue task. It supports English `don't want a/an/any`, `do not want`, `without the`, `instead of`; Russian `не хочу/хотим/нужно/нравится`, `вместо`; Kazakh postpositive `емес`, `керек емес`, `қоспа`, category `-сыз/-сіз`. `not only` is positive, and numeric date tokens are not skipped as separators.

## Verification actually executed

`PATH=<bundled-node-and-pnpm> pnpm exec vitest run tests/unit/multilingual-lexical.test.ts tests/unit/event-evidence.test.ts tests/unit/backend-pilot.test.ts --maxWorkers=2`: **50/50 PASS**, 3 files, exit 0. First run found two regressions (`Безбалета` legacy behavior and `not only` framing); code was corrected without weakening assertions and the same suite passed. The later numeric-separator helper adjustment was requested and covered by the independent dialogue task; final combined suite remains A0's gate.

`pnpm exec eslint src/server/retrieval/lexical-query.ts src/server/pilot/catalog.ts src/server/ingestion/event-evidence.ts tests/unit/multilingual-lexical.test.ts`: PASS, exit 0.

### Immutable dev A/B

Original code was extracted without switching or resetting the shared working tree:

```sh
git archive fbe5923 src data tests scripts/eval-rag.ts | tar -x -C <private-temp-directory>
```

Private extraction used `.sites-runtime/lexical-baseline.d4CoY5`. Running its `tests/evals/evaluate.ts` imports its archived sources, not the modified production files. Both runs use the same manifest-verified corpus/gold/frozen time and `cases.filter(c => c.split === 'dev')`. Gold and manifest were not edited.

| Dev slice | Immutable fbe5923 | Candidate working tree |
|---|---:|---:|
| Cases | 24 | 24 |
| Correct outcome | 23/24 | 24/24 |
| All assertions | 19/24 | 20/24 |
| Returned Recall@10, n=19 | 0.868421 | 0.973684 |
| nDCG@3, n=19 | 0.894737 | 1.000000 |
| Forbidden returned records | 0 | 0 |

Candidate includes concurrent dialogue changes, so this is a combined working-tree measurement rather than isolated attribution to this patch. Remaining dev failures are three missing outlet-unknown markers and KK group budget basis, outside this task's ownership. Baseline p95 was ~17.33 ms and candidate ~22.78 ms in separate Mac processes, not a reliable performance comparison or VPS SLA. Internal candidate recall remains unobservable at the existing top-3 boundary.

The matcher patch was frozen after independent regression tests and dev measurement. **This agent did not execute holdout.** A0 should run one final combined frozen holdout validation, report all regressions, and not tune from that result. The existing `eval:rag` script still labels imports `existing-top3-v1`, although its adapter imports current production functions: after this patch that command is a candidate measurement, not the immutable historical baseline. A0 owns labeling/infrastructure integration.

## Limitations and next checks

- This is bounded deterministic lexical improvement, not semantic retrieval, FTS5, embeddings, RRF or completed R3–R9.
- Negation has immediate mention scope, not unrestricted natural-language coordination resolution. Ambiguous multi-clause/list constraints still need structured query compilation and independent fixtures.
- Exact name match only uses existing names/translations. Unknown names are not resolved through external providers by this patch.
- The direct event retriever's existing source-policy boundary is not changed. A denied-source synthetic finding must remain visible until the shared source/eligibility work closes it; additional API policy gates must not be misrepresented as proof that every pure retriever is policy-complete.
- No claims that unknown prices, amenities, hours or route duration become known; unknown/strict constraints remain code-owned.
- No source data, media registry, budgets, common schemas, root config, package/lockfile, shared status docs, chat service or datastore were changed by this task.
