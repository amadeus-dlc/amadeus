#!/usr/bin/env bun
// examples/ の v2 契約 snapshot を検証する開発用 wrapper。
// 使い方:
//   bun run dev-scripts/validate-amadeus-examples.ts --workspaces-only
//   bun run dev-scripts/validate-amadeus-examples.ts --intents-only
//   bun run dev-scripts/validate-amadeus-examples.ts --provenance
//   bun run dev-scripts/validate-amadeus-examples.ts --invariants
//   bun run dev-scripts/validate-amadeus-examples.ts --generation-plan
//   bun run dev-scripts/validate-amadeus-examples.ts --all

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const validator = join(root, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts");
const intentId = "20260703-minimum-purchase-flow";
const snapshots = [
  "examples/01-ideation-completed",
  "examples/02-inception-completed",
  "examples/03-construction-design-ready",
  "examples/04-construction-implementation-planned",
];
const provenanceManifestPath = join(root, "examples/skill-provenance.json");

type Mode = "workspaces" | "intents" | "provenance" | "invariants" | "generation-plan" | "all";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseMode(args: string[]): Mode {
  if (args.includes("--workspaces-only")) return "workspaces";
  if (args.includes("--intents-only")) return "intents";
  if (args.includes("--provenance")) return "provenance";
  if (args.includes("--invariants")) return "invariants";
  if (args.includes("--generation-plan")) return "generation-plan";
  if (args.includes("--all")) return "all";
  fail("mode を指定してください: --workspaces-only | --intents-only | --provenance | --invariants | --generation-plan | --all");
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function existingSnapshots(): string[] {
  const found = snapshots.filter((snapshot) => existsSync(join(root, snapshot, ".amadeus")));
  if (found.length === 0) {
    fail(`検証対象の snapshot がありません。examples:generate:real で生成してください: ${snapshots.join(", ")}`);
  }
  if (found.length !== snapshots.length) {
    const missing = snapshots.filter((snapshot) => !found.includes(snapshot));
    fail(`snapshot が不足しています: ${missing.join(", ")}`);
  }
  return found;
}

function validateWorkspaces(): void {
  for (const snapshot of existingSnapshots()) {
    run(["bun", "run", validator, join(root, snapshot)]);
    console.log(`workspace pass: ${snapshot}`);
  }
}

function validateIntents(): void {
  for (const snapshot of existingSnapshots()) {
    run(["bun", "run", validator, join(root, snapshot), intentId]);
    console.log(`intent pass: ${snapshot} ${intentId}`);
  }
}

function md5File(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

type SkillFileDigest = { path: string; md5?: string; staleReason?: string };
type Manifest = { version: number; entries: Array<{ snapshot: string; skillFiles: SkillFileDigest[] }> };

function validateProvenance(): void {
  if (!existsSync(provenanceManifestPath)) fail(`missing manifest: examples/skill-provenance.json`);
  const manifest = JSON.parse(readFileSync(provenanceManifestPath, "utf8")) as Manifest;
  if (manifest.version !== 1) fail(`unsupported manifest version: ${manifest.version}`);

  const manifestSnapshots = manifest.entries.map((entry) => entry.snapshot);
  for (const snapshot of snapshots) {
    if (!manifestSnapshots.includes(snapshot)) fail(`manifest に snapshot の entry がありません: ${snapshot}`);
  }

  for (const entry of manifest.entries) {
    for (const skillFile of entry.skillFiles) {
      const source = join(root, skillFile.path);
      if (!existsSync(source)) fail(`${entry.snapshot}: source skill が存在しません: ${skillFile.path}`);
      if (skillFile.md5 === undefined) {
        if (!skillFile.staleReason) fail(`${entry.snapshot}: md5 も staleReason もない entry があります: ${skillFile.path}`);
        continue;
      }
      if (md5File(source) !== skillFile.md5) {
        if (skillFile.staleReason) {
          console.log(`stale (許容): ${entry.snapshot} ${skillFile.path}: ${skillFile.staleReason}`);
          continue;
        }
        fail([
          `${entry.snapshot}: skill の md5 が一致しません: ${skillFile.path}`,
          "real provider で再生成するか、再生成できない場合は staleReason を記録してください。",
        ].join("\n"));
      }
    }
  }
  console.log("provenance: ok");
}

// ---- snapshot 不変条件 ----
// 生成時に generator が検査する状態を、コミット済み snapshot に対しても再検査する。
// 手動編集で snapshot の意味（どの段階で止まっているか）が壊れた場合に CI で検出する。

type SnapshotInvariant = {
  snapshot: string;
  state: Record<string, string>;
  unitStates?: Array<{ stage: string; state: string }>;
  allBoltStates?: string;
  files?: string[];
  absentFiles?: string[];
};

const snapshotInvariants: SnapshotInvariant[] = [
  {
    snapshot: "examples/01-ideation-completed",
    state: { schemaVersion: "2", phase: "inception", "phaseGates.ideation.via": "pr", "stages.approval-handoff.state": "completed" },
  },
  {
    snapshot: "examples/02-inception-completed",
    state: { schemaVersion: "2", phase: "construction", "phaseGates.inception.via": "pr", "stages.delivery-planning.state": "completed" },
  },
  {
    snapshot: "examples/03-construction-design-ready",
    state: { schemaVersion: "2", phase: "construction", "stages.code-generation.state": "pending" },
    unitStates: [{ stage: "functional-design", state: "completed" }],
    allBoltStates: "active",
    files: ["construction/*/functional-design/business-logic-model.md"],
    absentFiles: ["construction/*/code-generation/plan.md"],
  },
  {
    snapshot: "examples/04-construction-implementation-planned",
    state: { schemaVersion: "2", phase: "construction" },
    unitStates: [{ stage: "code-generation", state: "active" }],
    allBoltStates: "active",
    files: ["construction/*/code-generation/plan.md"],
    absentFiles: ["construction/*/code-generation/summary.md"],
  },
];

function stateValue(state: Record<string, unknown>, dottedPath: string): unknown {
  let current: unknown = state;
  for (const key of dottedPath.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function matchExists(base: string, pattern: string): boolean {
  const segments = pattern.split("/");
  let candidates = [base];
  for (const segment of segments) {
    const next: string[] = [];
    for (const candidate of candidates) {
      if (segment === "*") {
        if (!existsSync(candidate) || !statSync(candidate).isDirectory()) continue;
        for (const entry of readdirSync(candidate)) next.push(join(candidate, entry));
      } else {
        const target = join(candidate, segment);
        if (existsSync(target)) next.push(target);
      }
    }
    candidates = next;
    if (candidates.length === 0) return false;
  }
  return candidates.length > 0;
}

function validateSnapshotInvariants(): void {
  existingSnapshots();
  for (const invariant of snapshotInvariants) {
    const intentBase = join(root, invariant.snapshot, ".amadeus/intents", intentId);
    const statePath = join(intentBase, "state.json");
    if (!existsSync(statePath)) fail(`${invariant.snapshot}: state.json がありません`);
    const state = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;

    for (const [path, expected] of Object.entries(invariant.state)) {
      const actual = stateValue(state, path);
      if (String(actual ?? "") !== expected) {
        fail(`${invariant.snapshot}: state.json の ${path} が期待値と一致しません（期待: ${expected}、実際: ${String(actual ?? "未設定")}）`);
      }
    }

    for (const expected of invariant.unitStates ?? []) {
      const units = stateValue(state, `stages.${expected.stage}.units`);
      if (typeof units !== "object" || units === null || Object.keys(units).length === 0) {
        fail(`${invariant.snapshot}: stages.${expected.stage}.units に Unit がありません`);
      }
      for (const [unitId, entry] of Object.entries(units as Record<string, { state?: string }>)) {
        if (String(entry?.state ?? "") !== expected.state) {
          fail(`${invariant.snapshot}: stages.${expected.stage}.units.${unitId}.state が期待値と一致しません（期待: ${expected.state}、実際: ${String(entry?.state ?? "未設定")}）`);
        }
      }
    }

    if (invariant.allBoltStates !== undefined) {
      const bolts = stateValue(state, "bolts");
      if (typeof bolts !== "object" || bolts === null || Object.keys(bolts).length === 0) {
        fail(`${invariant.snapshot}: state.json に bolts がありません`);
      }
      for (const [boltId, entry] of Object.entries(bolts as Record<string, { state?: string }>)) {
        if (String(entry?.state ?? "") !== invariant.allBoltStates) {
          fail(`${invariant.snapshot}: bolts.${boltId}.state が期待値と一致しません（期待: ${invariant.allBoltStates}、実際: ${String(entry?.state ?? "未設定")}）`);
        }
      }
    }

    for (const pattern of invariant.files ?? []) {
      if (!matchExists(intentBase, pattern)) {
        fail(`${invariant.snapshot}: 期待する成果物が見つかりません: ${pattern}`);
      }
    }
    for (const pattern of invariant.absentFiles ?? []) {
      if (matchExists(intentBase, pattern)) {
        fail(`${invariant.snapshot}: 存在してはならない成果物が見つかりました: ${pattern}`);
      }
    }
    console.log(`invariants pass: ${invariant.snapshot}`);
  }
}

function runExpectFailure(command: string[], expected: string, cwd = root): void {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "stdout:", stdout].join("\n"));
  }
  if (!stdout.includes(expected) && !stderr.includes(expected)) {
    fail(["command failed without expected evidence: " + expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
}

function assertPlan(stdout: string, mustInclude: string[], mustExclude: string[]): void {
  for (const expected of mustInclude) {
    if (!stdout.includes(expected)) fail(`generation plan の出力に ${JSON.stringify(expected)} がありません:\n${stdout}`);
  }
  for (const excluded of mustExclude) {
    if (stdout.includes(excluded)) fail(`generation plan の出力に ${JSON.stringify(excluded)} が含まれています:\n${stdout}`);
  }
}

function validateGenerationPlan(): void {
  const generator = "dev-scripts/generate-amadeus-examples.ts";
  const stepLines = snapshots.map((snapshot) => `-> ${snapshot}`);

  // 全 step の計画。
  assertPlan(
    run(["bun", "run", generator, "--dry-run"]),
    ["provider: real", "dryRun: true", ...stepLines],
    ["input snapshot:"],
  );

  // --from 先頭は全 step と等しく、入力 snapshot を持たない。
  assertPlan(
    run(["bun", "run", generator, "--dry-run", "--from", "01-ideation-completed"]),
    ["dryRun: true", ...stepLines],
    ["input snapshot:"],
  );

  // --from 途中 step は直前 snapshot を入力にし、前段 step を対象にしない。
  assertPlan(
    run(["bun", "run", generator, "--dry-run", "--from", "02-inception-completed"]),
    ["input snapshot: examples/01-ideation-completed", stepLines[1], stepLines[2], stepLines[3]],
    ["step: 01-ideation-completed"],
  );
  assertPlan(
    run(["bun", "run", generator, "--dry-run", "--from", "03-construction-design-ready"]),
    ["input snapshot: examples/02-inception-completed", stepLines[2], stepLines[3]],
    ["step: 01-ideation-completed", "step: 02-inception-completed"],
  );
  assertPlan(
    run(["bun", "run", generator, "--dry-run", "--from", "04-construction-implementation-planned"]),
    ["input snapshot: examples/03-construction-design-ready", stepLines[3]],
    ["step: 01-ideation-completed", "step: 02-inception-completed", "step: 03-construction-design-ready"],
  );

  // 存在しない step id は、利用可能な step id を示して失敗する。
  runExpectFailure(
    ["bun", "run", generator, "--dry-run", "--from", "invalid-step"],
    "unknown --from step id",
  );

  console.log("generation plan: ok");
}

const mode = parseMode(Bun.argv.slice(2));
if (mode === "workspaces" || mode === "all") validateWorkspaces();
if (mode === "intents" || mode === "all") validateIntents();
if (mode === "provenance" || mode === "all") validateProvenance();
if (mode === "invariants" || mode === "all") validateSnapshotInvariants();
if (mode === "generation-plan" || mode === "all") validateGenerationPlan();
console.log("validate amadeus examples: ok");
