// size: medium
//
// The control-byte gate over a real filesystem (#2814), driven through the
// in-process `runControlByteGate` seam with an injected file listing so the
// scan universe is fixed by the test rather than by the repository.
//
// EVERY control byte used here is GENERATED AT RUNTIME (Buffer.from([...])).
// No fixture file containing a raw control byte is ever committed — committing
// one would make the repository fail its own gate.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { BINARY_ALLOWLIST, runControlByteGate } from "../control-byte-gate.ts";

const ALLOWLISTED_PATH = BINARY_ALLOWLIST[0]?.path as string;

let root: string;

function write(relative: string, bytes: Uint8Array | string): void {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

beforeEach(() => {
  // Outside the repository: a temp dir, so nothing the test writes can be
  // picked up by the repository's own tooling.
  root = mkdtempSync(join(tmpdir(), "amadeus-control-byte-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("runControlByteGate", () => {
  test("a clean corpus produces no findings", () => {
    write("a.txt", "hello\n");
    write("nested/b.ts", "const x = 1;\r\n// 日本語\tok\n");
    write(ALLOWLISTED_PATH, "stand-in for the tracked binary\n");

    const result = runControlByteGate({
      repoRoot: root,
      listFiles: () => ["a.txt", "nested/b.ts", ALLOWLISTED_PATH],
    });

    // 3 enumerated - 1 allowlist hit.
    expect(result.scannedCount).toBe(2);
    expect(result.violations).toEqual([]);
    expect(result.staleAllowlist).toEqual([]);
    expect(result.readErrors).toEqual([]);
  });

  test("a control byte is reported with its path, offset and byte value", () => {
    write("dirty.md", Buffer.from([0x41, 0x42, 0x00, 0x43]));

    const result = runControlByteGate({
      repoRoot: root,
      listFiles: () => ["dirty.md"],
    });

    expect(result.violations).toEqual([{ path: "dirty.md", offset: 2, byte: 0x00 }]);
    expect(result.scannedCount).toBe(1);
  });

  test("multiple violations are reported in enumeration order", () => {
    write("z.txt", Buffer.from([0x1f]));
    write("a.txt", Buffer.from([0x41, 0x7f]));
    write("clean.txt", "fine\n");

    const result = runControlByteGate({
      repoRoot: root,
      listFiles: () => ["z.txt", "clean.txt", "a.txt"],
    });

    expect(result.violations).toEqual([
      { path: "z.txt", offset: 0, byte: 0x1f },
      { path: "a.txt", offset: 1, byte: 0x7f },
    ]);
    expect(result.scannedCount).toBe(3);
  });

  test("an allowlisted binary is skipped, not scanned", () => {
    write(ALLOWLISTED_PATH, Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x08]));
    write("a.txt", "clean\n");

    const result = runControlByteGate({
      repoRoot: root,
      listFiles: () => [ALLOWLISTED_PATH, "a.txt"],
    });

    expect(result.violations).toEqual([]);
    expect(result.staleAllowlist).toEqual([]);
    // 2 enumerated - 1 allowlist hit.
    expect(result.scannedCount).toBe(1);
  });

  test("an allowlist entry absent from the listing is reported stale", () => {
    write("a.txt", "clean\n");

    const result = runControlByteGate({
      repoRoot: root,
      listFiles: () => ["a.txt"],
    });

    expect(result.staleAllowlist).toEqual([ALLOWLISTED_PATH]);
    expect(result.violations).toEqual([]);
    expect(result.scannedCount).toBe(1);
  });

  test("an unreadable file is reported, never silently skipped", () => {
    write("a.txt", "clean\n");

    const result = runControlByteGate({
      repoRoot: root,
      listFiles: () => ["a.txt", "gone.txt", ALLOWLISTED_PATH],
    });

    expect(result.readErrors.length).toBe(1);
    expect(result.readErrors[0]?.path).toBe("gone.txt");
    expect(result.readErrors[0]?.message.length).toBeGreaterThan(0);
    // The unreadable file was enumerated and attempted, so it counts as scanned.
    expect(result.scannedCount).toBe(2);
  });

  test("a symlink is judged on its target string, not the dereferenced file", () => {
    write("a.txt", "clean\n");
    // A link whose TARGET STRING is clean, pointing at a file that is not:
    // the tracked blob is the link text, so the gate must pass it.
    write("secret.bin", Buffer.from([0x00, 0x01]));
    symlinkSync("secret.bin", join(root, "link.txt"));

    const result = runControlByteGate({
      repoRoot: root,
      listFiles: () => ["a.txt", "link.txt"],
    });

    expect(result.violations).toEqual([]);
    expect(result.readErrors).toEqual([]);
    expect(result.scannedCount).toBe(2);
  });

  test("the default listing enumerates the repository through git", () => {
    // No injected listFiles: the default path must run git ls-files against the
    // given root. A temp dir is not a git repository, so the enumeration stage
    // fails loudly rather than reporting an empty, clean corpus.
    expect(() => runControlByteGate({ repoRoot: root })).toThrow();
  });
});
