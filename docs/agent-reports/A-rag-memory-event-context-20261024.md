# RAG / named USER context, 2026-10-24

Scope: `src/server/assistant/leisure-dialogue.ts`, `named-place.ts`, new focused unit/API integration tests. No API wiring, UI, external provider/API calls, secrets, new keys, dependency/config/schema changes, corpus/gold changes, commit or deployment by this agent. Existing owner-approved key reuse and budgets remain unchanged.

## Independently reproduced defects

1. With USER history “Хочу кофе завтра”, “Расскажи про Astana Opera” and “Покажи Astana Opera на карте” produced no exact-name hint, retained food intent and appended the new request to the old coffee query. Bare exact “Astana Opera” already worked in v19 and is preserved.
2. USER “Astana Opera” followed by an explicit date retained the name text but had `intent=general`: replay had no server-catalog identity/category hint for historical USER turns. Assistant recommendations must not be used as facts to fix this.
3. Focused safety testing found an existing named-food budget gap: romantic flow with unknown budget plus a named food venue changed `format.key` to `places`, bypassing `missing()`'s key-based food budget question. The check now follows the factual category `format.goal === 'food'`, not the routing label. An informational lookup still does not assert affordability or fabricate a price.

## Implemented after orchestrator approval

- Name resolver accepts exact bare observed name/translation as before, plus strict whole informational/map request forms in RU/EN/KK. The captured name must exactly match one unique allowed catalogue record. Examples: “Расскажи про Astana Opera”, “Покажи Astana Opera на карте”, “Tell me about Astana Opera”, “Astana Opera картадан көрсет”. No fuzzy identity, shortened name, nearby suffix, multi-venue request, extra instruction, rejected name or chain-branch selection.
- Internal `prepareLeisureDialogue` input adds optional `resolveUserNamedPlace(text)` returning `{name,goal}` or undefined. It is invoked only for bounded USER turns/current text, never assistant prose, model output or client-provided entity hints. Source/catalog approval remains the caller's responsibility.
- Existing `currentNamedPlace` stays compatible and takes precedence on the current turn.
- Internal output `resolvedPlaceName: string|null` identifies the active server-resolved place query for API routing. It persists through explicit date/budget/time/acknowledgement follow-ups, not facts about venue price/hours/schedule.
- New category/cuisine, unknown new topic text, reset, ambiguous bare reference/alternative, greeting and conflicting confirmed goal clear that routing hint. “А там?” still asks what the person means, even after a known USER venue. No guessing from assistant suggestions.
- A whole informational/map request with an unknown or ambiguous name now clarifies instead of recycling earlier coffee. This guard does not apply to explicit category/cuisine requests such as “Расскажи про музеи” or “Покажи парки на карте”. The shared `exactNamedPlaceRequest()` helper recognizes request form only, never identity.
- Explicit category switch replaces the historical entity query; event-title follow-up keeps the USER-authored title and new date, not an assistant-authored alternative title.
- Confirmed budget/minutes/goal protection, independent source filters, anchored historical dates, expired-date clarification and 20-turn/6-KiB bounds remain intact. No memory storage/consent/TTL scope changed.

## Exact contract for root

```ts
resolveUserNamedPlace?: (text: string) => {
  name: string;
  goal: 'food' | 'walk' | 'activity';
} | undefined;
// Added to LeisureDialogue output, internal rather than a new browser DTO:
resolvedPlaceName: string | null;
```

Root owns passing the allowed server catalogue resolver and using a non-null active hint to avoid misdispatch to event/Google branches. The parser does not read the catalogue globally, fetch by URL or accept a new entity hint from public request JSON. A callback exception does not establish an identity.

## Executed checks

With bundled Node PATH:

`pnpm exec vitest run tests/unit/named-place.test.ts tests/unit/named-place-request-context.test.ts tests/unit/named-user-replay-context.test.ts tests/unit/leisure-assistant-dialogue.test.ts tests/unit/leisure-dialogue-followups.test.ts tests/unit/memory-local-dialogue.test.ts`

**116/116 passed in six files, 454 ms.** Existing bare-name/ambiguous-chain behavior preserved; RU/EN/KK strict forms; known name after coffee history; exact USER date/budget/time follow-ups; category/event switch; no assistant resolver calls; ambiguous refs; reset; protected settings; callback failure; unknown-budget clarification; two cross-day anchored-date cases.

An earlier new unknown-budget test failed (100/101) and exposed defect 3 above; the guard was fixed without weakening the assertion. Initial strict-name addition separately passed 33/33 existing/new resolver tests.

After the orchestrator-approved unresolved-whole-request guard, the same six-file command passed **123/123 tests in 475 ms**, adding four unknown/ambiguous whole-request cases and three positive category/cuisine controls. Scoped ESLint passed, TypeScript passed before that final guard and is rerun after it. No network, paid/provider test, live schedule, physical device or live HTTP deployment verification claimed. Known-name tests use existing observed catalogue entries; romantic-budget fixture is explicitly synthetic.

## Actual API integration after root wiring

Root subsequently wired the callback and active resolved-place routing gate into `handleChat`. New independent file `tests/integration/chat-named-user-context.test.ts` uses the actual handler, authenticated guest store, real temporary SQLite and memory service. Google, event-source and global fetch spies all remain uncalled.

`pnpm exec vitest run tests/integration/chat-named-user-context.test.ts`: **9/9 passed, 857 ms**. Whole info/map request after dinner, USER-named date follow-up, Rafe/unknown info/map clarification, strict unknown-price protection, and rejected browser-injected resolved-name field (400). The persistent case grants only 30-day dialogue memory, writes two USER exchanges and deliberately false assistant assertions, closes/reopens the DB after two calendar days, renews the guest, omits browser history and asks a fresh date. It retrieves the same existing venue with original unknown price and prior USER budget/time, not the assistant's invented hours or alternative venue. No `ai_transfer` grant or model call.

A concurrent repository TypeScript run returned an error in root-owned `src/app/api/plans/route.ts:33`: its get-only event-service type did not declare the new `resolveSourcePolicy`. This was reported to root rather than changing its concurrent route. It is not recorded as a passing final TypeScript run; root owns repair and final broad typecheck.

Final combined scoped run after root callback wiring: the six unit files plus the new integration file passed **132/132 tests across seven files, 1.01 seconds**. Scoped ESLint including the integration file and `git diff --check` passed. Source changes frozen for root integration.

## Limits

- No event-title-to-entity resolver was added. A USER event title is preserved as query context; a title match is not independent evidence of a live event, price or available ticket.
- Unknown/fuzzy names and ambiguous chain branches remain unresolved. Complex multi-intent requests are not extracted by this strict informational/map resolver.
- A callback is not a source grant. Root must provide only approved current catalogue data and preserve fail-closed source gates.
- This is deterministic context/routing work, not semantic RAG completion. No holdout tuning, embedding calls or scoring claims.
- No assumption that anonymous/proposed place identity survives beyond existing opted-in history limits or source expiry.
