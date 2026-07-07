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
  statSync,
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
const argv = process.argv.slice(2);
const mode: Mode = argv.includes("--apply") ? "apply" : "check";
const noBuild = argv.includes("--no-build");

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

const managedFiles = new Map<string, Buffer>([
  ["CLAUDE.md", Buffer.from("@AGENTS.md\n", "utf-8")],
]);

const preserved = [
  ".claude/CLAUDE.md",
  ".claude/settings.json",
  ".claude/settings.local.json",
  ".claude/worktrees/",
  ".codex/config.toml",
  ".codex/hooks.json",
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

function usage(): never {
  console.error(
    [
      "usage: bun scripts/promote-self.ts [--check|--apply] [--no-build]",
      "",
      "  --check     verify project-local self install matches generated output (default)",
      "  --apply     write .claude/, .codex/, .agents/, and CLAUDE.md",
      "  --no-build  skip the package.ts freshness step",
    ].join("\n"),
  );
  process.exit(2);
}

if (argv.includes("--help") || argv.includes("-h")) usage();
if (argv.includes("--check") && argv.includes("--apply")) usage();

function run(cmd: string, args: string[]): void {
  const res = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
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

function buildExpected(): Map<string, Buffer> {
  const expected = new Map(managedFiles);
  for (const { src, dst } of managedDirs) {
    const srcAbs = join(REPO_ROOT, src);
    if (!existsSync(srcAbs)) {
      throw new Error(`missing source directory: ${src}`);
    }
    for (const file of walk(srcAbs)) {
      const relFromSrc = normalizeRel(relative(srcAbs, file));
      const dstRel = normalizeRel(join(dst, relFromSrc));
      expected.set(dstRel, readFileSync(file));
    }
  }
  return expected;
}

function managedRoots(): string[] {
  return managedDirs.map((d) => normalizeRel(d.dst));
}

function orphanedFiles(expected: Map<string, Buffer>): string[] {
  const roots = managedRoots();
  const orphans: string[] = [];
  for (const root of roots) {
    const abs = join(REPO_ROOT, root);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const rel = normalizeRel(relative(REPO_ROOT, file));
      if (isPreserved(rel)) continue;
      if (COMPOSED_SCOPE_RE.test(rel)) continue; // composed scope — runtime data, never in dist
      if (!expected.has(rel)) orphans.push(rel);
    }
  }
  return orphans;
}

function ensureActiveSpaceCursor(): void {
  const cursor = join(REPO_ROOT, "amadeus", "active-space");
  if (existsSync(cursor)) return;
  mkdirSync(dirname(cursor), { recursive: true });
  writeFileSync(cursor, "default\n");
}

function check(expected: Map<string, Buffer>): string[] {
  const problems: string[] = [];
  for (const [rel, want] of expected) {
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) {
      problems.push(`MISSING: ${rel}`);
      continue;
    }
    const got = readFileSync(abs);
    if (SCOPE_GRID_RE.test(rel)) {
      if (!scopeGridInSync(got, want)) problems.push(`DIFFERS: ${rel}`);
    } else if (!got.equals(want)) problems.push(`DIFFERS: ${rel}`);
  }
  for (const rel of orphanedFiles(expected)) problems.push(`ORPHAN: ${rel}`);
  // The active-space cursor is a per-user runtime file (gitignored). --apply
  // ensure-creates it; mirror that here so a fresh checkout / CI (where no prior
  // /amadeus run has created it) self-heals the cursor instead of failing the
  // drift guard on a file that is intentionally never committed.
  ensureActiveSpaceCursor();
  return problems;
}

function apply(expected: Map<string, Buffer>): void {
  for (const rel of orphanedFiles(expected)) {
    rmSync(join(REPO_ROOT, rel), { force: true });
  }
  for (const [rel, bytes] of expected) {
    const abs = join(REPO_ROOT, rel);
    mkdirSync(dirname(abs), { recursive: true });
    const out =
      SCOPE_GRID_RE.test(rel) && existsSync(abs)
        ? mergeScopeGrid(readFileSync(abs), bytes)
        : bytes;
    writeFileSync(abs, out);
  }
  ensureActiveSpaceCursor();
}

// Main flow is guarded so the exported scope-grid helpers can be imported by
// tests without triggering a build or a check run.
if (import.meta.main) {
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
    expected = buildExpected();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (mode === "apply") {
    apply(expected);
    console.log("promote-self: project-local self install updated");
  } else {
    const problems = check(expected);
    if (problems.length > 0) {
      console.error(`promote-self --check FAILED (${problems.length} problem(s)):`);
      for (const p of problems.slice(0, 80)) console.error(`  ${p}`);
      if (problems.length > 80) console.error(`  ... ${problems.length - 80} more`);
      process.exit(1);
    }
    console.log("promote-self --check: project-local self install is in sync");
  }
}
