# A4 — Multi-turn dialogue and memory audit, 24 October 2026

## Scope and evidence

Read `PRD.md` in sections, `leisure-dialogue.ts`, bounded chat history, chat route,
memory service, memory datastore and existing dialogue tests. No provider calls,
new dependencies, billing changes, database schema changes or deployment.

## Implemented

- Replay still reads only bounded user messages; assistant messages cannot set
  a date, budget, party size or preference. No inferred relationship profile.
- Latest explicit positive format wins after the single-shot context parser.
  Previously “not only food, stand-up too” could select events then silently
  become food because `parseContext()` prioritises food nouns.
- Explicit exclusion survives short follow-ups for stand-up, concert and food,
  alongside the existing ballet/theatre/museum/park/cafe/rock list. Rejected
  nouns are removed from positive search terms; exclusion filters remain.
- Rejected alternatives (“stand-up instead of dinner”) are not treated as the
  newly requested format. Strict budget, party size and available time survive.
- The latest positive day mention wins, including explicit-date to relative-day
  corrections. “Послезавтра” no longer unconditionally overrides a later
  “завтра”, and its suffix is not parsed as a second tomorrow mention.
- Kazakh suffix negation is evaluated after the entire day match, so “ертең
  емес” cannot replace a previously agreed date.
- Dialogue shares `isNegatedMention()` with retrieval rather than maintaining a
  second scope parser. Numeric date negation is covered separately; punctuation
  trimming must not trim the digits of the date itself.

## Memory audit and bounded replay extension

- `MemoryService.readForAI()` and datastore `aiContext()` require active
  `ai_transfer`. `readProfile()`, `messages()` and `visits()` additionally require
  their independent scope and enforce expiry. Revocation deletes that scope.
- The chat route reads server memory only when `useAI=true`. Deterministic
  search does not currently obtain saved profile or dialogue directly.
- Current context, then session context, take precedence over stored profile.
  A client sending a default context therefore prevents the profile fallback;
  this is not evidence that saved preferences were applied to ranking.
- Initially the entire dialogue pipeline took only 6 messages, losing an initial
  intent after a few exchanges. With root-approved additional ownership,
  deterministic replay now receives at most 20 messages through browser payload,
  API normalization, restored SQLite context and dialogue preparation.
- `normalizeDialogueHistory()` retains the same **6 KiB total history budget**,
  1,600 UTF-8 bytes/1,000 characters per message, role validation and decimal GPS
  redaction. Long messages can still evict old turns. Whole request remains
  bounded at 14 KiB. Storage retention remains 24 messages and the same TTLs.
- `normalizeChatHistory()` is untouched and still selects 6 provider messages.
  Existing reasoned/smart assistant provider paths independently keep their
  6-message bounds. No prompt/output token limit or provider budget increased.
- Real SQLite reopen after 9 exchanges restores the first explicit date,
  dinner intent, strict budget and stand-up exclusion for deterministic replay;
  revoking `ai_transfer` still makes `readForAI()` return null.
- No hidden summary or inferred permanent preference was introduced.
- Persisted dialogue is personal untrusted context, not event/venue evidence.
  The transcript cannot establish an address, event time, actual price or venue
  suitability for a date. Precise decimal GPS is still redacted.

## Checks

Command (bundled Node/pnpm on PATH):

```text
pnpm exec vitest run tests/unit/leisure-dialogue-followups.test.ts tests/unit/leisure-assistant-dialogue.test.ts tests/unit/chat-history.test.ts tests/unit/ui-review-38.test.ts tests/unit/memory-api.test.ts tests/unit/chat-memory-context.test.ts --maxWorkers=2
```

Result: **83/83 tests across 6 files passed**, exit 0. New test file contains 14
RU/KK/EN offline synthetic-input cases; no gold/holdout changes. First run caught
two genuine goal-priority defects, fixed before the passing run.

`pnpm exec eslint src/server/assistant/leisure-dialogue.ts tests/unit/leisure-dialogue-followups.test.ts`
also passed, exit 0.

After the replay extension, scoped ESLint over all 11 changed source/test files
passed. Additional unchanged-provider/API regression command
`pnpm exec vitest run tests/unit/reasoned-assistant.test.ts tests/unit/smart-assistant.test.ts tests/unit/public-chat-api.test.ts --maxWorkers=2`
passed **85/85 tests across 3 files**, exit 0 (mocked/offline providers).

## Remaining integration boundaries

The root agent owns chat route, priority rules and source policy. Route must keep
up to 20 dialogue messages; provider preparation must retain its own 6-message
limit. A saved
profile must not override current explicit money/time constraints. Applying a
profile in deterministic search requires an explicit separate read contract,
not bypassing the current AI-transfer consent gate. Long-term summarisation,
cross-device identity and history outside the 20-message/6 KiB recent window remain
separate work; this patch does not claim those capabilities.

## Confirmed-field priority follow-up

Independent R2 QA then reproduced a real priority bug: historical “ужин до
12000 тенге” replaced a newer strict 5000-tenge context on “а балет?”. With root
approval, `prepareLeisureDialogue()` now accepts typed, runtime-whitelisted
`confirmedFields` (`budget`, `strictBudget`, `budgetBasis`, `partySize`, `minutes`,
`goal`). Protected values are restored immediately before the current turn;
that turn may explicitly propose a new value, without implicitly saving it.

By default only a known strict budget protects budget, strictness, basis and
party size together. An unconfirmed default 120-minute window does not override
history. Explicitly confirmed 120 minutes does. A protected goal also replaces
conflicting historical positive search terms, preventing downstream reparsing
from restoring the obsolete food goal.

Root owns route wiring from truly confirmed session context. This is not a claim
that default browser context after every reload has full field provenance.
Six new regression cases cover strict 5000 vs historical 12000, retaining a
historical budget with default-null context, current explicit 15000 proposal,
group budget scope, confirmed/default minutes and runtime whitelist/goal query.

Command:
`pnpm exec vitest run tests/unit/leisure-dialogue-followups.test.ts tests/unit/leisure-assistant-dialogue.test.ts tests/unit/chat-history.test.ts tests/unit/memory-api.test.ts --maxWorkers=2`
passed **71/71 tests across 4 files**, exit 0.
