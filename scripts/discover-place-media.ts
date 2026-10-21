/** Offline stdout report, no downloads, network, secret access or registry writes.
 * pnpm exec tsx scripts/discover-place-media.ts --source-as-of ISO_TIMESTAMP
 * Optional --extract PATH uses a separately authorized local OSM export.
 */
import { readFile } from 'node:fs/promises';
import { collectPlaceMediaCandidates } from '../src/server/media/place-media-candidates';
const args = process.argv.slice(2);
const arg = (key: string) => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
async function main() {
  const sourceAsOf = arg('--source-as-of');
  if (!sourceAsOf) throw new Error('Explicit source extraction checkpoint required; do not use current time for an old extract');
  const places = JSON.parse(await readFile('data/places.json', 'utf8'));
  const text = await readFile(arg('--extract') ?? '.sites-runtime/source-cache/astana-261019-selected.geojsonseq', 'utf8');
  if (Buffer.byteLength(text) > 50_000_000) throw new Error('OSM extract exceeds offline review limit');
  const features = text.split('\n').filter(Boolean).map(line => JSON.parse(line.replace(/^\u001e/u, '')));
  const candidates = collectPlaceMediaCandidates(places, features, sourceAsOf);
  console.log(JSON.stringify({ version: 1, sourceAsOf, places: places.length, candidates, policy: 'Review queue only: no permission, automatic image fetch or UI display inferred from OSM links.' }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Media discovery failed'); process.exitCode = 1; });
