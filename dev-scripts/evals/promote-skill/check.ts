#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], cwd = root): [string, string] {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return [stdout, stderr];
}

function amadeusSkills(): string[] {
  return readdirSync(join(root, "core/skills"))
    .filter(
      (entry) =>
        (entry === "amadeus" || entry.startsWith("amadeus-")) && statSync(join(root, "core/skills", entry)).isDirectory(),
    )
    .sort();
}

function policyManagedInternalSkills(): string[] {
  return [
    "amadeus-domain-modeling",
    "amadeus-grilling",
  ].sort();
}

function listPaths(rootPath: string): string[] {
  if (!existsSync(rootPath)) return [];
  const results: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const next = join(current, entry);
      results.push(relative(rootPath, next));
      if (statSync(next).isDirectory()) visit(next);
    }
  };
  visit(rootPath);
  return results.sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCodexMetadata(path: string, text: string): unknown {
  try {
    return Bun.YAML.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`invalid Codex metadata YAML for internal skill: ${relative(root, path)}: ${detail}`);
  }
}

function disablesImplicitInvocation(metadata: unknown): boolean {
  if (!isRecord(metadata)) return false;
  const policy = metadata.policy;
  if (!isRecord(policy)) return false;
  return policy.allow_implicit_invocation === false;
}

run(["bun", "run", "dev-scripts/promote-skill.ts", "amadeus-grilling", "--dry-run"]);
run(["bun", "run", "dev-scripts/promote-skill.ts", "amadeus", "--dry-run"]);
run(["bun", "run", "dev-scripts/promote-skill.ts", "amadeus-validator", "--dry-run"]);
runExpectFailure(["bun", "run", "dev-scripts/promote-skill.ts", "amadeus-grilling"]);

for (const skill of policyManagedInternalSkills()) {
  for (const base of ["harness/codex/skills", ".agents/skills"]) {
    const metadataPath = join(root, base, skill, "agents/openai.yaml");
    if (!existsSync(metadataPath)) fail(`missing Codex metadata for internal skill: ${relative(root, metadataPath)}`);
    const metadata = parseCodexMetadata(metadataPath, await Bun.file(metadataPath).text());
    if (!disablesImplicitInvocation(metadata)) {
      fail(`internal skill must disable implicit invocation: ${relative(root, metadataPath)}`);
    }
  }
}

const promoteAllRoot = mkdtempSync(join(tmpdir(), "amadeus-promote-all"));
const agentsRoot = join(promoteAllRoot, ".agents/skills");

for (const skill of amadeusSkills()) {
  run(["bun", "run", "dev-scripts/promote-skill.ts", skill, "--agents-root", agentsRoot]);
}

// Harness overlay (後勝ち) — mirror build.ts Step 3 so the temp dir matches
// the full three-layer build output committed in .agents/skills/.
// Without this step the diff below would flag every harness/codex openai.yaml.
{
  const harnessRoot = join(root, "harness", "codex", "skills");
  if (existsSync(harnessRoot)) {
    for (const name of readdirSync(harnessRoot)) {
      const harnessAgentsDir = join(harnessRoot, name, "agents");
      if (!existsSync(harnessAgentsDir) || !statSync(harnessAgentsDir).isDirectory()) continue;
      const dstAgentsDir = join(agentsRoot, name, "agents");
      mkdirSync(dstAgentsDir, { recursive: true });
      for (const file of readdirSync(harnessAgentsDir)) {
        const from = join(harnessAgentsDir, file);
        const to = join(dstAgentsDir, file);
        if (statSync(from).isFile()) cpSync(from, to);
      }
    }
  }
}

const disallowed = listPaths(agentsRoot).filter((path) => {
  const parts = path.split("/");
  return parts.some((part) => [
    "dev-scripts",
    "evals",
    "eval-runs",
    "tmp",
    "benchmarks",
    "review-output",
    "tests",
    ".venv",
    ".pytest_cache",
    "__pycache__",
    "justfile",
  ].includes(part)) || path === "scripts/ci" || path.startsWith("scripts/ci/");
});
if (disallowed.length > 0) fail(`disallowed promoted files remain:\n${disallowed.join("\n")}`);

for (const skill of amadeusSkills()) {
  run(["diff", "-qr", join(agentsRoot, skill), `.agents/skills/${skill}`]);
}

const violationRoot = mkdtempSync(join(tmpdir(), "amadeus-promote-violation"));
const violationAgentsRoot = join(violationRoot, ".agents/skills");
mkdirSync(join(violationAgentsRoot, "amadeus-grilling/evals"), { recursive: true });
writeFileSync(join(violationAgentsRoot, "amadeus-grilling/evals/keep.txt"), "x");
runExpectFailure([
  "bun",
  "run",
  "dev-scripts/promote-skill.ts",
  "amadeus-grilling",
  "--dry-run",
  "--agents-root",
  violationAgentsRoot,
]);

run(["git", "diff", "--check"]);

console.log("promote skill eval: ok");
