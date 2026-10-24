# v21: bounded Kazakh rejection + persistent USER replay

Date: 2026-10-24. Scope: one lexical implementation patch, two new focused test files, this report. No API/runtime/schema/config/media changes, provider calls, keys, gold edits, commit or deployment by this agent. Root separately owns dispatch and memory-redaction integration. Existing shared OpenAI budget remains reserved; this work makes no paid calls or quota resets.

## Independent development finding

New development phrases, chosen independently of the existing frozen gold/holdout:

- “Театр ұнамайды, мұражай көрсет” and “Театр маған ұнамайды, мұражай көрсет” were parsed as wanted museum **and theatre**, with no exclusion.
- “Кофе қаламаймын, саябақ көрсет” likewise treated rejected coffee as wanted.

This was reproduced using the actual `placeCategoryQuery` and `prepareLeisureDialogue`, before editing. The shared negation helper recognized “емес/керек емес” but not these explicit immediate negative predicates.

## Implemented

`src/server/retrieval/lexical-query.ts` now recognizes immediate Kazakh postfix predicates `ұнамайды`, `ұнатпаймын`, `қаламаймын`, `қажет емес`, `барғым келмейді`, optionally preceded by `маған/бізге`. This is clause-local user intent only, not a property of a venue. Positive `ұнайды`, “ғана емес”, another clause and longer nonmatching substrings do not become rejection.

Existing source policy, strict unknown-price constraints, exact-name matching and date parser were not widened. No semantic/model/index work. At root's direction, this is a **patch to lexical-v3 semantics**, with no schema/trace contract-version change.

The helper is shared by place retrieval and dialogue. A stored USER rejection survives a later explicit date turn; assistant prose is ignored. A later explicit positive USER correction clears the exclusion rather than making it a permanent dislike/profile inference.

## Root integration and additional confirmed finding

The canonical query includes explicit exclusion terms and dates. Before root integration, event dispatch could mistake a date/negative category for a positive event request. Root owns the dispatch fix for explicit place/food intent. The new actual API tests verify museum/date/negative-theatre stays on the place path, while an explicitly positive concert request still invokes the event adapter once.

The persistent API test additionally discovered an existing conservative address-redaction false positive: the exact budget/time span “5000 теңге, 90 минут” matched the bare-address heuristic, suppressing the whole USER turn. This was reported to root, not silently omitted. A temporary test-only punctuation variation isolated the lexical work. Root then implemented the narrow numeric-currency/numeric-duration exception in the detector copy, retaining original explicit-address/GPS/URL guards; the **original comma fixture was restored**. The final test asserts the persisted USER text equals that original string, then reopens SQLite and renews the guest after two days. Privacy-regression tests for that detector are owned by root; this report does not claim they ran merely because the lexical tests passed.

## Executed checks

New `tests/unit/kk-postfix-negation-v21.test.ts`: **16/16 passed**. Immediate negative predicates, positive/no-cross-clause controls, coffee-to-park, actual place retriever with synthetic POI, strict unknown-price rejection, USER-only replay and later positive correction. Synthetic rows are explicitly labelled and never production data.

New `tests/integration/chat-kk-memory-v21.test.ts`: actual `handleChat`, guest authentication and real temporary SQLite, with all external network blocked. Three cases:

1. Kazakh rejection + requested museum + date/budget/time returns existing museum POI, not theatre or an unrelated event call.
2. Dialogue-only 30-day consent, original comma-separated USER text persisted exactly, SQLite close/reopen after two days, new guest, no browser history or `ai_transfer`: fresh “Ертең” retrieves museums, retains 5000/90 and excludes theatre. Both Google and event-source spies remain uncalled.
3. Positive Kazakh concert/date control still calls the event adapter once. Adapter returns synthetic unavailable, not invented live events. Google/fetch remain uncalled.

Scoped regression command:

```text
pnpm exec vitest run tests/integration/chat-kk-memory-v21.test.ts tests/unit/kk-postfix-negation-v21.test.ts tests/unit/multilingual-lexical.test.ts tests/unit/lexical-post-negation.test.ts tests/unit/leisure-dialogue-followups.test.ts tests/unit/named-user-replay-context.test.ts tests/unit/retrieval-source-permission.test.ts
```

Before root's redaction fix, the new persistent case correctly failed: budget/time reverted because the USER text had been suppressed; two other API tests passed. This was not hidden by weakening assertions. Final original-comma rerun recorded below after completion.

Final original-comma regression rerun: **107/107 passed across seven files, 1.89 seconds**. The new three-case API file passed within that combined run, including exact restored text, budget/time and USER exclusion after DB reopen/new guest. Source frozen for root's broader release verification.

Scoped ESLint on the lexical module and both new tests passed. `pnpm exec tsc --noEmit` and `git diff --check` passed during integration. No live provider, physical-device or published-version verification by this agent.

## Unchanged frozen evaluation

After freezing the lexical patch, ran `pnpm exec tsx scripts/eval-rag.ts --split=all` once (the runner internally repeats to check determinism). No gold/corpus/manifest/annotation mutation or holdout-based tuning:

- All 40: outcomes **36/40**, all assertions **33/40**, forbidden **0**.
- Dev 24: outcomes 24/24, assertions 21/24, Recall@10 0.973684 (n19), nDCG@3 1.0 (n19).
- Holdout 16: outcomes 12/16, assertions 12/16, Recall@10 0.5 (n10), nDCG@3 0.573184 (n10).
- Overall returned Recall@10 0.810345 (n29), nDCG@3 0.852822 (n29), `deterministicRepeat=true`.
- Corpus SHA256 `5fab697ea45c3630ef91c03e8cfd76a04eb86fc03be2ab253d0fdf56d8cec1e1`; gold `ca73f28e49d02d335f52fc733e3a99a12ccad31ac589e0ac8b5ecad70ccb0917`, unchanged.

Metrics and seven earlier failures are unchanged: outlet unknown markers, hands/workshop semantics and the separate mixed-culture KK case. These new development cases improve a verified local behavior, not benchmark scores or proof of full Kazakh understanding. The advanced semantic/hybrid gate remains unmet; candidate Recall and LLM entailment were not measured.

## Limits / handoff

- Fixed predicates are deliberately finite; arbitrary Kazakh morphology, double negation and all event-query framing are not solved.
- No extra history length, lifetime, consent or external transfer. Known-name USER-only and historical-date regressions remain covered by existing scoped tests.
- No media/source rights, provider budgets or grants changed. No fake event availability, fee, schedule or venue attribute.
- Credential/PRD instructions were previously read in this same agent session. Existing owner-approved key reuse is unchanged; no credential reads/writes or AI requests were needed for this deterministic patch.
