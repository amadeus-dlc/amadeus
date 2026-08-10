// covers: file:scripts/numeric-provenance-distribution.ts,
//         file:packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts,
//         file:packages/framework/core/sensors/amadeus-numeric-provenance.md
// size: medium

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";

import { PROJECT_INSTRUCTIONS } from "../../packages/framework/harness/claude/project-instructions.ts";
import { GENERATED_NUMERIC_PROVENANCE_MAPPING } from "../../packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts";
import { promoteSelfMain } from "../../scripts/promote-self.ts";
import {
  numericProvenanceDistributionTargets,
  resolveNumericProvenanceDistributionTargets,
  type NumericProvenanceDistributionTarget,
} from "../../scripts/numeric-provenance-distribution.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const SENSOR_ID = "numeric-provenance";
const DISTRIBUTION_TIMEOUT_MS = 120_000;
const CORE_MANIFEST = join(REPO_ROOT, "packages/framework/core/sensors/amadeus-numeric-provenance.md");
const CORE_TOOL = join(REPO_ROOT, "packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts");
const ROOT_IMPORTS = "@.agents/rules/amadeus.md\n@.agents/rules/amadeus-codex-suffix.md\n";

let projectRoot = "";
let targets: readonly NumericProvenanceDistributionTarget[] = [];

function packageRoot(target: NumericProvenanceDistributionTarget): string {
  return join(projectRoot, target.packageRoot);
}

function promotedSelfInstallRoot(target: NumericProvenanceDistributionTarget): string {
  return join(projectRoot, target.selfInstallRoot ?? "");
}

function assertContained(root: string, candidate: string): void {
  const rel = relative(realpathSync(root), realpathSync(candidate));
  expect(isAbsolute(rel)).toBe(false);
  expect(rel === ".." || rel.startsWith(`..${sep}`)).toBe(false);
}

function graphWiredStages(root: string): string[] {
  const graph = JSON.parse(readFileSync(join(root, "tools/data/stage-graph.json"), "utf8")) as Array<{
    slug: string;
    sensors_applicable: Array<{ id: string }>;
  }>;
  return graph
    .filter((node) => node.sensors_applicable.some((sensor) => sensor.id === SENSOR_ID))
    .map((node) => node.slug)
    .sort();
}

function seedIntent(root: string): { positive: string; negative: string; auditDir: string } {
  const intentsDir = join(root, "amadeus/spaces/default/intents");
  const recordName = "260811-numeric-provenance-distribution-0000abcd";
  const recordRoot = join(intentsDir, recordName);
  const auditDir = join(recordRoot, "audit");
  const positive = join(recordRoot, "construction/positive/code-generation/code-summary.md");
  const negative = join(recordRoot, "construction/negative/code-generation/code-summary.md");
  mkdirSync(auditDir, { recursive: true });
  mkdirSync(join(positive, ".."), { recursive: true });
  mkdirSync(join(negative, ".."), { recursive: true });
  writeFileSync(join(recordRoot, "amadeus-state.md"), "# AI-DLC State Tracking\n");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [
        {
          uuid: "44444444-4444-4444-8444-444444444444",
          slug: "numeric-provenance-distribution",
          dirName: recordName,
          status: "in-flight",
        },
      ],
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(intentsDir, "active-intent"), `${recordName}\n`);
  writeFileSync(positive, "`rg --files`\nThe corpus contains 10 files.\n");
  writeFileSync(negative, "The corpus contains 10 files.\n");
  return { positive, negative, auditDir };
}

function sensorRows(auditDir: string): Array<Record<string, unknown>> {
  return readdirSync(auditDir)
    .filter((name) => name.endsWith(".jsonl"))
    .sort()
    .flatMap((name) => readFileSync(join(auditDir, name), "utf8").split("\n"))
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((row) => typeof row.eventName === "string" && row.eventName.startsWith("amadeus.sensor."));
}

function preflightDeliveryTool(
  root: string,
  harnessDir: string,
  outputPath: string,
  project: string,
  expectedPass: boolean,
): void {
  const result = spawnSync(
    process.execPath,
    [join(root, "tools/amadeus-sensor-numeric-provenance.ts"), "--stage", "code-generation", "--output-path", outputPath],
    {
      cwd: project,
      encoding: "utf8",
      timeout: 30_000,
      env: { ...process.env, AMADEUS_HARNESS_DIR: harnessDir },
    },
  );
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  const verdict = JSON.parse(result.stdout) as { pass: boolean };
  expect(verdict.pass, JSON.stringify(verdict)).toBe(expectedPass);
}

function fire(
  root: string,
  harnessDir: string,
  outputPath: string,
  project: string,
): void {
  const result = spawnSync(
    process.execPath,
    [
      join(root, "tools/amadeus-sensor.ts"),
      "fire",
      SENSOR_ID,
      "--stage",
      "code-generation",
      "--output-path",
      outputPath,
      "--project-dir",
      project,
    ],
    {
      cwd: project,
      encoding: "utf8",
      timeout: DISTRIBUTION_TIMEOUT_MS,
      env: {
        ...process.env,
        AMADEUS_HARNESS_DIR: harnessDir,
        AMADEUS_STAGE_GRAPH: join(root, "tools/data/stage-graph.json"),
        AMADEUS_SENSORS_DIR: join(root, "sensors"),
        AMADEUS_SENSOR_SCRIPT_DIR: join(root, "tools"),
      },
    },
  );
  const diagnostics = `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
  expect(result.error, diagnostics).toBeUndefined();
  expect(result.signal, diagnostics).toBeNull();
  expect(result.status, diagnostics).toBe(0);
  expect(result.stdout, diagnostics).toBe("");
  expect(result.stderr, diagnostics).toBe("");
}

beforeAll(async () => {
  projectRoot = realpathSync(mkdtempSync(join(tmpdir(), "t533-numeric-provenance-distribution-")));
  targets = numericProvenanceDistributionTargets();
  // CI runs the official producer before the integration suite. Copy that
  // immutable output into a dedicated project root, then let promote-self own
  // every package -> self-install write below.
  cpSync(join(REPO_ROOT, "dist"), join(projectRoot, "dist"), { recursive: true });

  const claudeInstructions = readFileSync(join(REPO_ROOT, ".claude/CLAUDE.md"));
  mkdirSync(join(projectRoot, ".claude"), { recursive: true });
  writeFileSync(join(projectRoot, ".claude/CLAUDE.md"), claudeInstructions);
  writeFileSync(join(projectRoot, "AGENTS.md"), ROOT_IMPORTS);
  writeFileSync(
    join(projectRoot, "CLAUDE.md"),
    Buffer.concat([Buffer.from(PROJECT_INSTRUCTIONS, "utf8"), claudeInstructions]),
  );

  const promoted = await promoteSelfMain(["--apply", "--no-build"], projectRoot, () => undefined, null);
  expect(promoted).toBe(0);
}, DISTRIBUTION_TIMEOUT_MS);

afterAll(() => {
  if (projectRoot !== "") rmSync(projectRoot, { recursive: true, force: true });
}, DISTRIBUTION_TIMEOUT_MS);

describe("t533 numeric provenance distribution", () => {
  test("fails closed for registry drift, duplicate roots, and unsafe manifest paths", () => {
    const manifest = (name: string, harnessDir: string) => ({ name, harnessDir });
    const valid = {
      packageIds: ["claude", "codex"],
      selfInstallIds: ["claude"],
      discoveredPackageIds: ["codex", "claude"],
      promotedSelfInstallIds: ["claude"],
      manifestFor: (id: string) => manifest(id, `.${id}`),
    };

    expect(() =>
      resolveNumericProvenanceDistributionTargets({ ...valid, discoveredPackageIds: ["claude"] }),
    ).toThrow("package-harness-set-mismatch");
    expect(() =>
      resolveNumericProvenanceDistributionTargets({ ...valid, packageIds: ["claude", "claude"] }),
    ).toThrow("duplicate-package-harness-id");
    expect(() =>
      resolveNumericProvenanceDistributionTargets({
        ...valid,
        selfInstallIds: ["claude", "codex"],
        promotedSelfInstallIds: ["claude", "codex"],
        manifestFor: (id) => manifest(id, ".shared"),
      }),
    ).toThrow("duplicate-self-install-root");
    expect(() =>
      resolveNumericProvenanceDistributionTargets({
        ...valid,
        manifestFor: (id) => manifest(id, id === "claude" ? "../escape" : `.${id}`),
      }),
    ).toThrow("unsafe-harness-directory");
  });

  test("projects identical tool, manifest, metadata, and wiring to every package harness", () => {
    const packageTargets = targets.map((target) => target.id).sort();
    expect(packageTargets).toEqual(["claude", "codex", "cursor", "kimi", "kiro", "kiro-ide", "opencode", "pi"]);
    for (const target of targets) {
      const root = packageRoot(target);
      assertContained(join(projectRoot, "dist", target.id), root);
      expect(readFileSync(join(root, "tools/amadeus-sensor-numeric-provenance.ts"))).toEqual(readFileSync(CORE_TOOL));
      const manifest = readFileSync(join(root, "sensors/amadeus-numeric-provenance.md"));
      const expectedManifest = readFileSync(CORE_MANIFEST, "utf8").replaceAll("{{HARNESS_DIR}}", target.harnessDir);
      expect(manifest.toString("utf8")).toBe(expectedManifest);
      expect(manifest.toString("utf8")).toContain("default_severity: advisory");
      expect(graphWiredStages(root)).toEqual([...GENERATED_NUMERIC_PROVENANCE_MAPPING.wiredStages].sort());

      const metadata = JSON.parse(readFileSync(join(root, "tools/data/harness.json"), "utf8")) as {
        name: string;
        harnessDir: string;
      };
      expect(metadata).toMatchObject({ name: target.id, harnessDir: target.harnessDir });
      expect(isAbsolute(metadata.harnessDir)).toBe(false);
      expect(metadata.harnessDir.split(/[\\/]/u)).not.toContain("..");
    }
  });

  test("fires paired pass and failure audit terminals from every self-install harness", () => {
    const selfInstallTargets = targets.filter((target) => target.selfInstallRoot !== null);
    expect(selfInstallTargets.map((target) => target.id).sort()).toEqual(["claude", "codex", "cursor", "kimi", "opencode"]);
    const fixture = seedIntent(projectRoot);

    for (const target of selfInstallTargets) {
      const promotedRoot = promotedSelfInstallRoot(target);
      assertContained(projectRoot, promotedRoot);
      expect(readFileSync(join(promotedRoot, "tools/amadeus-sensor-numeric-provenance.ts"))).toEqual(
        readFileSync(join(packageRoot(target), "tools/amadeus-sensor-numeric-provenance.ts")),
      );
      expect(readFileSync(join(promotedRoot, "sensors/amadeus-numeric-provenance.md"))).toEqual(
        readFileSync(join(packageRoot(target), "sensors/amadeus-numeric-provenance.md")),
      );
      for (const [outputPath, expectedPass, terminal] of [
        [fixture.positive, true, "amadeus.sensor.passed"],
        [fixture.negative, false, "amadeus.sensor.failed"],
      ] as const) {
        preflightDeliveryTool(promotedRoot, target.harnessDir, outputPath, projectRoot, expectedPass);
        const before = sensorRows(fixture.auditDir).length;
        fire(promotedRoot, target.harnessDir, outputPath, projectRoot);
        const rows = sensorRows(fixture.auditDir).slice(before);
        expect(rows.map((row) => row.eventName), JSON.stringify(rows[1]?.attributes)).toEqual([
          "amadeus.sensor.fired",
          terminal,
        ]);
        const firedAttrs = rows[0]?.attributes as Record<string, unknown>;
        const terminalAttrs = rows[1]?.attributes as Record<string, unknown>;
        expect(firedAttrs["Sensor ID"]).toBe(SENSOR_ID);
        expect(firedAttrs["Stage slug"]).toBe("code-generation");
        expect(terminalAttrs["Fire id"]).toBe(firedAttrs["Fire id"]);
      }
    }
  }, DISTRIBUTION_TIMEOUT_MS);
});
