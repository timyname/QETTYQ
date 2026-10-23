# A4 · Междневная память с доверенными часами · 24.10.2026

Status: implemented, integrated by A0 and independently tested through the actual API handler. Publication is not claimed by this report. All test messages are synthetic; no provider or paid network call was made.

## Working increment

- `readForDialogue` no longer discards the previous Astana calendar day's stored conversation. It returns the same bounded transcript and an internal aligned `historyCreatedAtMs` vector from SQLite server-write timestamps. `historyWindow` is now `trusted_persisted_turn_dates`.
- `readForAI` returns the same optional internal timestamp metadata, but still requires an independently active `ai_transfer` scope. The model payload is not expanded by this change; callers should pass timestamps only to deterministic parsing.
- New pure `assistant/anchored-history.ts` normalizes server-persisted text using the existing clipping/redaction, twenty-message maximum and six-KiB total history bound. Duplicate text retains separate corresponding clocks. Future/negative/invalid clocks are excluded, not adopted. Metadata is outside the existing text byte budget and never becomes a browser-accepted clock.
- `prepareLeisureDialogue` accepts an internal optional aligned timestamp vector. Each historical **user** turn resolves “tomorrow”, today, day after tomorrow and weekday names using that turn's persisted Astana day (UTC+5). The current user turn always resolves against the current request clock. Historical Russian dates without a year use their original year. Assistant messages remain ignored as facts/preferences.
- An elapsed historical calendar day causes a date clarification while keeping the remembered activity, budget, duration and exclusions. It does not silently become today's search. An old weekend similarly asks for a new day: the existing single-day query contract cannot represent a trusted historical two-day range without losing meaning. Current explicit day or “any day” supersedes this clarification. A topic reset discards historical date context normally.
- Fresh confirmed fields retain the existing precedence; saved text does not raise the protected budget or replace protected minutes. No preferences are silently promoted to confirmed settings.
- UI transcript rows remain unchanged. Reads do not rewrite persisted prose, clocks or consents. Consent expiry/revocation/full deletion, opaque cookie/session validation and the absence of implicit identities remain unchanged. No SQLite migration, dependency, global setting, provider model or cap changed.

## API integration contract for A0

The timestamp vector is **not** part of `chatInputSchema`. The existing strict POST `/api/memory/message` rejects `createdAtMs` supplied by the browser; `recordExchange` also does not accept it. Use only metadata returned by the authenticated memory service.

When replaying a saved transcript, pass both its bounded `history` and its corresponding `historyCreatedAtMs` to `prepareLeisureDialogue`. The existing current transcript takes precedence; do not mix old timestamps with unrelated browser text. A0 may match a complete identical retained transcript/suffix to trusted stored rows, but must preserve order, duplicate turns and the associated clocks, and must never accept a client claim of date authority. A browser-only transcript with no trusted stored correspondence has no authoritative historical clock; this increment cannot magically recover one.

Choose the local versus AI memory scope before reading as in v17. The new metadata does not authorize sending local-only remembered text or its derived query to Google/OpenAI. A0 owns the route's `localMemoryUsed` and external-transfer gates. No timestamp vector should be forwarded in the provider prompt or public trace.

`omittedHistoryCount` still counts invalid/future clock rows only, not normal size trimming. This avoids silently changing that diagnostic meaning.

## Actual checks

```text
pnpm exec vitest run tests/unit/memory-crossday.test.ts tests/unit/memory-local-dialogue.test.ts tests/unit/memory-api.test.ts tests/unit/leisure-dialogue-followups.test.ts tests/unit/leisure-assistant-dialogue.test.ts --maxWorkers=2
94/94 PASS, 5 files, 1.49 s

pnpm exec eslint src/server/memory/contracts.ts src/server/memory/service.ts src/server/assistant/anchored-history.ts src/server/assistant/leisure-dialogue.ts tests/unit/memory-crossday.test.ts tests/unit/memory-local-dialogue.test.ts
PASS

pnpm typecheck
PASS

pnpm exec vitest run tests/integration/chat-crossday-memory.test.ts tests/unit/memory-crossday.test.ts tests/unit/memory-local-dialogue.test.ts tests/integration/chat-local-memory.test.ts --maxWorkers=2
50/50 PASS, 4 files, 3.31 s

pnpm exec eslint tests/integration/chat-crossday-memory.test.ts
PASS
```

New cross-day suite: fifteen cases, including actual temporary SQLite close/reopen and guest replacement across Astana midnight; RU/KK/EN; a retained Monday versus silently moving it a week; an elapsed day; fresh day correction; old weekend clarification; December/January original-year anchoring; fresh protected budget/time; a forged timestamp HTTP write rejected with 400; AI transfer revoke independently of local dialogue; dialogue revoke and full delete; topic reset; duplicate text and Unicode clipping/timestamp alignment.

The first run had one test-fixture failure: moving its clock from October to late December expired the consent and guest session before recording the sample. The fixture now establishes its own valid December consent/session before the write. No production guard or assertion was weakened to pass it.

## Actual API integration acceptance

A0 integrated a strict `persistedReplayClocks` matcher in the handler and retained the actual POST schema. The new independent integration file `tests/integration/chat-crossday-memory.test.ts` exercises eight cases through `handleChat` and real temporary SQLite, with all global fetch calls denied and the Google runtime replaced by an explicitly synthetic no-network spy.

The checks verify original-day relative date retrieval after SQLite close/reopen and guest renewal across Astana midnight; complete identical role/text browser replay borrowing the persisted clocks; divergent text not borrowing them; forged per-turn browser clocks not adopted, an explicit top-level clock vector rejected with 400, and a memory-message timestamp write rejected with 400; elapsed-date clarification; current explicit date/budget/minutes priority; no Google request from exact browser replay when the service's local-only timestamps participate; and no resurrection after dialogue revoke. Every successful chat response is checked for absence of private timestamp fields and trace headers. Synthetic events on different days prove the selected day rather than merely checking parser output.

The Google suppression result is explicitly `status: unavailable`, `reason: MEMORY_LOCAL_ONLY`, and an empty result. It is not a claim that Google itself was available or queried. One initial integration expectation incorrectly demanded the absent `googlePlaces` field instead of this existing explicit unavailable contract; the expectation was corrected while retaining the zero-call assertion. A bare-word “Час” fixture did not parse as sixty minutes in the existing parser; the explicit supported “Один час” fixture was used. Bare-word duration parsing is not claimed repaired by this change.

## Remaining boundaries

- Actual API integration and cross-day regression checks now pass as documented above; a production deployment and physical-device check remain outside this agent's verification.
- The client transcript's locally asserted timestamps are not authoritative; absent a trusted stored match, cross-day date identity remains unavailable.
- Historical weekend range representation is conservatively deferred, not approximated to Saturday or Sunday.
- Retention remains 24 hours or 30 days according to the existing explicit grant, not unlimited lifelong history. At most twenty messages/six KiB participate in deterministic replay; older turns can fall out of that window.
- No native iPhone relaunch/background test, embeddings/hybrid retrieval, inferred user profiling or paid model evaluation was performed here.
