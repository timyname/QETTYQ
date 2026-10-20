// Owner-authorized QETTYQ-only provisioning. No credentials in argv/stdout/images.
import { readFileSync, writeFileSync, existsSync, lstatSync, chmodSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [identity, knownHosts] = process.argv.slice(2);
if (!identity || !knownHosts) throw Error('SSH identity and pinned known_hosts required');
const source = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const values = [...source.matchAll(/^GOOGLE_MAPS_SERVER_API_KEY\s*=\s*([^\r\n]+)\s*$/gm)];
const key = values.at(-1)?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2');
if (values.length !== 1 || !/^AIza[A-Za-z0-9_-]{35}$/.test(key ?? '')) throw Error('Exactly one valid server Google key required');
const credentialFile = new URL('../.sites-runtime/threads-analyzer.env', import.meta.url);
let token;
if (existsSync(credentialFile)) {
  if (!lstatSync(credentialFile).isFile() || lstatSync(credentialFile).isSymbolicLink()) throw Error('Credential file must be a regular private file');
  token = readFileSync(credentialFile, 'utf8').match(/^QETTYQ_HUB_TOKEN=([A-Za-z0-9_-]{43})$/m)?.[1];
  if (!token) throw Error('Existing producer credential invalid; refusing rotation');
  chmodSync(credentialFile, 0o600);
} else {
  token = randomBytes(32).toString('base64url');
  writeFileSync(credentialFile, `QETTYQ_HUB_URL=https://qettyqapp.anamai.kz/api/internal/data-hub/batches\nQETTYQ_HUB_TOKEN=${token}\n`, { mode: 0o600, flag: 'wx' });
}
const updates = { GOOGLE_MAPS_SERVER_API_KEY: key, QETTYQ_GOOGLE_PLACES_ENABLED: 'true',
  QETTYQ_GOOGLE_BUDGET_APPROVED: 'true', QETTYQ_HUB_THREADS_TOKEN_SHA256: createHash('sha256').update(token).digest('hex') };
// The current app image supplies Node; this utility mounts ONLY QETTYQ secrets.
const remote = `const fs=require('node:fs');let raw='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>{raw+=x;if(raw.length>4096)process.exit(2)});process.stdin.on('end',()=>{const u=JSON.parse(raw);const allowed=['GOOGLE_MAPS_SERVER_API_KEY','QETTYQ_GOOGLE_PLACES_ENABLED','QETTYQ_GOOGLE_BUDGET_APPROVED','QETTYQ_HUB_THREADS_TOKEN_SHA256'];if(Object.keys(u).length!==4||allowed.some(k=>typeof u[k]!=='string'||/[\\r\\n]/.test(u[k])))process.exit(2);const p='/run/qettyq-secrets/runtime.env';const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>32768)process.exit(2);const old=fs.readFileSync(p,'utf8').split(/\\r?\\n/).filter(l=>!allowed.some(k=>l.startsWith(k+'=')));const content=old.filter(Boolean).concat(allowed.map(k=>k+'='+u[k])).join('\\n')+'\\n';const t=p+'.data-update';const fd=fs.openSync(t,'wx',0o600);try{fs.writeFileSync(fd,content);fs.fchownSync(fd,10001,10001);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}fs.renameSync(t,p);});`;
const command = `docker run --rm -i --network none --read-only --user 0:0 --mount type=bind,source=/opt/qettyq/secrets,target=/run/qettyq-secrets --entrypoint node qettyq:vps-20261021-3 -e '${remote}'`;
// Single-quote quoting would corrupt embedded code; reject it before dispatch.
const quoted = remote.replaceAll("'", "'\\''");
try {
  execFileSync('ssh', ['-i', identity, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${knownHosts}`, 'root@46.224.184.192',
    command.replace(`'${remote}'`, `'${quoted}'`)],
  { input: JSON.stringify(updates), stdio: ['pipe', 'ignore', 'ignore'], timeout: 30_000 });
} catch { throw Error('QETTYQ configuration transfer failed; credentials retained privately, no values logged'); }
console.log('QETTYQ Google configuration and producer hash updated; activation requires app recreation. Producer credential kept in ignored 0600 file.');
