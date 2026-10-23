import { evaluate, loadEvalInputs, summarize } from '../tests/evals/evaluate';

// Offline only: no dotenv, provider clients, databases, deployment or fixture mutation.
// Evaluation failures are findings, not a reason to rewrite the matcher for green.
const input = loadEvalInputs();
const split = process.argv.find(arg => arg.startsWith('--split='))?.slice('--split='.length) ?? 'all';
if (!['all', 'dev', 'holdout'].includes(split)) throw new Error('EVAL_SPLIT_INVALID');
const cases = input.cases.filter(c => split === 'all' || c.split === split);
const first = evaluate(cases, input.corpus), second = evaluate(cases, input.corpus);
const stable = (rows: typeof first) => rows.map(({ milliseconds: _timing, ...rest }) => { void _timing; return rest; });
const deterministicRepeat = JSON.stringify(stable(first)) === JSON.stringify(stable(second));
console.log(JSON.stringify({ schemaVersion: 1, mode: 'offline_snapshot_and_synthetic_test', baseline: 'multilingual-lexical-dialogue-v2', split,
  corpusVersion: input.corpus.corpusVersion, frozenNow: input.corpus.frozenNow, hashes: input.hashes,
  noNetwork: true, paidCalls: 0, deterministicRepeat, independentReview: input.cases.every(c => c.annotation.status === 'reviewed') ? 'reviewed_root_and_independent_agent_20261024' : 'pending',
  note: 'Current production-function adapter, not the immutable historical baseline. Compare archived fbe5923 using identical manifest/corpus. Tune on dev only; holdout is final validation. Source-policy/API/LLM generations are not simulated as successful integration.',
  summary: summarize(first), cases: first }, null, 2));
if (!deterministicRepeat) process.exitCode = 1;
