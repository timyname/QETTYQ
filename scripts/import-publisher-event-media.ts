/** Bounded explicit Sxodim publisher-media ingestion. No secret/provider APIs.
 * 1) --page EXACT_EVENT_URL downloads one exact Event.image into ignored review.
 * 2) View image, then --publish-reviewed REVIEW_JSON --reviewed-sha256 HASH
 *    publishes ONLY bytes that were explicitly visually reviewed.
 * No authorization is inferred from a filename, search result or robots alone.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile, stat, open, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { extractSxodimMediaCandidates, SXODIM_TERMS } from '../src/server/ingestion/sxodim-live';
import { resolvePublisherEventMedia, type PublisherPosterRecord } from '../src/server/media/publisher-event-media';
const args = process.argv.slice(2), arg = (name: string) => args[args.indexOf(name) + 1];
const root = path.resolve('.sites-runtime/publisher-media-review');
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
async function fetchBounded(url: string, cap: number) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'QETTYQ-NoncommercialPilot/1.0 (+https://qettyqapp.anamai.kz)' } });
  if (!response.ok) throw new Error(`Publisher HTTP ${response.status}; no retry/bypass`);
  const chunks: Uint8Array[] = []; let size = 0;
  if (!response.body) throw new Error('Empty publisher response');
  const reader = response.body.getReader();
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > cap) throw new Error('Publisher response size cap exceeded'); chunks.push(value); }
  } finally { await reader.cancel(); }
  return { bytes: Buffer.concat(chunks), mime: response.headers.get('content-type')?.split(';')[0] };
}
async function checkTerms() {
  const robots = (await fetchBounded('https://sxodim.com/robots.txt', 32_000)).bytes.toString();
  if (!/^User-agent:\s*\*\s*\nDisallow:\s*$/iu.test(robots.trim())) throw new Error('Robots changed: manual review required');
  const terms = (await fetchBounded(SXODIM_TERMS, 512_000)).bytes.toString().replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ');
  if (!terms.includes('Мы разрешаем вам использовать материалы этого сайта во всех благих целях, если вы не зарабатываете на этом деньги и не забываете упомянуть нас как авторов и ставить ссылки.')) throw new Error('Publisher permission changed: manual review required');
}
async function main() {
  await checkTerms();
  const now = new Date().toISOString();
  if (args.includes('--publish-reviewed')) {
    const filename = path.resolve(arg('--publish-reviewed'));
    if (!filename.startsWith(`${root}${path.sep}`)) throw new Error('Review manifest must remain inside ignored quarantine');
    const review = JSON.parse(await readFile(filename, 'utf8')) as { record: PublisherPosterRecord; localFile: string };
    const bytes = await readFile(path.join(root, path.basename(review.localFile)));
    const checksum = sha(bytes);
    if (arg('--reviewed-sha256') !== checksum || review.record.sha256 !== checksum) throw new Error('Explicit visually reviewed bytes required');
    const record: PublisherPosterRecord = { ...review.record, status: 'approved', visualVerified: true, reviewedAt: now,
      reviewExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() };
    const data = JSON.parse(await readFile('data/publisher-event-media.json', 'utf8'));
    if (!resolvePublisherEventMedia(record.eventSourceUrl, { ...data, records: [record] })) throw new Error('Review fails publisher media contract');
    if (!Array.isArray(data.records) || data.records.length >= 100) throw new Error('Publisher registry limit reached');
    const target = path.join('data/event-media-cache', `${checksum}.jpg`);
    await mkdir(path.dirname(target), { recursive: true });
    try { await copyFile(path.join(root, path.basename(review.localFile)), target, constants.COPYFILE_EXCL); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || sha(await readFile(target)) !== checksum) throw error; }
    data.records = [...data.records.filter((p: PublisherPosterRecord) => p.eventSourceUrl !== record.eventSourceUrl), record];
    data.termsReviewedAt = now;
    await writeFile('data/publisher-event-media.json', `${JSON.stringify(data, null, 2)}\n`);
    console.log(JSON.stringify({ published: record.localAssetPath, bytes: bytes.length, source: record.eventSourceUrl })); return;
  }
  const page = arg('--page');
  if (!/^https:\/\/sxodim\.com\/astana\/event\/[a-z0-9-]+$/u.test(page ?? '')) throw new Error('One explicit exact Sxodim event URL required');
  const html = (await fetchBounded(page, 512_000)).bytes.toString();
  const [candidate] = extractSxodimMediaCandidates(html, page, now);
  if (!candidate) throw new Error('No exact Event.image in page');
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)];
  const event = scripts.map(match => { try { return JSON.parse(match[1]); } catch { return null; } }).find(item => item?.['@type'] === 'Event' && item.url === page);
  if (typeof event?.name !== 'string') throw new Error('Missing exact source event name');
  const incoming = await fetchBounded(candidate.candidateUrl, 3_000_000), bytes = incoming.bytes;
  if (incoming.mime !== 'image/jpeg' || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('Only bounded complete JPEG currently supported');
  const checksum = sha(bytes), localFile = `${checksum}.jpg`;
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, localFile), bytes, { flag: 'wx' }).catch(async error => {
    if (error.code !== 'EEXIST' || sha(await readFile(path.join(root, localFile))) !== checksum) throw error;
  });
  const decoded = execFileSync('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path.join(root, localFile)], { encoding: 'utf8', timeout: 10_000 });
  const width = Number(decoded.match(/pixelWidth:\s*(\d+)/u)?.[1]), height = Number(decoded.match(/pixelHeight:\s*(\d+)/u)?.[1]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || Math.min(width, height) < 64 || Math.max(width, height) > 3000) throw new Error('Invalid/oversize decoded dimensions');
  if ((await stat(path.join(root, localFile))).size !== bytes.length) throw new Error('Downloaded image length mismatch');
  const record: PublisherPosterRecord = { eventSourceUrl: page, sourceImageUrl: candidate.candidateUrl,
    localAssetPath: `/api/media/events/${checksum}`, eventName: event.name,
    publisher: 'Давай Сходим', termsUrl: SXODIM_TERMS, rightsBasis: 'publisher_public_noncommercial_permission_with_credit_and_link',
    status: 'blocked', visualVerified: false, knownThirdPartyRestriction: false, reviewedAt: now, reviewExpiresAt: now,
    fetchedAt: now, sha256: checksum, bytes: bytes.length, width, height, mime: 'image/jpeg', author: null,
    modifications: 'No edits: original bytes of exact same-origin Event.image. Photographer/artwork author not separately stated; attribution under publisher reuse permission.' };
  const manifest = path.join(root, `${checksum}.json`);
  await writeFile(manifest, `${JSON.stringify({ record, localFile }, null, 2)}\n`);
  console.log(JSON.stringify({ privateReviewManifest: manifest, localFile: path.join(root, localFile), sha256: checksum, width, height, bytes: bytes.length, source: page }));
}
async function lockedMain() {
  await mkdir(root, { recursive: true });
  const lockPath = path.join(root, 'import.lock');
  // One local ingestion at a time; never overwrite a concurrent approval.
  const lock = await open(lockPath, 'wx');
  try { await main(); } finally { await lock.close(); await unlink(lockPath); }
}
lockedMain().catch(error => { console.error(error instanceof Error ? error.message : 'Publisher media import failed'); process.exitCode = 1; });
