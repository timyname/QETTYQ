# A8 — independent R2 API/SQLite checks

Inspected root-owned trace schema/recorder, SQLite trace store, chat route,
diagnostics route, session-data deletion, memory HTTP bridge and VPS startup.
Only the independent test file and this report were added for this QA task.

## Executed

```text
pnpm exec vitest run tests/integration/rag-trace-api.test.ts --maxWorkers=1
pnpm exec eslint tests/integration/rag-trace-api.test.ts
git diff --check -- tests/integration/rag-trace-api.test.ts
```

Results: **9/9 tests passed**, exit 0; ESLint and diff check passed. Real temporary
SQLite databases and the actual additive R2 migration/store were used. Sources
were bounded synthetic/offline fixtures; a global fetch stub rejects network.
No Google/OpenAI/2GIS calls or budgets consumed.

## Proven boundaries

- Real `handleChat()` writes clarify, successful place lookup and empty lookup
  diagnostics; a failing source becomes `unavailable` empty fallback.
- An uncaught malformed-source pipeline error is rethrown, while a technical
  `pipeline_error` trace is saved without its private error string.
- Response trace ID resolves through the actual diagnostics GET for its own
  guest only. Another guest receives 404; absent guest receives 401; malformed
  IDs receive 404. Successful diagnostics are `no-store`.
- SQLite payload contains no query, history, raw provider-output marker, GPS or
  raw guest session ID. Returned selected entities are SHA-256 hashes.
- Session-data deletion removes only the current guest's traces. Full memory
  deletion also removes current traces. A trace-delete exception yields 503
  and `deleted:false`, not a false successful full deletion.
- Disabled R2 adds no trace/header, leaves reply/items/context unchanged and
  does not add any external/source calls.

## Separately reported context-priority defect

Historical dialogue can currently overwrite a newer confirmed settings budget:
base `budget=5000, strictBudget=true`, history “ужин до 12000 тенге”, current
“а балет?” yields 12000. This is outside the R2 implementation and was reported
to root before release. No production application fix was made during this QA.

A reliable general fix needs explicit provenance such as `confirmedFields` for
budget/basis/party/minutes/goal. Historical replay should restore those current
confirmed fields before interpreting the latest user turn, which may itself
explicitly change them. Values alone cannot distinguish a default 120-minute
window from a deliberately confirmed 120-minute window; blindly restoring all
input defaults would break the newly extended dialogue context.

These tests are not a physical-device check, live provider measurement or a
production deployment claim.

Subsequent root-authorized dialogue work fixed the separately reported budget
priority defect using explicit confirmed-field provenance plus a default known
strict-budget guard; see `A-memory-dialogue-followups-20261024.md`. Route wiring
and release verification remain root-owned. The R2 tests themselves did not
modify application code.
