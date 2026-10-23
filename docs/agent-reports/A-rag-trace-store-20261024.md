# A2/A8 · Optional SQLite RAG trace store · 24 October 2026

Status: implemented, **19/19 real-SQLite unit tests PASS**. This task does not claim complete R2 wiring or a deployment. The shared trace schema, migrations and API/runtime integration are owned by A0 and were not edited here.

## Implemented

- Node-only `src/server/datastore/rag-traces.ts`, factory `createRagTraceStore(db, { enabled, now? })`, implementing the existing `RagTraceStore` contract.
- Disabled mode performs no database prepare/read/write/purge and starts no timer. It does not create or inspect a table.
- Enabled mode validates the strict imported schema, safe integer clock, UUID, and write timestamp at most 60 seconds old, never in the future. No arbitrary query, transcript, GPS, address, URL, provider output, session ID or secret fields are accepted; nested extra fields are rejected too.
- Session IDs require 32–256 safe token characters. Only SHA256 of the namespaced session token is persisted. Raw session identifiers are absent from rows and payloads.
- Every write transaction purges expired rows, enforces immutable request IDs, denies cross-session collision, and bounds storage to newest 30 records per session and 10,000 globally. Duplicate identical same-session records are idempotent; changed payloads cannot overwrite an existing request.
- Maximum TTL is 24 hours. Reads check owner hash, UUID, strict payload schema, payload/row identity and time consistency, expiry, future-created rows and overlong expiry. Expired records cannot be read before physical cleanup runs.
- Startup and a 60-second unref timer perform cleanup. `dispose` clears the interval. No migration, environment configuration, network call, logger or provider client is used.
- Read/write diagnostics fail safely as null/false on storage failure. Explicit `deleteSession` and `purge` propagate failures for the route owner to return a failed deletion response rather than claim success. Enabled disposed stores reject deletion. Timer cleanup alone catches errors because it cannot fail a request; expiry is independently checked on every read.

## Checks actually executed

`pnpm exec vitest run tests/unit/rag-trace.test.ts --maxWorkers=1`: **19/19 PASS**, exit 0 (Node 24 bundled runtime). Tests use actual `node:sqlite`, not mocked SQL. Coverage: strict sensitive-field rejection, nested field rejection, namespace hash only, invalid token/UUID/clock/hash rejection, expiry before purge, startup/interval purge, real close/reopen persistence, owner isolation, scoped delete, immutable collisions, 30/session and 10,000/global bounds, disabled no-DB/no-timer mode, storage-down failures, disposed delete failure, and no implicit schema creation. The global capacity fixture inserts 10,030 rows into a test-only DB, then verifies actual pruning.

Scoped ESLint for `src/server/datastore/rag-traces.ts tests/unit/rag-trace.test.ts`: PASS, exit 0 before the final small disposed-delete/startup-test additions; A0 should include both in final scoped lint.

Whole-project `pnpm typecheck` ran and reported two errors outside the R2 store: `leisure-dialogue.ts` RegExpMatchArray adapter typing and the earlier lexical synthetic fixture's `parserVersion` union. These were reported to A0; no type error referred to the new store/test. A0 explicitly authorized correcting the earlier fixture to its valid parser-version literal; the fixture remains synthetic. A0 owns the independent dialogue adapter correction.

Global `git diff --check` reported pre-existing/shared whitespace in `docs/DECISIONS.md` and `docs/PRODUCT_UI_MASTER_SPEC.md`; this agent did not change those files. No migration/schema/API/root config/shared doc/previous retrieval file was changed in this task.

## Required integration acceptance

A0 must apply the exact supplied table/index migration; instantiate the factory with a default-disabled flag; wrap optional diagnostic failures without blocking the main answer; propagate authoritative deletion failure; connect session deletion and shutdown/dispose; and test API owner isolation, disabled mode, storage failure, TTL and deletion. No claim is made here that an endpoint exposes the traces or that a live deployment has the table. No paid calls, browser, Next server, holdout evaluation or deployment was executed.
