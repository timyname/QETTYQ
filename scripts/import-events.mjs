/** Safe separate batch importer. Run: node --import tsx scripts/import-events.mjs --help */
import { readFile, open, unlink, access } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEventDocument, mergeEventSnapshots } from "../src/server/ingestion/events.ts";
import { fetchApprovedEventDocument } from "../src/server/ingestion/fetch.ts";

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
if (args.includes("--help")) {
  console.log("node --import tsx scripts/import-events.mjs --input <owned-jsonld-or-html> --policy <approved-policy.json> --source-url <exact-approved-url> --output <NEW-file.json> [--previous <snapshot.json>] [--synthetic-test]\nNetwork is OFF by default. Replace --input with --fetch only for an approved source policy. Never pass credentials in URLs. Existing outputs are never overwritten.");
} else {
  let lockPath, lock;
  try {
    const policyPath = value("--policy"), sourceUrl = value("--source-url"), output = value("--output"), input = value("--input");
    if (!policyPath || !sourceUrl || !output || (!input && !args.includes("--fetch")) || (input && args.includes("--fetch"))) throw new Error("REQUIRED_ARGUMENTS_MISSING_OR_AMBIGUOUS: use --help");
    const policy = JSON.parse(await readFile(resolve(policyPath), "utf8"));
    try { await access(resolve(output)); throw new Error("INVALID_OUTPUT_ALREADY_EXISTS"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const now = new Date().toISOString();
    const previousPath = value("--previous"), previous = previousPath ? JSON.parse(await readFile(resolve(previousPath), "utf8")) : { records: [] };
    if (!Array.isArray(previous.records)) throw new Error("INVALID_PREVIOUS_SNAPSHOT");
    // Serialize imports using the same reviewed policy, even when output names differ.
    lockPath = `${resolve(policyPath)}.import.lock`;
    lock = await open(lockPath, "wx", 0o600);
    const lastSuccessAt = previous.records.filter((record) => record.provenance?.sourceId === policy.id).map((record) => record.provenance.retrievedAt).sort().at(-1) ?? null;
    const document = input ? await readFile(resolve(input), "utf8") : await fetchApprovedEventDocument(policy, sourceUrl, lastSuccessAt, now);
    const parsed = parseEventDocument(document, policy, sourceUrl, { now, dataMode: args.includes("--synthetic-test") ? "synthetic_test" : "snapshot" });
    if (!parsed.records.length) throw new Error("NO_VALID_EVENTS: previous snapshot unchanged");
    const merged = mergeEventSnapshots(previous.records, parsed.records);
    const file = await open(resolve(output), "wx", 0o600);
    try { await file.writeFile(JSON.stringify({ generatedAt: now, parserVersion: "jsonld-event-v1", records: merged.records, changes: [...(Array.isArray(previous.changes) ? previous.changes : []), ...merged.changes.map((change) => ({ ...change, observedAt: now }))], rejected: parsed.rejected }, null, 2) + "\n"); } finally { await file.close(); }
    console.log(JSON.stringify({ imported: parsed.records.length, total: merged.records.length, rejected: parsed.rejected.length, changedSchedule: merged.changes.length, dataMode: args.includes("--synthetic-test") ? "synthetic_test" : "snapshot", network: !input }));
  } catch (error) {
    // Do not log external body, URL, stack or credentials.
    const allowed = /^(SOURCE_|INVALID_|FETCH_|REFRESH_|UNSAFE_|PROVIDER_|DOCUMENT_|UNSUPPORTED_|REQUIRED_|NO_VALID_)/;
    console.error(error instanceof Error && allowed.test(error.message) ? error.message : "EVENT_IMPORT_FAILED: verify inputs, policy and NEW output path");
    process.exitCode = 2;
  } finally { if (lock) { await lock.close(); await unlink(lockPath); } }
}
