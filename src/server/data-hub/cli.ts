#!/usr/bin/env -S node --import tsx
import { DatabaseSync } from "node:sqlite";
import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";
import { createDataHubRepository } from "./repository";
import { createPublicDataHubFeed } from "./public-feed";
import { publicUrl, sourceId, timestamp } from "./contracts";

// Trusted local CLI ONLY. No .env loading, credentials, network, source grant or
// migrations. Needs Node24 and the repository's already-installed tsx runner.
async function main() {
  if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("HUB_NODE24_REQUIRED");
  const [command, ...args] = process.argv.slice(2);
  if (command === "review-source") {
    const file = args[0];
    if (!file || !isAbsolute(file) || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink() || lstatSync(file).size > 64 * 1024) throw new Error("HUB_REVIEW_FILE_INVALID");
    const proposal = z.object({ schemaVersion: z.literal(1), sourceId, policyUrl: publicUrl, reviewedAt: timestamp,
      approvalReference: z.string().min(1).max(200), sourceHosts: z.array(z.string().min(1).max(253)).min(1).max(20),
      allowedUses: z.object({ persist: z.boolean(), display: z.boolean(), sendToLlm: z.boolean() }).strict(),
      mediaApproved: z.literal(false) }).strict().safeParse(JSON.parse(readFileSync(file, "utf8")));
    if (!proposal.success || proposal.data.sourceHosts.some(host => !publicUrl.safeParse(`https://${host}`).success || new URL(`https://${host}`).host !== host)) throw new Error("HUB_REVIEW_INVALID");
    console.log(JSON.stringify({ valid: true, sourceId: proposal.data.sourceId, applied: false, requiresSeparateOwnerApproval: true,
      note: "Review schema validation only. No source permissions/media rights changed." }));
    return;
  }
  if (!["readiness", "quarantine", "feed"].includes(command)) throw new Error("USAGE: readiness|quarantine|feed [--db ABSOLUTE_PATH] | review-source ABSOLUTE_REVIEW_JSON");
  const at = args.indexOf("--db"), path = at >= 0 ? args[at + 1] : process.env.QETTYQ_DATABASE_PATH;
  if (!path || !isAbsolute(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error("HUB_EXPLICIT_DATABASE_REQUIRED");
  const db = new DatabaseSync(path, { readOnly: true, allowExtension: false, enableForeignKeyConstraints: true });
  try {
    const repository = createDataHubRepository(db);
    if (command === "readiness") {
      const names = ["qettyq_hub_producers", "qettyq_hub_batches", "qettyq_hub_records", "qettyq_hub_occurrences"];
      const installed = names.every(name => db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
      console.log(JSON.stringify({ installed, ...(installed ? {
        enabledProducers: Number(db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_producers WHERE enabled=1").get()?.count),
        acceptedRecords: Number(db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_records WHERE state='accepted'").get()?.count),
        quarantinedRecords: Number(db.prepare("SELECT COUNT(*) AS count FROM qettyq_hub_records WHERE state='quarantined'").get()?.count),
        threadsApproved: Boolean(db.prepare("SELECT 1 FROM data_sources WHERE id='threads-candidate' AND allow_persist=1 AND allow_display=1").get()),
      } : {}) }));
    } else if (command === "quarantine") console.log(JSON.stringify(repository.listQuarantined(50)));
    else console.log(JSON.stringify(await createPublicDataHubFeed(repository).get({ cityId: "astana" })));
  } finally { db.close(); }
}
void main().catch(() => { console.error("HUB_ADMIN_COMMAND_FAILED: verify Node24, command, explicit paths and installed schema. No changes applied."); process.exitCode = 1; });
