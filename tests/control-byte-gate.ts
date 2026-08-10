#!/usr/bin/env bun
// control-byte-gate.ts — the raw control-byte gate over tracked files (#2814).
//
// WHAT THIS IS. A deterministic, always-run CI gate. It enumerates every file
// git tracks, reads each one as bytes, and fails when a file contains a C0
// control byte other than TAB/LF/CR, or DEL.
//
// WHY A GATE AND NOT REVIEW. A stray control byte in a tracked source is
// structurally invisible to the three things that would normally catch it:
// `git diff` stops rendering a file past 8KB, the interactive `grep` classifies
// the file as binary and reports nothing, and a human reviewer sees a rendered
// glyph-less gap. The repository has already shipped one
// (cid:requirements-analysis:control-byte-guard). Only a byte-level machine
// check closes that class.
//
// THE ALLOWLIST IS NOT A RATCHET. It holds the repository's legitimate tracked
// binaries — files that are SUPPOSED to contain control bytes. It is a fixed,
// tiny, hand-reviewed set, and an entry that no longer matches a tracked file
// is itself a failure (`stale allowlist entry`), so the list cannot quietly
// grow stale and start excusing files that no longer exist.
//
// SYMLINKS. git tracks a symlink as a blob whose content is the TARGET PATH
// STRING. The gate judges that string, not the dereferenced file: the bytes in
// the repository are the link text, and dereferencing would both scan an
// untracked file and break on a dangling link.
//
// FAIL-CLOSED ENUMERATION. If `git ls-files` cannot run or exits non-zero, the
// gate throws rather than scanning an empty list — a broken enumeration must
// never look like a clean repository.
//
// Run:
//   bun tests/control-byte-gate.ts --check     # CI gate (exit 1 on any finding)

import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findControlByte, type GateResult, type Violation } from "./lib/control-byte.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// The allowlist: tracked files that legitimately contain control bytes.
// ---------------------------------------------------------------------------

type AllowlistEntry = {
  readonly path: string;
  readonly reason: string;
};

export const BINARY_ALLOWLIST: readonly AllowlistEntry[] = [
  {
    path: "assets/AI-DLC-Workflows-2.0-Specification.pdf",
    reason: "the repository's only legitimate tracked binary: the AI-DLC specification PDF asset",
  },
] as const;

// ---------------------------------------------------------------------------
// Enumeration. NUL-separated so paths with any byte in them — Japanese file
// names included — survive the round trip untouched by shell quoting rules.
// ---------------------------------------------------------------------------

function gitTrackedFiles(repoRoot: string): string[] {
  const proc = spawnSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "buffer",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (proc.error !== undefined) {
    throw new Error(`git ls-files could not be run in ${repoRoot}: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    const stderr = proc.stderr?.toString("utf-8").trim() ?? "";
    throw new Error(`git ls-files exited ${String(proc.status)} in ${repoRoot}: ${stderr}`);
  }
  return proc.stdout
    .toString("utf-8")
    .split("\0")
    .filter((path) => path.length > 0);
}

// ---------------------------------------------------------------------------
// The gate itself. Exported so tests drive it in process: a spawned CLI is
// invisible to `bun --coverage`, and the seam also lets a test fix the scan
// universe instead of depending on the repository's live contents.
// ---------------------------------------------------------------------------

export type GateOptions = {
  readonly repoRoot: string;
  readonly listFiles?: () => string[];
};

// The bytes git stores for this path: the link target string for a symlink,
// the file content otherwise.
function trackedBytes(absolute: string): Uint8Array {
  if (lstatSync(absolute).isSymbolicLink()) {
    return new TextEncoder().encode(readlinkSync(absolute));
  }
  return readFileSync(absolute);
}

export function runControlByteGate(options: GateOptions): GateResult {
  const listFiles = options.listFiles ?? (() => gitTrackedFiles(options.repoRoot));
  const tracked = listFiles();
  const trackedSet = new Set(tracked);

  const allowed = new Set<string>();
  const staleAllowlist: string[] = [];
  for (const entry of BINARY_ALLOWLIST) {
    if (trackedSet.has(entry.path)) allowed.add(entry.path);
    else staleAllowlist.push(entry.path);
  }

  const violations: Violation[] = [];
  const readErrors: { path: string; message: string }[] = [];
  let scannedCount = 0;

  for (const path of tracked) {
    if (allowed.has(path)) continue;
    scannedCount += 1;
    let bytes: Uint8Array;
    try {
      bytes = trackedBytes(join(options.repoRoot, path));
    } catch (err) {
      readErrors.push({ path, message: (err as Error).message });
      continue;
    }
    const found = findControlByte(bytes);
    if (found !== null) violations.push({ path, offset: found.offset, byte: found.byte });
  }

  return { scannedCount, violations, staleAllowlist, readErrors };
}

// ---------------------------------------------------------------------------
// CLI. Every finding is printed in full — a truncated listing would hide the
// tail of exactly the class of defect this gate exists to surface.
// ---------------------------------------------------------------------------

function formatByte(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

export function runCheck(repoRoot: string = REPO_ROOT): number {
  const result = runControlByteGate({ repoRoot });
  for (const violation of result.violations) {
    console.log(
      `${violation.path}: control byte 0x${formatByte(violation.byte)} at offset ${String(violation.offset)}`,
    );
  }
  for (const path of result.staleAllowlist) console.log(`stale allowlist entry: ${path}`);
  for (const failure of result.readErrors) console.log(`read error: ${failure.path}: ${failure.message}`);
  const clean =
    result.violations.length === 0 && result.staleAllowlist.length === 0 && result.readErrors.length === 0;
  if (!clean) return 1;
  console.log(`scanned ${String(result.scannedCount)} files, no control bytes found`);
  return 0;
}

const USAGE =
  "usage: bun tests/control-byte-gate.ts --check\n" +
  "  --check   scan every tracked file for raw control bytes (CI gate)";

export function main(args: string[]): number {
  try {
    if (args.length === 1 && args[0] === "--check") return runCheck();
    console.error(USAGE);
    return 2;
  } catch (err) {
    console.error(`CONTROL BYTE GATE FAILED: ${(err as Error).message}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
