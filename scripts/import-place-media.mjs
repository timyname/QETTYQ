#!/usr/bin/env node
/** Offline publish of a previously downloaded, manually reviewed Commons JPEG.
 * No network requests, secrets, image generation or automatic rights approvals.
 * Usage: node scripts/import-place-media.mjs --place-id osm:way:ID
 *   --metadata ignored-commons-imageinfo.json --file ignored-reviewed.jpg --write
 * Fetching is deliberately separate: inspect file-specific license+subject rights
 * and decode/view the quarantine image BEFORE setting the registry review flags.
 */
import { readFile, writeFile, mkdir, stat, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const args = process.argv.slice(2), get = key => args.includes(key) ? args[args.indexOf(key) + 1] : null;
const id = get('--place-id'), metadataPath = get('--metadata'), inputPath = get('--file');
const plain = value => typeof value === 'string' ? value.replace(/<[^>]*>/gu, '').replace(/&amp;/gu, '&').trim() : '';

async function main() {
  if (!args.includes('--write') || !/^osm:(node|way|relation):[1-9]\d*$/u.test(id ?? '') || !metadataPath || !inputPath) throw new Error('Explicit place-id, metadata, reviewed file and --write required');
  for (const file of [metadataPath, inputPath]) if ((await stat(file)).size > 3_000_000) throw new Error('Metadata/image byte limit exceeded');
  const registry = JSON.parse(await readFile('data/place-media.json', 'utf8'));
  if (registry.version !== 1 || !Array.isArray(registry.records) || registry.records.length > 20) throw new Error('Invalid registry');
  const matches = registry.records.filter(record => record.placeId === id);
  if (matches.length !== 1) throw new Error('Exactly one reviewed target record required');
  const record = matches[0], rights = record.rights;
  if (rights?.status !== 'approved' || rights.visualVerified !== true || rights.photographLicenseVerified !== true
    || rights.allowStore !== true || rights.allowDisplay !== true || rights.allowRedistribute !== true
    || !['nature_no_protected_work', 'public_domain', 'separate_permission'].includes(rights.subjectRights)) throw new Error('Rights not approved; nothing published');
  if (!/^\/assets\/places\/[a-z0-9-]+\.jpg$/u.test(record.src ?? '')) throw new Error('Unsafe local target');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const page = Object.values(metadata.query?.pages ?? {}).find(page => page.title === record.fileTitle);
  const info = page?.imageinfo?.[0], meta = info?.extmetadata;
  if (!info || info.mime !== 'image/jpeg' || info.descriptionurl !== record.sourceUrl || !/^[a-f0-9]{40}$/u.test(info.sha1)) throw new Error('File-specific Commons identity missing');
  const license = plain(meta.LicenseShortName?.value);
  if (!(license === record.license || license === 'CC0' && record.license === 'CC0 1.0')) throw new Error('Commons license changed/mismatch');
  if (plain(meta.Artist?.value) !== record.author || plain(meta.Restrictions?.value)) throw new Error('Author mismatch or restrictions; manual review required');
  const observedCategories = plain(meta.Categories?.value).split('|');
  if (!Array.isArray(record.fileCategories) || !record.fileCategories.length
    || !record.fileCategories.every(category => observedCategories.includes(category))) throw new Error('Reviewed file category membership changed');
  const place = JSON.parse(await readFile('data/places.json', 'utf8')).find(place => place.id === id);
  if (!place || place.sourceUrl !== record.identityProof?.osmUrl) throw new Error('Unknown/different OSM venue');
  const raw = await readFile('.sites-runtime/source-cache/astana-261019-selected.geojsonseq', 'utf8');
  let identityVerified = false;
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const feature = JSON.parse(line.replace(/^\u001e/u, '')), tags = feature.properties ?? {};
    if (`osm:${tags['@type']}:${tags['@id']}` !== id) continue;
    if (record.identityProof.osmTag === 'reviewed_geographic_match') {
      const proof = record.identityProof.geographicMatch;
      if (proof && Number(meta.GPSLatitude?.value) === proof.fileLat && Number(meta.GPSLongitude?.value) === proof.fileLon
        && JSON.stringify(feature.geometry?.coordinates?.[0]?.[0]) === JSON.stringify(proof.osmBoundary)
        && Object.entries(tags).some(([key, value]) => (key === 'name' || key.startsWith('name:')) && value === proof.matchedVenueLabel)
        && plain(meta.ImageDescription?.value) === proof.fileDescription && proof.filePageUrl === record.sourceUrl) identityVerified = true;
    } else if (tags[record.identityProof.osmTag] === record.identityProof.osmTagValue) identityVerified = true;
    break;
  }
  if (!identityVerified) throw new Error('OSM source tag proof missing/mismatch');
  const bytes = await readFile(inputPath);
  if (bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) throw new Error('Not a complete JPEG');
  // Native raster decoding, not just trusted MIME or metadata dimensions.
  // This offline utility currently requires macOS sips; fail closed elsewhere.
  const decoded = execFileSync('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path.resolve(inputPath)], { encoding: 'utf8', timeout: 10_000 });
  const width = Number(decoded.match(/pixelWidth:\s*(\d+)/u)?.[1]), height = Number(decoded.match(/pixelHeight:\s*(\d+)/u)?.[1]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || Math.min(width, height) < 64 || Math.max(width, height) > 1500) throw new Error('Decoded size outside 64..1500; do not publish original');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (!/^[a-f0-9]{64}$/u.test(record.reviewedSha256 ?? '') || record.reviewedSha256 !== sha256) throw new Error('JPEG differs from the visually reviewed checksum; new manual review required');
  record.width = width; record.height = height; record.bytes = bytes.length;
  record.sha256 = sha256;
  record.commonsOriginalSha1 = info.sha1;
  // Offline publishing is not a new source fetch; retain the retrieval checkpoint.
  record.importedAt = new Date().toISOString();
  record.photographedAt = plain(meta.DateTimeOriginal?.value) || null;
  const target = path.join('public', record.src);
  await mkdir('public/assets/places', { recursive: true });
  try {
    await copyFile(inputPath, target, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const previous = await readFile(target);
    if (createHash('sha256').update(previous).digest('hex') !== record.sha256) throw new Error('Existing target differs; not overwritten');
  }
  await writeFile('data/place-media.json', `${JSON.stringify(registry, null, 2)}\n`);
  console.log(JSON.stringify({ placeId: id, src: record.src, width, height, bytes: record.bytes, license: record.license, sha256: record.sha256 }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
