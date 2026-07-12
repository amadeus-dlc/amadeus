#!/usr/bin/env bun
// scripts/promote-self.ts — promote generated harness output into this repo.
//
// This is a project-local dogfood install, not a distributable build. The
// packager still owns dist/; this script copies the generated Claude/Codex
// harness surfaces into the repository root so Amadeus can develop itself.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

type Mode = "check" | "apply";

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
const managedDirs: ManagedDir[] = [
  { src: "dist/claude/.claude", dst: ".claude" },
  { src: "dist/codex/.codex", dst: ".codex" },
  { src: "dist/codex/.agents", dst: ".agents" },
];

const CLAUDE_MD_CONTENT = `@AGENTS.md

## Project Instructions

- Communicate with the user in Japanese.
- Write documentation in English by default.
- As an exception, write \`amadeus/**/*.md\` in Japanese.
- Write code comments in English.
- Write commit messages in English.
- If you find violations of these language rules while working, fix them as part of the same change.
`;

const managedFiles = new Map<string, Buffer>([
  ["CLAUDE.md", Buffer.from(CLAUDE_MD_CONTENT, "utf-8")],
]);

const CODEX_AGENTS_MARKER = "# AI-DLC on Codex CLI\n";
const AMADEUS_IMPORT = "@.agents/rules/amadeus.md\n\n";

// Preserve the hand-authored project guidance before the Codex onboarding
// marker, while replacing the generated suffix from dist on every promotion.
// The root already imports the Amadeus rules, so strip the dist copy to avoid
// loading the same method tree twice.
export function composeRootAgents(existing: Buffer, codexDist: Buffer): Buffer {
  const current = existing.toString("utf-8");
  const generated = codexDist.toString("utf-8");
  const markerAt = current.indexOf(CODEX_AGENTS_MARKER);
  let prefix = markerAt >= 0 ? current.slice(0, markerAt) : `${current.trimEnd()}\n\n`;
  let hasImport = false;
  prefix = prefix.replaceAll(AMADEUS_IMPORT, () => {
    if (hasImport) return "";
    hasImport = true;
    return AMADEUS_IMPORT;
  });
  const suffix = hasImport && generated.startsWith(AMADEUS_IMPORT)
    ? generated.slice(AMADEUS_IMPORT.length)
    : generated;
  const separator = prefix.trimEnd().length > 0 ? "\n\n" : "";
  return Buffer.from(`${prefix.trimEnd()}${separator}${suffix}`, "utf-8");
}

const preserved = [
  ".claude/CLAUDE.md",
  ".claude/settings.json",
  ".claude/settings.local.json",
  ".claude/worktrees/",
  ".codex/config.toml",
  ".codex/hooks.json",
  ".codex/agmsg-delivery-mode",
  ".codex/local/",
];

// Composed-scope runtime data: the adaptive composer APPENDS approved scopes to
// the runtime scope registry (a `scopes/amadeus-<name>.md` file + an entry in
// `tools/data/scope-grid.json`) — the sanctioned write path for composed scopes.
// Neither ever exists in dist/ (graph compile regenerates only stock scopes), so
// a byte-parity promote would misread them as drift: the .md as an ORPHAN (and
// --apply would delete it), the grid entry as DIFFERS. Both are preserved
// instead: a scopes/*.md absent from dist is a composed scope, and scope-grid
// comparison/write is per-key — dist keys must match, extra keys survive.
export const COMPOSED_SCOPE_RE = /^\.[^/]+\/scopes\/amadeus-[^/]+\.md$/;
export const SCOPE_GRID_RE = /^\.[^/]+\/tools\/data\/scope-grid\.json$/;

// True when the grid at `got` carries every dist key with identical value.
// Extra keys (composed scopes) are tolerated. Unparseable content falls back
// to the strict byte compare — never weaker than the plain check.
export function scopeGridInSync(got: Buffer, want: Buffer): boolean {
  try {
    const g = JSON.parse(got.toString("utf-8")) as Record<string, unknown>;
    const w = JSON.parse(want.toString("utf-8")) as Record<string, unknown>;
    for (const key of Object.keys(w)) {
      if (!(key in g)) return false;
      if (JSON.stringify(g[key]) !== JSON.stringify(w[key])) return false;
    }
    return true;
  } catch {
    return got.equals(want);
  }
}

// The grid bytes --apply writes: dist content plus any composed (dst-only)
// entries carried over, in dist key order first. Byte-identical to dist when
// no composed scope exists; unparseable dst content is overwritten with dist.
export function mergeScopeGrid(got: Buffer | null, want: Buffer): Buffer {
  if (got === null) return want;
  try {
    const g = JSON.parse(got.toString("utf-8")) as Record<string, unknown>;
    const w = JSON.parse(want.toString("utf-8")) as Record<string, unknown>;
    const extras = Object.keys(g).filter((k) => !(k in w));
    if (extras.length === 0) return want;
    const merged: Record<string, unknown> = { ...w };
    for (const k of extras) merged[k] = g[k];
    return Buffer.from(`${JSON.stringify(merged, null, 2)}\n`, "utf-8");
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
      "  --apply     write .claude/, .codex/, .agents/, AGENTS.md, and CLAUDE.md",
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
  const expected = new Map(managedFiles);
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
  const rootAgents = join(repoRoot, "AGENTS.md");
  const distAgents = join(repoRoot, "dist", "codex", "AGENTS.md");
  if (!existsSync(distAgents)) throw new Error("missing source file: dist/codex/AGENTS.md");
  const existing = existsSync(rootAgents) ? readFileSync(rootAgents) : Buffer.alloc(0);
  expected.set("AGENTS.md", composeRootAgents(existing, readFileSync(distAgents)));
  return expected;
}

function managedRoots(): string[] {
  return managedDirs.map((d) => normalizeRel(d.dst));
}

function orphanedFiles(expected: Map<string, Buffer>, repoRoot: string): string[] {
  const roots = managedRoots();
  const orphans: string[] = [];
  for (const root of roots) {
    const abs = join(repoRoot, root);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const rel = normalizeRel(relative(repoRoot, file));
      if (isPreserved(rel)) continue;
      if (COMPOSED_SCOPE_RE.test(rel)) continue; // composed scope — runtime data, never in dist
      if (!expected.has(rel)) orphans.push(rel);
    }
  }
  return orphans;
}

function ensureActiveSpaceCursor(repoRoot: string): void {
  const cursor = join(repoRoot, "amadeus", "active-space");
  if (existsSync(cursor)) return;
  mkdirSync(dirname(cursor), { recursive: true });
  writeFileSync(cursor, "default\n");
}

function check(expected: Map<string, Buffer>, repoRoot: string): string[] {
  const problems: string[] = [];
  for (const [rel, want] of expected) {
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) {
      problems.push(`MISSING: ${rel}`);
      continue;
    }
    const got = readFileSync(abs);
    if (SCOPE_GRID_RE.test(rel)) {
      if (!scopeGridInSync(got, want)) problems.push(`DIFFERS: ${rel}`);
    } else if (!got.equals(want)) problems.push(`DIFFERS: ${rel}`);
  }
  for (const rel of orphanedFiles(expected, repoRoot)) problems.push(`ORPHAN: ${rel}`);
  // The active-space cursor is a per-user runtime file (gitignored). --apply
  // ensure-creates it; mirror that here so a fresh checkout / CI (where no prior
  // /amadeus run has created it) self-heals the cursor instead of failing the
  // drift guard on a file that is intentionally never committed.
  ensureActiveSpaceCursor(repoRoot);
  return problems;
}

function apply(expected: Map<string, Buffer>, repoRoot: string): void {
  for (const rel of orphanedFiles(expected, repoRoot)) {
    rmSync(join(repoRoot, rel), { force: true });
  }
  for (const [rel, bytes] of expected) {
    const abs = join(repoRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    const out =
      SCOPE_GRID_RE.test(rel) && existsSync(abs)
        ? mergeScopeGrid(readFileSync(abs), bytes)
        : bytes;
    writeFileSync(abs, out);
  }
  ensureActiveSpaceCursor(repoRoot);
}

// Argv-parameterized handler exported as an in-process test seam. Returns the
// process exit code instead of exiting so tests can drive check/apply against
// a fixture repoRoot without spawning (spawned subprocesses are invisible to
// bun --coverage).
export function promoteSelfMain(argv: string[], repoRoot: string = REPO_ROOT): number {
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

  if (!noBuild) {
    if (mode === "apply") {
      run("bun", ["scripts/package.ts", "claude"]);
      run("bun", ["scripts/package.ts", "codex"]);
    } else {
      run("bun", ["scripts/package.ts", "claude", "--check"]);
      run("bun", ["scripts/package.ts", "codex", "--check"]);
    }
  }

  let expected: Map<string, Buffer>;
  try {
    expected = buildExpected(repoRoot);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  if (mode === "apply") {
    apply(expected, repoRoot);
    console.log("promote-self: project-local self install updated");
    return 0;
  }

  const problems = check(expected, repoRoot);
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
if (import.meta.main) process.exit(promoteSelfMain(process.argv.slice(2)));
