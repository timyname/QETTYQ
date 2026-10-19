import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspaceDir = "/Users/phonelab/Documents/QETTYQ";
const skillDir = "/Users/phonelab/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.11052/skills/presentations";
const stagingDir = path.join(workspaceDir, ".codex-presentations/qettyq-v2");
const candidatePath = path.join(stagingDir, "candidate.pptx");
const finalPath = path.join(workspaceDir, "exports/QETTYQ_APP_pitch_v2.pptx");
const pythonExecutable = "/Users/phonelab/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python";
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);

await fs.mkdir(stagingDir, { recursive: true });
if (await fs.stat(finalPath).then(() => true).catch(() => false)) await fs.rename(finalPath, candidatePath);
await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath,
  explicitTotalSlideCount: 9,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  pythonExecutable,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: ["Aptos"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "QETTYQ_APP_pitch_v2.pptx.validation.json"),
});
