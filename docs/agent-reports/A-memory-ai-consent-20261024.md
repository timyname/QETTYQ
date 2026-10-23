# A8 · Browser memory-to-AI consent boundary · 2026-10-24

Owned deliverables: `tests/e2e/memory-ai-consent.spec.ts` and this report. No application/helper/root configuration edits or provider operations were performed.

## Four focused privacy scenarios

1. Server-restored history remains visible in the chat, but a missing, expired or revoked AI-transfer consent excludes its distinctive marker from a request with `useAI: true`. Each variant preserves the current user message and old UI row.
2. Initial `/api/memory` reports active transfer consent. A second, fresh GET during send is held pending, then returns denied. The test asserts no chat payload is sent before that check, the pending user turn remains visible while waiting, the protected row is excluded from AI history, and neither UI row disappears afterward. This specifically guards against refreshing/restoring the UI store during the check.
3. A seeded legacy browser row without provenance is displayed but fails closed. A new device-authored user/assistant exchange survives reload and is included as the exact two-entry history of the next request, without the legacy marker.
4. Active transfer initially permits a server-restored row. Its mocked assistant derivative must be persisted as `contextOrigin: server`. After transfer is revoked, both original server content and the derivative are excluded from the next AI history, while the independently device-authored user question remains available and the protected rows remain in the UI.

The fixture freezes browser time at 24 October 2026. All API requests are explicitly mocked or fail closed; every non-local request is aborted and asserted absent. `useAI: true` is a wire-contract fixture only: no model/API key, Google search, ingestion or actual memory service is contacted. Tests also assert no memory writes are attempted.

## Checks and coordination

- `pnpm exec eslint tests/e2e/memory-ai-consent.spec.ts` — PASS on the initial implementation.
- `pnpm typecheck` — PASS on the initial implementation.
- A final readiness helper was then corrected to respect the real empty-composer disabled-send state; this is a test-fixture correction, not an application change.

Browser run is pending A0 coordination of a single Next server on port 3039. This agent has not started Next or Playwright for this task. Physical-device behavior, live AI answers and actual server consent storage are outside this fixture's claims.
