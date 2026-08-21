#!/usr/bin/env bun
// scripts/promote-self.ts — promote generated harness output into this repo.
//
// This is a project-local dogfood install, not a distributable build. The
// packager still owns dist/; this script copies the generated Claude/Codex/
// Cursor/OpenCode/Kimi/Pi harness surfaces into the repository root so Amadeus can develop itself.
// Contributor-only skill runtime files under contrib/skills/ are projected
// into both harness discovery trees without entering dist/. Authoring-only
// eval assets remain at the canonical contributor path.

import { spawnSync } from "node:child_process";
import {
  constants as fsConstants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPOSED_SCOPE_RE,
  PLUGIN_ENGINE_STATE_RE,
  preserved as preservedEntries,
  SCOPE_GRID_RE,
  SELF_INSTALL_ALLOWLIST,
  STAGE_GRAPH_RE,
} from "../packages/framework/core/tools/data/self-install-allowlist.ts";
import { PROJECT_INSTRUCTIONS } from "../packages/framework/harness/claude/project-instructions.ts";
import { mirrorProjectionRegistryDigest } from "../packages/framework/harness/projections.ts";
import {
  kimiConfigPath,
  renderHooksError,
  resolveKimiHome,
  runHooksMerge,
} from "../packages/setup/src/modules/kimi-hooks.ts";
import { planMerge, renderManagedBlock } from "../packages/setup/src/domain/kimi-hooks.ts";
import { createApplyWrite } from "../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite } from "../packages/setup/src/ports/fsops.ts";
import { DistributionTransactionCoordinator } from "./distribution-transaction.ts";
import {
  SELFDEV_BUILD_COMMAND,
  writeSelfDevelopmentIntegrityAttestation,
} from "../packages/framework/core/tools/amadeus-selfdev-integrity.ts";
// The self-install face set is defined ONCE, next to the eight package faces it
// is deliberately narrower than. This script consumes it; it never re-declares
// an equal-valued list under another name (#1575).
import { buildSelfInstallProjection, SELF_INSTALL_HARNESSES } from "./plugin-projection.ts";

type Mode = "check" | "apply";
type AttestationWriter = (repoRoot: string) => void;

type ManagedDir = {
  src: string;
  dst: string;
};

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// amadeus/spaces/default/memory/ is deliberately NOT managed: workspace
// memory is the hand-edited method source — practices-discovery writes to it
// and the self-learning loop appends to its ## Corrections sections at
// runtime, so promoting the shipped seed over it would clobber user content.
// The engine seeds it from the bundled copy only when it is missing.
export const managedDirs: ManagedDir[] = [
  { src: "dist/claude/.claude", dst: ".claude" },
  { src: "dist/codex/.codex", dst: ".codex" },
  { src: "dist/codex/.agents", dst: ".agents" },
  { src: "dist/cursor/.cursor", dst: ".cursor" },
  { src: "dist/opencode/.opencode", dst: ".opencode" },
  { src: "dist/kimi/.kimi-code", dst: ".kimi-code" },
  // Only the harness dir. dist/pi/.gitignore is Pi's project-root file for an
  // INSTALLED workspace (it negates a broad vendor/ rule so .pi/vendor/ stays
  // commit-visible there); this repository's root .gitignore is the opposite —
  // the hand-maintained source-only boundary that ignores /.pi/**.
  { src: "dist/pi/.pi", dst: ".pi" },
];

const CONTRIBUTOR_SKILLS_ROOT = "contrib/skills";
const CONTRIBUTOR_SKILL_DESTINATIONS = [".claude/skills", ".agents/skills"];
const CODEX_AGENTS_MARKER = "# AI-DLC on Codex CLI\n";
const AMADEUS_IMPORT = "@.agents/rules/amadeus.md\n\n";
const CODEX_SUFFIX_REL = ".agents/rules/amadeus-codex-suffix.md";
const CODEX_SUFFIX_IMPORT = "@.agents/rules/amadeus-codex-suffix.md";
const ROOT_AGENTS_IMPORTS = [AMADEUS_IMPORT.trim(), CODEX_SUFFIX_IMPORT] as const;

function composeCodexAgentsSuffix(codexDist: Buffer): Buffer {
  const generated = codexDist.toString("utf-8");
  return Buffer.from(
    generated.startsWith(AMADEUS_IMPORT)
      ? generated.slice(AMADEUS_IMPORT.length)
      : generated,
    "utf-8",
  );
}

const preserved = preservedEntries(SELF_INSTALL_ALLOWLIST);

// Composed-scope runtime data: the adaptive composer APPENDS approved scopes to
// the runtime scope registry (a `scopes/amadeus-<name>.md` file + an entry in
// `tools/data/scope-grid.json`) — the sanctioned write path for composed scopes.
// Neither ever exists in dist/ (graph compile regenerates only stock scopes), so
// a byte-parity promote would misread them as drift: the .md as an ORPHAN (and
// --apply would delete it), the grid entry as DIFFERS. Both are preserved
// instead: a scopes/*.md absent from dist is a composed scope, and scope-grid
// comparison/write is per-key — dist keys must match, extra keys survive.
// True when the grid at `got` already holds the bytes --apply would write.
// Defined as the write path itself so check and apply cannot disagree: a
// per-key comparison accepted any key ORDER, while --apply re-serialises in
// canonical order, so a grid whose composed keys sat before the dist keys
// passed the check yet churned the whole file on the next --apply.
export function scopeGridInSync(got: Buffer, want: Buffer): boolean {
  return mergeScopeGrid(got, want).equals(got);
}

// The grid bytes --apply writes: dist content plus any composed (dst-only)
// entries carried over, serialised in canonical key order so re-applying is a
// no-op. Byte-identical to dist when no composed scope exists; unparseable dst
// content is overwritten with dist.
//
// Membership is Object.hasOwn and assembly is fromEntries because a scope may
// legitimately be named `constructor`, `toString` or `__proto__`: `in` would
// resolve those against Object.prototype and drop the entry as non-composed,
// and plain assignment of `__proto__` would set the prototype instead of a
// data key. Both lose the scope silently.
export function mergeScopeGrid(got: Buffer | null, want: Buffer): Buffer {
  if (got === null) return want;
  try {
    const g = JSON.parse(got.toString("utf-8")) as Record<string, unknown>;
    const w = JSON.parse(want.toString("utf-8")) as Record<string, unknown>;
    const extras = Object.keys(g).filter((k) => !Object.hasOwn(w, k));
    if (extras.length === 0) return want;
    const merged = Object.fromEntries(
      [...Object.keys(w), ...extras]
        .sort()
        .map((k) => [k, Object.hasOwn(w, k) ? w[k] : g[k]]),
    );
    return Buffer.from(`${JSON.stringify(merged, null, 2)}\n`, "utf-8");
  } catch {
    return want;
  }
}

// Composed-plugin runtime data: the plugin engine (amadeus-plugin.ts compose)
// writes surfaces that never exist in dist/ — the composed stage bodies under
// plugins/<name>/, the generated runner skill for each plugin stage, the
// engine dot-state (.amadeus-plugin-* records + staging), and one extra
// plugin_source node inside tools/data/stage-graph.json. A byte-parity promote
// would misread all of them as drift (ORPHAN / DIFFERS) and --apply would
// destroy the composition. They are tolerated instead, mirroring the
// composed-scope carve-out above, with ownership decided by the composition
// record (.amadeus-plugin-composition.json) — a deterministic ledger, not a
// path convention. The ledger cannot hide real drift: managed files stay
// byte-compared (DIFFERS is unaffected by ownedPaths), only plugins/-prefixed
// owned paths and plugin-slug runner skills are exempt from ORPHAN, and the
// graph tolerance accepts only nodes carrying plugin_source: true whose slug
// the ledger indexes.
const PLUGIN_RUNTIME_HISTORY_RE = /(?:audit|drops)\.json$/u;
const PLUGIN_RUNNER_PATH_RE = /skills\/amadeus-([^/]+)\//u;
const EXPECTED_STAGING_PATH_RE = /\/\.amadeus-plugin-src\/([^/]+)\//u;
export type PluginLedger = {
  slugs: Set<string>;
  ownedPaths: Set<string>;
};

// Parse the composition record into the ownership ledger the carve-out
// predicates consult. Malformed content yields null — every consumer then
// falls back to the strict byte/path behaviour, never weaker than stock.
export function parsePluginLedger(bytes: Buffer): PluginLedger | null {
  try {
    const record = JSON.parse(bytes.toString("utf-8")) as { plugins?: unknown };
    if (!Array.isArray(record.plugins)) return null;
    const slugs = new Set<string>();
    const ownedPaths = new Set<string>();
    for (const entry of record.plugins) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const rec = entry[1] as { ownedPaths?: unknown; stageIndex?: unknown };
      if (Array.isArray(rec?.ownedPaths)) {
        for (const p of rec.ownedPaths) {
          // Only plugins/-rooted paths are exemptible: a ledger claiming
          // ownership elsewhere must not widen the orphan carve-out.
          if (typeof p === "string" && p.startsWith("plugins/")) ownedPaths.add(p);
        }
      }
      if (Array.isArray(rec?.stageIndex)) {
        for (const s of rec.stageIndex) {
          const slug = (s as { slug?: unknown })?.slug;
          if (typeof slug === "string") slugs.add(slug);
        }
      }
    }
    return { slugs, ownedPaths };
  } catch {
    return null;
  }
}

function readPluginLedger(repoRoot: string, host: string): PluginLedger | null {
  const p = join(repoRoot, host, ".amadeus-plugin-composition.json");
  if (!existsSync(p)) return null;
  return parsePluginLedger(readFileSync(p));
}

// Per-host ledger cache for one check/apply pass.
function ledgerLookup(repoRoot: string): (rel: string) => PluginLedger | null {
  const cache = new Map<string, PluginLedger | null>();
  return (rel: string) => {
    const host = normalizeRel(rel).split("/")[0] ?? "";
    if (!cache.has(host)) cache.set(host, readPluginLedger(repoRoot, host));
    return cache.get(host) ?? null;
  };
}

// True when `rel` (repo-relative, host-prefixed) is a composed-plugin surface
// the ledger owns: a composed stage body under plugins/, or the generated
// runner skill of a ledger-indexed plugin stage slug.
export function isPluginOwned(rel: string, ledger: PluginLedger | null): boolean {
  if (ledger === null) return false;
  const normalized = normalizeRel(rel);
  const slash = normalized.indexOf("/");
  if (slash < 0) return false;
  const hostRel = normalized.slice(slash + 1);
  if (ledger.ownedPaths.has(hostRel)) return true;
  for (const slug of ledger.slugs) {
    if (hostRel.startsWith(`skills/amadeus-${slug}/`)) return true;
  }
  return false;
}

function isLedgerPluginNode(node: unknown, ledger: PluginLedger): boolean {
  if (typeof node !== "object" || node === null) return false;
  const n = node as { slug?: unknown; plugin_source?: unknown };
  return n.plugin_source === true && typeof n.slug === "string" && ledger.slugs.has(n.slug);
}

// True when the graph at `got` equals dist after removing the ledger-indexed
// plugin_source nodes. Any other extra, missing, or differing node still
// fails. Unparseable content falls back to the strict byte compare.
export function stageGraphInSync(
  got: Buffer,
  want: Buffer,
  ledger: PluginLedger | null,
): boolean {
  if (ledger === null || ledger.slugs.size === 0) return got.equals(want);
  try {
    const g = JSON.parse(got.toString("utf-8")) as unknown;
    const w = JSON.parse(want.toString("utf-8")) as unknown;
    if (!Array.isArray(g) || !Array.isArray(w)) return got.equals(want);
    const rest = g.filter((node) => !isLedgerPluginNode(node, ledger));
    return JSON.stringify(rest) === JSON.stringify(w);
  } catch {
    return got.equals(want);
  }
}

// The graph bytes --apply writes: dist content plus the ledger-owned
// plugin_source nodes carried over from the existing file, each re-anchored
// after its preceding non-plugin slug so the compile-time spine position is
// preserved. Derived from the same predicate as the check: when the existing
// file is already in sync it is kept byte-identical, so check(merge(x)) holds.
type PluginInsert = { node: unknown; afterSlug: string | null };

// The ledger-owned plugin nodes of `g`, each remembering the non-plugin slug
// that precedes it (its compile-time spine anchor).
function collectPluginInserts(g: unknown[], ledger: PluginLedger): PluginInsert[] {
  const inserts: PluginInsert[] = [];
  let lastSlug: string | null = null;
  for (const node of g) {
    if (isLedgerPluginNode(node, ledger)) {
      inserts.push({ node, afterSlug: lastSlug });
    } else {
      const slug = (node as { slug?: unknown })?.slug;
      if (typeof slug === "string") lastSlug = slug;
    }
  }
  return inserts;
}

function insertPluginNodes(w: unknown[], inserts: PluginInsert[]): unknown[] {
  const merged: unknown[] = [...w];
  for (const { node, afterSlug } of inserts) {
    const anchor =
      afterSlug === null
        ? -1
        : merged.findIndex((n) => (n as { slug?: unknown })?.slug === afterSlug);
    merged.splice(anchor < 0 && afterSlug !== null ? merged.length : anchor + 1, 0, node);
  }
  return merged;
}

export function mergeStageGraph(
  got: Buffer | null,
  want: Buffer,
  ledger: PluginLedger | null,
): Buffer {
  if (got === null || ledger === null || ledger.slugs.size === 0) return want;
  if (stageGraphInSync(got, want, ledger)) return got;
  try {
    const g = JSON.parse(got.toString("utf-8")) as unknown;
    const w = JSON.parse(want.toString("utf-8")) as unknown;
    if (!Array.isArray(g) || !Array.isArray(w)) return want;
    const inserts = collectPluginInserts(g, ledger);
    if (inserts.length === 0) return want;
    return Buffer.from(`${JSON.stringify(insertPluginNodes(w, inserts), null, 2)}\n`, "utf-8");
  } catch {
    return want;
  }
}

function printUsage(): void {
  console.error(
    [
      "usage: bun scripts/promote-self.ts [--check|--apply] [--no-build]",
      "",
      "  --check     verify project-local self install matches generated output (default)",
      "  --apply     write .claude/, .codex/, .agents/, .cursor/, .opencode/, .kimi-code/, and .pi/ generated files,",
      "              then merge the amadeus hooks managed block into the user-level kimi config",
      "              ($KIMI_CODE_HOME/config.toml, or ~/.kimi-code/config.toml when unset; a backup is made)",
      "  --no-build  skip the package.ts freshness step",
    ].join("\n"),
  );
}

function run(cmd: string, args: string[]): void {
  const res = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

export function packageFreshnessArgs(_mode: Mode): string[][] {
  return SELF_INSTALL_HARNESSES.map((harness) => ["scripts/package.ts", harness]);
}

export function runPackageFreshness(
  mode: Mode,
  runner: (cmd: string, args: string[]) => void = run,
): void {
  for (const args of packageFreshnessArgs(mode)) {
    runner("bun", args);
  }
}

// Dirents carry lstat-level type info, so symlinks are never followed: a
// dangling symlink (e.g. inside a preserved subtree like .claude/worktrees/)
// is yielded as a plain entry instead of crashing on a follow-the-link stat.
function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function normalizeRel(path: string): string {
  return path.split("\\").join("/");
}

function isPreserved(rel: string): boolean {
  const normalized = normalizeRel(rel);
  return preserved.some((p) =>
    p.endsWith("/")
      ? normalized === p.slice(0, -1) || normalized.startsWith(p)
      : normalized === p,
  );
}

function buildExpected(repoRoot: string): Map<string, Buffer> {
  const expected = new Map<string, Buffer>();
  for (const { src, dst } of managedDirs) {
    const srcAbs = join(repoRoot, src);
    if (!existsSync(srcAbs)) {
      throw new Error(`missing source directory: ${src}`);
    }
    for (const file of walk(srcAbs)) {
      const relFromSrc = normalizeRel(relative(srcAbs, file));
      const dstRel = normalizeRel(join(dst, relFromSrc));
      expected.set(dstRel, readFileSync(file));
    }
  }
  for (const harness of SELF_INSTALL_HARNESSES) {
    const projection = buildSelfInstallProjection(harness, repoRoot);
    for (const [rel, bytes] of projection.artifacts ?? []) expected.set(rel, bytes);
  }
  const contributorSkillsAbs = join(repoRoot, CONTRIBUTOR_SKILLS_ROOT);
  if (existsSync(contributorSkillsAbs)) {
    for (const file of walk(contributorSkillsAbs)) {
      const relFromSkills = normalizeRel(relative(contributorSkillsAbs, file));
      if (relFromSkills.split("/")[1] === "evals") continue;
      const bytes = readFileSync(file);
      for (const dst of CONTRIBUTOR_SKILL_DESTINATIONS) {
        expected.set(normalizeRel(join(dst, relFromSkills)), bytes);
      }
    }
  }
  const distAgents = join(repoRoot, "dist", "codex", "AGENTS.md");
  if (!existsSync(distAgents)) throw new Error("missing source file: dist/codex/AGENTS.md");
  expected.set(CODEX_SUFFIX_REL, composeCodexAgentsSuffix(readFileSync(distAgents)));
  return expected;
}

function managedRoots(): string[] {
  return managedDirs.map((d) => normalizeRel(d.dst));
}

function runnerPlacedElsewhere(runner: RegExpMatchArray | null, rel: string, expected: Map<string, Buffer>): boolean {
  if (runner === null) return false;
  const marker = `/skills/amadeus-${runner[1]}/`;
  for (const path of expected.keys()) {
    if (path !== rel && path.includes(marker)) return true;
  }
  return false;
}

function rootAgentsProblems(repoRoot: string): string[] {
  const path = join(repoRoot, "AGENTS.md");
  if (!existsSync(path)) return ["MISSING: AGENTS.md"];
  const contents = readFileSync(path, "utf-8");
  const imports = contents
    .split("\n")
    .filter((line) => line.startsWith("@"));
  const hasGeneratedSuffix = contents
    .split("\n")
    .includes(CODEX_AGENTS_MARKER.trimEnd());
  return imports.length === ROOT_AGENTS_IMPORTS.length &&
      imports.every((line, index) => line === ROOT_AGENTS_IMPORTS[index]) &&
      !hasGeneratedSuffix
    ? []
    : ["DIFFERS: AGENTS.md"];
}

function rootClaudeProblems(repoRoot: string): string[] {
  const claudeOnboarding = join(repoRoot, ".claude", "CLAUDE.md");
  const rootClaude = join(repoRoot, "CLAUDE.md");
  if (!existsSync(claudeOnboarding)) return ["MISSING: .claude/CLAUDE.md"];
  if (!existsSync(rootClaude)) return ["MISSING: CLAUDE.md"];
  const expected = Buffer.concat([
    Buffer.from(PROJECT_INSTRUCTIONS, "utf-8"),
    readFileSync(claudeOnboarding),
  ]);
  return readFileSync(rootClaude).equals(expected) ? [] : ["DIFFERS: CLAUDE.md"];
}

function rootInstructionProblems(repoRoot: string): string[] {
  return [...rootAgentsProblems(repoRoot), ...rootClaudeProblems(repoRoot)];
}

function orphanedFiles(expected: Map<string, Buffer>, repoRoot: string): string[] {
  const roots = managedRoots();
  const orphans: string[] = [];
  const ledgerFor = ledgerLookup(repoRoot);
  for (const root of roots) {
    const abs = join(repoRoot, root);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const rel = normalizeRel(relative(repoRoot, file));
      if (isPreserved(rel)) continue;
      if (COMPOSED_SCOPE_RE.test(rel)) continue; // composed scope — runtime data, never in dist
      if (PLUGIN_ENGINE_STATE_RE.test(rel)) {
        const host = rel.split("/")[0];
        const deterministic = expected.has(`${host}/.amadeus-plugin-composition.json`);
        if (!deterministic || !PLUGIN_RUNTIME_HISTORY_RE.test(rel)) continue;
      }
      if (isPluginOwned(rel, ledgerFor(rel))) {
        const runner = rel.match(PLUGIN_RUNNER_PATH_RE);
        if (runnerPlacedElsewhere(runner, rel, expected)) continue;
        continue;
      }
      if (!expected.has(rel)) orphans.push(rel);
    }
  }
  return orphans;
}

function projectionNames(paths: readonly string[], pattern: RegExp): Set<string> {
  const names = new Set<string>();
  for (const path of paths) {
    const match = path.match(pattern);
    if (match?.[1]) names.add(match[1]);
  }
  return names;
}

function expectedPluginRunnerSlugs(expected: Map<string, Buffer>): Set<string> {
  const slugs = new Set<string>();
  for (const [path, bytes] of expected) {
    if (!path.endsWith("/.amadeus-plugin-composition.json")) continue;
    const ledger = parsePluginLedger(bytes);
    if (ledger === null) continue;
    for (const slug of ledger.slugs) slugs.add(slug);
  }
  return slugs;
}

function isMisplacedRunner(
  rel: string,
  selectedRunners: ReadonlySet<string>,
  expected: Map<string, Buffer>,
): boolean {
  const segments = rel.split("/");
  const skillRoot = segments.lastIndexOf("skills");
  const directory = segments[skillRoot + 1] ?? "";
  if (!directory.startsWith("amadeus-")) return false;
  const runner = directory.slice("amadeus-".length);
  return selectedRunners.has(runner) && !expected.has(rel);
}

function misplacedRunnersInRoot(
  root: string,
  selectedRunners: ReadonlySet<string>,
  expected: Map<string, Buffer>,
  repoRoot: string,
): string[] {
  const absolute = join(repoRoot, root);
  if (!existsSync(absolute)) return [];
  const misplaced: string[] = [];
  for (const file of walk(absolute)) {
    const rel = normalizeRel(relative(repoRoot, file));
    if (isMisplacedRunner(rel, selectedRunners, expected)) misplaced.push(rel);
  }
  return misplaced;
}

function addMisplacedRunners(
  misplaced: Set<string>,
  selectedRunners: ReadonlySet<string>,
  expected: Map<string, Buffer>,
  repoRoot: string,
): void {
  for (const root of managedRoots()) {
    for (const rel of misplacedRunnersInRoot(root, selectedRunners, expected, repoRoot)) misplaced.add(rel);
  }
}

function addMisplacedKiroProjection(misplaced: Set<string>, selectedPlugins: ReadonlySet<string>, repoRoot: string): void {
  for (const plugin of selectedPlugins) {
    for (const candidate of [
      `.kiro/.amadeus-plugin-src/${plugin}`,
      `.kiro/plugins/${plugin}`,
      `.kiro/skills/amadeus-${plugin}`,
    ]) {
      const absolute = join(repoRoot, candidate);
      if (!existsSync(absolute)) continue;
      for (const file of walk(absolute)) misplaced.add(normalizeRel(relative(repoRoot, file)));
    }
  }
}

export function misplacedPluginProjectionFiles(expected: Map<string, Buffer>, repoRoot: string): string[] {
  const misplaced = new Set<string>();
  const expectedPaths = [...expected.keys()];
  const selectedRunners = expectedPluginRunnerSlugs(expected);
  const selectedPlugins = projectionNames(expectedPaths, EXPECTED_STAGING_PATH_RE);
  addMisplacedRunners(misplaced, selectedRunners, expected, repoRoot);
  addMisplacedKiroProjection(misplaced, selectedPlugins, repoRoot);
  return [...misplaced].sort();
}

function ensureActiveSpaceCursor(repoRoot: string): void {
  const cursor = join(repoRoot, "amadeus", "active-space");
  if (existsSync(cursor)) return;
  mkdirSync(dirname(cursor), { recursive: true });
  writeFileSync(cursor, "default\n");
}

// Fresh-worktree bootstrap (#2714): --apply just wrote `.codex/hooks.json.example`
// (the canonical, tracked Amadeus hook contract) as part of the managed
// dist/codex/.codex sync. Auto-create the ignored, per-clone active
// `.codex/hooks.json` from it, but ONLY when the active file is absent — this
// mirrors packages/framework/harness/codex/tools/amadeus-codex-hooks-contract.ts's
// activateCodexHooks() COPYFILE_EXCL semantics (canonical source, exclusive
// create) WITHOUT its doctor validation: a pre-existing active file is
// preservedRuntime (self-install-allowlist.ts) and may be deliberately
// customized, so silent auto-activation must never touch or reject it, only
// fill the gap when nothing is there yet. COPYFILE_EXCL itself is the
// presence check — EEXIST (a file, a directory, anything already at the
// path) IS the preserved verdict, with no pre-check racing the filesystem.
export function activateCodexHooksIfMissing(repoRoot: string): "created" | "preserved" | "absent" {
  const canonicalPath = join(repoRoot, ".codex", "hooks.json.example");
  const activePath = join(repoRoot, ".codex", "hooks.json");
  if (!existsSync(canonicalPath)) return "absent";
  try {
    copyFileSync(canonicalPath, activePath, fsConstants.COPYFILE_EXCL);
    return "created";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return "preserved";
    throw error;
  }
}

function check(expected: Map<string, Buffer>, repoRoot: string): string[] {
  const problems = rootInstructionProblems(repoRoot);
  const ledgerFor = ledgerLookup(repoRoot);
  for (const [rel, want] of expected) {
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) {
      problems.push(`MISSING: ${rel}`);
      continue;
    }
    const got = readFileSync(abs);
    if (SCOPE_GRID_RE.test(rel)) {
      if (!scopeGridInSync(got, want)) problems.push(`DIFFERS: ${rel}`);
    } else if (STAGE_GRAPH_RE.test(rel)) {
      const deterministicProjection = want.includes(Buffer.from('"plugin_source": true'));
      if (deterministicProjection ? !got.equals(want) : !stageGraphInSync(got, want, ledgerFor(rel))) {
        problems.push(`DIFFERS: ${rel}`);
      }
    } else if (!got.equals(want)) problems.push(`DIFFERS: ${rel}`);
  }
  for (const rel of orphanedFiles(expected, repoRoot)) problems.push(`ORPHAN: ${rel}`);
  for (const rel of misplacedPluginProjectionFiles(expected, repoRoot)) problems.push(`MISPLACED: ${rel}`);
  // The active-space cursor is a per-user runtime file (gitignored). --apply
  // ensure-creates it; mirror that here so a fresh checkout / CI (where no prior
  // /amadeus run has created it) self-heals the cursor instead of failing the
  // drift guard on a file that is intentionally never committed.
  ensureActiveSpaceCursor(repoRoot);
  return problems;
}

function apply(
  expected: Map<string, Buffer>,
  repoRoot: string,
  coordinator: DistributionTransactionCoordinator,
): void {
  const updates: Array<{ path: string; bytes: Buffer | null }> = [];
  const removals = new Set([
    ...orphanedFiles(expected, repoRoot),
    ...misplacedPluginProjectionFiles(expected, repoRoot),
  ]);
  for (const rel of removals) {
    const path = join(repoRoot, rel);
    if (lstatSync(path).isSymbolicLink()) rmSync(path);
    else updates.push({ path: rel, bytes: null });
  }
  const ledgerFor = ledgerLookup(repoRoot);
  for (const [rel, bytes] of expected) {
    const abs = join(repoRoot, rel);
    const out = SCOPE_GRID_RE.test(rel) && existsSync(abs)
      ? mergeScopeGrid(readFileSync(abs), bytes)
      : STAGE_GRAPH_RE.test(rel) && existsSync(abs) && !bytes.includes(Buffer.from('"plugin_source": true'))
        ? mergeStageGraph(readFileSync(abs), bytes, ledgerFor(rel))
        : bytes;
    updates.push({ path: rel, bytes: out });
  }
  applyDistributionUpdates(repoRoot, updates, coordinator);
  ensureActiveSpaceCursor(repoRoot);
}

export function applyDistributionUpdates(
  repoRoot: string,
  updates: readonly { path: string; bytes: Buffer | null }[],
  coordinator: DistributionTransactionCoordinator = new DistributionTransactionCoordinator(repoRoot),
): void {
  try {
    coordinator.apply(updates, mirrorProjectionRegistryDigest());
  } catch (error) {
    if (coordinator.pendingJournalCount() > 0) {
      try {
        coordinator.recover();
      } catch (recoveryError) {
        const combined = recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError));
        Object.defineProperty(combined, "cause", { value: error, configurable: true });
        throw combined;
      }
    }
    throw error;
  }
}

// Kimi Code has no project-level wiring config, so in the self-development
// repo dogfood promotion takes the installer's role: the SAME setup module
// merges the managed block into the user-level config.toml
// ($KIMI_CODE_HOME ?? ~/.kimi-code, resolveKimiHome's rule), read from the
// canonical snippet master. Approval is implicit — running --apply IS the
// operator's consent — but the OC-1 contract still routes it through an
// interactive confirm, so the tty port auto-confirms.
//
// The step is split to preserve the distribution transaction's atomic
// boundary: preflight validates the merge (snippet render + config read +
// plan) BEFORE any repo file is written, so a malformed user config fails
// the run with nothing applied. run executes after the repo transaction
// commits; a failure there is reported as exactly what it is — the repo was
// updated, the user-level config was not.
const KIMI_SNIPPET_MASTER_REL = join(
  "packages",
  "framework",
  "harness",
  "kimi",
  "hooks",
  "amadeus-hooks.snippet.toml",
);

export type PostApplyStep = {
  readonly name: string;
  // Validate before the repo transaction commits. Non-zero aborts the whole
  // apply with nothing written.
  readonly preflight: (repoRoot: string) => Promise<number>;
  // Execute after the repo transaction commits. Non-zero means the repo was
  // updated but this step was not — the message must say so precisely.
  readonly run: (repoRoot: string) => Promise<number>;
};

const kimiHooksStep: PostApplyStep = {
  name: "kimi-hooks",
  preflight: async (repoRoot: string): Promise<number> => {
    const snippetPath = join(repoRoot, KIMI_SNIPPET_MASTER_REL);
    if (!existsSync(snippetPath)) {
      console.error(`missing source file: ${KIMI_SNIPPET_MASTER_REL}`);
      return 1;
    }
    const block = renderManagedBlock(readFileSync(snippetPath, "utf-8"));
    if (block.type === "err") {
      console.error(renderHooksError(block.error));
      return 1;
    }
    const configPath = kimiConfigPath(resolveKimiHome());
    const read = await createFsRead().readText(configPath);
    if (read.type === "err" && read.error.notFound !== true) {
      console.error(renderHooksError(read.error));
      return 1;
    }
    const planned = planMerge(read.type === "ok" ? read.value : "", block.value);
    if (planned.type === "err") {
      console.error(renderHooksError(planned.error));
      return 1;
    }
    return 0;
  },
  run: async (repoRoot: string): Promise<number> => {
    const merged = await runHooksMerge(
      {
        snippet: readFileSync(join(repoRoot, KIMI_SNIPPET_MASTER_REL), "utf-8"),
        snippetSource: ".kimi-code/hooks/amadeus-hooks.snippet.toml",
        interactive: true,
        kimiHome: resolveKimiHome(),
      },
      {
        tty: {
          isTTY: false,
          select: async () => "",
          input: async () => "",
          confirm: async () => true,
        },
        fsRead: createFsRead(),
        fsWrite: createFsWrite(),
        applyWrite: createApplyWrite(),
        out: (message) => console.log(message),
      },
    );
    if (merged.type === "err") {
      console.error(
        `promote-self: repository update applied, but the kimi hooks merge failed: ${renderHooksError(merged.error)}`,
      );
      return 1;
    }
    return 0;
  },
};

// Argv-parameterized handler exported as an in-process test seam. Returns the
// process exit code instead of exiting so tests can drive check/apply against
// a fixture repoRoot without spawning (spawned subprocesses are invisible to
// bun --coverage). Async because the --apply path's post-apply step awaits
// the setup module's ports; the check path never awaits anything meaningful.
// `postApply` is the wiring the apply path runs around the repo transaction
// (default: the kimi hooks managed-block merge); pass null to test the bare
// distribution mechanics without the user-level config side effect.
export async function promoteSelfMain(
  argv: string[],
  repoRoot: string = REPO_ROOT,
  freshness: (mode: Mode) => void = runPackageFreshness,
  postApply: PostApplyStep | null = kimiHooksStep,
  coordinatorFactory: (repoRoot: string) => DistributionTransactionCoordinator =
    (root) => new DistributionTransactionCoordinator(root),
  mintAttestation = true,
  attestationWriter: AttestationWriter = writeSelfDevelopmentIntegrityAttestation,
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return 2;
  }
  if (argv.includes("--check") && argv.includes("--apply")) {
    printUsage();
    return 2;
  }
  const mode: Mode = argv.includes("--apply") ? "apply" : "check";
  const noBuild = argv.includes("--no-build");

  // Validate the post-apply wiring before ANY mutation. freshness()
  // regenerates dist/ in place, so a preflight failure must abort before
  // freshness runs — otherwise a malformed user config would still leave
  // the dist trees rewritten behind a failed run.
  if (mode === "apply" && postApply !== null) {
    const preflight = await postApply.preflight(repoRoot);
    if (preflight !== 0) return preflight;
  }

  if (!noBuild) {
    freshness(mode);
  }

  const coordinator = coordinatorFactory(repoRoot);
  if (mode === "check" && coordinator.pendingJournalCount() > 0) {
    console.error("promote-self --check FAILED: distribution recovery required");
    return 1;
  }
  const session = mode === "check"
    ? coordinator.openReadSession("promote-self-check")
    : null;
  let expected: Map<string, Buffer>;
  try {
    expected = buildExpected(repoRoot);
  } catch (err) {
    session?.close();
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  if (mode === "apply") {
    const rootProblems = rootInstructionProblems(repoRoot);
    if (rootProblems.length > 0) {
      console.error(`promote-self --apply FAILED (${rootProblems.length} problem(s)):`);
      for (const problem of rootProblems) console.error(`  ${problem}`);
      return 1;
    }
    try {
      apply(expected, repoRoot, coordinator);
    } catch (error) {
      console.error(
        `promote-self --apply FAILED: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 1;
    }
    if (activateCodexHooksIfMissing(repoRoot) === "created") {
      console.log("promote-self: created .codex/hooks.json from .codex/hooks.json.example");
    }
    if (postApply !== null) {
      const ran = await postApply.run(repoRoot);
      if (ran !== 0) return ran;
    }
    // Only the real build path can mint build-success evidence. Test seams and
    // --no-build promotions deliberately leave the prior disposable attestation
    // untouched rather than claiming a build occurred.
    if (!noBuild && repoRoot === REPO_ROOT && mintAttestation) {
      try {
        attestationWriter(repoRoot);
      } catch (error) {
        console.warn(
          `promote-self: build succeeded, but the self-development attestation was not written; ` +
            `intent-birth remains fail-closed until \`${SELFDEV_BUILD_COMMAND}\` succeeds: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
        // The promotion transaction is already committed. Keep the build green,
        // while the missing attestation makes the next self-development birth refuse.
        return 0;
      }
    }
    console.log("promote-self: project-local self install updated");
    return 0;
  }

  const problems = check(expected, repoRoot);
  session?.close();
  if (problems.length > 0) {
    console.error(`promote-self --check FAILED (${problems.length} problem(s)):`);
    for (const p of problems.slice(0, 80)) console.error(`  ${p}`);
    if (problems.length > 80) console.error(`  ... ${problems.length - 80} more`);
    return 1;
  }
  console.log("promote-self --check: project-local self install is in sync");
  return 0;
}

// Main flow is guarded so the exported helpers can be imported by tests
// without triggering a build or a check run.
if (import.meta.main) process.exit(await promoteSelfMain(process.argv.slice(2)));
