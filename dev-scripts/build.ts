#!/usr/bin/env bun

// build.ts — Amadeus DLC three-layer build tool (Issue #572, B001 walking skeleton)
//
// Copies core/ + harness/ → generated outputs (.agents/, .claude/ symlinks).
// Designed to be deterministic: given the same inputs, it always produces the
// same outputs.  A second run is byte/link-identical to the first (idempotent).
//
// Steps:
//   Step 1: Engine copy  — core/<dir>/ → .agents/amadeus/<dir>/  (7 dirs)
//   Step 2: Skill copy   — core/skills/<name>/ → .agents/skills/<name>/
//             (promote-skill.ts semantics: allowedEntries, disallowedNames)
//   Step 3: Harness overlay (後勝ち) — harness/codex/skills/<name>/agents/ →
//             .agents/skills/<name>/agents/  (overwrites Step 2 output)
//   Step 4: Symlink reproduction — harness/claude/wiring.json → .claude/
//   Step 5: Model overlay (fail-soft) — apply-model-overrides.ts equivalent
//   Step 6: #543 hook — design-only, silently skipped (not yet implemented)
//
// Flags:
//   --root <dir>   Root directory to operate on (default: process.cwd())
//   --check        After building, run git diff --exit-code on generated paths
//                  to verify the working tree matches the committed baseline.

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { applyModelOverrides } from "./apply-model-overrides";

// ---------------------------------------------------------------------------
// Promote semantics — mirrored from promote-skill.ts (source of truth).
// Keep in sync with promote-skill.ts:7-23 until B003 retires it.
// ---------------------------------------------------------------------------

const alwaysAllowedFiles: string[] = ["SKILL.md", "pyproject.toml", "uv.lock"];
const alwaysAllowedDirs: string[] = ["references", "scripts", "assets", "templates", "agents"];
const conditionalDirs: string[] = ["validator", "eval-viewer"];
const disallowedNames = new Set([
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
  ".gitignore",
]);
const disallowedPaths: string[] = ["scripts/ci"];

// ---------------------------------------------------------------------------
// Engine directories (7) — top-level dirs under core/ that map to
// .agents/amadeus/<dir>/.  Same set as scripts/amadeus-install.ts ENGINE_DIR_NAMES.
// ---------------------------------------------------------------------------

const ENGINE_DIRS: string[] = [
  "agents",
  "amadeus-common",
  "hooks",
  "knowledge",
  "scopes",
  "sensors",
  "tools",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// Read SKILL.md body for a skill source directory.
function skillBody(source: string): string {
  return readFileSync(join(source, "SKILL.md"), "utf8");
}

// Whether a conditionalDir name is referenced in the SKILL.md body.
function referenced(body: string, name: string): boolean {
  return (
    body.includes(`${name}/`) ||
    body.includes(`\`${name}\``) ||
    body.includes(`<skill-dir>/${name}`)
  );
}

// Compute the list of entries to copy from a skill source directory
// (mirrors promote-skill.ts allowedEntries function).
function allowedEntries(source: string): string[] {
  const body = skillBody(source);
  const entries: string[] = [];
  for (const file of alwaysAllowedFiles) {
    if (isFile(join(source, file))) entries.push(file);
  }
  for (const dir of alwaysAllowedDirs) {
    if (isDirectory(join(source, dir))) entries.push(dir);
  }
  for (const dir of conditionalDirs) {
    if (isDirectory(join(source, dir)) && referenced(body, dir)) entries.push(dir);
  }
  return entries;
}

// Walk a directory and return all descendant paths (files + dirs).
function listFilesAndDirs(root: string): string[] {
  if (!existsSync(root)) return [];
  const results: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const next = join(current, entry);
      results.push(next);
      if (statSync(next).isDirectory()) visit(next);
    }
  };
  visit(root);
  return results;
}

// Check that the promoted destination contains no disallowed paths
// (mirrors promote-skill.ts disallowedPromotedPaths function).
function disallowedPromotedPaths(destination: string): string[] {
  const paths: string[] = [];
  for (const path of listFilesAndDirs(destination)) {
    const rel = relative(destination, path);
    const name = basename(path);
    if (disallowedNames.has(name)) paths.push(rel);
    if (disallowedPaths.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) {
      paths.push(rel);
    }
  }
  return [...new Set(paths)].sort();
}

// ---------------------------------------------------------------------------
// Build steps
// ---------------------------------------------------------------------------

// Step 1: Copy the 7 engine directories from core/ to .agents/amadeus/.
// Uses full replacement (cpSync with recursive:true after rmSync).
function stepEnginesCopy(root: string): void {
  for (const dir of ENGINE_DIRS) {
    const src = join(root, "core", dir);
    const dst = join(root, ".agents", "amadeus", dir);
    if (!isDirectory(src)) {
      fail(`Step 1: missing engine source directory: ${src}`);
    }
    if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst, { recursive: true });
    console.log(`Step 1: ${src} → ${dst}`);
  }
}

// Step 2: Copy skill directories from core/skills/ to .agents/skills/ using
// promote semantics (allowedEntries, disallowedNames).
// BR-16: fail loudly if core/skills/<name>/agents/openai.yaml exists.
function stepSkillsCopy(root: string): void {
  const skillsRoot = join(root, "core", "skills");
  if (!isDirectory(skillsRoot)) {
    fail(`Step 2: missing core/skills directory: ${skillsRoot}`);
  }
  const skillNames = readdirSync(skillsRoot).filter((entry) =>
    isDirectory(join(skillsRoot, entry)),
  );
  for (const name of skillNames) {
    const src = join(skillsRoot, name);
    const dst = join(root, ".agents", "skills", name);

    // BR-16: openai.yaml must not exist in core/skills/<name>/agents/.
    const coreOpenaiYaml = join(src, "agents", "openai.yaml");
    if (isFile(coreOpenaiYaml)) {
      fail(
        `BR-16 violation: core/skills/${name}/agents/openai.yaml exists.\n` +
          "openai.yaml must only be sourced from harness/codex/skills/<name>/agents/.\n" +
          "Remove openai.yaml from core/skills/ to resolve this.",
      );
    }

    if (!isFile(join(src, "SKILL.md"))) {
      fail(`Step 2: missing SKILL.md for skill: ${src}`);
    }

    const entries = allowedEntries(src);
    if (!entries.includes("SKILL.md")) {
      fail(`Step 2: SKILL.md must be in allowedEntries for: ${name}`);
    }

    // Full replacement: remove existing promoted skill, then copy allowed entries.
    if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
    mkdirSync(dst, { recursive: true });

    for (const entry of entries) {
      const from = join(src, entry);
      const to = join(dst, entry);
      cpSync(from, to, { recursive: true });
      console.log(`Step 2: skill ${name}: ${entry}`);
    }

    // Verify no disallowed paths remain in the promoted destination.
    const violations = disallowedPromotedPaths(dst);
    if (violations.length > 0) {
      fail(
        `Step 2: disallowed promoted paths in .agents/skills/${name}:\n` +
          violations.map((p) => `  - ${p}`).join("\n"),
      );
    }
  }
}

// Step 3: Harness overlay (後勝ち) — copy harness/codex/skills/<name>/agents/
// over .agents/skills/<name>/agents/ (overwrites whatever Step 2 placed there).
function stepHarnessOverlay(root: string): void {
  const harnessRoot = join(root, "harness", "codex", "skills");
  if (!isDirectory(harnessRoot)) {
    // harness/codex/skills/ may not exist in all fixtures — silently skip.
    console.log("Step 3: harness/codex/skills/ not found, skipping overlay");
    return;
  }
  const skillNames = readdirSync(harnessRoot).filter((entry) =>
    isDirectory(join(harnessRoot, entry)),
  );
  for (const name of skillNames) {
    const harnessAgentsDir = join(harnessRoot, name, "agents");
    if (!isDirectory(harnessAgentsDir)) continue;
    const dstAgentsDir = join(root, ".agents", "skills", name, "agents");
    mkdirSync(dstAgentsDir, { recursive: true });
    // Copy each file (後勝ち: overwrites Step 2 output).
    for (const file of readdirSync(harnessAgentsDir)) {
      const from = join(harnessAgentsDir, file);
      const to = join(dstAgentsDir, file);
      cpSync(from, to);
      console.log(`Step 3: overlay ${name}/agents/${file}`);
    }
  }
}

// Wiring entry type (matches harness/claude/wiring.json format per BR-15).
type WiringEntry = {
  name: string;
  target: string;
};

// Step 4: Reproduce .claude/* symlinks from harness/claude/wiring.json.
// Idempotent: existing symlinks at the same path are unlinked and recreated.
function stepSymlinks(root: string): void {
  const wiringPath = join(root, "harness", "claude", "wiring.json");
  if (!isFile(wiringPath)) {
    console.log("Step 4: harness/claude/wiring.json not found, skipping symlinks");
    return;
  }
  const entries = JSON.parse(readFileSync(wiringPath, "utf8")) as WiringEntry[];
  const claudeDir = join(root, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  for (const entry of entries) {
    const linkPath = join(claudeDir, entry.name);
    // Remove existing symlink or file at this path (idempotent).
    if (existsSync(linkPath) || ((): boolean => {
      try { lstatSync(linkPath); return true; } catch { return false; }
    })()) {
      try {
        unlinkSync(linkPath);
      } catch {
        rmSync(linkPath, { recursive: true, force: true });
      }
    }
    symlinkSync(entry.target, linkPath);
    console.log(`Step 4: symlink .claude/${entry.name} → ${entry.target}`);
  }
}

// Step 5: Model overlay (fail-soft) — apply dev-scripts/data/model-overrides.json
// to .agents/amadeus/agents/*.md if the overlay file exists.
// When absent, prints a warning and continues without error.
// Matches promote-skill.ts:195-203 fail-soft behavior.
function stepModelOverlay(root: string): void {
  try {
    applyModelOverrides(root);
    console.log("Step 5: model overlay applied");
  } catch (error) {
    console.error(
      `Step 5 (model overlay): skipped — ${error instanceof Error ? error.message : String(error)}`,
    );
    // Fail-soft: exit code is not affected.
  }
}

// Step 6: #543 hook — build.ts version/hash manifest.
// Design-only in B001; silently skipped until #543 merges.
function stepManifestHook(_root: string): void {
  // No-op: #543 not yet merged. See business-logic-model.md §1.6.
}

// ---------------------------------------------------------------------------
// --check mode: run build then verify git diff --exit-code
// ---------------------------------------------------------------------------

function runCheck(root: string, wiringPath: string): void {
  // Collect generated paths to check.
  const generatedPaths: string[] = [".agents/amadeus", ".agents/skills"];

  // Also include symlink names from wiring.json.
  if (isFile(wiringPath)) {
    const entries = JSON.parse(readFileSync(wiringPath, "utf8")) as WiringEntry[];
    for (const entry of entries) {
      generatedPaths.push(`.claude/${entry.name}`);
    }
  }

  const result = Bun.spawnSync(["git", "diff", "--exit-code", ...generatedPaths], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    const diff = new TextDecoder().decode(result.stdout);
    console.error("build:check: generated paths differ from committed baseline:");
    if (diff) console.error(diff);
    process.exit(result.exitCode ?? 1);
  }
  console.log("build:check: ok (generated output matches committed baseline)");
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { root: string; check: boolean } {
  let root = process.cwd();
  let check = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        fail("--root requires a directory argument");
      }
      root = resolve(value);
      i += 1;
    } else if (arg === "--check") {
      check = true;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }

  return { root, check };
}

function main(): void {
  const { root, check } = parseArgs(process.argv.slice(2));

  console.log(`build: root = ${root}`);

  // Step 1: Engine copy
  stepEnginesCopy(root);

  // Step 2: Skill copy (promote semantics)
  stepSkillsCopy(root);

  // Step 3: Harness overlay (後勝ち)
  stepHarnessOverlay(root);

  // Step 4: Symlink reproduction
  stepSymlinks(root);

  // Step 5: Model overlay (fail-soft)
  stepModelOverlay(root);

  // Step 6: #543 hook (no-op)
  stepManifestHook(root);

  console.log("build: done");

  // --check mode: verify generated paths match committed baseline via git diff.
  if (check) {
    runCheck(root, join(root, "harness", "claude", "wiring.json"));
  }
}

if (import.meta.main) main();
