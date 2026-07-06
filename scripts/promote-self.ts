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
  transform?: boolean;
};

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const mode: Mode = argv.includes("--apply") ? "apply" : "check";
const noBuild = argv.includes("--no-build");

const managedDirs: ManagedDir[] = [
  { src: "dist/claude/.claude", dst: ".claude", transform: true },
  { src: "dist/codex/.codex", dst: ".codex", transform: true },
  { src: "dist/codex/.agents", dst: ".agents", transform: true },
  {
    src: "dist/claude/aidlc/spaces/default/memory",
    dst: "amadeus/spaces/default/memory",
    transform: true,
  },
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

function usage(): never {
  console.error(
    [
      "usage: bun scripts/promote-self.ts [--check|--apply] [--no-build]",
      "",
      "  --check     verify project-local self install matches generated output (default)",
      "  --apply     write .claude/, .codex/, .agents/, CLAUDE.md, and amadeus/spaces/default/memory",
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

function isTextPath(rel: string): boolean {
  return /\.(md|ts|json|toml|rules|txt|ya?ml|gitignore)$/i.test(rel) || !rel.includes(".");
}

function projectLocalTransform(rel: string, bytes: Buffer): Buffer {
  if (!isTextPath(rel)) return bytes;
  let text = bytes.toString("utf-8");
  text = text
    .replaceAll("@aidlc/", "@amadeus/")
    .replaceAll("file://aidlc/", "file://amadeus/")
    .replaceAll("aidlc\\/", "amadeus\\/")
    .replaceAll(".aidlc", ".amadeus")
    .replaceAll('"aidlc"', '"amadeus"')
    .replaceAll("'aidlc'", "'amadeus'")
    .replaceAll("`aidlc`", "`amadeus`")
    .replace(/(?<![A-Za-z0-9_-])aidlc\//g, "amadeus/")
    .replace(/\baidlc\b/g, "amadeus");
  return Buffer.from(text, "utf-8");
}

function buildExpected(): Map<string, Buffer> {
  const expected = new Map(managedFiles);
  for (const { src, dst, transform } of managedDirs) {
    const srcAbs = join(REPO_ROOT, src);
    if (!existsSync(srcAbs)) {
      throw new Error(`missing source directory: ${src}`);
    }
    for (const file of walk(srcAbs)) {
      const relFromSrc = normalizeRel(relative(srcAbs, file));
      const dstRel = normalizeRel(join(dst, relFromSrc));
      const raw = readFileSync(file);
      expected.set(dstRel, transform ? projectLocalTransform(dstRel, raw) : raw);
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
    if (!got.equals(want)) problems.push(`DIFFERS: ${rel}`);
  }
  for (const rel of orphanedFiles(expected)) problems.push(`ORPHAN: ${rel}`);
  if (!existsSync(join(REPO_ROOT, "amadeus", "active-space"))) {
    problems.push("MISSING: amadeus/active-space");
  }
  return problems;
}

function apply(expected: Map<string, Buffer>): void {
  for (const rel of orphanedFiles(expected)) {
    rmSync(join(REPO_ROOT, rel), { force: true });
  }
  for (const [rel, bytes] of expected) {
    const abs = join(REPO_ROOT, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, bytes);
  }
  ensureActiveSpaceCursor();
}

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
