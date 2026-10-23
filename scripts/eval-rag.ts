import { evaluate, loadEvalInputs, summarize } from '../tests/evals/evaluate';

// Offline only: no dotenv, provider clients, databases, deployment or fixture mutation.
// Evaluation failures are findings, not a reason to rewrite the matcher for green.
const input = loadEvalInputs();
const first = evaluate(input.cases, input.corpus), second = evaluate(input.cases, input.corpus);
const stable = (rows: typeof first) => rows.map(({ milliseconds: _timing, ...rest }) => { void _timing; return rest; });
const deterministicRepeat = JSON.stringify(stable(first)) === JSON.stringify(stable(second));
console.log(JSON.stringify({ schemaVersion: 1, mode: 'offline_snapshot_and_synthetic_test', baseline: 'existing-top3-v1',
  corpusVersion: input.corpus.corpusVersion, frozenNow: input.corpus.frozenNow, hashes: input.hashes,
  noNetwork: true, paidCalls: 0, deterministicRepeat, independentReview: input.cases.every(c => c.annotation.status === 'reviewed') ? 'reviewed_root_and_independent_agent_20261024' : 'pending',
  note: 'Dev/holdout observed for baseline only; no training. Source-policy/API/LLM generations are not simulated as successful integration.',
  summary: summarize(first), cases: first }, null, 2));
if (!deterministicRepeat) process.exitCode = 1;
