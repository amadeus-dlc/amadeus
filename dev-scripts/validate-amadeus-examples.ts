#!/usr/bin/env bun
// examples/ の v2 契約 snapshot を検証する開発用 wrapper。
// 段階不変条件の定義は dev-scripts/examples-contract.ts に一元化し、generator と共有する。
// 使い方:
//   bun run dev-scripts/validate-amadeus-examples.ts --workspaces-only
//   bun run dev-scripts/validate-amadeus-examples.ts --intents-only
//   bun run dev-scripts/validate-amadeus-examples.ts --provenance
//   bun run dev-scripts/validate-amadeus-examples.ts --invariants
//   bun run dev-scripts/validate-amadeus-examples.ts --generation-plan
//   bun run dev-scripts/validate-amadeus-examples.ts --all

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkSnapshotInvariant, exampleIntentId, exampleSnapshots, snapshotInvariants } from "./examples-contract";

const root = resolve(import.meta.dir, "..");
const validator = join(root, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts");
const intentId = exampleIntentId;
const snapshots = exampleSnapshots;
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

// コミット済み snapshot に対して、examples-contract の段階不変条件を再検査する。
// 生成時と同じ定義を使うため、generator との鏡映漏れは起きない。
function validateSnapshotInvariants(): void {
  existingSnapshots();
  for (const invariant of snapshotInvariants) {
    const intentBase = join(root, invariant.snapshot, ".amadeus/intents", intentId);
    checkSnapshotInvariant(invariant, intentBase, fail);
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
