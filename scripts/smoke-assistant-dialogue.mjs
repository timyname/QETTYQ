// Own disposable session only. --ai permits ONE existing-budget reasoner bundle.
// No keys, user identities, provider content or coordinates are logged/saved.
const base = 'https://qettyqapp.anamai.kz';
const opened = await fetch(`${base}/api/session`, { method: 'POST' });
const token = opened.headers.get('x-qettyq-session');
if (!opened.ok || !token) throw Error('SESSION_UNAVAILABLE');
const headers = { 'x-qettyq-session': token, 'content-type': 'application/json' };
const useAI = process.argv.includes('--ai');
const firstText = 'Хочу девушку сводить на свидание';
const context = { goal: 'new', minutes: 120, budget: null };
const check = (value, error) => { if (!value) throw Error(error); };
const chat = async body => {
  const response = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ ...body, useAI, googleConsent: true, language: 'ru', context }) });
  check(response.ok, 'CHAT_HTTP_FAILED'); return response.json();
};
try {
  const first = await chat({ text: firstText });
  check(first.reason === 'DIALOGUE_CLARIFICATION' && first.questions?.length === 2 && first.items.length === 0 && !first.googlePlaces && first.memoryStored === false, 'CLARIFICATION_CONTRACT_FAILED');
  console.log('dating: two clarifications / no Google results / no hidden server memory PASS');
  const second = await chat({ text: 'Завтра прогулка, два часа, бюджет неважен', history: [{ role: 'user', text: firstText }, { role: 'assistant', text: first.reply }] });
  check(second.proposedContext.goal === 'walk' && second.proposedContext.minutes === 120 && second.proposedContext.budget === null, 'FOLLOWUP_CONTEXT_FAILED');
  check(second.items.length > 0 && second.items.every(item => item.tags.some(tag => ['park', 'garden', 'viewpoint'].includes(tag))) && !second.googlePlaces, 'WALK_CHANGED_OR_EMPTY');
  check(second.memoryStored === false, 'HIDDEN_MEMORY_WRITE');
  console.log(JSON.stringify({ followup: 'PASS', mode: second.mode, reason: second.reason, validationReason: second.validationReason, reasoningMode: second.reasoningMode, places: second.items.length, citations: second.citations?.length, memoryStored: second.memoryStored }));
  if (useAI) check(second.mode === 'openai' && second.reasoningMode === 'plan_retrieve_answer', 'LIVE_REASONER_NOT_CONFIRMED');
  const memory = await fetch(`${base}/api/memory`, { headers }).then(response => response.json());
  check(memory.enabled === false, 'UNEXPECTED_MEMORY_IDENTITY');
} finally {
  const removed = await fetch(`${base}/api/session/data`, { method: 'DELETE', headers });
  check(removed.ok, 'OWN_SESSION_CLEANUP_FAILED');
  console.log('own disposable session deleted');
}
