#!/usr/bin/env bun

// build eval (Issue #572, Intent 260706-three-layer-build, Bolt B001).
//
// Drives dev-scripts/build.ts against isolated fixture workspaces.
// LLM-free, deterministic, no network. Cleans up temp dirs on success
// and on failure.
//
// Cases covered:
// (a) Full pipeline: engine 7 dirs copied, skill copy honors promote semantics
//     (disallowedNames excluded, conditionalDirs by SKILL.md reference),
//     harness overlay overwrites openai.yaml AFTER skill copy (後勝ち proof:
//     core/skills has no openai.yaml, harness provides it → generated has
//     harness content), wiring.json symlinks reproduced idempotently.
// (b) BR-16 violation: core/skills/<n>/agents/openai.yaml exists → build
//     fails loudly (non-zero exit).
// (c) --check mode: detects a source change via git diff (non-zero when
//     generated output diverges from committed state); clean tree passes.
// (d) Idempotence: second run produces byte-identical output (zero diff).

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const buildScript = join(root, "dev-scripts/build.ts");

// Engine directory names that build.ts copies from core/ to .agents/amadeus/.
const ENGINE_DIRS = ["agents", "amadeus-common", "hooks", "knowledge", "scopes", "sensors", "tools"];

let failures = 0;
const cleanups: string[] = [];

function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function runBuild(
  args: string[],
  cwd: string,
): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(["bun", "run", buildScript, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode ?? -1,
  };
}

function git(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode ?? -1,
  };
}

function makeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-build-eval-"));
  cleanups.push(dir);
  return dir;
}

// Recursively collect all file paths under a directory.
function collectFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const st = lstatSync(full);
      if (st.isSymbolicLink() || st.isFile()) {
        results.push(full);
      } else if (st.isDirectory()) {
        visit(full);
      }
    }
  };
  visit(dir);
  return results.sort();
}

// Build a fixture with:
// - core/<engineDir>/  (7 dirs, each with a test file)
// - core/skills/<skillName>/ with SKILL.md and optional sub-entries
// - harness/codex/skills/<skillName>/agents/openai.yaml (the harness overlay)
// - harness/claude/wiring.json (symlink declarations for 7 dirs)
// Returns the fixture root.
function buildBaseFixture(opts: {
  skillName?: string;
  skillMdBody?: string; // SKILL.md content (controls conditionalDirs)
  includeDisallowed?: boolean; // add a disallowedNames entry inside skill
  includeConditional?: boolean; // add validator/ dir to skill (conditional)
  addOpenaiYamlToCore?: boolean; // BR-16 violation: put openai.yaml in core/skills
  wiringEntries?: Array<{ name: string; target: string }>;
}): string {
  const fx = makeFixture();
  const skillName = opts.skillName ?? "amadeus-test-skill";

  // Engine dirs: core/<dir>/file.txt
  for (const dir of ENGINE_DIRS) {
    mkdirSync(join(fx, "core", dir), { recursive: true });
    writeFileSync(join(fx, "core", dir, "engine-file.txt"), `engine content for ${dir}`);
  }

  // Skill: core/skills/<name>/
  const skillDir = join(fx, "core", "skills", skillName);
  mkdirSync(skillDir, { recursive: true });

  // Decide conditionalDirs referenced in SKILL.md
  const referencesValidator = opts.includeConditional ?? false;
  const skillMd =
    opts.skillMdBody ??
    [
      `# ${skillName}`,
      "",
      referencesValidator ? "See validator/ for the validator." : "No conditional dirs.",
      "",
    ].join("\n");
  writeFileSync(join(skillDir, "SKILL.md"), skillMd);

  // Always-allowed dir: references/
  mkdirSync(join(skillDir, "references"), { recursive: true });
  writeFileSync(join(skillDir, "references", "readme.md"), "reference content");

  // Conditional dir: validator/ (only present if includeConditional)
  if (opts.includeConditional) {
    mkdirSync(join(skillDir, "validator"), { recursive: true });
    writeFileSync(join(skillDir, "validator", "check.ts"), "// validator");
  }

  // Disallowed entry inside skill: evals/ (should NOT be copied)
  if (opts.includeDisallowed) {
    mkdirSync(join(skillDir, "evals"), { recursive: true });
    writeFileSync(join(skillDir, "evals", "check.ts"), "// evals — must be excluded");
  }

  // BR-16 violation: openai.yaml inside core/skills/
  if (opts.addOpenaiYamlToCore) {
    mkdirSync(join(skillDir, "agents"), { recursive: true });
    writeFileSync(join(skillDir, "agents", "openai.yaml"), "# openai.yaml in core — violation");
  }

  // Harness overlay: harness/codex/skills/<name>/agents/openai.yaml
  mkdirSync(join(fx, "harness", "codex", "skills", skillName, "agents"), { recursive: true });
  writeFileSync(
    join(fx, "harness", "codex", "skills", skillName, "agents", "openai.yaml"),
    "# harness openai.yaml content",
  );

  // Symlink wiring: harness/claude/wiring.json
  mkdirSync(join(fx, "harness", "claude"), { recursive: true });
  const wiringEntries = opts.wiringEntries ?? [
    { name: "tools", target: "../.agents/amadeus/tools" },
    { name: "agents", target: "../.agents/amadeus/agents" },
  ];
  writeFileSync(join(fx, "harness", "claude", "wiring.json"), JSON.stringify(wiringEntries, null, 2));

  return fx;
}

// ---------------------------------------------------------------------------
// Case (a): Full pipeline — engine copy, skill copy semantics, harness
// overlay (後勝ち), symlink reproduction, determinism on second run.
// ---------------------------------------------------------------------------

{
  const fx = buildBaseFixture({ includeDisallowed: true, includeConditional: false });
  const skillName = "amadeus-test-skill";

  const r1 = runBuild(["--root", fx], root);
  ok("(a) build exits 0", r1.exitCode === 0, r1.stderr || r1.stdout);

  // Engine dirs copied
  for (const dir of ENGINE_DIRS) {
    ok(
      `(a) engine dir .agents/amadeus/${dir}/ exists`,
      existsSync(join(fx, ".agents", "amadeus", dir)),
    );
    ok(
      `(a) engine dir .agents/amadeus/${dir}/engine-file.txt copied`,
      existsSync(join(fx, ".agents", "amadeus", dir, "engine-file.txt")),
    );
  }

  // Skill copied: SKILL.md present
  ok("(a) skill SKILL.md promoted", existsSync(join(fx, ".agents", "skills", skillName, "SKILL.md")));

  // Always-allowed: references/ copied
  ok(
    "(a) skill references/ promoted",
    existsSync(join(fx, ".agents", "skills", skillName, "references", "readme.md")),
  );

  // Disallowed: evals/ NOT copied (BR promote semantics)
  ok(
    "(a) skill evals/ excluded (disallowedNames)",
    !existsSync(join(fx, ".agents", "skills", skillName, "evals")),
  );

  // Harness overlay: openai.yaml comes from harness (後勝ち)
  const generatedYaml = join(fx, ".agents", "skills", skillName, "agents", "openai.yaml");
  ok("(a) harness overlay openai.yaml exists in generated skill", existsSync(generatedYaml));
  if (existsSync(generatedYaml)) {
    ok(
      "(a) harness overlay openai.yaml has harness content (後勝ち)",
      readFileSync(generatedYaml, "utf8").includes("harness openai.yaml content"),
    );
  }

  // Symlinks from wiring.json
  for (const entry of [
    { name: "tools", target: "../.agents/amadeus/tools" },
    { name: "agents", target: "../.agents/amadeus/agents" },
  ]) {
    const linkPath = join(fx, ".claude", entry.name);
    let isSymlink = false;
    try {
      isSymlink = lstatSync(linkPath).isSymbolicLink();
    } catch {
      isSymlink = false;
    }
    ok(`(a) symlink .claude/${entry.name} is a symlink`, isSymlink);
    if (isSymlink) {
      ok(
        `(a) symlink .claude/${entry.name} target matches wiring.json`,
        readlinkSync(linkPath) === entry.target,
        `got: ${readlinkSync(linkPath)}`,
      );
    }
  }

  // Second run — idempotent (symlinks unchanged)
  const r2 = runBuild(["--root", fx], root);
  ok("(a) second build exits 0 (idempotent)", r2.exitCode === 0, r2.stderr);

  for (const entry of [
    { name: "tools", target: "../.agents/amadeus/tools" },
    { name: "agents", target: "../.agents/amadeus/agents" },
  ]) {
    const linkPath = join(fx, ".claude", entry.name);
    let isSymlink = false;
    try {
      isSymlink = lstatSync(linkPath).isSymbolicLink();
    } catch {
      isSymlink = false;
    }
    ok(`(a) symlink .claude/${entry.name} still a symlink after second run`, isSymlink);
  }
}

// ---------------------------------------------------------------------------
// Case (a-ext): conditionalDirs — validator/ only copied when SKILL.md
// references it.
// ---------------------------------------------------------------------------

{
  const fxWith = buildBaseFixture({ includeConditional: true });
  const skillName = "amadeus-test-skill";
  runBuild(["--root", fxWith], root);
  ok(
    "(a-ext) validator/ promoted when SKILL.md references it",
    existsSync(join(fxWith, ".agents", "skills", skillName, "validator", "check.ts")),
  );

  const fxWithout = buildBaseFixture({ includeConditional: false });
  runBuild(["--root", fxWithout], root);
  ok(
    "(a-ext) validator/ NOT promoted when SKILL.md does not reference it",
    !existsSync(join(fxWithout, ".agents", "skills", skillName, "validator")),
  );
}

// ---------------------------------------------------------------------------
// Case (b): BR-16 violation — openai.yaml in core/skills/<n>/agents/ → build
// must fail with non-zero exit.
// ---------------------------------------------------------------------------

{
  const fx = buildBaseFixture({ addOpenaiYamlToCore: true });
  const r = runBuild(["--root", fx], root);
  ok(
    "(b) BR-16: build fails when core/skills/<n>/agents/openai.yaml exists",
    r.exitCode !== 0,
    `exit=${r.exitCode} stderr=${r.stderr}`,
  );
  ok(
    "(b) BR-16: failure message mentions openai.yaml or BR-16",
    r.stderr.toLowerCase().includes("openai") || r.stderr.toLowerCase().includes("br-16") ||
    r.stdout.toLowerCase().includes("openai") || r.stdout.toLowerCase().includes("br-16"),
    `stderr=${r.stderr} stdout=${r.stdout}`,
  );
}

// ---------------------------------------------------------------------------
// Case (c): --check mode — detects when source changed causes generated
// output to diverge from committed state (git diff non-zero).
// Clean tree (no source change) → check passes (exit 0).
// ---------------------------------------------------------------------------

{
  const fx = buildBaseFixture({});
  const skillName = "amadeus-test-skill";

  // Initialize git in the fixture so --check can run git diff.
  git(["init", "-b", "main"], fx);
  git(["config", "user.email", "eval@amadeus.test"], fx);
  git(["config", "user.name", "Eval"], fx);

  // First build to generate files.
  const r1 = runBuild(["--root", fx], root);
  ok("(c) initial build exits 0", r1.exitCode === 0, r1.stderr);

  // Commit the generated state as the baseline.
  git(["add", "-A"], fx);
  git(["commit", "-m", "initial generated state"], fx);

  // Clean state: --check should pass (no source changes, same output).
  const rClean = runBuild(["--root", fx, "--check"], root);
  ok("(c) --check passes on clean tree (exit 0)", rClean.exitCode === 0, rClean.stderr || rClean.stdout);

  // Modify a source file in core/ (simulate a developer edit that needs rebuild).
  const engineFile = join(fx, "core", "tools", "engine-file.txt");
  writeFileSync(engineFile, "modified engine content — requires rebuild");

  // --check should detect that the generated output now diverges from the
  // committed baseline (build regenerates, then git diff is non-zero).
  const rDirty = runBuild(["--root", fx, "--check"], root);
  ok(
    "(c) --check fails when source changed (exit non-zero)",
    rDirty.exitCode !== 0,
    `exit=${rDirty.exitCode}`,
  );
}

// ---------------------------------------------------------------------------
// Case (d): Idempotence — second run byte-identical output.
// ---------------------------------------------------------------------------

{
  const fx = buildBaseFixture({ includeConditional: true });

  const r1 = runBuild(["--root", fx], root);
  ok("(d) first build exits 0", r1.exitCode === 0, r1.stderr);

  // Snapshot file contents after first run.
  function snapshot(dir: string): Map<string, string> {
    const snap = new Map<string, string>();
    for (const f of collectFiles(dir)) {
      try {
        const st = lstatSync(f);
        if (st.isSymbolicLink()) {
          snap.set(f, `symlink:${readlinkSync(f)}`);
        } else {
          snap.set(f, readFileSync(f, "utf8"));
        }
      } catch {
        // ignore unreadable
      }
    }
    return snap;
  }

  const snap1 = snapshot(join(fx, ".agents"));
  const snapLinks1 = snapshot(join(fx, ".claude"));

  const r2 = runBuild(["--root", fx], root);
  ok("(d) second build exits 0", r2.exitCode === 0, r2.stderr);

  const snap2 = snapshot(join(fx, ".agents"));
  const snapLinks2 = snapshot(join(fx, ".claude"));

  let agentsDiff = false;
  for (const [k, v] of snap1) {
    if (snap2.get(k) !== v) {
      agentsDiff = true;
      console.error(`(d) diff in .agents: ${k}`);
    }
  }
  for (const [k, v] of snap2) {
    if (!snap1.has(k)) {
      agentsDiff = true;
      console.error(`(d) extra file in .agents after second run: ${k}`);
    }
  }
  ok("(d) .agents/ byte-identical after second run", !agentsDiff);

  let linksDiff = false;
  for (const [k, v] of snapLinks1) {
    if (snapLinks2.get(k) !== v) {
      linksDiff = true;
    }
  }
  ok("(d) .claude symlinks identical after second run", !linksDiff);
}

// ---------------------------------------------------------------------------
// Cleanup and result
// ---------------------------------------------------------------------------

for (const dir of cleanups) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
} else {
  console.log("\nAll build eval checks passed.");
}
