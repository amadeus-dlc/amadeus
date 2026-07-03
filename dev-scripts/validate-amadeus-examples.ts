#!/usr/bin/env bun
// examples/ の v2 契約 snapshot を検証する開発用 wrapper。
// 使い方:
//   bun run dev-scripts/validate-amadeus-examples.ts --workspaces-only
//   bun run dev-scripts/validate-amadeus-examples.ts --intents-only
//   bun run dev-scripts/validate-amadeus-examples.ts --provenance
//   bun run dev-scripts/validate-amadeus-examples.ts --generation-plan
//   bun run dev-scripts/validate-amadeus-examples.ts --all

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const validator = join(root, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts");
const intentId = "20260703-minimum-purchase-flow";
const snapshots = [
  "examples/01-ideation-completed",
  "examples/02-inception-completed",
  "examples/03-construction-design-ready",
];
const provenanceManifestPath = join(root, "examples/skill-provenance.json");

type Mode = "workspaces" | "intents" | "provenance" | "generation-plan" | "all";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseMode(args: string[]): Mode {
  if (args.includes("--workspaces-only")) return "workspaces";
  if (args.includes("--intents-only")) return "intents";
  if (args.includes("--provenance")) return "provenance";
  if (args.includes("--generation-plan")) return "generation-plan";
  if (args.includes("--all")) return "all";
  fail("mode を指定してください: --workspaces-only | --intents-only | --provenance | --generation-plan | --all");
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

function validateGenerationPlan(): void {
  const stdout = run(["bun", "run", "dev-scripts/generate-amadeus-examples.ts", "--dry-run"]);
  for (const expected of [
    "provider: real",
    "dryRun: true",
    ...snapshots.map((snapshot) => `-> ${snapshot}`),
  ]) {
    if (!stdout.includes(expected)) fail(`generation plan の出力に ${JSON.stringify(expected)} がありません:\n${stdout}`);
  }
  console.log("generation plan: ok");
}

const mode = parseMode(Bun.argv.slice(2));
if (mode === "workspaces" || mode === "all") validateWorkspaces();
if (mode === "intents" || mode === "all") validateIntents();
if (mode === "provenance" || mode === "all") validateProvenance();
if (mode === "generation-plan" || mode === "all") validateGenerationPlan();
console.log("validate amadeus examples: ok");
