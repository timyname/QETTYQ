/** Reproducible offline publication of an explicitly curated exact venue image.
 * New identity records are reviewed separately, never generated from proximity.
 * pnpm exec tsx scripts/import-publisher-place-media.ts --place-id osm:node:ID
 *   --file IGNORED_REVIEWED_JPEG --reviewed-sha256 HASH --write
 */
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import registry from '../data/publisher-place-media.json';
import { resolvePublisherPlaceMedia } from '../src/server/media/publisher-place-media';
const args = process.argv.slice(2), arg = (key: string) => args[args.indexOf(key) + 1];
async function main() {
  const placeId = arg('--place-id'), input = arg('--file'), reviewedSha = arg('--reviewed-sha256');
  if (!args.includes('--write') || !input || !reviewedSha) throw new Error('Explicit --write, reviewed file and SHA required');
  const record = registry.records.find(p => p.placeId === placeId);
  if (!record || !resolvePublisherPlaceMedia(placeId, registry)) throw new Error('Exact venue identity/rights review is not currently approved');
  const bytes = await readFile(input), hash = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== record.bytes || bytes.length > 3_000_000 || hash !== reviewedSha || hash !== record.sha256
    || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('Not exact reviewed JPEG bytes');
  const decoded = execFileSync('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path.resolve(input)], { encoding: 'utf8', timeout: 10_000 });
  if (Number(decoded.match(/pixelWidth:\s*(\d+)/u)?.[1]) !== record.width || Number(decoded.match(/pixelHeight:\s*(\d+)/u)?.[1]) !== record.height) throw new Error('Native decoded dimensions differ from review');
  const target = path.join('data/place-media-cache', `${hash}.jpg`);
  await mkdir(path.dirname(target), { recursive: true });
  try { await copyFile(input, target, constants.COPYFILE_EXCL); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || createHash('sha256').update(await readFile(target)).digest('hex') !== hash) throw error; }
  console.log(JSON.stringify({ placeId, privateAsset: target, bytes: bytes.length, sha256: hash }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Venue media import failed'); process.exitCode = 1; });
