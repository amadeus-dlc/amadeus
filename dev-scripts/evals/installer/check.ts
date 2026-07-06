#!/usr/bin/env bun

// installer eval (Issue #451, Intent 260705-engine-installer, Bolt B001).
//
// Drives the REAL scripts/amadeus-install.ts against an isolated temp
// workspace — no fixtures standing in for the installer's own output. LLM-
// free, deterministic, no network. Cleans up the temp workspace on success
// and on failure (FR-2.8).
//
// B001 (walking skeleton) coverage: FR-2.1 (real install), FR-2.2 (cold-cache
// module load of every copied tool/hook), FR-2.3 (idempotent re-run),
// FR-2.4 (this eval registered as test:it:installer), FR-2.5 (manifest vs.
// real source layout).
//
// B002 (hardening) coverage added below: FR-2.6 (AMADEUS.md transform
// bidirectional — positive-direction throw + blank-line compression),
// FR-2.7 (settings.json merge against a fixture with pre-existing user
// content), FR-2.9 (non-destructive aborts on symlink-position conflicts and
// unparseable settings.json), FR-2.10 (the 3 pre-check patterns), FR-2.11
// (non-target skills left byte-identical), FR-2.12 (smoke false-positive
// regression), FR-2.13 (amadeus/ untouchable), FR-4.1 (Codex `.agents/`
// completeness), FR-3.1 (README documents the installer).

import {
  chmodSync,
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
import { join, relative, resolve } from "node:path";

// Import the installer's own manifest + pure transform — the eval verifies
// them against reality rather than re-declaring its own expectations.
import { MANIFEST, transformAmadeusMd } from "../../../scripts/amadeus-install";

const root = resolve(import.meta.dir, "../../..");
const installerPath = join(root, "scripts", "amadeus-install.ts");

let failures = 0;

function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function run(cmd: string[], cwd: string, env?: Record<string, string | undefined>): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync({
    cmd,
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: env ?? process.env,
  });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode ?? -1,
  };
}

// ---------------------------------------------------------------------------
// FR-2.5 — manifest vs. real distribution-source layout.
// (Checked against THIS repo, not the temp target — the manifest describes
// the source, and this is the "did layout drift under a concurrent Intent"
// regression guard, R-1.)
// ---------------------------------------------------------------------------

for (const dir of MANIFEST.engineDirs) {
  ok(`FR-2.5 engineDir "${dir}" exists under .agents/amadeus/`, existsSync(join(root, ".agents/amadeus", dir)));
}

for (const name of MANIFEST.claudeSymlinks) {
  const p = join(root, ".claude", name);
  let isSymlink = false;
  try {
    isSymlink = lstatSync(p).isSymbolicLink();
  } catch {
    isSymlink = false;
  }
  ok(`FR-2.5 claudeSymlink ".claude/${name}" exists as a symlink`, isSymlink);
}

{
  const settingsRaw = readFileSync(join(root, ".claude", "settings.json"), "utf-8");
  const settings = JSON.parse(settingsRaw) as { hooks?: Record<string, Array<{ matcher: string; hooks: Array<{ command: string }> }>> };
  const presentCommands = new Set<string>();
  for (const blocks of Object.values(settings.hooks ?? {})) {
    for (const block of blocks) {
      for (const h of block.hooks ?? []) presentCommands.add(h.command);
    }
  }
  for (const entry of MANIFEST.hooksWiring) {
    ok(`FR-2.5 hooksWiring command present in repo settings.json: ${entry.command}`, presentCommands.has(entry.command));
  }
  ok("FR-2.5 hooksWiring has exactly 11 entries", MANIFEST.hooksWiring.length === 11, String(MANIFEST.hooksWiring.length));
}

{
  const amadeusMdRaw = readFileSync(join(root, "AMADEUS.md"), "utf-8");
  try {
    transformAmadeusMd(amadeusMdRaw);
    ok("FR-2.5 AMADEUS.md removal targets (sections + blocks) all exist in source (positive direction)", true);
  } catch (e) {
    ok(
      "FR-2.5 AMADEUS.md removal targets (sections + blocks) all exist in source (positive direction)",
      false,
      e instanceof Error ? e.message : String(e)
    );
  }
}

// ---------------------------------------------------------------------------
// FR-2.6 — AMADEUS.md transform bidirectional check, synthetic-source half.
// (The negative direction — no dev-reference pattern survives in the real
// transformed output — is checked against the real install below, alongside
// the blank-line compression assertion. This half exercises the positive
// direction with synthetic sources: transformAmadeusMd must throw the moment
// a declared removal target goes missing from its source, independent of the
// real AMADEUS.md's current content.)
// ---------------------------------------------------------------------------

function syntheticSource(opts: { omitBlock?: string; omitHeading?: boolean }): string {
  const lines: string[] = ["# Synthetic AMADEUS.md", ""];
  for (const prefix of MANIFEST.amadeusMd.removeBlocks) {
    if (prefix === opts.omitBlock) continue;
    lines.push(`${prefix} synthetic filler content for eval`);
    lines.push("synthetic filler line 2");
    lines.push("");
  }
  if (!opts.omitHeading) {
    for (const heading of MANIFEST.amadeusMd.removeSections) {
      lines.push(`## ${heading}`);
      lines.push("synthetic section body");
      lines.push("");
    }
  }
  lines.push("## Kept Section");
  lines.push("kept body");
  lines.push("");
  return lines.join("\n");
}

{
  try {
    transformAmadeusMd(syntheticSource({}));
    ok("FR-2.6 transformAmadeusMd succeeds on a synthetic source containing every declared target (baseline)", true);
  } catch (e) {
    ok(
      "FR-2.6 transformAmadeusMd succeeds on a synthetic source containing every declared target (baseline)",
      false,
      e instanceof Error ? e.message : String(e)
    );
  }
}

for (const prefix of MANIFEST.amadeusMd.removeBlocks) {
  let threw = false;
  try {
    transformAmadeusMd(syntheticSource({ omitBlock: prefix }));
  } catch {
    threw = true;
  }
  ok(`FR-2.6 transformAmadeusMd throws when declared removeBlocks target is missing from source ("${prefix}")`, threw);
}

{
  let threw = false;
  try {
    transformAmadeusMd(syntheticSource({ omitHeading: true }));
  } catch {
    threw = true;
  }
  ok(
    `FR-2.6 transformAmadeusMd throws when declared removeSections heading is missing from source ("${MANIFEST.amadeusMd.removeSections[0]}")`,
    threw
  );
}

// ---------------------------------------------------------------------------
// FR-3.1 — README documents the installer for end users (light regression
// guard: the section is a doc deliverable, not behavior, but a silently
// deleted section should still be caught).
// ---------------------------------------------------------------------------

{
  const readmeText = readFileSync(join(root, "README.md"), "utf-8");
  const readmeJaText = readFileSync(join(root, "README.ja.md"), "utf-8");
  ok(
    "FR-3.1 README.md documents the installer command, doctor verification, and re-run-to-update",
    /scripts\/amadeus-install\.ts/.test(readmeText) && /doctor/.test(readmeText) && /amadeus:install/.test(readmeText)
  );
  ok(
    "FR-3.1 README.ja.md documents the installer command, doctor verification, and re-run-to-update",
    /scripts\/amadeus-install\.ts/.test(readmeJaText) && /doctor/.test(readmeJaText) && /amadeus:install/.test(readmeJaText)
  );
}

// ---------------------------------------------------------------------------
// Temp workspace — a fresh install target. amadeus/spaces/default/memory/ is
// pre-seeded (simulating an already-shipped workspace shell) because the
// installer deliberately never touches amadeus/ (BR-1) and doctor's
// "workspace shell ready" check requires that dir to pre-exist.
// ---------------------------------------------------------------------------

// FR-2.13 marker — content the installer must never touch (amadeus/ untouchable).
const AIDLC_MARKER_CONTENT = "# pre-existing amadeus/ record\nmust survive install untouched\n";

function makeWorkspace(): string {
  const ws = mkdtempSync(join(tmpdir(), "amadeus-installer-eval-"));
  mkdirSync(join(ws, "amadeus/spaces/default/memory"), { recursive: true });
  writeFileSync(join(ws, "amadeus/spaces/default/memory/org.md"), "# org\n", "utf-8");
  writeFileSync(join(ws, "amadeus/spaces/default/memory/marker.md"), AIDLC_MARKER_CONTENT, "utf-8");
  return ws;
}

function relativeSymlinkTarget(linkPath: string): string {
  return readlinkSync(linkPath);
}

// Cold-cache module-load probe: resolve (bundle) each .ts file's own import
// graph without executing any top-level/CLI logic. Several engine tools call
// their `main()` unconditionally at module scope (no `if (import.meta.main)`
// guard) and read `process.argv` for a required subcommand — driving those
// via `bun -e "import(...)"` would exit non-zero merely because no
// subcommand was supplied, which is a CLI-usage artifact, not an offline/
// cold-cache module-load failure. `bun build --target=bun <file>` resolves
// every local import (would fail loudly on a file missing after copy, or on
// an npm dependency unavailable offline) without running any module code,
// so it is used uniformly for every file instead — verified upstream against
// all 26 tools + 11 hooks in this repo (see code-generation-plan.md).
function moduleLoadsCleanly(filePath: string, cwd: string): { ok: boolean; detail: string } {
  const outfile = join(tmpdir(), `amadeus-installer-eval-build-${Math.random().toString(36).slice(2)}.js`);
  try {
    const { stdout, stderr, exitCode } = run(
      ["bun", "build", "--target=bun", filePath, "--outfile", outfile],
      cwd,
      { ...process.env, CLAUDE_PROJECT_DIR: undefined }
    );
    return { ok: exitCode === 0, detail: `${stdout}\n${stderr}` };
  } finally {
    rmSync(outfile, { force: true });
  }
}

// Recursively finds symlinks under `dir` (FR-4.1: Codex needs `.agents/`
// alone — no symlink back into `.claude/`).
function findSymlinksRecursive(dir: string): string[] {
  const found: string[] = [];
  if (!existsSync(dir)) return found;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const name of readdirSync(current)) {
      const p = join(current, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) {
        found.push(p);
      } else if (st.isDirectory()) {
        stack.push(p);
      }
    }
  }
  return found;
}

// Mirrors smoke()'s exact invocation (component-methods.md / business-logic-
// model.md O-2): `bun <target>/.agents/amadeus/tools/amadeus-utility.ts
// doctor --project-dir <target>` with cwd=target. Not exported from the
// installer, so reproduced here to drive it directly against arbitrary
// targets (FR-2.12 — proving the check is target-specific).
function mirrorSmoke(target: string): { pass: boolean; exitCode: number } {
  const doctorPath = join(target, ".agents", "amadeus", "tools", "amadeus-utility.ts");
  const result = Bun.spawnSync({
    cmd: ["bun", doctorPath, "doctor", "--project-dir", target],
    cwd: target,
    stdout: "pipe",
    stderr: "pipe",
  });
  return { pass: (result.exitCode ?? 1) === 0, exitCode: result.exitCode ?? -1 };
}

function countHookCommands(settingsPath: string): number {
  const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
    hooks?: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
  };
  let count = 0;
  for (const blocks of Object.values(settings.hooks ?? {})) {
    for (const block of blocks) count += (block.hooks ?? []).length;
  }
  return count;
}

const ws = makeWorkspace();
// FR-2.13 snapshot — taken before any install runs.
const aidlcMarkerPath = join(ws, "amadeus/spaces/default/memory/marker.md");
const aidlcOrgPath = join(ws, "amadeus/spaces/default/memory/org.md");
const aidlcMarkerBeforeMtime = statSync(aidlcMarkerPath).mtimeMs;
const aidlcOrgBeforeMtime = statSync(aidlcOrgPath).mtimeMs;
try {
  // ---- FR-2.1 — real install into the temp workspace ----
  const install1 = run(["bun", installerPath, "--target", ws], root);
  ok("FR-2.1 first install exits 0", install1.exitCode === 0, `stdout:\n${install1.stdout}\nstderr:\n${install1.stderr}`);
  for (const marker of ["[1/5]", "[2/5]", "[3/5]", "[4/5]", "[5/5]"]) {
    ok(`FR-2.1 stdout contains progress marker ${marker}`, install1.stdout.includes(marker), install1.stdout);
  }
  ok("FR-2.1 stdout reports smoke check passed", install1.stdout.includes("doctor check passed"), install1.stdout);

  // ---- Layout assertions ----
  for (const dir of MANIFEST.engineDirs) {
    ok(`layout: .agents/amadeus/${dir} copied into target`, existsSync(join(ws, ".agents/amadeus", dir)));
  }

  for (const rel of [".claude/skills", ".agents/skills"]) {
    const p = join(ws, rel);
    const names = existsSync(p) ? readdirSync(p).filter((n) => n.startsWith("amadeus")) : [];
    ok(`layout: ${rel} has amadeus* skills present`, names.length > 0, `found ${names.length}`);
  }

  for (const name of MANIFEST.claudeSymlinks) {
    const linkPath = join(ws, ".claude", name);
    let isSymlink = false;
    let linkTarget = "";
    try {
      isSymlink = lstatSync(linkPath).isSymbolicLink();
      linkTarget = relativeSymlinkTarget(linkPath);
    } catch {
      isSymlink = false;
    }
    ok(`layout: .claude/${name} is a symlink`, isSymlink, linkTarget);
    ok(`layout: .claude/${name} points to ../.agents/amadeus/${name}`, linkTarget === join("..", ".agents", "amadeus", name), linkTarget);
  }

  {
    const amadeusMdPath = join(ws, "AMADEUS.md");
    ok("layout: AMADEUS.md exists at target root", existsSync(amadeusMdPath));
    // Liveness guard: the negative assertions below must never pass
    // vacuously on an empty string when the install failed to produce the
    // file — a missing/empty file is itself a failure of each check.
    const text = existsSync(amadeusMdPath) ? readFileSync(amadeusMdPath, "utf-8") : "";
    const transformed = text.length > 0;
    ok("layout: AMADEUS.md is non-empty (transform actually ran)", transformed);
    for (const pattern of MANIFEST.amadeusMd.devReferencePatterns) {
      const re = new RegExp(pattern);
      ok(`layout: AMADEUS.md has no match for dev-reference pattern ${pattern}`, transformed && !re.test(text));
    }
    // FR-2.6 negative direction, blank-line-compression half: removals must
    // not leave behind runs of 2+ consecutive blank lines.
    ok("FR-2.6 AMADEUS.md has no run of 2+ consecutive blank lines (compressed)", transformed && !text.includes("\n\n\n"), text);
  }

  {
    const settingsPath = join(ws, ".claude/settings.json");
    ok("layout: settings.json exists in target", existsSync(settingsPath));
    const count = existsSync(settingsPath) ? countHookCommands(settingsPath) : -1;
    ok("layout: settings.json has exactly 11 hook command entries", count === 11, String(count));
  }

  // ---- FR-2.2 — cold-cache module load of every copied tool + hook ----
  const toolsDir = join(ws, ".agents/amadeus/tools");
  const hooksDir = join(ws, ".agents/amadeus/hooks");
  const probeFiles = [
    ...readdirSync(toolsDir).filter((f) => f.endsWith(".ts")).map((f) => join(toolsDir, f)),
    ...readdirSync(hooksDir).filter((f) => f.endsWith(".ts")).map((f) => join(hooksDir, f)),
  ];
  ok("FR-2.2 found tool + hook files to probe", probeFiles.length > 0, String(probeFiles.length));
  for (const file of probeFiles) {
    const { ok: loaded, detail } = moduleLoadsCleanly(file, ws);
    ok(`FR-2.2 module loads cleanly: ${relative(ws, file)}`, loaded, detail.slice(0, 500));
  }

  // ---- FR-2.3 — idempotent second run ----
  const install2 = run(["bun", installerPath, "--target", ws], root);
  ok("FR-2.3 second install exits 0", install2.exitCode === 0, `stdout:\n${install2.stdout}\nstderr:\n${install2.stderr}`);

  const settingsPath = join(ws, ".claude/settings.json");
  const countAfterSecond = countHookCommands(settingsPath);
  ok("FR-2.3 hook command count still exactly 11 after second run (no duplicates)", countAfterSecond === 11, String(countAfterSecond));

  for (const name of MANIFEST.claudeSymlinks) {
    const linkPath = join(ws, ".claude", name);
    let isSymlink = false;
    let linkTarget = "";
    try {
      isSymlink = lstatSync(linkPath).isSymbolicLink();
      linkTarget = relativeSymlinkTarget(linkPath);
    } catch {
      isSymlink = false;
    }
    ok(`FR-2.3 .claude/${name} symlink still correct after second run`, isSymlink && linkTarget === join("..", ".agents", "amadeus", name), linkTarget);
  }

  // ---- FR-2.13 — aidlc/ untouchable across both installs ----
  ok(
    "FR-2.13 amadeus/ marker file byte-identical after two installs",
    existsSync(aidlcMarkerPath) && readFileSync(aidlcMarkerPath, "utf-8") === AIDLC_MARKER_CONTENT
  );
  ok(
    "FR-2.13 amadeus/ marker file mtime unchanged after two installs",
    existsSync(aidlcMarkerPath) && statSync(aidlcMarkerPath).mtimeMs === aidlcMarkerBeforeMtime
  );
  ok(
    "FR-2.13 aidlc/ org.md byte-identical after two installs",
    existsSync(aidlcOrgPath) && readFileSync(aidlcOrgPath, "utf-8") === "# org\n"
  );
  ok(
    "FR-2.13 aidlc/ org.md mtime unchanged after two installs",
    existsSync(aidlcOrgPath) && statSync(aidlcOrgPath).mtimeMs === aidlcOrgBeforeMtime
  );

  // ---- FR-4.1 — Codex `.agents/` completeness (no symlink into `.claude/`) ----
  {
    for (const dir of MANIFEST.engineDirs) {
      const dirPath = join(ws, ".agents", "amadeus", dir);
      const isSymlink = lstatSync(dirPath).isSymbolicLink();
      ok(`FR-4.1 .agents/amadeus/${dir} is a real directory, not a symlink`, !isSymlink);
    }
    const agentsSkillsRoot = join(ws, ".agents", "skills");
    const amadeusSkillDirs = existsSync(agentsSkillsRoot)
      ? readdirSync(agentsSkillsRoot).filter((n) => n.startsWith(MANIFEST.skillsGlobPrefix))
      : [];
    ok("FR-4.1 .agents/skills/ has amadeus* skill dirs", amadeusSkillDirs.length > 0, String(amadeusSkillDirs.length));
    for (const name of amadeusSkillDirs) {
      const dirPath = join(agentsSkillsRoot, name);
      const isSymlink = lstatSync(dirPath).isSymbolicLink();
      ok(`FR-4.1 .agents/skills/${name} is a real directory, not a symlink`, !isSymlink);
      const nestedSymlinks = findSymlinksRecursive(dirPath);
      ok(`FR-4.1 .agents/skills/${name} contains no symlinks (Codex needs no .claude wiring)`, nestedSymlinks.length === 0, nestedSymlinks.join(", "));
    }
  }

  // ---- FR-2.12 — smoke false-positive regression ----
  // (Last use of `ws` in this block: damages it deliberately, so this must
  // run after every other assertion that needs an intact `ws`.)
  {
    const intact = mirrorSmoke(ws);
    ok("FR-2.12 doctor mirror invocation passes against the intact installed target", intact.pass, `exitCode=${intact.exitCode}`);

    // Control: a second, independent fresh install, checked with the same
    // mirrored invocation shape, BEFORE `ws` is damaged below. Both targets
    // pass independently — this is the baseline that "fail is specific to
    // the damaged directory" (not some invocation quirk) is checked against.
    const wsControl = makeWorkspace();
    try {
      const installControl = run(["bun", installerPath, "--target", wsControl], root);
      ok("FR-2.12 control: second independent target installs cleanly", installControl.exitCode === 0, installControl.stderr);
      const control = mirrorSmoke(wsControl);
      ok("FR-2.12 control: doctor mirror invocation passes against the independent target", control.pass, `exitCode=${control.exitCode}`);

      // Damage `ws` minimally — remove settings.json, which doctor's
      // hook-contract check requires — and confirm the SAME mirrored
      // invocation (cwd=target, --project-dir target) now fails for `ws`
      // while the untouched, independent `wsControl` stays green. This
      // proves the check inspects the argument it was pointed at, not some
      // shared/ambient state (REL-4's double-pin: --project-dir + cwd).
      rmSync(join(ws, ".claude", "settings.json"), { force: true });
      const damaged = mirrorSmoke(ws);
      ok("FR-2.12 doctor mirror invocation fails against the damaged target", !damaged.pass, `exitCode=${damaged.exitCode}`);

      const controlAfter = mirrorSmoke(wsControl);
      ok(
        "FR-2.12 control: independent target stays green after the OTHER target was damaged",
        controlAfter.pass,
        `exitCode=${controlAfter.exitCode}`
      );
    } finally {
      rmSync(wsControl, { recursive: true, force: true });
    }
  }
} finally {
  // FR-2.8 — clean up on success AND failure.
  rmSync(ws, { recursive: true, force: true });
}

ok("FR-2.8 temp workspace removed", !existsSync(ws));

// ---------------------------------------------------------------------------
// FR-2.7 — settings.json merge against a fixture with pre-existing user
// content: env / permissions untouched, existing hooks order preserved, the
// user's own hook entries left alone, and a second run adds no duplicates.
// ---------------------------------------------------------------------------

{
  const wsMerge = makeWorkspace();
  try {
    const claudeDir = join(wsMerge, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, "settings.json");
    const original = {
      env: { FOO: "bar" },
      permissions: { allow: ["Bash(ls:*)"] },
      hooks: {
        UserPromptSubmit: [{ matcher: "", hooks: [{ type: "command", command: "bun some/other/tool.ts" }] }],
        PostToolUse: [{ matcher: "Write|Edit", hooks: [{ type: "command", command: "echo custom" }] }],
      },
    };
    writeFileSync(settingsPath, JSON.stringify(original, null, 2), "utf-8");

    const install1 = run(["bun", installerPath, "--target", wsMerge], root);
    ok("FR-2.7 install with pre-existing settings.json completes (exit 0, settings step reached)", install1.exitCode === 0 && install1.stdout.includes("[4/5] settings"), `exit=${install1.exitCode}\nstdout:\n${install1.stdout}\nstderr:\n${install1.stderr}`);

    const raw = readFileSync(settingsPath, "utf-8");
    let parsed: { env?: unknown; permissions?: unknown; hooks?: Record<string, Array<{ matcher: string; hooks: Array<{ command: string }> }>> } = {};
    let parseOk = true;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parseOk = false;
    }
    ok("FR-2.7 settings.json is re-readable JSON after merge", parseOk, raw);
    ok("FR-2.7 non-target key 'env' unchanged", JSON.stringify(parsed.env) === JSON.stringify(original.env));
    ok("FR-2.7 non-target key 'permissions' unchanged", JSON.stringify(parsed.permissions) === JSON.stringify(original.permissions));

    const upsBlocks = parsed.hooks?.UserPromptSubmit ?? [];
    ok("FR-2.7 existing UserPromptSubmit block still first (order preserved)", upsBlocks[0]?.matcher === "");
    ok(
      "FR-2.7 user's own UserPromptSubmit hook entry untouched",
      JSON.stringify(upsBlocks[0]?.hooks) === JSON.stringify(original.hooks.UserPromptSubmit[0].hooks)
    );

    const postBlocks = parsed.hooks?.PostToolUse ?? [];
    ok("FR-2.7 existing PostToolUse block still first (order preserved)", postBlocks[0]?.matcher === "Write|Edit");
    ok(
      "FR-2.7 user's own PostToolUse hook entry untouched",
      JSON.stringify(postBlocks[0]?.hooks) === JSON.stringify(original.hooks.PostToolUse[0].hooks)
    );

    const countAfterFirst = countHookCommands(settingsPath);
    ok("FR-2.7 hook command count is manifest (11) + user's own (2) after first merge", countAfterFirst === 13, String(countAfterFirst));

    // Second run: manifest entries dedupe, user's entries still untouched.
    const install2 = run(["bun", installerPath, "--target", wsMerge], root);
    ok("FR-2.7 second install over merged settings.json completes (exit 0)", install2.exitCode === 0 && install2.stdout.includes("[4/5] settings"), `exit=${install2.exitCode}\nstdout:\n${install2.stdout}\nstderr:\n${install2.stderr}`);
    const countAfterSecond = countHookCommands(settingsPath);
    ok("FR-2.7 hook command count unchanged after second merge (manifest entries deduped)", countAfterSecond === 13, String(countAfterSecond));

    const raw2 = readFileSync(settingsPath, "utf-8");
    const parsed2 = JSON.parse(raw2) as typeof parsed;
    const upsBlocks2 = parsed2.hooks?.UserPromptSubmit ?? [];
    const postBlocks2 = parsed2.hooks?.PostToolUse ?? [];
    ok(
      "FR-2.7 user's own UserPromptSubmit hook entry still untouched after second run",
      JSON.stringify(upsBlocks2[0]?.hooks) === JSON.stringify(original.hooks.UserPromptSubmit[0].hooks)
    );
    ok(
      "FR-2.7 user's own PostToolUse hook entry still untouched after second run",
      JSON.stringify(postBlocks2[0]?.hooks) === JSON.stringify(original.hooks.PostToolUse[0].hooks)
    );
  } finally {
    rmSync(wsMerge, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// FR-2.9 — non-destructive aborts.
// ---------------------------------------------------------------------------

{
  // (a) a real directory sits where a `.claude/<name>` symlink would go.
  const wsConflict = mkdtempSync(join(tmpdir(), "amadeus-installer-eval-fr29a-"));
  try {
    const conflictDir = join(wsConflict, ".claude", "agents");
    mkdirSync(conflictDir, { recursive: true });
    const markerPath = join(conflictDir, "marker.txt");
    const markerContent = "pre-existing content, must not change\n";
    writeFileSync(markerPath, markerContent, "utf-8");
    const beforeMtime = statSync(markerPath).mtimeMs;

    const result = run(["bun", installerPath, "--target", wsConflict], root);
    ok("FR-2.9a install aborts with exit 1 on a symlink-position directory conflict", result.exitCode === 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    ok("FR-2.9a stderr contains the conflicting path", result.stderr.includes(conflictDir), result.stderr);
    ok("FR-2.9a stderr fix guidance mentions re-running after resolving the cause", /re-run/.test(result.stderr), result.stderr);

    ok("FR-2.9a conflicting directory content unchanged", existsSync(markerPath) && readFileSync(markerPath, "utf-8") === markerContent);
    ok("FR-2.9a conflicting directory mtime unchanged", existsSync(markerPath) && statSync(markerPath).mtimeMs === beforeMtime);
  } finally {
    rmSync(wsConflict, { recursive: true, force: true });
  }
}

{
  // (b) settings.json exists but is not parseable as JSON.
  const wsBadJson = mkdtempSync(join(tmpdir(), "amadeus-installer-eval-fr29b-"));
  try {
    const claudeDir = join(wsBadJson, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, "settings.json");
    const invalidContent = "{ this is not valid JSON ";
    writeFileSync(settingsPath, invalidContent, "utf-8");

    const result = run(["bun", installerPath, "--target", wsBadJson], root);
    ok("FR-2.9b install aborts with exit 1 on unparseable settings.json", result.exitCode === 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    ok("FR-2.9b stderr contains the settings.json path", result.stderr.includes(settingsPath), result.stderr);
    ok("FR-2.9b stderr fix guidance mentions re-running after resolving the cause", /re-run/.test(result.stderr), result.stderr);
    ok("FR-2.9b settings.json byte-identical after abort", readFileSync(settingsPath, "utf-8") === invalidContent);
  } finally {
    rmSync(wsBadJson, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// FR-2.10 — the 3 pre-check patterns (interaction-spec.md's reason table).
// ---------------------------------------------------------------------------

{
  // Pattern 1: target does not exist.
  const nonexistentTarget = join(tmpdir(), `amadeus-installer-eval-nonexistent-${Math.random().toString(36).slice(2)}`);
  const result = run(["bun", installerPath, "--target", nonexistentTarget], root);
  ok("FR-2.10 nonexistent target exits 1", result.exitCode === 1, result.stderr);
  ok("FR-2.10 nonexistent target reason wording exact", result.stderr.includes(`target does not exist: ${nonexistentTarget}`), result.stderr);
  ok("FR-2.10 nonexistent target fix mentions --target", result.stderr.includes("--target"), result.stderr);
  ok("FR-2.10 nonexistent target still does not exist (no changes made)", !existsSync(nonexistentTarget));
}

{
  // Pattern 2: target exists but is a file, not a directory.
  const fileTargetDir = mkdtempSync(join(tmpdir(), "amadeus-installer-eval-filetarget-"));
  try {
    const fileTarget = join(fileTargetDir, "not-a-dir.txt");
    const fileContent = "I am a file, not a directory\n";
    writeFileSync(fileTarget, fileContent, "utf-8");

    const result = run(["bun", installerPath, "--target", fileTarget], root);
    ok("FR-2.10 file target exits 1", result.exitCode === 1, result.stderr);
    ok("FR-2.10 file target reason wording exact", result.stderr.includes(`target is not a directory: ${fileTarget}`), result.stderr);
    ok("FR-2.10 file target fix mentions --target", result.stderr.includes("--target"), result.stderr);
    ok("FR-2.10 file target content unchanged", readFileSync(fileTarget, "utf-8") === fileContent);
  } finally {
    rmSync(fileTargetDir, { recursive: true, force: true });
  }
}

{
  // Pattern 3: target exists, is a directory, but is not writable.
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  if (isRoot) {
    console.log("skip: FR-2.10 non-writable target check (running as root — permission bits are not enforced)");
  } else {
    const nonWritableDir = mkdtempSync(join(tmpdir(), "amadeus-installer-eval-nowrite-"));
    try {
      chmodSync(nonWritableDir, 0o000);
      const result = run(["bun", installerPath, "--target", nonWritableDir], root);
      ok("FR-2.10 non-writable target exits 1", result.exitCode === 1, result.stderr);
      ok("FR-2.10 non-writable target reason wording exact", result.stderr.includes(`target is not writable: ${nonWritableDir}`), result.stderr);
      ok("FR-2.10 non-writable target fix mentions --target", result.stderr.includes("--target"), result.stderr);
    } finally {
      chmodSync(nonWritableDir, 0o755);
      rmSync(nonWritableDir, { recursive: true, force: true });
    }
  }
}

// ---------------------------------------------------------------------------
// FR-2.11 — non-target skills (not amadeus*) are left byte-identical.
// ---------------------------------------------------------------------------

{
  const wsSkills = makeWorkspace();
  try {
    const nonAmadeusSkillDirs = [join(wsSkills, ".claude", "skills", "my-custom-skill"), join(wsSkills, ".agents", "skills", "my-custom-skill")];
    const markerRelPath = "SKILL.md";
    const markerContent = "# My Custom Skill\nnot amadeus, must survive install\n";
    for (const dir of nonAmadeusSkillDirs) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, markerRelPath), markerContent, "utf-8");
    }
    const beforeMtimes = nonAmadeusSkillDirs.map((dir) => statSync(join(dir, markerRelPath)).mtimeMs);

    const result = run(["bun", installerPath, "--target", wsSkills], root);
    ok("FR-2.11 install with pre-existing non-amadeus skills still exits 0", result.exitCode === 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

    for (const [i, dir] of nonAmadeusSkillDirs.entries()) {
      const p = join(dir, markerRelPath);
      const rel = relative(root, p);
      ok(`FR-2.11 non-amadeus skill file still present: ${rel}`, existsSync(p));
      ok(`FR-2.11 non-amadeus skill file byte-identical: ${rel}`, existsSync(p) && readFileSync(p, "utf-8") === markerContent);
      ok(`FR-2.11 non-amadeus skill file mtime unchanged: ${rel}`, existsSync(p) && statSync(p).mtimeMs === beforeMtimes[i]);
    }
  } finally {
    rmSync(wsSkills, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// FR-1.1 — usage error paths (missing --target, unknown argument).
// ---------------------------------------------------------------------------

{
  const missing = run(["bun", installerPath], root);
  ok("FR-1.1 missing --target exits 1", missing.exitCode === 1);
  ok("FR-1.1 missing --target prints usage on stderr", missing.stderr.includes("Usage:") && missing.stderr.includes("--target"));

  const unknown = run(["bun", installerPath, "--target", root, "--bogus-flag"], root);
  ok("FR-1.1 unknown argument exits 1", unknown.exitCode === 1);
  ok("FR-1.1 unknown argument prints usage on stderr", unknown.stderr.includes("Usage:"));
}

// ---------------------------------------------------------------------------
// BR-13 — full-replacement removes stale amadeus* skills that no longer exist
// in the distribution source, while leaving non-amadeus neighbours untouched.
// ---------------------------------------------------------------------------

{
  const wsStale = makeWorkspace();
  try {
    const first = run(["bun", installerPath, "--target", wsStale], root);
    ok("BR-13 initial install exits 0", first.exitCode === 0);

    const staleDirs = [join(wsStale, ".claude", "skills", "amadeus-stale-removed-upstream"), join(wsStale, ".agents", "skills", "amadeus-stale-removed-upstream")];
    const survivorDirs = [join(wsStale, ".claude", "skills", "unrelated-neighbour"), join(wsStale, ".agents", "skills", "unrelated-neighbour")];
    for (const dir of [...staleDirs, ...survivorDirs]) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "SKILL.md"), "marker\n", "utf-8");
    }

    const second = run(["bun", installerPath, "--target", wsStale], root);
    ok("BR-13 re-install exits 0", second.exitCode === 0);
    for (const dir of staleDirs) {
      ok(`BR-13 stale amadeus* skill removed: ${relative(wsStale, dir)}`, !existsSync(dir));
    }
    for (const dir of survivorDirs) {
      ok(`BR-13 non-amadeus neighbour untouched: ${relative(wsStale, dir)}`, existsSync(join(dir, "SKILL.md")));
    }
  } finally {
    rmSync(wsStale, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`installer eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("installer eval: ok");
