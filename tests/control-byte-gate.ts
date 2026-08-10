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
// untracked file and break on a dangling link. Measured 2026-08-11 in a scratch
// repository: for a mode-120000 entry, `git cat-file blob` and `readlink` yield
// the same bytes ("real.txt", no trailing newline) while `readFileSync` yields
// the target's content instead. The tracked corpus itself currently holds no
// symlinks — `git ls-files -s | awk '$1=="120000"'` returns 0 of 16651 entries
// — so this path is exercised by test rather than by the repository.
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

// The type makes `reason` present; only a runtime check makes it MEAN anything.
// An entry excuses a file from the gate, so the justification for that excuse
// has to exist in the source where the excuse is granted — an empty string is a
// silent exemption, which is the one thing the allowlist must never be.
export function assertAllowlistWellFormed(entries: readonly AllowlistEntry[]): void {
  for (const entry of entries) {
    if (entry.path.trim().length === 0) throw new Error("allowlist entry has an empty path");
    if (entry.reason.trim().length === 0) {
      throw new Error(`allowlist entry ${entry.path} has an empty reason`);
    }
  }
}

assertAllowlistWellFormed(BINARY_ALLOWLIST);

// ---------------------------------------------------------------------------
// Enumeration. NUL-separated so paths with any byte in them — Japanese file
// names included — survive the round trip untouched by shell quoting rules.
// ---------------------------------------------------------------------------

// A tracked path as git reports it. `bytes` is what git stored and what every
// filesystem call must use; `display` is a lossy decode for diagnostics only.
//
// The two cannot be collapsed. A path may contain bytes that are not valid
// UTF-8 — the filesystems git runs on permit it, even where macOS does not —
// and decoding those to a string replaces them with U+FFFD. Re-encoding that
// string names a DIFFERENT file, so a gate that scanned the decoded path would
// report a spurious read error for a file that is present and perfectly
// readable. `keyOf` uses latin1, which is a lossless byte-for-byte mapping, so
// Set and Map lookups stay exact where a UTF-8 key would collide.
type TrackedPath = {
  readonly bytes: Buffer;
  readonly display: string;
};

function trackedPath(bytes: Buffer): TrackedPath {
  return { bytes, display: bytes.toString("utf-8") };
}

function keyOf(bytes: Buffer): string {
  return bytes.toString("latin1");
}

function splitNul(stdout: Buffer): Buffer[] {
  const paths: Buffer[] = [];
  let start = 0;
  for (let i = 0; i < stdout.length; i += 1) {
    if (stdout[i] !== 0) continue;
    if (i > start) paths.push(stdout.subarray(start, i));
    start = i + 1;
  }
  if (stdout.length > start) paths.push(stdout.subarray(start));
  return paths;
}

function gitTrackedFiles(repoRoot: string): TrackedPath[] {
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
  return splitNul(proc.stdout).map(trackedPath);
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

// The absolute location of a tracked path, kept in bytes end to end. Node's fs
// accepts a Buffer path and passes it to the syscall unchanged, so a path git
// reported is handed back to the filesystem exactly as git spelled it.
function absoluteBytes(repoRoot: string, path: TrackedPath): Buffer {
  return Buffer.concat([Buffer.from(`${repoRoot}/`, "utf-8"), path.bytes]);
}

// The bytes git stores for this path: the link target string for a symlink,
// the file content otherwise.
function trackedBytes(absolute: Buffer): Uint8Array {
  if (lstatSync(absolute).isSymbolicLink()) {
    return readlinkSync(absolute, "buffer");
  }
  return readFileSync(absolute);
}

export function runControlByteGate(options: GateOptions): GateResult {
  const listFiles = options.listFiles;
  // An injected listing is authored as JS strings, so encoding them is exact;
  // the default listing already carries git's own bytes.
  const tracked: TrackedPath[] =
    listFiles === undefined
      ? gitTrackedFiles(options.repoRoot)
      : listFiles().map((path) => trackedPath(Buffer.from(path, "utf-8")));
  const trackedKeys = new Set(tracked.map((path) => keyOf(path.bytes)));

  const allowed = new Set<string>();
  const staleAllowlist: string[] = [];
  for (const entry of BINARY_ALLOWLIST) {
    const key = keyOf(Buffer.from(entry.path, "utf-8"));
    if (trackedKeys.has(key)) allowed.add(key);
    else staleAllowlist.push(entry.path);
  }

  const violations: Violation[] = [];
  const readErrors: { path: string; message: string }[] = [];
  // scannedCount = enumerated entries MINUS allowlist hits. A file whose read
  // failed still counts: the gate attempted it and reported the failure, so
  // excluding it would make the summary understate the corpus it stood over.
  let scannedCount = 0;

  for (const path of tracked) {
    if (allowed.has(keyOf(path.bytes))) continue;
    scannedCount += 1;
    let bytes: Uint8Array;
    try {
      bytes = trackedBytes(absoluteBytes(options.repoRoot, path));
    } catch (err) {
      readErrors.push({ path: path.display, message: (err as Error).message });
      continue;
    }
    const found = findControlByte(bytes);
    if (found !== null) {
      violations.push({ path: path.display, offset: found.offset, byte: found.byte });
    }
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

export function main(args: string[], repoRoot: string = REPO_ROOT): number {
  try {
    if (args.length === 1 && args[0] === "--check") return runCheck(repoRoot);
    console.error(USAGE);
    return 2;
  } catch (err) {
    console.error(`CONTROL BYTE GATE FAILED: ${(err as Error).message}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
