#!/usr/bin/env bun

// amadeus-install — canonical single-command installer for the Amadeus engine
// (Issue #451, Intent 260705-engine-installer, u001-engine-installer, Bolt B001).
//
// Copies the engine (.agents/amadeus/), the amadeus* skills, and a transformed
// AMADEUS.md from this repository (the distribution source) into a target
// workspace, recreates the .claude/* engine symlinks, merges the hooks wiring
// into the target's .claude/settings.json, and runs a smoke check (doctor).
//
// Design references (binding, not re-derived here):
//   - business-logic-model.md (manifest shape, AMADEUS.md transform, settings
//     merge algorithm, smoke invocation)
//   - business-rules.md (BR-1..BR-15)
//   - mockups.md / interaction-spec.md (exact CLI output shapes)
//   - component-methods.md (function contracts)
//
// No external dependencies — node:/Bun standard APIs only (NFR-2).

import {
  accessSync,
  constants as fsConstants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Manifest — the single declarative source for what gets installed (FR-1.10).
// ---------------------------------------------------------------------------

const ENGINE_DIR_NAMES = [
  "agents",
  "amadeus-common",
  "hooks",
  "knowledge",
  "scopes",
  "sensors",
  "tools",
] as const;

export const MANIFEST = {
  // .agents/amadeus/ subdirectories copied wholesale (FR-1.2).
  engineDirs: ENGINE_DIR_NAMES,
  // Prefix used to select amadeus* skills under .claude/skills/ and
  // .agents/skills/ (FR-1.3). Non-matching skills are never touched.
  skillsGlobPrefix: "amadeus",
  // .claude/<name> -> ../.agents/amadeus/<name> relative symlinks (FR-1.5).
  // Same 7 names as engineDirs (business-logic-model O-1).
  claudeSymlinks: ENGINE_DIR_NAMES,
  amadeusMd: {
    // H2 sections removed wholesale (development-only content).
    removeSections: ["Development Rules"],
    // Declarative blocks removed: line-prefix match through the line before
    // the next blank line (business-logic-model O-1).
    removeBlocks: [
      "- Skill sources:",
      "ステージ skill（`skills/amadeus-",
      "「実際に動く実行結果の検証」は、",
      "Skill 昇格の確認は、",
    ],
    // Negative-direction check patterns (FR-2.6). Built with `new RegExp(...)`
    // by callers — some contain a negative lookbehind, so they cannot be
    // regex literals (they contain "/").
    devReferencePatterns: [
      String.raw`(?<!\.agents/)skills/amadeus`,
      "dev-scripts/",
      "parity:check",
      "promote-skill",
      "test:it:",
    ],
  },
  // .claude/settings.json hooks wiring merged in (FR-1.6). 11 entries —
  // matches the amadeus-*.ts hooks actually wired in this repo's
  // .claude/settings.json (kanban-local hooks are excluded, AD-4).
  hooksWiring: [
    { event: "UserPromptSubmit", matcher: "", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-mint-presence.ts" },
    { event: "SessionStart", matcher: "", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-session-start.ts" },
    { event: "SessionEnd", matcher: "", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-session-end.ts" },
    { event: "PostToolUse", matcher: "Write|Edit", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-audit-logger.ts" },
    { event: "PostToolUse", matcher: "Write|Edit", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-sensor-fire.ts" },
    { event: "PostToolUse", matcher: "TaskUpdate", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-sync-statusline.ts" },
    { event: "PostToolUse", matcher: "AskUserQuestion", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-mint-presence.ts" },
    { event: "PostToolUse", matcher: "Bash", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-runtime-compile.ts" },
    { event: "PreCompact", matcher: "", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-validate-state.ts" },
    { event: "SubagentStop", matcher: "", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-log-subagent.ts" },
    { event: "Stop", matcher: "", command: "bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-stop.ts" },
  ],
} as const;

type HookWiringEntry = (typeof MANIFEST.hooksWiring)[number];

// ---------------------------------------------------------------------------
// Errors — carries a user-facing fix line distinct from the raw message
// (reliability-design's "対象別の操作 + 原因解消後の再実行で収束する旨").
// ---------------------------------------------------------------------------

class InstallError extends Error {
  readonly fix: string;
  constructor(message: string, fix: string) {
    super(message);
    this.fix = fix;
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ---------------------------------------------------------------------------
// AMADEUS.md transform (component-methods.md: transformAmadeusMd, pure).
// Throws if a declared removal target is missing from the source — that is
// the removal list going stale relative to the real document (BR-5).
// ---------------------------------------------------------------------------

function removeDeclaredBlock(lines: string[], prefix: string): string[] {
  const startIdx = lines.findIndex((line) => line.startsWith(prefix));
  if (startIdx === -1) {
    throw new Error(`AMADEUS.md transform: declared block not found in source (prefix: "${prefix}")`);
  }
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") {
      endIdx = i;
      break;
    }
  }
  return [...lines.slice(0, startIdx), ...lines.slice(endIdx)];
}

function removeH2Section(lines: string[], heading: string): string[] {
  const target = `## ${heading}`;
  const startIdx = lines.findIndex((line) => line === target);
  if (startIdx === -1) {
    throw new Error(`AMADEUS.md transform: declared section not found in source ("${target}")`);
  }
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      endIdx = i;
      break;
    }
  }
  return [...lines.slice(0, startIdx), ...lines.slice(endIdx)];
}

// Collapses runs of 2+ consecutive blank lines into a single blank line —
// cosmetic cleanup for the removals above (business-logic-model O-1).
function compressBlankLines(lines: string[]): string[] {
  const out: string[] = [];
  let prevBlank = false;
  for (const line of lines) {
    const isBlank = line.trim() === "";
    if (isBlank && prevBlank) continue;
    out.push(line);
    prevBlank = isBlank;
  }
  return out;
}

export function transformAmadeusMd(source: string): string {
  let lines = source.split("\n");
  for (const prefix of MANIFEST.amadeusMd.removeBlocks) {
    lines = removeDeclaredBlock(lines, prefix);
  }
  for (const heading of MANIFEST.amadeusMd.removeSections) {
    lines = removeH2Section(lines, heading);
  }
  lines = compressBlankLines(lines);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// preflight (component-methods.md). Runs before any write; no changes made
// on failure (FR-1.1).
// ---------------------------------------------------------------------------

function preflight(target: string): void {
  if (!existsSync(target)) {
    dieTargetError(`target does not exist: ${target}`);
  }
  if (!statSync(target).isDirectory()) {
    dieTargetError(`target is not a directory: ${target}`);
  }
  try {
    accessSync(target, fsConstants.W_OK);
  } catch {
    dieTargetError(`target is not writable: ${target}`);
  }
}

// ---------------------------------------------------------------------------
// copyEngine (component-methods.md). Full replace of the 7 .agents/amadeus/
// subdirectories (FR-1.2, BR-13).
// ---------------------------------------------------------------------------

function copyEngine(src: string, target: string): void {
  for (const dir of MANIFEST.engineDirs) {
    const srcPath = join(src, ".agents", "amadeus", dir);
    const destPath = join(target, ".agents", "amadeus", dir);
    try {
      rmSync(destPath, { recursive: true, force: true });
      mkdirSync(join(target, ".agents", "amadeus"), { recursive: true });
      cpSync(srcPath, destPath, { recursive: true, dereference: true });
    } catch (e) {
      throw new InstallError(
        `failed to copy engine dir "${dir}": ${errorMessage(e)}`,
        "check disk space / permissions on the target, then re-run (idempotent)"
      );
    }
  }
}

// ---------------------------------------------------------------------------
// copySkills (component-methods.md). Full replace of amadeus* skills only,
// in both .claude/skills/ and .agents/skills/ (FR-1.3). dereference:true so a
// symlinked source entry (this repo's own .claude/skills/amadeus* convention)
// is copied as real, standalone content — not propagated as a symlink.
// ---------------------------------------------------------------------------

function copySkills(src: string, target: string): void {
  const skillRoots = [join(".claude", "skills"), join(".agents", "skills")];
  for (const rel of skillRoots) {
    const srcRoot = join(src, rel);
    const targetRoot = join(target, rel);
    try {
      mkdirSync(targetRoot, { recursive: true });
      const sourceNames = existsSync(srcRoot)
        ? readdirSync(srcRoot).filter((name) => name.startsWith(MANIFEST.skillsGlobPrefix))
        : [];
      const targetNames = readdirSync(targetRoot).filter((name) => name.startsWith(MANIFEST.skillsGlobPrefix));
      // Full replace: drop target-only entries no longer in source, then
      // replace every source-listed entry.
      for (const name of targetNames) {
        if (!sourceNames.includes(name)) {
          rmSync(join(targetRoot, name), { recursive: true, force: true });
        }
      }
      for (const name of sourceNames) {
        const destPath = join(targetRoot, name);
        rmSync(destPath, { recursive: true, force: true });
        cpSync(join(srcRoot, name), destPath, { recursive: true, dereference: true });
      }
    } catch (e) {
      throw new InstallError(
        `failed to copy skills under "${rel}": ${errorMessage(e)}`,
        "check disk space / permissions on the target, then re-run (idempotent)"
      );
    }
  }
}

// ---------------------------------------------------------------------------
// placeAmadeusMd (component-methods.md). Full replace of AMADEUS.md, applying
// transformAmadeusMd (FR-1.4, FR-1.8).
// ---------------------------------------------------------------------------

function placeAmadeusMd(src: string, target: string): void {
  let raw: string;
  try {
    raw = readFileSync(join(src, "AMADEUS.md"), "utf-8");
  } catch (e) {
    throw new InstallError(`failed to read source AMADEUS.md: ${errorMessage(e)}`, "verify the distribution source repository is intact, then re-run");
  }
  const transformed = transformAmadeusMd(raw);
  try {
    writeFileSync(join(target, "AMADEUS.md"), transformed, "utf-8");
  } catch (e) {
    throw new InstallError(
      `failed to write target AMADEUS.md: ${errorMessage(e)}`,
      "check disk space / permissions on the target, then re-run (idempotent)"
    );
  }
}

// ---------------------------------------------------------------------------
// relinkClaude (component-methods.md). Recreates the 7 .claude/<name>
// relative symlinks (FR-1.5). A non-symlink conflict aborts without touching
// the conflicting path (BR-3).
// ---------------------------------------------------------------------------

function relinkClaude(target: string): void {
  const claudeDir = join(target, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  for (const name of MANIFEST.claudeSymlinks) {
    const linkPath = join(claudeDir, name);
    const relativeTarget = join("..", ".agents", "amadeus", name);

    let existing: ReturnType<typeof lstatSync> | null = null;
    try {
      existing = lstatSync(linkPath);
    } catch {
      existing = null;
    }

    if (existing === null) {
      symlinkSync(relativeTarget, linkPath);
      continue;
    }
    if (existing.isSymbolicLink()) {
      unlinkSync(linkPath);
      symlinkSync(relativeTarget, linkPath);
      continue;
    }
    throw new InstallError(
      `${linkPath} exists and is not a symlink`,
      `move or remove ${linkPath}, then re-run (idempotent)`
    );
  }
}

// ---------------------------------------------------------------------------
// mergeSettings (component-methods.md). Idempotent hooks-only merge into
// .claude/settings.json (FR-1.6, AD-6, BR-2, BR-10).
// ---------------------------------------------------------------------------

interface HookCommandEntry {
  type: string;
  command: string;
}
interface HookBlock {
  matcher: string;
  hooks: HookCommandEntry[];
}
interface SettingsShape {
  hooks?: Record<string, HookBlock[]>;
  [key: string]: unknown;
}

function mergeSettings(target: string, wiring: readonly HookWiringEntry[]): { total: number; duplicates: number } {
  const settingsPath = join(target, ".claude", "settings.json");

  let settings: SettingsShape = { hooks: {} };
  if (existsSync(settingsPath)) {
    let raw: string;
    try {
      raw = readFileSync(settingsPath, "utf-8");
    } catch (e) {
      throw new InstallError(
        `cannot read ${settingsPath}: ${errorMessage(e)}`,
        `repair ${settingsPath} manually, then re-run (idempotent). The file was NOT modified.`
      );
    }
    try {
      settings = JSON.parse(raw) as SettingsShape;
    } catch {
      throw new InstallError(
        `cannot parse ${settingsPath} as JSON`,
        `repair ${settingsPath} manually, then re-run (idempotent). The file was NOT modified.`
      );
    }
    if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
      throw new InstallError(
        `${settingsPath} does not contain a JSON object`,
        `repair ${settingsPath} manually, then re-run (idempotent). The file was NOT modified.`
      );
    }
  }

  if (!settings.hooks || typeof settings.hooks !== "object" || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
  const hooks = settings.hooks;

  const manifestCommands = new Set<string>(wiring.map((entry) => entry.command));
  let duplicates = 0;

  for (const entry of wiring) {
    if (!Array.isArray(hooks[entry.event])) hooks[entry.event] = [];
    const eventBlocks = hooks[entry.event];

    const alreadyPresent = eventBlocks.some(
      (block) => block.matcher === entry.matcher && (block.hooks ?? []).some((h) => h.command === entry.command)
    );
    if (alreadyPresent) {
      duplicates++;
      continue;
    }

    // First block, same matcher, that already carries a manifest-managed
    // command — append there so amadeus's own hooks stay grouped and other
    // tools' blocks are never touched (business-logic-model O-1 step 3).
    const targetBlock = eventBlocks.find(
      (block) => block.matcher === entry.matcher && (block.hooks ?? []).some((h) => manifestCommands.has(h.command))
    );
    if (targetBlock) {
      targetBlock.hooks.push({ type: "command", command: entry.command });
    } else {
      eventBlocks.push({ matcher: entry.matcher, hooks: [{ type: "command", command: entry.command }] });
    }
  }

  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    // Re-read and validate — catches silent corruption on write (FR-2.7).
    JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch (e) {
    throw new InstallError(
      `failed to write ${settingsPath}: ${errorMessage(e)}`,
      "check disk space / permissions on the target, then re-run (idempotent)"
    );
  }

  return { total: wiring.length, duplicates };
}

// ---------------------------------------------------------------------------
// smoke (component-methods.md, business-logic-model O-2). Runs doctor against
// the target with --project-dir + cwd=target (double-pinned, REL-4).
// ---------------------------------------------------------------------------

function smoke(target: string): { pass: boolean; output: string } {
  const doctorPath = join(target, ".agents", "amadeus", "tools", "amadeus-utility.ts");
  const result = Bun.spawnSync({
    cmd: ["bun", doctorPath, "doctor", "--project-dir", target],
    cwd: target,
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr);
  return { pass: (result.exitCode ?? 1) === 0, output };
}

// ---------------------------------------------------------------------------
// CLI — argument parsing and output (interaction-spec.md, mockups.md).
// ---------------------------------------------------------------------------

function dieUsage(message: string): never {
  process.stderr.write(`Usage: bun run scripts/amadeus-install.ts --target <workspace>\n`);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function dieTargetError(reason: string): never {
  process.stderr.write(`amadeus-install: error: ${reason}\n`);
  process.stderr.write(`  fix: pass an existing writable workspace directory via --target\n`);
  process.exit(1);
}

function parseTargetArg(argv: string[]): string {
  let target: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--target") {
      target = argv[i + 1];
      i++;
    } else {
      dieUsage(`unknown argument: ${argv[i]}`);
    }
  }
  if (!target) {
    dieUsage("--target <workspace> is required");
  }
  return target;
}

function runStep(n: number, label: string, action: () => string): void {
  process.stdout.write(`[${n}/5] ${label.padEnd(14)}`);
  let detail: string;
  try {
    detail = action();
  } catch (e) {
    process.stdout.write("...\n");
    const fix = e instanceof InstallError ? e.fix : "resolve the cause above, then re-run (idempotent)";
    process.stderr.write(`amadeus-install: error at step ${n}/5 (${label}): ${errorMessage(e)}\n`);
    process.stderr.write(`  fix: ${fix}\n`);
    process.exit(1);
  }
  console.log(detail);
}

function main(): void {
  const target = resolve(parseTargetArg(process.argv.slice(2)));
  preflight(target);

  const src = resolve(import.meta.dir, "..");

  console.log(`amadeus-install: installing into ${target}`);

  runStep(1, "engine", () => {
    copyEngine(src, target);
    placeAmadeusMd(src, target);
    return `.agents/amadeus/ (${MANIFEST.engineDirs.length} dirs, replaced)`;
  });

  runStep(2, "skills", () => {
    copySkills(src, target);
    return ".claude/skills/amadeus*, .agents/skills/amadeus* (replaced)";
  });

  runStep(3, "symlinks", () => {
    relinkClaude(target);
    return `.claude/{${MANIFEST.claudeSymlinks.join(",")}} (recreated)`;
  });

  runStep(4, "settings", () => {
    const result = mergeSettings(target, MANIFEST.hooksWiring);
    return `.claude/settings.json (hooks merged: ${result.total} entries, ${result.duplicates} duplicates)`;
  });

  process.stdout.write(`[5/5] ${"smoke".padEnd(14)}`);
  // REL-3: the smoke step must go through the same error shaping as steps 1-4.
  // Bun.spawnSync THROWS (not a failing exit code) when the executable is
  // missing from $PATH, so an unguarded call would crash with a raw stack.
  let smokeResult: { pass: boolean; output: string };
  try {
    smokeResult = smoke(target);
  } catch (e) {
    process.stdout.write("...\n");
    process.stderr.write(`amadeus-install: error at step 5/5 (smoke): ${errorMessage(e)}\n`);
    process.stderr.write(`  fix: resolve the cause above, then re-run (idempotent)\n`);
    process.exit(1);
  }
  const { pass, output } = smokeResult;
  if (pass) {
    console.log("doctor check passed");
    console.log('amadeus-install: done. Next: see README "導入後の検証" (doctor / amadeus-validator)');
    process.exit(0);
  }
  console.log("doctor check failed");
  const doctorPath = join(target, ".agents", "amadeus", "tools", "amadeus-utility.ts");
  process.stderr.write("amadeus-install: installed but smoke check failed\n");
  process.stderr.write(`${output}\n`);
  process.stderr.write(`fix: re-run \`bun ${doctorPath} doctor --project-dir ${target}\` manually and follow its guidance\n`);
  process.exit(1);
}

if (import.meta.main) main();
