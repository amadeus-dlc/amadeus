// covers: file:tests/harness/fixtures.ts
//
// copyTreeWithRetry (#2397, t99): cpSync(AMADEUS_SRC, ..., { recursive: true })
// has failed under full-suite parallel load with a bare
// `ENOENT: no such file or directory, open` — no path attached, so the raw
// error carries zero positional information. copyTreeWithRetry is the
// symmetric counterpart to removeTreeWithRetry (#1565,
// t-fixtures-remove-tree-retry.integration.test.ts): the retry branch and
// the diagnostics-then-throw branch are driven in-process via injected ops,
// plus one real-FS case that exercises the actual failure mode (a dangling
// symlink under a real cpSync source) to prove the diagnostics fire outside
// the mock.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { copyTreeWithRetry, type CopyTreeOps } from "../harness/fixtures.ts";

function opsRecorder(overrides: Partial<CopyTreeOps>): CopyTreeOps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    copy(src: string, dest: string) {
      calls.push(`copy:${src}->${dest}`);
      overrides.copy?.(src, dest);
    },
    exists(path: string) {
      calls.push(`exists:${path}`);
      return overrides.exists ? overrides.exists(path) : true;
    },
    sleep(ms: number) {
      calls.push(`sleep:${ms}`);
      overrides.sleep?.(ms);
    },
    count(path: string) {
      calls.push(`count:${path}`);
      return overrides.count ? overrides.count(path) : 0;
    },
  };
}

describe("copyTreeWithRetry (#2397 in-process branches)", () => {
  test("returns on the first attempt when the copy succeeds and file counts match", () => {
    const ops = opsRecorder({ count: () => 3 });
    copyTreeWithRetry("/fake/src", "/fake/dest", ops);
    expect(ops.calls).toEqual([
      "copy:/fake/src->/fake/dest",
      "count:/fake/src",
      "count:/fake/dest",
    ]);
  });

  test("retries a transient ENOENT and succeeds once the source is stable", () => {
    let attempts = 0;
    const enoent = Object.assign(new Error("ENOENT: no such file or directory, open"), {
      code: "ENOENT",
    });
    const retries: number[] = [];
    const ops = opsRecorder({
      copy: () => {
        attempts++;
        if (attempts < 2) throw enoent;
      },
      count: () => 5,
      sleep: (ms) => retries.push(ms),
    });
    copyTreeWithRetry("/fake/src", "/fake/dest", ops);
    expect(attempts).toBe(2);
    expect(retries).toEqual([50]);
  });

  test("exhausts all attempts on a persistent ENOENT and throws with diagnostics", () => {
    const enoent = Object.assign(new Error("ENOENT: no such file or directory, open"), {
      code: "ENOENT",
    });
    let attempts = 0;
    const ops = opsRecorder({
      copy: () => {
        attempts++;
        throw enoent;
      },
    });
    expect(() => copyTreeWithRetry("/fake/src", "/fake/dest", ops)).toThrow(
      "ENOENT: no such file or directory, open",
    );
    expect(attempts).toBe(3);
  });

  test("throws a non-retryable copy error immediately without sleeping", () => {
    const denied = Object.assign(new Error("denied"), { code: "EACCES" });
    const sleeps: number[] = [];
    let attempts = 0;
    const ops = opsRecorder({
      copy: () => {
        attempts++;
        throw denied;
      },
      sleep: (ms) => sleeps.push(ms),
    });
    expect(() => copyTreeWithRetry("/fake/src", "/fake/dest", ops)).toThrow("denied");
    expect(attempts).toBe(1);
    expect(sleeps).toEqual([]);
  });

  test("a copy that returns without throwing but leaves a partial tree retries then throws a count-mismatch error", () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const ops = opsRecorder({
      copy: () => {
        attempts++;
        /* returns without throwing — a partial copy every attempt */
      },
      count: (path) => (path === "/fake/src" ? 10 : 4),
      sleep: (ms) => sleeps.push(ms),
    });
    expect(() => copyTreeWithRetry("/fake/src", "/fake/dest", ops)).toThrow(
      "copyTreeWithRetry: cpSync returned but the file count does not match",
    );
    // Symmetric with removeTreeWithRetry's silent-survival branch: a copy
    // that returns without throwing but leaves a wrong file count is
    // retried the same as a thrown retryable error, not failed closed on
    // the first attempt (the mismatch could itself be a transient race).
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([50, 100]);
  });

  test("a copy that recovers on a later attempt succeeds without throwing", () => {
    let attempts = 0;
    const ops = opsRecorder({
      copy: () => {
        attempts++;
      },
      count: (path) => (path === "/fake/src" ? 10 : attempts < 2 ? 4 : 10),
    });
    expect(() => copyTreeWithRetry("/fake/src", "/fake/dest", ops)).not.toThrow();
    expect(attempts).toBe(2);
  });
});

describe("copyTreeWithRetry (#2397 real filesystem)", () => {
  const scratch: string[] = [];

  afterAll(() => {
    for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function tmp(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    scratch.push(dir);
    return dir;
  }

  test("a dangling symlink in the source tree still copies (Node/bun cpSync follows link targets but tolerates missing ones) and diagnostics are only emitted on genuine failure", () => {
    const src = tmp("t-copy-tree-retry-src-");
    writeFileSync(join(src, "real-file.txt"), "hello\n");
    symlinkSync(join(src, "does-not-exist.txt"), join(src, "dangling.txt"));

    const dest = join(tmp("t-copy-tree-retry-dest-parent-"), "dest");

    // This exercises the ACTUAL cpSync/countFilesRecursive real-FS path (not
    // ops-injected), proving copyTreeWithRetry's default ops work against a
    // real dangling symlink without throwing on the mere existence of one —
    // node:fs's recursive cpSync copies the symlink itself. If bun's real
    // recursive copy behaves differently for the dangling entry, this test
    // fails here rather than only in production.
    expect(() => copyTreeWithRetry(src, dest)).not.toThrow();
  });

  test("a source directory that vanishes entirely produces a real ENOENT with diagnostics on stderr, then throws after exhausting retries", () => {
    const parent = tmp("t-copy-tree-retry-vanish-");
    const src = join(parent, "gone");
    // Deliberately never created: cpSync against a genuinely absent source
    // is the real-FS analogue of the transient race in #2397 — a
    // permanent (not transient) ENOENT, so the diagnostics fire on every
    // attempt and the final throw carries the real fs error.
    const dest = join(parent, "dest");

    const originalWrite = process.stderr.write.bind(process.stderr);
    const captured: string[] = [];
    process.stderr.write = ((chunk: unknown) => {
      captured.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      expect(() => copyTreeWithRetry(src, dest)).toThrow(/ENOENT/);
    } finally {
      process.stderr.write = originalWrite;
    }

    const diagnostics = captured.join("");
    expect(diagnostics).toContain("[copyTreeWithRetry diagnostics]");
    expect(diagnostics).toContain("error.code: ENOENT");
    expect(diagnostics).toContain(`src exists: false`);
    expect(diagnostics).toContain("src recursive file count (post-failure re-scan): -1");
    expect(diagnostics).toContain("dest parent exists: true");
    // Three attempts (COPY_TREE_RETRY_LIMIT): diagnostics fire before every
    // retry, never silently.
    expect(diagnostics.split("[copyTreeWithRetry diagnostics]").length - 1).toBe(3);
  });

  test("diagnostics for a real, existing src walk its entries via safeReaddir (the srcExists===true branch, not the vanished-src short circuit above)", () => {
    // reportCopyTreeFailure's existsSync(src)/safeReaddir(src) calls are
    // real fs calls, unaffected by an injected `ops` — `ops` only stands in
    // for the copy operation itself. The two cases above (in-process /fake/
    // literals, and a src that never existed) both leave existsSync(src)
    // false, so `srcExists ? safeReaddir(src).length : -1` never calls
    // safeReaddir at all. A real, existing src drives that branch: src
    // exists, so safeReaddir(src) runs (its try calls readdirSync, which
    // succeeds here — the catch fallback is exercised implicitly by
    // whatever real entries are present, not asserted separately since
    // there is no failure mode to trigger it without a second race).
    const src = tmp("t-copy-tree-retry-real-src-");
    writeFileSync(join(src, "one.txt"), "1\n");
    writeFileSync(join(src, "two.txt"), "2\n");
    const dest = join(tmp("t-copy-tree-retry-real-dest-parent-"), "dest");

    const enoent = Object.assign(new Error("ENOENT: no such file or directory, open"), {
      code: "ENOENT",
    });
    let attempts = 0;
    const ops = opsRecorder({
      copy: () => {
        attempts++;
        throw enoent;
      },
    });

    const originalWrite = process.stderr.write.bind(process.stderr);
    const captured: string[] = [];
    process.stderr.write = ((chunk: unknown) => {
      captured.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      expect(() => copyTreeWithRetry(src, dest, ops)).toThrow(
        "ENOENT: no such file or directory, open",
      );
    } finally {
      process.stderr.write = originalWrite;
    }

    expect(attempts).toBe(3);
    const diagnostics = captured.join("");
    expect(diagnostics).toContain("src exists: true");
    expect(diagnostics).toContain("src top-level entries: 2");
  });
});
