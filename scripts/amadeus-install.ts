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
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { readModelOverrideLine, setModelOverrideLine } from "../dev-scripts/apply-model-overrides";

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
      "ステージ skill（`core/skills/amadeus-",
      "「実際に動く実行結果の検証」は、",
      "Skill 昇格の確認は、",
    ],
    // Negative-direction check patterns (FR-2.6). Built with `new RegExp(...)`
    // by callers — some contain a negative lookbehind, so they cannot be
    // regex literals (they contain "/").
    devReferencePatterns: [
      String.raw`core/skills/amadeus`,
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
// Install manifest (Issue #543, Intent 260706-installer-versioning, B001).
// REL(#543)-1: written once, at the very end of a fully successful run —
// never on a mid-run or smoke failure, so a re-run re-judges from the
// previous state and converges.
// ---------------------------------------------------------------------------

export const INSTALL_MANIFEST_NAME = ".amadeus-install.json";
export const INSTALL_BACKUP_DIR = ".amadeus-install-backup";

export type InstallManifest = {
  installedAt: string;
  sourceCommit: string;
  hashAlgorithm: "sha256";
  files: Record<string, string>;
};

function sha256Of(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function readInstallManifest(target: string): InstallManifest | null {
  const manifestPath = join(target, INSTALL_MANIFEST_NAME);
  if (!existsSync(manifestPath)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (e) {
    throw new InstallError(
      `cannot parse ${manifestPath} as JSON: ${errorMessage(e)}`,
      `repair or remove ${manifestPath}, then re-run (a removed manifest falls back to the conservative bootstrap path)`
    );
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InstallError(
      `${manifestPath} does not contain a JSON object`,
      `repair or remove ${manifestPath}, then re-run (a removed manifest falls back to the conservative bootstrap path)`
    );
  }
  const manifest = parsed as InstallManifest;
  // SEC(#543)-2: the target-side manifest is user-writable and therefore
  // untrusted — every recorded relPath is validated BEFORE any use (its keys
  // flow into backup/removal paths in B002). POSIX-only execution is assumed;
  // the drive-letter check is a belt-and-braces rejection of foreign content.
  for (const relPath of Object.keys(manifest.files ?? {})) {
    assertSafeRelPath(relPath, manifestPath);
  }
  return manifest;
}

function assertSafeRelPath(relPath: string, manifestPath: string): void {
  const segments = relPath.split("/");
  const bad =
    relPath.startsWith("/") ||
    /^[A-Za-z]:/.test(relPath) ||
    relPath.includes("\\") ||
    segments.some((s) => s === ".." || s === "");
  if (bad) {
    throw new InstallError(
      `unsafe path in ${manifestPath}: "${relPath}"`,
      `repair or remove ${manifestPath}, then re-run (a removed manifest falls back to the conservative bootstrap path)`
    );
  }
}

function writeInstallManifest(target: string, sourceCommit: string, files: Record<string, string>): void {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(files).sort()) sorted[key] = files[key];
  const manifest: InstallManifest = {
    installedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    sourceCommit,
    hashAlgorithm: "sha256",
    files: sorted,
  };
  writeFileSync(join(target, INSTALL_MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

// SourceCommitResolver. REL(#543)-3: Bun.spawnSync THROWS when git itself is
// missing from $PATH and returns a non-zero exit when the source is not a git
// checkout — both fall to "unknown" (announced by the caller).
function resolveSourceCommit(srcRoot: string): string {
  try {
    const result = Bun.spawnSync({ cmd: ["git", "rev-parse", "HEAD"], cwd: srcRoot, stdout: "pipe", stderr: "pipe" });
    if ((result.exitCode ?? 1) !== 0) return "unknown";
    const out = new TextDecoder().decode(result.stdout).trim();
    return /^[0-9a-f]{40}$/.test(out) ? out : "unknown";
  } catch {
    return "unknown";
  }
}

// TrackedWriter (AD-2): the single entry point for every tracked write.
// B002 activates the 3-way judge (functional-design judge table, incl. the
// global precedence rule) and the backup-then-overwrite strategy. REL(#543)-2:
// the backup completes BEFORE the overwrite; a backup failure aborts via
// InstallError without touching the file.
class InstallRecorder {
  readonly files: Record<string, string> = {};
  readonly backedUp: string[] = [];
  readonly obsoleteBackedUp: string[] = [];
  readonly restored: string[] = [];
  private backupTimeDir: string | null = null;
  constructor(
    readonly target: string,
    readonly recorded: Record<string, string>
  ) {}

  private backupDirAbs(): string {
    if (this.backupTimeDir === null) {
      this.backupTimeDir = new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
    }
    return join(this.target, INSTALL_BACKUP_DIR, this.backupTimeDir);
  }

  backupDirRel(): string | null {
    return this.backupTimeDir === null ? null : `${INSTALL_BACKUP_DIR}/${this.backupTimeDir}/`;
  }

  // REL(#543)-2: write the backup copy first; only then may the caller write.
  private backup(relPath: string, currentContent: Buffer): void {
    try {
      const abs = join(this.backupDirAbs(), relPath);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, currentContent);
    } catch (e) {
      throw new InstallError(
        `failed to back up customized file "${relPath}": ${errorMessage(e)}`,
        "check disk space / permissions on the target, then re-run (the customized file was NOT overwritten)"
      );
    }
  }

  trackedWrite(relPath: string, content: string | Buffer): void {
    const abs = join(this.target, relPath);
    const newHash = sha256Of(content);

    let currentContent: Buffer | null = null;
    try {
      currentContent = readFileSync(abs);
    } catch {
      currentContent = null;
    }
    const currentHash = currentContent === null ? null : sha256Of(currentContent);

    // Global precedence rule: already identical to the new distribution →
    // record and skip the write (prevents double-backup after a mid-failure).
    if (currentHash === newHash) {
      this.files[relPath] = newHash;
      return;
    }

    const recordedHash = this.recorded[relPath] ?? null;
    if (currentContent === null) {
      if (recordedHash !== null) this.restored.push(relPath);
      // recorded-null + current-null = plain creation (no announcement).
    } else if (recordedHash === null || currentHash !== recordedHash) {
      // Customized (or unjudgeable = conservative bootstrap): back up first.
      this.backup(relPath, currentContent);
      this.backedUp.push(relPath);
    }
    // recorded present and currentHash === recordedHash → plain overwrite.

    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    this.files[relPath] = newHash;
  }

  // Obsolete handling (FR-2.6): a target-side file absent from the new
  // distribution. Customized or unjudgeable content is backed up before
  // removal; a pristine file converges away silently.
  judgeObsolete(relPath: string, contentAbs: string): void {
    let currentContent: Buffer | null = null;
    try {
      currentContent = readFileSync(contentAbs);
    } catch {
      return;
    }
    const currentHash = sha256Of(currentContent);
    const recordedHash = this.recorded[relPath] ?? null;
    if (recordedHash === null || currentHash !== recordedHash) {
      this.backup(relPath, currentContent);
      this.backedUp.push(relPath);
      this.obsoleteBackedUp.push(relPath);
    }
  }
}

// DistEnumerator: recursive file enumeration under an ABSOLUTE root.
// SEC/impl note: uses statSync (NOT lstatSync) for type checks so a symlinked
// directory entry (this repo's .claude/skills/amadeus* convention) is
// descended into as a real directory — the per-file equivalent of the old
// cpSync dereference:true.
function enumerateDistFiles(rootAbs: string, relPrefix = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(rootAbs, relPrefix)).sort()) {
    const rel = relPrefix === "" ? name : `${relPrefix}/${name}`;
    const st = statSync(join(rootAbs, rel));
    if (st.isDirectory()) {
      out.push(...enumerateDistFiles(rootAbs, rel));
    } else if (st.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

// Removal pass shared by engine dirs and skills (ObsoleteScanner, FR-2.6).
// A target-side file absent from the dist set is judged via the recorder:
// customized (or unjudgeable) content is backed up first, a pristine file
// converges away. Directories emptied by the pass are removed bottom-up
// (BR-13's !existsSync semantics).
function removeAbsentFiles(targetRootAbs: string, rootRel: string, distRelSet: Set<string>, rec: InstallRecorder): void {
  if (!existsSync(targetRootAbs)) return;
  const walk = (relPrefix: string): void => {
    // .sort(): deterministic, OS-independent enumeration so the backed-up
    // listing order is reproducible (matches enumerateDistFiles).
    for (const name of readdirSync(join(targetRootAbs, relPrefix)).sort()) {
      const rel = relPrefix === "" ? name : `${relPrefix}/${name}`;
      const abs = join(targetRootAbs, rel);
      const st = lstatSync(abs);
      if (st.isDirectory()) {
        walk(rel);
        if (readdirSync(abs).length === 0) rmSync(abs, { recursive: true, force: true });
      } else if (!distRelSet.has(rel)) {
        rec.judgeObsolete(`${rootRel}/${rel}`, abs);
        rmSync(abs, { force: true });
      }
    }
  };
  walk("");
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
// Model overlay reverse transform (Issue #579, Intent 260706-overlay-
// reverse). The dev repo may have the #554 model overlay applied (e.g.
// amadeus-architect-agent.md carrying `modelOverride: fable`), which must
// never ship to users who may not have access to that model — the
// distributed copy always carries the overlay's declared BASE value.
// ---------------------------------------------------------------------------

const MODEL_OVERRIDE_OVERLAY_RELATIVE_PATH = "dev-scripts/data/model-overrides.json";

export type ModelOverlayAgentEntry = { model: string; base?: string };
export type ModelOverlay = { agents: Record<string, ModelOverlayAgentEntry>; fallbacks: Record<string, string> };

// FR(#579)-1.3: fail-open. An absent, unreadable, or malformed overlay
// declaration in the source must never fail the install — it just means no
// agent gets a reverse transform (copy everything as-is).
function loadModelOverlay(src: string): ModelOverlay | null {
  try {
    return JSON.parse(readFileSync(join(src, MODEL_OVERRIDE_OVERLAY_RELATIVE_PATH), "utf-8")) as ModelOverlay;
  } catch {
    return null;
  }
}

// Reverse-transforms a distributed agent md's `modelOverride` line to the
// overlay's base value. Reuses the line-parse/replace helpers already
// exported by dev-scripts/apply-model-overrides.ts (tested there) and
// reimplements only the managed-value-set judgement, mirroring #554 parity's
// normalizeModelOverlay conservative rule (dev-scripts/parity-check.ts lines
// 233-252, FR(#579)-1.2): transform ONLY when base is recorded AND the actual
// value is in the managed set (declared model ∪ declared fallback target).
// Any other case (agent not declared, base not yet recorded, actual value
// unmanaged, or an unparsable modelOverride line) copies the content as-is —
// no silent mutation.
export function reverseModelOverlay(content: string, agentName: string, overlay: ModelOverlay | null): string {
  if (!overlay) return content;
  const entry = overlay.agents[agentName];
  if (!entry || entry.base === undefined) return content;
  try {
    const actual = readModelOverrideLine(content);
    const fallbackTarget = overlay.fallbacks[entry.model];
    const managed = new Set(fallbackTarget ? [entry.model, fallbackTarget] : [entry.model]);
    if (managed.has(actual)) {
      return setModelOverrideLine(content, entry.base);
    }
  } catch {
    // modelOverride line unreadable — copy as-is (no silent mutation).
  }
  return content;
}

// ---------------------------------------------------------------------------
// copyEngine (component-methods.md). Full replace of the 7 .agents/amadeus/
// subdirectories (FR-1.2, BR-13).
// ---------------------------------------------------------------------------

// AD-7 (#543): per-file copy replacing the old rm→cp full replace. The
// enumerate → trackedWrite → removal-pass structure records every written
// file's sha256 for the install manifest while preserving the old
// convergence semantics (B001 keeps the judge frozen to plain overwrite).
function copyEngine(src: string, target: string, rec: InstallRecorder): void {
  // FR(#579)-3.1: loaded once per run; content is reverse-transformed BEFORE
  // being handed to rec.trackedWrite, so the manifest hash is automatically
  // the sha256 of the written (transformed) content.
  const modelOverlay = loadModelOverlay(src);
  for (const dir of MANIFEST.engineDirs) {
    const srcPath = join(src, ".agents", "amadeus", dir);
    const destRel = `.agents/amadeus/${dir}`;
    try {
      const rels = enumerateDistFiles(srcPath);
      for (const rel of rels) {
        let content: string | Buffer = readFileSync(join(srcPath, rel));
        // FR(#579)-1.1: the utf-8 round-trip is gated on the overlay actually
        // declaring this agent — undeclared agent md files ship as raw bytes
        // (no decode/encode side effects on files the transform never touches).
        if (dir === "agents" && rel.endsWith(".md")) {
          const agentName = rel.slice(0, -".md".length);
          if (modelOverlay?.agents[agentName]) {
            content = reverseModelOverlay(content.toString("utf-8"), agentName, modelOverlay);
          }
        }
        rec.trackedWrite(`${destRel}/${rel}`, content);
      }
      removeAbsentFiles(join(target, ".agents", "amadeus", dir), destRel, new Set(rels), rec);
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

// AD-7 (#543): per-file copy — see copyEngine. The target-side scan is
// filtered to amadeus* on BOTH sides (the pre-#543 line-240 filter), so
// non-amadeus neighbours are never compared or removed. Symlinked source
// entries (this repo's .claude/skills/amadeus* convention) are descended
// into by enumerateDistFiles' statSync checks — the per-file equivalent of
// the old cpSync dereference:true.
function copySkills(src: string, target: string, rec: InstallRecorder): void {
  const skillRoots = [join(".claude", "skills"), join(".agents", "skills")];
  for (const rel of skillRoots) {
    const srcRoot = join(src, rel);
    const targetRoot = join(target, rel);
    try {
      mkdirSync(targetRoot, { recursive: true });
      const sourceNames = existsSync(srcRoot)
        ? readdirSync(srcRoot)
            .filter((name) => name.startsWith(MANIFEST.skillsGlobPrefix))
            .filter((name) => statSync(join(srcRoot, name)).isDirectory())
        : [];
      const targetNames = readdirSync(targetRoot).filter((name) => name.startsWith(MANIFEST.skillsGlobPrefix));
      const relPosix = rel.split("\\").join("/");
      // Removal pass (ObsoleteScanner): stale amadeus* skill dirs no longer
      // in the source are removed with per-file judgment (FR-2.6 — customized
      // files are backed up first), then the dir itself is dropped (BR-13).
      for (const name of targetNames) {
        if (!sourceNames.includes(name)) {
          removeAbsentFiles(join(targetRoot, name), `${relPosix}/${name}`, new Set(), rec);
          rmSync(join(targetRoot, name), { recursive: true, force: true });
        }
      }
      for (const name of sourceNames) {
        const skillSrc = join(srcRoot, name);
        const rels = enumerateDistFiles(skillSrc);
        for (const fileRel of rels) {
          rec.trackedWrite(`${relPosix}/${name}/${fileRel}`, readFileSync(join(skillSrc, fileRel)));
        }
        removeAbsentFiles(join(targetRoot, name), `${relPosix}/${name}`, new Set(rels), rec);
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

function placeAmadeusMd(src: string, target: string, rec: InstallRecorder): void {
  let raw: string;
  try {
    raw = readFileSync(join(src, "AMADEUS.md"), "utf-8");
  } catch (e) {
    throw new InstallError(`failed to read source AMADEUS.md: ${errorMessage(e)}`, "verify the distribution source repository is intact, then re-run");
  }
  const transformed = transformAmadeusMd(raw);
  try {
    // FR(#543)-1.1 / C-7: the manifest records the POST-transform content.
    rec.trackedWrite("AMADEUS.md", transformed);
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

function mergeSettings(target: string, wiring: readonly HookWiringEntry[], rec: InstallRecorder): { total: number; duplicates: number } {
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

  // Snapshot of every non-hooks key BEFORE the merge mutates anything —
  // the post-write re-read is deep-compared against this (FR-2.7,
  // business-logic-model O-1 step 4: non-target keys stay value-identical).
  const nonHooksSnapshot = JSON.stringify(
    Object.fromEntries(Object.entries(settings as Record<string, unknown>).filter(([key]) => key !== "hooks"))
  );

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
    // AD-6 (#543): the "new content" for settings.json is the merge result;
    // the manifest records the post-merge written content. The pre/post
    // non-hooks deep-compare below stays OUTSIDE the tracked write.
    rec.trackedWrite(".claude/settings.json", JSON.stringify(settings, null, 2));
  } catch (e) {
    throw new InstallError(
      `failed to write ${settingsPath}: ${errorMessage(e)}`,
      "check disk space / permissions on the target, then re-run (idempotent)"
    );
  }

  // Post-write verification, reported separately from a write failure: the
  // file HAS been written at this point, so the fix guidance must say
  // "inspect", not "check disk space". Re-read and validate — catches silent
  // corruption on write, and deep-compares every non-hooks key against the
  // pre-merge snapshot (FR-2.7: the merge must never change user-owned values).
  try {
    const reread = JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
    const rereadNonHooks = JSON.stringify(Object.fromEntries(Object.entries(reread).filter(([key]) => key !== "hooks")));
    if (rereadNonHooks !== nonHooksSnapshot) {
      throw new Error("a non-hooks key changed during the merge");
    }
  } catch (e) {
    throw new InstallError(
      `post-write verification of ${settingsPath} failed: ${errorMessage(e)}`,
      `the file was written and may already contain merged hooks — inspect ${settingsPath}, restore it if needed, then re-run (idempotent)`
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

function parseArgs(argv: string[]): { target: string; versionInfo: boolean } {
  let target: string | undefined;
  let versionInfo = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--target") {
      target = argv[i + 1];
      i++;
    } else if (argv[i] === "--version-info") {
      versionInfo = true;
    } else {
      dieUsage(`unknown argument: ${argv[i]}`);
    }
  }
  if (!target) {
    dieUsage("--target <workspace> is required");
  }
  return { target, versionInfo };
}

// FR(#543)-3: --version-info. Installed = exit 0 (stdout, one line); manifest
// missing = exit 1 (stderr + fix hint) — the rpm -q / dpkg -s "not installed
// is non-zero" convention, so CI can branch with `--version-info || install`.
function printVersionInfo(target: string): never {
  let manifest: InstallManifest | null;
  try {
    manifest = readInstallManifest(target);
  } catch (e) {
    const fix = e instanceof InstallError ? e.fix : "inspect the manifest, then re-run";
    process.stderr.write(`amadeus-install: ${errorMessage(e)}\n`);
    process.stderr.write(`  fix: ${fix}\n`);
    process.exit(1);
  }
  if (manifest === null) {
    process.stderr.write("amadeus-install: no install manifest found (pre-versioning install or not installed)\n");
    process.stderr.write("  fix: run the install command once — it records a versioned manifest (existing files are backed up if they differ)\n");
    process.exit(1);
  }
  const c8 = manifest.sourceCommit === "unknown" ? "unknown" : manifest.sourceCommit.slice(0, 8);
  const count = Object.keys(manifest.files ?? {}).length;
  console.log(`amadeus-install: installed commit ${c8} (installed at ${manifest.installedAt}, ${count} files tracked)`);
  process.exit(0);
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
  const args = parseArgs(process.argv.slice(2));
  const target = resolve(args.target);
  if (args.versionInfo) {
    printVersionInfo(target);
  }
  preflight(target);

  const src = resolve(import.meta.dir, "..");

  console.log(`amadeus-install: installing into ${target}`);

  // FR(#543)-1.1: resolve the distribution commit up front; both failure
  // modes (git absent = throw, not a checkout = non-zero) fall to "unknown".
  const sourceCommit = resolveSourceCommit(src);
  if (sourceCommit === "unknown") {
    console.log('amadeus-install: source commit unknown (not a git checkout) — manifest records "unknown"');
  }

  // FR(#543)-3.3: previous-install announcement (manifest present), or the
  // conservative-bootstrap announcement (manifest absent). A corrupt manifest
  // aborts with the readInstallManifest fix line via runStep-equivalent shaping.
  let previous: InstallManifest | null = null;
  try {
    previous = readInstallManifest(target);
  } catch (e) {
    const fix = e instanceof InstallError ? e.fix : "inspect the manifest, then re-run";
    process.stderr.write(`amadeus-install: ${errorMessage(e)}\n`);
    process.stderr.write(`  fix: ${fix}\n`);
    process.exit(1);
  }
  if (previous !== null) {
    const c8 = previous.sourceCommit === "unknown" ? "unknown" : previous.sourceCommit.slice(0, 8);
    console.log(`amadeus-install: previous install found (commit ${c8}, ${previous.installedAt})`);
  } else {
    console.log("amadeus-install: no previous manifest — treating differing files as customized (conservative bootstrap)");
  }

  const rec = new InstallRecorder(target, previous?.files ?? {});

  // FR-2.3: each step's detail carries the counts of backups/restores that
  // happened inside it; the end-of-run summary lists every backed-up path.
  const stepCounts = (fn: () => string): string => {
    // Count rule (mockups.md): obsolete backups are summary-only — the step
    // detail counts copy-stage backups exclusively, so the obsolete deltas
    // are subtracted out.
    const b0 = rec.backedUp.length - rec.obsoleteBackedUp.length;
    const r0 = rec.restored.length;
    const base = fn();
    const parts: string[] = [];
    const b = rec.backedUp.length - rec.obsoleteBackedUp.length - b0;
    const r = rec.restored.length - r0;
    if (b > 0) parts.push(`${b} customized backed up`);
    if (r > 0) parts.push(`${r} deleted restored`);
    return parts.length > 0 ? `${base} (${parts.join(", ")})` : base;
  };

  runStep(1, "engine", () =>
    stepCounts(() => {
      copyEngine(src, target, rec);
      placeAmadeusMd(src, target, rec);
      return `.agents/amadeus/ (${MANIFEST.engineDirs.length} dirs, replaced)`;
    })
  );

  runStep(2, "skills", () =>
    stepCounts(() => {
      copySkills(src, target, rec);
      return ".claude/skills/amadeus*, .agents/skills/amadeus* (replaced)";
    })
  );

  runStep(3, "symlinks", () => {
    relinkClaude(target);
    return `.claude/{${MANIFEST.claudeSymlinks.join(",")}} (recreated)`;
  });

  runStep(4, "settings", () =>
    stepCounts(() => {
      const result = mergeSettings(target, MANIFEST.hooksWiring, rec);
      return `.claude/settings.json (hooks merged: ${result.total} entries, ${result.duplicates} duplicates)`;
    })
  );

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
    // #573: on a brand-new target the workspace shell is not seeded yet —
    // doctor reports this as an advisory pass with a fixed marker prefix
    // (the contract shared with amadeus-utility.ts's shell check; change
    // them together). Surface it as one info line so the fresh-install user
    // learns the next step instead of never seeing the discarded output.
    if (output.includes("workspace shell pending first workflow")) {
      console.log("note: workspace shell is seeded at your first /amadeus workflow (known state on a fresh install)");
    }
    // FR-2.3 summary: header count = total backups = number of listing lines;
    // the obsolete inner-count and restored lines appear only when non-zero.
    if (rec.backedUp.length > 0) {
      console.log(`amadeus-install: ${rec.backedUp.length} customized file(s) backed up to ${rec.backupDirRel() ?? ""}`);
      for (const rel of rec.backedUp) {
        console.log(`amadeus-install:   backed up: ${rel}`);
      }
      if (rec.obsoleteBackedUp.length > 0) {
        console.log(`amadeus-install: ${rec.obsoleteBackedUp.length} of the above is obsolete (removed from the new distribution)`);
      }
    }
    if (rec.restored.length > 0) {
      console.log(`amadeus-install: ${rec.restored.length} deleted file(s) restored (per manifest)`);
    }
    // REL(#543)-1 / FR-1.3: the manifest is written exactly once, only after
    // every step (including smoke) succeeded — a failed install is never
    // recorded as installed.
    try {
      writeInstallManifest(target, sourceCommit, rec.files);
    } catch (e) {
      process.stderr.write(`amadeus-install: failed to write ${INSTALL_MANIFEST_NAME}: ${errorMessage(e)}\n`);
      process.stderr.write("  fix: check disk space / permissions on the target, then re-run (idempotent)\n");
      process.exit(1);
    }
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
