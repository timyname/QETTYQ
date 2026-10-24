# A4 · Контекст коротких продолжений после v18 · 24.10.2026

Status: narrow deterministic implementation and offline checks complete. API wiring of the named-place hint belongs to A0; publication is not asserted here. No provider, credential, model, dependency, budget, schema, memory service or consent contract changed.

## Reproduced gaps before implementation

Actual local `prepareLeisureDialogue` probes with a retained user request returned the following:

| Current user text | Prior user text | Incorrect result |
| --- | --- | --- |
| `А там?` | `Завтра балет до 5000 тенге` | `retrieve`, query `балет до А там? 2026-10-25` |
| `What about there?` | `Tomorrow ballet under 5000 kzt` | `retrieve`, query `ballet under What about there? 2026-10-25` |
| `Ал онда?` | `Ертең балет 5000 теңге` | `retrieve`, query `балет Ал онда? 2026-10-25` |
| `Не это, другое` | `Завтра балет до 5000 тенге` | `retrieve`, previous ballet plus the ambiguous rejection as search words |
| `Театры не хочу, лучше стендап` | `Завтра театр до 5000 тенге` | missing `theatre` exclusion; postfix Russian negation gap handed to lexical-retrieval owner |
| `Astana Opera` | `Завтра ужин до 5000 тенге` | old `goal: food`, query combines dinner with the new exact name |

The first four cases contain no uniquely identifiable place/event. Guessing a reference from assistant text would promote unverified prose to catalog facts. A0 approved bounded localized clarification instead. The exact-name case requires a unique allowed-catalog match at the API boundary; it is not solved by assuming that every capitalized phrase is a place.

## Implemented

- Whole-utterance-only unresolved references and unspecified alternatives produce a short question in RU, KK or EN. The patterns do not catch explicit alternatives such as `Не это, лучше парк` or longer questions containing a named place.
- These replies preserve prior budget/time/date constraints, do not invent a referent, and do not turn skip/rejection into a new permanent dislike.
- Unresolved reference state is reconstructed only from bounded user turns. A later date-only reply does not falsely resolve the place/activity. A later explicit activity or name resolves it normally. This is not a new durable inferred profile.
- Whole-utterance acknowledgements such as `Хорошо`, `okay`, `жақсы` no longer become invented replacement entity names while clarification is pending.
- Ordinary `Ещё варианты` in a known category still retrieves; it is not indiscriminately turned into a clarification.
- Added internal optional `currentNamedPlace: { name, goal }` to `prepareLeisureDialogue`, approved by A0. It applies only to the current turn, sets the query to the exact trusted name instead of concatenating old dinner, sets its allowed-catalog category goal and `intent: places`, and resolves the unspecified referent. Existing budget/duration/party/date and protected current settings remain. An elapsed historical day still requires a fresh day.
- The hint has no provenance on its own. A0 must populate it exclusively from a unique exact **complete current utterance** match in the approved server catalog, not model output, substring/fuzzy matching, history or assistant prose. It is not a client API schema field. No common wire contract was expanded by this agent.
- Existing trusted server clocks, 20-turn / 6-KiB text limits, profile/dialogue/AI-transfer separation, revoke/delete and local-only external-transfer restrictions were not changed.

## Verified

```text
pnpm exec vitest run tests/unit/leisure-context-reference.test.ts tests/integration/chat-context-reference.test.ts tests/unit/leisure-dialogue-followups.test.ts tests/unit/leisure-assistant-dialogue.test.ts tests/unit/memory-crossday.test.ts tests/integration/chat-crossday-memory.test.ts --maxWorkers=2
109/109 PASS, 6 files, 1.51 s

pnpm exec eslint src/server/assistant/leisure-dialogue.ts tests/unit/leisure-context-reference.test.ts tests/integration/chat-context-reference.test.ts
PASS

pnpm typecheck
PASS
```

New tests include 28 pure dialogue cases and seven actual API/SQLite cases. The API tests grant real temporary SQLite dialogue consent, persist user/assistant turns, call `handleChat`, verify bounded clarification and its persisted continuation, and then resolve an explicit stand-up choice. All global fetch calls are denied; the Google runtime is an explicitly synthetic no-network spy. Ambiguous inputs do not even request event-source retrieval. No synthetic event or assistant sentence is represented as a live catalog fact.

## Remaining scope

- A0 owns trusted exact catalog resolution and actual API integration of `currentNamedPlace`; the helper alone is not proof of end-to-end named-place routing.
- Postfix Russian negation is the separate retrieval agent's scope, not claimed repaired here.
- There is no clicked-card/selected-entity identifier in these free-text references. A later product feature may resolve a reference through an authenticated current selected entity, but assistant prose must not be that authority.
- Arbitrary anaphora, free-form rejection, popularity claims, unknown venue properties and long-range conversational understanding are not claimed solved by this bounded phrase set.
- No new paid AI evaluation, native device run, screenshot, public deployment or Git commit was made by this agent.

## Independent actual named-place API checks

A0 subsequently added the unique exact catalog resolver and wired its internal hint into `handleChat`. Independent tests were added in `tests/unit/named-place.test.ts` and `tests/integration/chat-named-place.test.ts`; no A0 implementation file was edited by this agent.

The initial real API run was **18/19 PASS**, not fully green. It reproduced a functional defect for the exact known venue `Астана балет`: the hint correctly selected the catalog entity, but the later generic event regex still matched `балет`, called the event service and replaced catalog items with event results. With the explicitly synthetic unavailable event runtime, the venue disappeared entirely. This was reported to A0 with the retained failing assertion demanding the actual venue and zero event calls; the test was not weakened. A catalog-only route is needed for an exact known venue, not merely suppressed logs.

Other initial checks passed: actual translated Astana Opera after prior dinner correctly changed goal/query without changing budget/time/party; session-confirmed strict budget kept an unknown-price venue out rather than calling it free; known unique Uno skipped Google with `CATALOG_NAME_MATCH` despite consent; assistant-authored schedule/price claims were not adopted. Pure resolver tests covered case/whitespace, exact full names/translations, no fuzzy/substrings, actual Rafe branch ambiguity, colliding aliases and unsupported category tags.

Additional API cases verify that unknown/fuzzy/ambiguous chain names do **not** acquire the exact-name bypass (Google terminates at an explicitly synthetic no-network spy), and a browser-injected `currentNamedPlace` object is rejected with 400. No actual Google request was issued. Targeted ESLint for the two independent files passed.

A0 fixed the routing defect with an internal `venueOnly` option. The same independent ballet assertion then passed with the actual named venue present and zero event-service calls. Final combined rerun:

```text
pnpm exec vitest run tests/unit/named-place.test.ts tests/integration/chat-named-place.test.ts tests/unit/leisure-context-reference.test.ts tests/integration/chat-context-reference.test.ts --maxWorkers=2
58/58 PASS, 4 files, 931 ms
```

This includes thirteen exact-name resolver tests, ten actual API named-place tests, twenty-eight pure context tests and seven actual API reference tests. Provider calls in unknown-name controls terminate in the synthetic spy, not a paid API; all global fetch calls remain denied.
