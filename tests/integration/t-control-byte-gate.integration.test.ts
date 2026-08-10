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
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  assertAllowlistWellFormed,
  BINARY_ALLOWLIST,
  main,
  runCheck,
  runControlByteGate,
} from "../control-byte-gate.ts";

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

  test("an empty file is clean", () => {
    write("empty.txt", new Uint8Array(0));

    const result = runControlByteGate({ repoRoot: root, listFiles: () => ["empty.txt"] });

    expect(result.violations).toEqual([]);
    expect(result.readErrors).toEqual([]);
    expect(result.scannedCount).toBe(1);
  });

  test("the default listing enumerates the repository through git", () => {
    // No injected listFiles: the default path must run git ls-files against the
    // given root. A temp dir is not a git repository, so the enumeration stage
    // fails loudly rather than reporting an empty, clean corpus.
    expect(() => runControlByteGate({ repoRoot: root })).toThrow();
  });

  test("git failing to launch at all is loud, not an empty corpus", () => {
    // The two enumeration failures are distinct and neither may report a clean
    // repository: git RAN and refused (previous test, non-zero exit), versus
    // git never started. A root that does not exist makes the spawn itself fail
    // — posix_spawn cannot chdir into it — which is the only lever a caller has
    // on that branch, and it reaches it through the public seam.
    expect(() => runControlByteGate({ repoRoot: join(root, "no-such-directory") })).toThrow(
      /git ls-files could not be run in/,
    );
  });
});

describe("assertAllowlistWellFormed", () => {
  test("the shipped allowlist is well formed", () => {
    expect(() => assertAllowlistWellFormed(BINARY_ALLOWLIST)).not.toThrow();
  });

  test("an entry whose reason is blank is rejected", () => {
    expect(() => assertAllowlistWellFormed([{ path: "a.pdf", reason: "   " }])).toThrow(
      "allowlist entry a.pdf has an empty reason",
    );
  });

  test("an entry whose path is blank is rejected", () => {
    expect(() => assertAllowlistWellFormed([{ path: "", reason: "because" }])).toThrow(
      "allowlist entry has an empty path",
    );
  });
});

// ---------------------------------------------------------------------------
// The CLI over a real git repository. These drive the DEFAULT enumeration —
// `git ls-files -z` against a throwaway repo — so the NUL parsing, the exit
// mapping and the exact diagnostic wording are all exercised for real rather
// than around an injected listing.
// ---------------------------------------------------------------------------

function gitAddAll(repo: string): void {
  const init = spawnSync("git", ["init", "-q", "."], { cwd: repo, encoding: "utf8", env: process.env });
  expect(init.status).toBe(0);
  const add = spawnSync("git", ["add", "-A"], { cwd: repo, encoding: "utf8", env: process.env });
  expect(add.status).toBe(0);
}

function capture(run: () => number): { code: number; lines: string[] } {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    return { code: run(), lines };
  } finally {
    console.log = original;
  }
}

describe("runCheck over a real git repository", () => {
  test("a clean tracked corpus exits 0 and reports the scanned count", () => {
    write("a.txt", "hello\n");
    write("日本語のパス.md", "見出し\r\n\tindented\n");
    write("empty.txt", new Uint8Array(0));
    write(ALLOWLISTED_PATH, "stand-in for the tracked binary\n");
    gitAddAll(root);

    const { code, lines } = capture(() => runCheck(root));

    expect(code).toBe(0);
    // 4 tracked - 1 allowlist hit.
    expect(lines).toEqual(["scanned 3 files, no control bytes found"]);
  });

  test("a control byte exits 1 and names the path, byte value and offset", () => {
    write("dirty.md", Buffer.from([0x41, 0x42, 0x00, 0x43]));
    write(ALLOWLISTED_PATH, "stand-in\n");
    gitAddAll(root);

    const { code, lines } = capture(() => runCheck(root));

    expect(code).toBe(1);
    expect(lines).toEqual(["dirty.md: control byte 0x00 at offset 2"]);
  });

  test("a byte value below 0x10 is printed as two upper-case hex digits", () => {
    write("bell.txt", Buffer.from([0x07]));
    write(ALLOWLISTED_PATH, "stand-in\n");
    gitAddAll(root);

    const { code, lines } = capture(() => runCheck(root));

    expect(code).toBe(1);
    expect(lines).toEqual(["bell.txt: control byte 0x07 at offset 0"]);
  });

  test("a stale allowlist entry alone exits 1 and names the entry", () => {
    write("a.txt", "clean\n");
    gitAddAll(root);

    const { code, lines } = capture(() => runCheck(root));

    expect(code).toBe(1);
    expect(lines).toEqual([`stale allowlist entry: ${ALLOWLISTED_PATH}`]);
  });

  test("a tracked file that cannot be read exits 1 and names the read error", () => {
    write("a.txt", "clean\n");
    write("vanishes.txt", "gone in a moment\n");
    write(ALLOWLISTED_PATH, "stand-in\n");
    gitAddAll(root);
    // Tracked in the index, absent from the working tree: the gate must report
    // it rather than skip it (NFR-3 — no silent fail-open).
    unlinkSync(join(root, "vanishes.txt"));

    const { code, lines } = capture(() => runCheck(root));

    expect(code).toBe(1);
    expect(lines.length).toBe(1);
    expect(lines[0]).toStartWith("read error: vanishes.txt: ");
  });
});

describe("main", () => {
  test("--check returns the gate's exit code", () => {
    write("a.txt", "clean\n");
    write(ALLOWLISTED_PATH, "stand-in\n");
    gitAddAll(root);

    expect(capture(() => main(["--check"], root)).code).toBe(0);
  });

  test("a broken enumeration is loud and non-zero, never a clean verdict", () => {
    // Not a git repository: `git ls-files` exits non-zero, and the gate must
    // surface that rather than report an empty, spotless corpus.
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    };
    try {
      expect(main(["--check"], root)).toBe(1);
    } finally {
      console.error = original;
    }
    expect(errors.length).toBe(1);
    expect(errors[0]).toStartWith("CONTROL BYTE GATE FAILED: ");
  });

  test("any other invocation prints usage and returns 2", () => {
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    };
    try {
      expect(main([], root)).toBe(2);
      expect(main(["--help"], root)).toBe(2);
    } finally {
      console.error = original;
    }
    expect(errors.length).toBe(2);
    expect(errors[0]).toContain("usage: bun tests/control-byte-gate.ts --check");
  });
});
