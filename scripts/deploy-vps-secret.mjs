// Owner-authorized, one-time local file -> approved VPS transfer. No secret stdout,
// argv, shell expansion, image layer, repository file, or unrelated env entries.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [identity, knownHosts] = process.argv.slice(2);
if (!identity || !knownHosts) throw new Error('SSH identity and pinned known_hosts are required');
const source = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const match = source.match(/^OPENAI_API_KEY\s*=\s*([^\r\n]+)\s*$/m);
const key = match?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2');
if (!key || !/^sk-[A-Za-z0-9_-]+$/.test(key)) throw new Error('Existing local API key missing or unsupported format');
const content = [
  `OPENAI_API_KEY=${key}`,
  'QETTYQ_AI_ENABLED=true',
  'QETTYQ_AI_PUBLIC_ENABLED=true',
  'QETTYQ_AI_PUBLIC_BUDGET_APPROVED=true',
  'QETTYQ_PUBLIC_ROUTING_ENABLED=true',
  'QETTYQ_ROUTING_PROVIDER=fossgis_foot',
  '',
].join('\n');
try {
  execFileSync('ssh', ['-i', identity, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${knownHosts}`, 'root@46.224.184.192',
    'umask 077; test ! -e /opt/qettyq/secrets/runtime.env && install -m 0600 /dev/stdin /opt/qettyq/secrets/runtime.env && chown 10001:10001 /opt/qettyq/secrets/runtime.env'],
  { input: content, stdio: ['pipe', 'ignore', 'ignore'], timeout: 30_000 });
} catch { throw new Error('Secret transfer failed; no secret output retained'); }
console.log('QETTYQ runtime secret transferred to approved VPS; value not displayed.');
