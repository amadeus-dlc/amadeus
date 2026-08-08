// covers: function:normalizeSpawnOutcome, function:parseTree, contract:no-silent-drop:identity-only-rebind
// size: medium
//
// t499 - issue #2397. Two defects on the evidence adapter's command boundary:
//
//   1. fail-open. `spawnSync` can return `status: 0` *together with* an `error`, and the runner
//      derived its verdict from `status` alone - so a child that overflowed maxBuffer and still
//      exited on its own handed the caller a truncated stdout under a success verdict. Measured on
//      bun 1.3.13 (see "bun really does return status 0 alongside an error" below); the shape is
//      not hypothetical.
//   2. no forensics. `parseTree`'s throw said only "tree output is not NUL terminated" and dropped
//      every byte-level fact - length, edges, NUL count, the child's own exit code and stderr -
//      needed to tell a truncated pipe from a genuinely malformed tree. #2397's rotating flake is
//      exactly the case that message could not explain.
//
// The 8 MiB production maxBuffer makes the status-0 overflow unreachable through a real spawn (a
// child that big is always killed before it can exit), so the fail-closed rule is driven through
// the exported `normalizeSpawnOutcome` seam with the measured outcome shape, and the real-process
// arm asserts the overflow lands non-zero end to end.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  type CommandResult,
  type CommandRunner,
  NoSilentDropEvidenceAdapter,
  normalizeSpawnOutcome,
  systemCommandRunner,
} from "../../scripts/no-silent-drop-evidence-adapter.ts";

const NUL = String.fromCharCode(0);
const MOCK_EVENT = "e".repeat(40);
const MOCK_BINDING = "b".repeat(40);
const MOCK_PULL_REQUEST_HEAD = "c".repeat(40);
const BLOB_SHA = "d".repeat(40);

function enobufsError(): Error {
  const error = new Error(
    "SystemError: spawnSync /bin/sh ENOBUFS (stdout or stderr buffer reached maxBuffer size limit)",
  );
  (error as Error & { code: string }).code = "ENOBUFS";
  return error;
}

function commandResult(status = 0, stdout = "", stderr = ""): CommandResult {
  return { status, stdout, stderr };
}

function treeEntry(path: string): string {
  return `100644 blob ${BLOB_SHA}\t${path}`;
}

// The minimum a `proveIdentityOnlyRebind` call needs to reach `recursiveTree`, with the tree
// output itself supplied by the caller so a test can hand it a cut stdout under exit 0.
function treeRunner(treeStdout: string): CommandRunner {
  const handlers: Record<string, () => CommandResult> = {
    "gh api": () =>
      commandResult(
        0,
        JSON.stringify([[
          {
            number: 7,
            state: "closed",
            merged_at: "2026-08-07T00:00:00Z",
            merge_commit_sha: MOCK_EVENT,
            base: { ref: "main" },
          },
        ]]),
      ),
    "git rev-parse": () => commandResult(0, `${MOCK_PULL_REQUEST_HEAD}\n`),
    "git ls-tree": () => commandResult(0, treeStdout),
  };
  return {
    run(args) {
      return handlers[`${args[0] ?? ""} ${args[1] ?? ""}`]?.() ?? commandResult();
    },
  };
}

function treeFailure(treeStdout: string): string {
  try {
    new NoSilentDropEvidenceAdapter("/nonexistent", treeRunner(treeStdout))
      .proveIdentityOnlyRebind(MOCK_EVENT, MOCK_BINDING, "amadeus-dlc/amadeus");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the tree parse to fail closed");
}

describe("t499 spawn boundary fails closed", () => {
  test("bun really does return status 0 alongside an error", () => {
    // Grounds the synthesised outcome below: with a buffer small enough that the child finishes
    // before the overflow kill lands, bun reports success and a truncated stdout at the same time.
    //
    // That "before" is a race the child usually wins and a loaded machine can lose: when the
    // SIGTERM lands first the same overflow surfaces as status null instead. A single sample
    // therefore grounds nothing reliably -- it made this test fail on the coverage runner, whose
    // instrumentation load flips the schedule. Sampling until the exit-0 shape appears keeps the
    // claim the fix rests on (bun does pair a success status with an error) while making the
    // race's other side a non-event: every attempt still has to report the ENOBUFS overflow, so
    // a genuine change in bun's behaviour is caught on the first attempt rather than tolerated.
    const attempts = 25;
    let successWithError: ReturnType<typeof spawnSync> | null = null;
    for (let i = 0; i < attempts && successWithError === null; i += 1) {
      const measured = spawnSync("/bin/sh", ["-c", "printf 'abcdefgh'"], {
        encoding: "utf8",
        env: process.env,
        maxBuffer: 2,
      });
      // Invariant on every sample, whoever wins the race: the overflow is reported, never dropped.
      expect(measured.error).toBeDefined();
      expect((measured.error as Error & { code?: string }).code).toBe("ENOBUFS");
      // The child either finished first (status 0) or was killed by the overflow (status null).
      expect(measured.status === 0 || measured.status === null).toBe(true);
      if (measured.status === 0) successWithError = measured;
    }
    expect(successWithError).not.toBeNull();
    expect(successWithError?.status).toBe(0);
    expect(successWithError?.error).toBeDefined();
  });

  test("an exit-0 spawn that reports an error is not a success", () => {
    const normalized = normalizeSpawnOutcome(
      { status: 0, stdout: "abcdefgh", stderr: "", error: enobufsError() },
      1_000,
    );
    expect(normalized.status).not.toBe(0);
    expect(normalized.stderr).toContain("ENOBUFS");
    // The partial stdout is still handed back - the verdict changes, the evidence is not hidden.
    expect(normalized.stdout).toBe("abcdefgh");
  });

  test("an error detail reaches stderr even when the child wrote its own stderr", () => {
    const normalized = normalizeSpawnOutcome(
      { status: 0, stdout: "", stderr: "fatal: child said something\n", error: enobufsError() },
      1_000,
    );
    expect(normalized.status).not.toBe(0);
    expect(normalized.stderr).toContain("fatal: child said something");
    expect(normalized.stderr).toContain("ENOBUFS");
  });

  test("a clean exit-0 spawn stays a success and keeps its stderr verbatim", () => {
    const normalized = normalizeSpawnOutcome({ status: 0, stdout: "ok", stderr: "warning\n" }, 1_000);
    expect(normalized).toEqual({ status: 0, stdout: "ok", stderr: "warning\n" });
  });

  test("a real child overflowing the production buffer lands non-zero", () => {
    const result = systemCommandRunner.run([
      process.execPath,
      "-e",
      'process.stdout.write("x".repeat(9_000_000))',
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ENOBUFS");
  });
});

describe("t499 tree parse failures are diagnosable", () => {
  test("a stdout cut one byte short names the contradiction and the byte-level evidence", () => {
    const complete = `${treeEntry("packages/framework/core/tools/fixture.ts")}${NUL}`;
    const cut = complete.slice(0, -1);
    const message = treeFailure(cut);
    const bytes = Buffer.from(cut, "utf8");

    expect(message).toContain("tree output is not NUL terminated");
    expect(message).toContain("exit 0 reported but stdout is incomplete");
    expect(message).toContain(`bytes=${bytes.length}`);
    expect(message).toContain(`head16=${Buffer.from(bytes.subarray(0, 16)).toString("hex")}`);
    expect(message).toContain(`tail16=${Buffer.from(bytes.subarray(bytes.length - 16)).toString("hex")}`);
    expect(message).toContain("nulCount=0");
    expect(message).toContain("endsNul=false");
    expect(message).toContain(`bytesAfterLastNul=${bytes.length}`);
    expect(message).toContain("status=0");
    expect(message).toContain('stderr=""');
  });

  test("a stdout cut mid-stream reports the NULs it did see and the residue after the last one", () => {
    const cut = `${treeEntry("a.ts")}${NUL}${treeEntry("b.ts")}${NUL}100644 blob dddd`;
    const message = treeFailure(cut);

    expect(message).toContain("nulCount=2");
    expect(message).toContain("endsNul=false");
    expect(message).toContain("bytesAfterLastNul=16");
  });

  test("a NUL-terminated but malformed entry carries the same forensics", () => {
    const message = treeFailure(`100644 blob not-a-sha\tfixture.ts${NUL}`);

    expect(message).toContain("tree entry is malformed");
    expect(message).toContain("exit 0 reported and stdout did not parse");
    expect(message).toContain("nulCount=1");
    expect(message).toContain("endsNul=true");
    expect(message).toContain("bytesAfterLastNul=0");
    expect(message).toContain("status=0");
  });
});
