import { access, readFile } from "node:fs/promises";

async function main() {
  const required = ["README.md", "PRD.md", "AGENTS.md", "docs/STATUS.md", "docs/TEST_REPORT.md", "data/source-registry.json"];
  let failed = false;
  for (const file of required) {
    try { await access(file); console.log(`OK ${file}`); }
    catch { failed = true; console.error(`MISSING ${file}`); }
  }
  const env = await readFile(".env.example", "utf8");
  if (/sk-[A-Za-z0-9]/.test(env)) { failed = true; console.error("SECRET_PATTERN .env.example"); }
  if (failed) process.exit(1);
}

main().catch((error) => { console.error(error); process.exit(1); });
