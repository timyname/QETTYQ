# A4 · Local deterministic memory replay · 24.10.2026

Status: implemented, integrated by A0 and independently tested through the actual `handleChat` API handler. This report does not assert publication or a completed hybrid RAG.

## Working increment

Previously a new guest session without client transcript could recover saved context through `readForAI` only when AI was requested and independent `ai_transfer` consent was active. Deterministic search therefore could forget the same day's saved dialogue even though the browser had explicitly granted dialogue storage and still possessed its opaque memory cookie.

Added optional `MemoryService.readForDialogue(request)`, implemented by the SQLite service. The result is deliberately not `MemoryAIContext`: it carries `usage: local_deterministic_only`, `historyTrust: untrusted_personal_context`, `historyWindow: same_astana_calendar_day`, preferences and bounded history, and no visit information.

- Existing authenticated guest session and an existing server-verified memory cookie are mandatory. No identity, grant or RAM fallback is created on read.
- Profile and dialogue each require their own active unexpired grant. `ai_transfer` alone authorizes neither. The new method does not grant transfer to any model or external search provider.
- Stored preferences remain preferences, not current confirmed settings. Fresh input and confirmed `/api/context` settings must win at the caller.
- History remains at most 20 messages and 6 KiB, with the existing per-message clipping and redaction. Assistant turns remain untrusted text; the dialogue parser uses user turns as context, never catalog evidence.
- No schema migration, new index, provider call, embedding, model change or budget increase.

## Conservative date boundary

The replay parser has one request clock, but saved messages have their own creation times. Replaying yesterday's “tomorrow” against today's clock would silently move a user's date. This release therefore only replays messages from the current Astana calendar day (UTC+5), rejects future-dated rows, and returns `omittedHistoryCount` for rows excluded by that calendar/future-time filter. Normalization may additionally omit older/oversized turns under the unchanged size bound; this counter is not a full token-trimming diagnostic.

The complete retained transcript is not erased: it stays available to the existing history UI under its original retention consent. Thirty-day profile preferences also remain available when dialogue replay is empty. Proper trusted per-turn date anchoring and cross-day replay are deferred, not claimed as implemented.

## Caller contract for A0

Only the deterministic execution branch may call `readForDialogue`. A0's final guard checks public AI availability before selecting a memory scope: an unavailable/throwing budget gate forces deterministic execution even when the UI requested AI. Once a local-only read was selected, this request cannot later attempt a model if quota changes. Actually executable AI keeps `readForAI`, with its independent `ai_transfer` requirement. Without a public runtime the existing local-test AI gate remains separate and an AI-requested request still never reads local-only memory. Never cast a local result into model input. If deterministic retrieval may enrich from Google or another external provider, prevent the locally restored transcript/preferences or derived personal query from being forwarded without the corresponding explicit transfer authorization; original current user input has a separate consent path.

Prefer incoming bounded transcript when present; do not append/deduplicate a saved transcript in a way that removes a later correction. Saved preferences must not overwrite fresh current input or confirmed session constraints. The optional method preserves compatibility with runtimes/test doubles that do not implement durable memory.

## Files and verification

- `src/server/memory/contracts.ts`: local-only result and optional service method.
- `src/server/memory/service.ts`: authenticated, scoped local read and conservative calendar filter.
- `tests/unit/memory-local-dialogue.test.ts`: 13 new cases using actual temporary SQLite databases, not mocked persistence.
- `tests/integration/chat-local-memory.test.ts`: 14 actual API-handler cases with real SQLite, a denied-network global fetch and an explicitly synthetic Google runtime spy.

Executed:

```text
pnpm exec vitest run tests/unit/memory-local-dialogue.test.ts tests/unit/memory-api.test.ts --maxWorkers=2
28/28 PASS, 2 files, 749 ms

pnpm exec eslint src/server/memory/contracts.ts src/server/memory/service.ts tests/unit/memory-local-dialogue.test.ts
PASS (exit 0)

pnpm exec vitest run tests/integration/chat-local-memory.test.ts --maxWorkers=1
10/10 PASS, 1 file, 836 ms

pnpm exec vitest run tests/integration/chat-local-memory.test.ts tests/unit/memory-local-dialogue.test.ts tests/unit/memory-api.test.ts --maxWorkers=2
Final after budget-tuple guard: 40/40 PASS, 3 files, 1.19 s (12 API + 13 local-memory + 15 existing memory API)

Same command after public AI availability guard: 42/42 PASS, 3 files, 2.14 s (14 API + 13 local-memory + 15 existing memory API)

pnpm exec eslint tests/integration/chat-local-memory.test.ts
PASS (exit 0)

pnpm typecheck
PASS after typing the synthetic Google spy as vi.fn<GooglePlacesRuntime["search"]> (no any/casts)
```

Coverage: no implicit identity/grants; profile-only/dialogue-only/AI-only separation; actual DB reopen and guest renewal; cookie fixation/ambiguity/foreign identity/session isolation; CSRF; UTC versus Astana day boundaries; no reinterpretation after midnight; independent expiry/revoke/full delete; future timestamps; 20-message/6-KiB bounds; stored GPS/address/URL suppression; fail-closed unavailable SQLite. Existing memory API regressions remain passing. Paid calls: none.

## API integration acceptance

A0's handler separately chooses `readForAI` only when AI execution can proceed and `readForDialogue` otherwise. The actual handler tests verify DB reopen/new guest recovery without client history or AI transfer; saved profile use only when input/session context is absent; dinner-to-standup correction; strict client budget and session-confirmed minutes protection; current transcript priority without deduplication; no local-only read in an AI-execution branch; no Google call from restored dialogue **or** restored profile even when Google consent is true; separate current-input Google access when no local context was consumed; and no resurrection after revoke/full delete. Two final tests verify a public runtime reporting unavailable budget and throwing on budget lookup: both restore local memory despite `useAI: true`, return deterministic mode, never invoke `readForAI` or runtime dependencies, and do not retry model execution. Their budget status is explicitly synthetic; they are not a measurement of the live remaining cap.

Google calls in these tests terminate at an in-process spy returning `SYNTHETIC_TEST_NO_NETWORK`. No actual Google/OpenAI/other provider was called. The network-denying fetch spy remained unused.

Independent review flagged a field-provenance edge for A0: nondefault client minutes/non-strict budget could be replaced by old replayed user text, unlike genuinely session-confirmed fields and strict budgets. A0 added a request-local guard for nondefault incoming fields; it does not persist these settings as confirmed. Two regressions verify fresh 90 minutes versus old three hours and fresh non-strict 7000 versus old strict 12000, while allowing the current turn to propose a new explicit value. The first combined run found a second real defect: 7000 survived but its `strictBudget: false` was replaced by the old true flag, because false equaled the default and was not guarded. A0 fixed this by protecting the coupled budget/strictness/basis/party tuple when a non-null incoming budget participates in local-memory replay. Final independent rerun: 40/40 PASS. The assertions were not weakened; both tests also prove that proposals do not mutate session-confirmed settings.

Remaining: long-term field-level confirmed provenance, trusted timestamp replay across days, source capability/expiry/revoke boundary, hybrid retrieval eval gates. Existing budgets, consents, provider prompt limits and privacy retention settings are unchanged.
