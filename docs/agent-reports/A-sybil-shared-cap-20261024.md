# Sybil shared-cap gateway · 2026-10-24

Status: internal adapter implemented and unit-tested with synthetic provider responses and actual SQLite. No paid simulation or live provider call was performed. This does not automatically reroute unmodified upstream Sybil: it must never receive a direct QETTYQ API key.

## Scope

- New `src/server/sybil/shared-budget-gateway.ts` reuses **existing** `createPublicAIQuota`, `getPublicAIBudgetStatus`, `PUBLIC_AI_APPROVAL_ID` and the existing reservation table. No schema, budget reset, replacement ledger, refund, new approval or balance top-up.
- New `scripts/sybil-budget-preflight.ts` is **read-only preflight only**, not a paid runner. It accepts exactly `--preflight /absolute/existing/qettyq.sqlite`; opens an existing regular file read-only; performs no migration, credential loading, reservation or API call. Missing/unimported ledger fails closed. Exit 2 means blocked/unavailable, not successful paid execution.
- New `tests/unit/sybil-shared-budget.test.ts` exercises the production SQLite adapter and exact shared conditional INSERT, not a separate JavaScript balance mock.

## Boundaries

The internal gateway fixes the official OpenAI Responses endpoint, GPT-5.5, `service_tier:default`, `store:false`, no tools, no hidden conversation, no redirects, no retries or alternate provider. Total instruction+evidence input is at most 8 KiB UTF-8, output at most 800 tokens including reasoning, timeout 20 s and raw response at most 64 KiB. Valid completed usage, approved model/tier and no tools are required; ambiguous accounting/network/format failure retains the full USD0.50 reservation and blocks the **same app approval**. This inherits the original application's reservation model; it is not an OpenAI project-level billing guarantee.

Fixed `sybil-admin` session retains existing cooldown/daily limits. Valid UUID + integer step1..4 yields at most four distinct reservation IDs per run. Duplicate step IDs cannot be replayed after a process restart. New UUIDs cannot bypass the original global cap or pending/accounting lock. Only sanitized public app evidence should be supplied; this adapter is not a public HTTP endpoint and does not authorize transferring private dialogue/location.

Root's separately established production checkpoint is 19 completed reservations plus one blocked reservation: USD10 reserved in total, zero remaining calls. With that existing state, preflight correctly denies calls (`PUBLIC_ACCOUNTING_BLOCKED` has priority over exhausted). This agent did **not** inspect or mutate the VPS ledger. The tests reproduce that shape with explicitly synthetic imported rows and prove denied calls make zero provider requests.

No GLM/ZCode/OAuth credentials or browser sessions were read or extracted. The owner's available GLM subscription is not assumed to be an OpenAI-compatible API entitlement. The non-API ZCode app review is a separate workflow; no paid Sybil runner was created.

## Actual commands/results

- First isolated run: 11/12 passed; timeout test incorrectly advanced fake time before asynchronous SQLite/session hashing reached provider dispatch. Test synchronization was fixed with an explicit provider-start barrier; production timeout remained 20 s.
- `pnpm exec vitest run tests/unit/sybil-shared-budget.test.ts tests/unit/public-ai-budget.test.ts`: **28/28 passed**, final rerun 826 ms (13 new +15 existing). The concurrent reservation test accepts either winner rather than depending on WebCrypto completion order.
- Scoped ESLint on the three new TypeScript files: passed.
- `pnpm exec tsc --noEmit --incremental false`: passed. Initial check found two test child-process environments missing the repository's required `NODE_ENV` type; corrected to explicit `NODE_ENV:test`, then full check and tests rerun successfully.

Coverage: app19+Sybil1 share original USD10 cap; concurrent app/Sybil pending lock; default-off/no-key preflight; fixed approval ID; unimported storage denial; request replay; step5 rejection; fixed request parameters; unknown provider denial; oversized input/response; wrong usage/model/tools; one-call network/timeout failure with no refund; real CLI reads a closed on-disk synthetic exhausted ledger without credentials and leaves database bytes unchanged; absent DB exits closed without creating a replacement.

## References and limits

Read PRD1/9/14 and the available OpenAI API-key/docs skills. Existing-key reuse was already explicitly approved by the owner; this task neither loads nor uses that key. Official Responses create-reference search established `store`, `max_output_tokens` and usage fields; its full API-reference fetch exceeded the web tool's size limit. The official [conversation-state guide](https://developers.openai.com/api/docs/guides/conversation-state) was opened successfully. Existing project GPT-5.5 approval/model limits were preserved, not replaced with a newly selected model.

No production deploy, GLM automation, upstream Sybil adaptation or generative product-review result is claimed by this report.

## Orchestrator verification

The trusted read-only CLI was bundled and streamed through the already-authorized SSH connection into the existing app container (no script written to the VPS, no credential passed to Sybil). Actual production output: approval unchanged, cap/reserved both10000000 micro-USD, remainingCalls0, availablefalse, reasonPUBLIC_ACCOUNTING_BLOCKED, providerCalls0, paidSimulationRunfalse; exit2 as designed. Earlier independent SQL grouped the same20 rows as19completed +1blocked. This is a reservation balance, not a measured invoice total. The Node/pnpm wrapper initially tried to interpret the native esbuild binary as JavaScript; invoking the existing native binary directly produced the bundle successfully. No global installation/config change.

The orchestrator also opened the official [GPT-5.5 model documentation](https://developers.openai.com/api/docs/models/gpt-5.5) on24October: standard text inputUSD5/M and outputUSD30/M, consistent with the existing approval's conservativeUSD0.50 reservation. This does not authorize new calls or release old reservations.

The owner clarified that GLM is available only through the ZCode app. A separate read-only audit was actually dispatched through that app's existing GLM-5.3 Max session; no OAuth extraction/API entitlement was inferred. That audit is not execution of upstream Sybil. Its product hypotheses and browser observations must be reported separately.
