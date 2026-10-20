// Reproducible, allowlisted local source package. Never traverses a nested project.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const version = process.argv[2] ?? 'v7';
if (!/^v[0-9]+$/.test(version)) throw new Error('Expected version vN');
const output = path.join(root, 'exports', `QETTYQ_APP_pilot_source_${version}.zip`);
try { await fs.access(output); throw new Error('Output exists; choose a new version.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const files = [];
const roots = ['src', 'public', 'docs', 'tests', 'presentation', 'scripts', 'design/penpot', 'data/livedata'];
const blocked = new Set(['node_modules', '.git', '.next', 'tmp', 'raw', 'test-results', 'playwright-report']);
const textual = /\.(?:tsx?|jsx?|mjs|json|md|ya?ml|css|svg|html|txt)$|\.env\.example$/;
const knownSecret = /AIza[0-9A-Za-z_-]{35}|sk-(?:proj-|svcacct-)[A-Za-z0-9_-]{24,}|\b[0-9]{8,12}:[A-Za-z0-9_-]{35}\b/;
async function add(relative) {
  if (relative.includes('\n')) throw new Error('Unsupported filename');
  const full = path.join(root, relative);
  const stat = await fs.lstat(full);
  if (stat.isSymbolicLink()) throw new Error(`Symlink is not packaged: ${relative}`);
  if (stat.isDirectory()) {
    for (const name of (await fs.readdir(full)).sort()) {
      if (blocked.has(name) || name.startsWith('.env') || /\.(?:log|zip)$/.test(name)) continue;
      await add(path.join(relative, name));
    }
  } else if (stat.isFile()) {
    if (textual.test(relative) && knownSecret.test(await fs.readFile(full, 'utf8'))) throw new Error(`Possible secret; package stopped: ${relative}`);
    files.push(relative);
  }
}
for (const folder of roots) await add(folder);
await add('pnpm-workspace.yaml');
for (const name of ['AGENTS.md', 'PRD.md', 'README.md', 'THIRD_PARTY_NOTICES.md', 'package.json', 'pnpm-lock.yaml', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'eslint.config.mjs', 'playwright.config.ts', 'vitest.config.mts', '.gitignore', '.env.example', 'data/places.json', 'data/snapshots/osm-astana-2026-10-19.json', 'data/source-registry.json', 'data/event-source-candidates.json', `exports/QETTYQ_APP_pitch_${version}.pdf`, `exports/QETTYQ_APP_pitch_${version}.pptx`]) await add(name);
// Layer contracts are included; large historical generated screen masters are not runtime assets.
for (const name of (await fs.readdir(path.join(root, 'design'))).sort()) if (/\.(?:md|json)$/.test(name)) await add(`design/${name}`);
const result = spawnSync('/usr/bin/zip', ['-q', '-X', output, '-@'], { cwd: root, input: [...new Set(files)].join('\n') + '\n', encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || 'zip failed');
const verify = spawnSync('/usr/bin/unzip', ['-tqq', output], { encoding: 'utf8' });
if (verify.status !== 0) throw new Error('Archive integrity failed');
console.log(JSON.stringify({ output, files: new Set(files).size, bytes: (await fs.stat(output)).size, secretPatterns: 'not found', integrity: 'PASS', note: 'Source archive; not a signed iOS application. No env.local, keys, node_modules or build cache.' }, null, 2));
