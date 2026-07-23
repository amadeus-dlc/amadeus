// covers: subcommand:amadeus-sensor-required-sections, function:templateEligibleArtifacts, function:memoryTemplatesDir, function:frameworkTemplatesDir
//
// t155 — TPL: the template-override layer (one file, two readers).
//
// The template-override layer lets a team author one file per output artifact
// at amadeus/memory/templates/<artifact>.md, read by TWO consumers keyed off the
// output filename stem: the agent (fills the skeleton — knowledge, exercised by
// the stage-protocol clause, not a tool) and the required-sections sensor
// (verifies the `##` headings — determinism, exercised here). Whole-doc,
// advisory.
//
// This file exercises the DETERMINISM half at the PROCESS boundary: it spawns
// the real per-sensor script (amadeus-sensor-required-sections.ts) via
// node:child_process spawnSync — the same boundary t133 uses for the
// edge-block branch — passing the dispatcher-threaded flags --templates-dir +
// --template-eligible directly, plus the in-process function unit
// templateEligibleArtifacts (graph.ts). Asserted properties:
//
//   1. Resolution: a template at <dir>/<stem>.md whose `##` set ⊆ output → pass.
//   2. Precise findings: a template heading the output lacks → fail, the
//      missing heading reported verbatim, findings_count == #missing.
//   3. Override-before-default keyed by basename(outputPath) stem: a
//      multi-artifact stage resolves EACH artifact against its own template
//      (requirements.md vs architecture.md), distinctly.
//   4. Third branch (no template): output keeps the generic >=2-H2 floor.
//   5. Eligibility gating (the MUST-FIX hazard): an INELIGIBLE artifact's
//      resolved template is IGNORED (kept on the floor) + a config_warning is
//      surfaced — so a team dropping requirements-analysis-questions.md does
//      NOT get spurious findings against a deliberately-not->=2-H2 file.
//   6. Advisory severity preserved: the manifest default_severity stays advisory
//      and the script still exits 0 on a template fail (verdict is data, not an
//      exit code).
//   7. Same-file invariant: the bytes the agent would fill (the template file)
//      ARE the bytes the sensor parses for its expected set — no drift.
//
// Mechanism: cli (spawnSync of the bun script) for the sensor cases + none
// (in-process import) for the templateEligibleArtifacts cases. No LLM, no
// tokens — byte-reproducible.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AMADEUS_SRC, toPortablePath } from "../harness/fixtures.ts";
// Import the function unit from the SHIPPED tree (dist), the same tree the
// spawned SENSOR script runs from — so the in-process unit and the cli boundary
// agree on exactly what ships. AMADEUS_SRC = <REPO_ROOT>/dist/claude/.claude, so
// from tests/unit/ that is ../../dist/claude/.claude/tools/amadeus-graph.ts.
import {
	memoryTemplatesDir,
	templateEligibleArtifacts,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { existsSync, readdirSync } from "node:fs";

const BUN = process.execPath; // the bun running this test
const SENSOR = join(AMADEUS_SRC, "tools", "amadeus-sensor-required-sections.ts");

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

// A fresh temp workspace: an output dir, the TEAM templates dir (the override
// source amadeus/memory/templates/), and the FRAMEWORK-default templates dir (the
// engine-shipped middle tier). Torn down in afterAll.
function makeWorkspace(): {
  root: string;
  outDir: string;
  templatesDir: string;
  frameworkDir: string;
} {
  let root = mkdtempSync(join(tmpdir(), "amadeus-t155-"));
  root = toPortablePath(root);
  tempDirs.push(root);
  const outDir = join(root, "out");
  const templatesDir = join(root, "amadeus", "memory", "templates");
  const frameworkDir = join(root, "framework-templates");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(templatesDir, { recursive: true });
  mkdirSync(frameworkDir, { recursive: true });
  return { root, outDir, templatesDir, frameworkDir };
}

function writeFile(path: string, body: string): void {
  writeFileSync(path, body, "utf-8");
}

interface SensorResult {
  pass: boolean;
  h2_count: number;
  headings: string[];
  findings_count: number;
  template?: string;
  template_expected?: string[];
  template_missing?: string[];
  config_warning?: string;
  edge_block?: string;
  marker_exempt?: boolean;
  raw: string;
  status: number | null;
}

// Spawn the per-sensor script the way the dispatcher does (threading
// --templates-dir + --template-eligible). templatesDir/eligible optional so the
// no-template (third) branch is exercisable.
function runSensor(opts: {
  stage: string;
  outputPath: string;
  templatesDir?: string;
  frameworkTemplatesDir?: string;
  eligible?: string[];
}): SensorResult {
  const args = [SENSOR, "--stage", opts.stage, "--output-path", opts.outputPath];
  if (opts.templatesDir !== undefined) {
    args.push("--templates-dir", opts.templatesDir);
  }
  if (opts.frameworkTemplatesDir !== undefined) {
    args.push("--framework-templates-dir", opts.frameworkTemplatesDir);
  }
  if (opts.templatesDir !== undefined || opts.frameworkTemplatesDir !== undefined) {
    args.push("--template-eligible", (opts.eligible ?? []).join(","));
  }
  const res = spawnSync(BUN, args, { encoding: "utf-8" });
  const raw = res.stdout ?? "";
  const parsed = JSON.parse(raw.trim());
  return { ...parsed, raw, status: res.status };
}

describe("t155 templateEligibleArtifacts (function unit, in-process)", () => {
  test("filters out -questions and -timestamp markers, keeps prose artifacts", () => {
    const produces = [
      "requirements",
      "requirements-analysis-questions",
      "business-overview",
      "reverse-engineering-timestamp",
    ];
    expect(templateEligibleArtifacts(produces)).toEqual([
      "requirements",
      "business-overview",
    ]);
  });

  test("empty / nullish produces → empty eligible set", () => {
    expect(templateEligibleArtifacts([])).toEqual([]);
    // biome-ignore lint/suspicious/noExplicitAny: deliberately exercising nullish guard
    expect(templateEligibleArtifacts(undefined as any)).toEqual([]);
  });
});

describe("t155 template-override sensor branch (cli, spawnSync)", () => {
  // 1 — resolution: template `##` set ⊆ output → pass, template:"applied".
  test("resolved template, all headings present → pass + template:applied", () => {
    const ws = makeWorkspace();
    writeFile(
      join(ws.templatesDir, "requirements.md"),
      "# Requirements\n\n## Functional Requirements\n\n## Constraints\n",
    );
    const out = join(ws.outDir, "requirements.md");
    writeFile(
      out,
      "# Requirements\n\n## Functional Requirements\nF1\n\n## Constraints\nC1\n## Extra\nbonus\n",
    );
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir,
      eligible: ["requirements"],
    });
    expect(r.template).toBe("applied");
    expect(r.template_expected).toEqual([
      "## Functional Requirements",
      "## Constraints",
    ]);
    expect(r.template_missing).toEqual([]);
    expect(r.pass).toBe(true);
    expect(r.findings_count).toBe(0);
    expect(r.status).toBe(0);
  });

  // 2 — precise findings: a template heading the output lacks.
  test("resolved template, missing heading → fail + precise missing finding", () => {
    const ws = makeWorkspace();
    writeFile(
      join(ws.templatesDir, "requirements.md"),
      "# Requirements\n\n## Functional Requirements\n\n## Non-Functional Requirements\n\n## Constraints\n",
    );
    const out = join(ws.outDir, "requirements.md");
    // Output has Functional + Constraints but NOT Non-Functional.
    writeFile(
      out,
      "# Requirements\n\n## Functional Requirements\nF1\n\n## Constraints\nC1\n",
    );
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir,
      eligible: ["requirements"],
    });
    expect(r.template).toBe("applied");
    expect(r.template_missing).toEqual(["## Non-Functional Requirements"]);
    expect(r.findings_count).toBe(1);
    expect(r.pass).toBe(false);
    // Advisory: verdict is data, exit still 0.
    expect(r.status).toBe(0);
  });

  // 3 — override-before-default keyed by stem: a multi-artifact stage resolves
  // EACH artifact against its own template, distinctly. reverse-engineering
  // produces both business-overview and architecture (verified produces list).
  test("multi-artifact stage resolves each artifact by its own stem-keyed template", () => {
    const ws = makeWorkspace();
    writeFile(
      join(ws.templatesDir, "business-overview.md"),
      "## Mission\n\n## Domain\n",
    );
    writeFile(
      join(ws.templatesDir, "architecture.md"),
      "## Components\n\n## Data Flow\n",
    );
    const eligible = ["business-overview", "architecture"];

    // business-overview output: matches its template → pass.
    const bo = join(ws.outDir, "business-overview.md");
    writeFile(bo, "## Mission\nm\n\n## Domain\nd\n");
    const rbo = runSensor({
      stage: "reverse-engineering",
      outputPath: bo,
      templatesDir: ws.templatesDir,
      eligible,
    });
    expect(rbo.template).toBe("applied");
    expect(rbo.template_expected).toEqual(["## Mission", "## Domain"]);
    expect(rbo.pass).toBe(true);

    // architecture output: missing Data Flow → fail against ITS template only.
    const arch = join(ws.outDir, "architecture.md");
    writeFile(arch, "## Components\nc\n\n## Notes\nn\n");
    const rarch = runSensor({
      stage: "reverse-engineering",
      outputPath: arch,
      templatesDir: ws.templatesDir,
      eligible,
    });
    expect(rarch.template).toBe("applied");
    expect(rarch.template_expected).toEqual(["## Components", "## Data Flow"]);
    expect(rarch.template_missing).toEqual(["## Data Flow"]);
    expect(rarch.pass).toBe(false);
  });

  // 4 — third branch: no template resolves → generic >=2-H2 floor.
  test("no template resolves → generic >=2-H2 floor (template field absent)", () => {
    const ws = makeWorkspace();
    const out = join(ws.outDir, "requirements.md");
    writeFile(out, "# Requirements\n\n## One\n\n## Two\n");
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir, // dir exists but no requirements.md in it
      eligible: ["requirements"],
    });
    expect(r.template).toBeUndefined();
    expect(r.raw.includes("template")).toBe(false);
    expect(r.h2_count).toBe(2);
    expect(r.pass).toBe(true);
  });

  test("third branch holds even with no --templates-dir flag at all (bare call)", () => {
    const ws = makeWorkspace();
    const out = join(ws.outDir, "requirements.md");
    writeFile(out, "# R\n\n## Only One\n");
    const r = runSensor({ stage: "requirements-analysis", outputPath: out });
    expect(r.template).toBeUndefined();
    expect(r.h2_count).toBe(1);
    expect(r.pass).toBe(false); // <2 H2 fails the generic floor
    expect(r.findings_count).toBe(1);
  });

  // --- §10 MIDDLE branch: framework-default templates (team → framework → floor) ---

  // 5 — framework default applies when the team dir misses (the new middle tier).
  test("framework-default template applies when team dir has none → template:applied", () => {
    const ws = makeWorkspace();
    // team dir empty; framework dir ships requirements.md.
    writeFile(
      join(ws.frameworkDir, "requirements.md"),
      "# Requirements\n\n## Functional Requirements\n\n## Constraints\n",
    );
    const out = join(ws.outDir, "requirements.md");
    writeFile(out, "# Requirements\n\n## Functional Requirements\nF1\n"); // missing Constraints
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir, // exists, no requirements.md
      frameworkTemplatesDir: ws.frameworkDir,
      eligible: ["requirements"],
    });
    expect(r.template).toBe("applied");
    expect(r.template_expected).toEqual(["## Functional Requirements", "## Constraints"]);
    expect(r.template_missing).toEqual(["## Constraints"]);
    expect(r.pass).toBe(false);
  });

  // 6 — override-before-default: TEAM template WINS over framework default.
  test("team template overrides framework default (first hit wins)", () => {
    const ws = makeWorkspace();
    writeFile(
      join(ws.templatesDir, "requirements.md"),
      "# Team\n\n## Team Section A\n\n## Team Section B\n",
    );
    writeFile(
      join(ws.frameworkDir, "requirements.md"),
      "# Framework\n\n## Framework Only\n",
    );
    const out = join(ws.outDir, "requirements.md");
    writeFile(out, "# Requirements\n\n## Team Section A\nx\n## Team Section B\ny\n");
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir,
      frameworkTemplatesDir: ws.frameworkDir,
      eligible: ["requirements"],
    });
    // Expected set is the TEAM headings, not the framework's.
    expect(r.template).toBe("applied");
    expect(r.template_expected).toEqual(["## Team Section A", "## Team Section B"]);
    expect(r.pass).toBe(true);
  });

  // 7 — GA reality: framework dir present but EMPTY (zero default files) → floor.
  test("empty framework dir (GA default) falls through to the generic floor", () => {
    const ws = makeWorkspace();
    const out = join(ws.outDir, "requirements.md");
    writeFile(out, "# Requirements\n\n## One\n\n## Two\n");
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir, // empty
      frameworkTemplatesDir: ws.frameworkDir, // empty (the shipped GA state)
      eligible: ["requirements"],
    });
    expect(r.template).toBeUndefined();
    expect(r.h2_count).toBe(2);
    expect(r.pass).toBe(true);
  });

  // 8 — eligibility gate still applies to a framework-default resolution: the
  // template is IGNORED + config_warning surfaced (gate unchanged). Post-#1296,
  // the marker is also floor-exempt (E-FVEPD) → pass:true + marker_exempt:true.
  test("framework default for an ineligible marker is ignored + config_warning; marker floor-exempt", () => {
    const ws = makeWorkspace();
    writeFile(
      join(ws.frameworkDir, "intent-questions.md"),
      "## Q1\n\n## Q2\n\n## Q3\n",
    );
    const out = join(ws.outDir, "intent-questions.md");
    writeFile(out, "# Q\n\n## Only One\n");
    const r = runSensor({
      stage: "intent-capture",
      outputPath: out,
      frameworkTemplatesDir: ws.frameworkDir,
      eligible: [], // intent-questions NOT eligible
    });
    // Eligibility gate unchanged: template ignored + config_warning emitted.
    expect(r.template).toBe("ineligible");
    expect(r.config_warning).toBeDefined();
    // #1296: the marker is exempt from the generic floor (was pass:false).
    expect(r.marker_exempt).toBe(true);
    expect(r.pass).toBe(true);
  });

  // 5 — eligibility gating (the MUST-FIX hazard). A team drops a template for
  // a questions marker; it must be IGNORED + warned, NOT applied. Post-#1296 the
  // marker is additionally floor-exempt (E-FVEPD): the ignored-template path is
  // unchanged (template:ineligible + config_warning), but the verdict is now the
  // exemption (pass:true + marker_exempt:true), not the pre-fix floor fail.
  test("ineligible marker: resolved template ignored + config_warning; marker floor-exempt", () => {
    const ws = makeWorkspace();
    // Team authored a template for a questions marker (unsound stem key).
    writeFile(
      join(ws.templatesDir, "requirements-analysis-questions.md"),
      "## Q1\n\n## Q2\n\n## Q3\n",
    );
    const out = join(ws.outDir, "requirements-analysis-questions.md");
    // The actual questions file is intentionally NOT >=2-H2 shaped.
    writeFile(out, "## Questions\n[Q]: ...\n[Answer]: ...\n");
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir,
      // eligible set EXCLUDES the questions marker (dispatcher-filtered).
      eligible: ["requirements"],
    });
    // Eligibility gate unchanged: template ignored, precise config_warning, no
    // template_missing (the 3-heading template set was NOT applied).
    expect(r.template).toBe("ineligible");
    expect(typeof r.config_warning).toBe("string");
    expect(r.config_warning).toContain("requirements-analysis-questions.md");
    expect(r.template_missing).toBeUndefined();
    // #1296: h2_count is still reported (1), but the marker is exempt from the
    // floor — pass:true + marker_exempt:true + zero findings, NOT the pre-fix
    // pass:false / findings_count:1 floor fail.
    expect(r.h2_count).toBe(1);
    expect(r.marker_exempt).toBe(true);
    expect(r.pass).toBe(true);
    expect(r.findings_count).toBe(0);
    expect(r.status).toBe(0); // advisory
  });

  // 7 — same-file invariant: the template the sensor's expected set comes from
  // IS the file the agent fills. Read both ends, assert byte-identity of the
  // heading set the sensor reports vs the template file on disk.
  test("same-file invariant: sensor expected set == the template file headings", () => {
    const ws = makeWorkspace();
    const templateBody =
      "# Skeleton\n\n## Alpha\nfill me\n\n## Beta\nfill me\n";
    const templatePath = join(ws.templatesDir, "requirements.md");
    writeFile(templatePath, templateBody);
    const out = join(ws.outDir, "requirements.md");
    writeFile(out, "# Out\n\n## Alpha\nx\n\n## Beta\ny\n");
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
      templatesDir: ws.templatesDir,
      eligible: ["requirements"],
    });
    // Derive the expected set independently from the SAME template file bytes.
    const headingsFromTemplate = templateBody
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("## "));
    expect(r.template_expected).toEqual(headingsFromTemplate);
    expect(r.pass).toBe(true);
  });

  // 8 - REGRESSION (the dispatcher default-path BLOCKER). The dispatcher's
  // default --templates-dir MUST resolve to the SAME location SEED ships the
  // templates/ floor. The original bug defaulted to <pd>/amadeus/memory/templates
  // while SEED ships <pd>/amadeus/spaces/default/memory/templates - a clean miss
  // that silently disabled every team template at the real runtime path. The
  // other tests never caught it because they ALWAYS inject an explicit
  // --templates-dir. These pin the default-path computation (now derived via
  // memoryTemplatesDir from the same MEMORY_SEGMENTS the rules resolver +
  // packager use) and cross-check it against where dist actually ships, so the
  // sensor lookup and the ship location can never drift apart again.
  test("memoryTemplatesDir resolves under spaces/default/memory (the ship + resolver root)", () => {
    const td = memoryTemplatesDir("/ws").replace(/\\/g, "/");
    expect(td).toBe("/ws/amadeus/spaces/default/memory/templates");
    // NOT the old buggy default the BLOCKER shipped.
    expect(td).not.toBe("/ws/amadeus/memory/templates");
  });

  test("the dispatcher default templates dir matches where the packager SHIPS the floor", () => {
    // AMADEUS_SRC = <repo>/dist/claude/.claude; the shipped tree's workspace root
    // is its parent (<repo>/dist/claude), where amadeus/ is emitted.
    const shippedWorkspaceRoot = join(AMADEUS_SRC, "..");
    const dispatcherDefault = memoryTemplatesDir(shippedWorkspaceRoot);
    // The default the dispatcher computes must point at a real shipped dir...
    expect(existsSync(dispatcherDefault)).toBe(true);
    // ...the templates/ floor SEED ships (the .gitkeep guarantees it exists).
    expect(readdirSync(dispatcherDefault)).toContain(".gitkeep");
  });
});

// Issue #1296 — marker exemption (E-FVEPD). A `*-questions.md` / `*-timestamp.md`
// marker intentionally omits the ≥2-H2 prose shape, so it must be EXEMPTED from
// the generic floor (pass:true + marker_exempt:true), not failed by it. The
// non-marker floor stays healthy (control), and the marker_exempt field is
// absent for non-markers (no silent field on the prose path).
describe("t155 marker floor exemption (cli, spawnSync) — Issue #1296 / E-FVEPD", () => {
  // A single-line marker body: H2 == 0, which pre-fix failed the generic floor.
  const MARKER_BODY =
    "Discovered: 2026-07-20T06:43:20Z at commit d588c117a1e83ac6bac74bf586294d4db1a26add\n";

  test("-timestamp marker: single-line body → pass:true + marker_exempt:true (floor exempted)", () => {
    const ws = makeWorkspace();
    const out = join(ws.outDir, "practices-discovery-timestamp.md");
    writeFile(out, MARKER_BODY);
    const r = runSensor({
      stage: "practices-discovery",
      outputPath: out,
    });
    expect(r.h2_count).toBe(0); // intentionally not ≥2-H2
    expect(r.pass).toBe(true); // exempted, NOT failed by the floor
    expect(r.marker_exempt).toBe(true);
    expect(r.findings_count).toBe(0);
    expect(r.status).toBe(0);
  });

  test("-questions marker: [Answer]-style body → pass:true + marker_exempt:true (floor exempted)", () => {
    const ws = makeWorkspace();
    const out = join(ws.outDir, "requirements-analysis-questions.md");
    writeFile(out, "## Questions\n[Q]: ...\n[Answer]: ...\n"); // 1 H2 < floor
    const r = runSensor({
      stage: "requirements-analysis",
      outputPath: out,
    });
    expect(r.pass).toBe(true); // exempted regardless of h2_count
    expect(r.marker_exempt).toBe(true);
    expect(r.findings_count).toBe(0);
    expect(r.status).toBe(0);
  });

  test("non-marker prose (h2<2) still fails the floor, marker_exempt absent (control)", () => {
    const ws = makeWorkspace();
    const out = join(ws.outDir, "requirements.md");
    writeFile(out, "# R\n\n## Only One\n"); // 1 H2 — below the floor
    const r = runSensor({ stage: "requirements-analysis", outputPath: out });
    expect(r.pass).toBe(false); // floor still governs non-markers (FR-3)
    expect(r.findings_count).toBe(1);
    expect(r.marker_exempt).toBeUndefined();
    expect(r.raw.includes("marker_exempt")).toBe(false);
  });
});
