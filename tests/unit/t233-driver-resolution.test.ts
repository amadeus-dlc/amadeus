// covers: file:packages/framework/core/tools/amadeus-swarm.ts
//
// t233 — driver-contract-core: the env×harness driver resolution (Issue #1157).
//
// Drives the exported pure function resolveDriver and the CLI handler
// handleResolve in-process (no spawn, no fs — Bun coverage does not instrument
// spawned CLI processes). The 16-cell decision matrix is a HANDWRITTEN table
// (construction/driver-contract-core/functional-design/business-logic-model.md),
// NOT generated from DRIVER_VALUES/HARNESS_VALUES — a self-referential expected
// table would be verification theatre (SCD-2). The negative half proves the
// rejected path is fail-closed: exit 1, empty stdout, no side effects.

import { describe, expect, spyOn, test } from "bun:test";
import {
  DRIVER_VALUES,
  type DriverResolution,
  handleResolve,
  type HarnessName,
  resolveDriver,
} from "../../packages/framework/core/tools/amadeus-swarm.ts";

// The four harnesses, spelled out (not read from HARNESS_VALUES — see header).
const HARNESSES: readonly HarnessName[] = ["claude", "codex", "kiro", "kiro-ide"];

// The 16-cell decision matrix, written by hand from the FD decision table. Each
// row pins raw × harness → the exact expected DriverResolution. The "other" row
// uses "1" (the old sentinel) as its representative; more rejected inputs are
// exercised separately below.
interface MatrixCell {
  readonly raw: string | undefined;
  readonly harness: HarnessName;
  readonly expected: DriverResolution;
}

const MATRIX: readonly MatrixCell[] = [
  // raw unset → the subagent floor on every harness.
  { raw: undefined, harness: "claude", expected: { kind: "selected", driver: "subagent" } },
  { raw: undefined, harness: "codex", expected: { kind: "selected", driver: "subagent" } },
  { raw: undefined, harness: "kiro", expected: { kind: "selected", driver: "subagent" } },
  { raw: undefined, harness: "kiro-ide", expected: { kind: "selected", driver: "subagent" } },

  // claude-ultra → selected only on the Claude harness; degraded elsewhere.
  { raw: "claude-ultra", harness: "claude", expected: { kind: "selected", driver: "claude-ultra" } },
  { raw: "claude-ultra", harness: "codex", expected: { kind: "degraded", driver: "subagent", requested: "claude-ultra" } },
  { raw: "claude-ultra", harness: "kiro", expected: { kind: "degraded", driver: "subagent", requested: "claude-ultra" } },
  { raw: "claude-ultra", harness: "kiro-ide", expected: { kind: "degraded", driver: "subagent", requested: "claude-ultra" } },

  // codex-ultra → selected only on the Codex harness; degraded elsewhere.
  { raw: "codex-ultra", harness: "claude", expected: { kind: "degraded", driver: "subagent", requested: "codex-ultra" } },
  { raw: "codex-ultra", harness: "codex", expected: { kind: "selected", driver: "codex-ultra" } },
  { raw: "codex-ultra", harness: "kiro", expected: { kind: "degraded", driver: "subagent", requested: "codex-ultra" } },
  { raw: "codex-ultra", harness: "kiro-ide", expected: { kind: "degraded", driver: "subagent", requested: "codex-ultra" } },

  // any other value ("1" here) → rejected as unknown, on every harness.
  { raw: "1", harness: "claude", expected: { kind: "rejected", raw: "1", reason: "unknown-value" } },
  { raw: "1", harness: "codex", expected: { kind: "rejected", raw: "1", reason: "unknown-value" } },
  { raw: "1", harness: "kiro", expected: { kind: "rejected", raw: "1", reason: "unknown-value" } },
  { raw: "1", harness: "kiro-ide", expected: { kind: "rejected", raw: "1", reason: "unknown-value" } },
];

describe("resolveDriver — 16-cell decision matrix", () => {
  test("the handwritten table has all 16 cells", () => {
    expect(MATRIX.length).toBe(16);
  });

  for (const cell of MATRIX) {
    const label = `${cell.raw === undefined ? "(unset)" : `"${cell.raw}"`} @ ${cell.harness}`;
    test(`${label} → ${cell.expected.kind}`, () => {
      expect(resolveDriver(cell.raw, cell.harness)).toEqual(cell.expected);
    });
  }
});

describe("resolveDriver — value semantics", () => {
  test("raw is NOT trimmed: a whitespace-padded ultra value is rejected (C-06)", () => {
    for (const harness of HARNESSES) {
      expect(resolveDriver(" claude-ultra", harness)).toEqual({
        kind: "rejected",
        raw: " claude-ultra",
        reason: "unknown-value",
      });
    }
  });

  test("the empty string is rejected, not treated as unset (fail-closed)", () => {
    expect(resolveDriver("", "claude")).toEqual({ kind: "rejected", raw: "", reason: "unknown-value" });
  });

  test("an explicit \"subagent\" env value is rejected (only unset floors)", () => {
    expect(resolveDriver("subagent", "claude")).toEqual({
      kind: "rejected",
      raw: "subagent",
      reason: "unknown-value",
    });
  });

  test("the retired \"ultracode\" value is rejected", () => {
    expect(resolveDriver("ultracode", "claude")).toEqual({
      kind: "rejected",
      raw: "ultracode",
      reason: "unknown-value",
    });
  });
});

// --- handleResolve CLI seam (in-process, exit injected) ----------------------

const SWARM_ENV = "AMADEUS_USE_SWARM";

function withSwarmEnv(value: string | undefined, run: () => void): void {
  const prior = process.env[SWARM_ENV];
  if (value === undefined) delete process.env[SWARM_ENV];
  else process.env[SWARM_ENV] = value;
  try {
    run();
  } finally {
    if (prior === undefined) delete process.env[SWARM_ENV];
    else process.env[SWARM_ENV] = prior;
  }
}

interface HandleOutcome {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

function driveResolve(swarmValue: string | undefined, args: string[]): HandleOutcome {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const logSpy = spyOn(console, "log").mockImplementation((value) => {
    stdout.push(String(value));
  });
  const errSpy = spyOn(console, "error").mockImplementation((value) => {
    stderr.push(String(value));
  });
  let exitCode = -1;
  try {
    withSwarmEnv(swarmValue, () => {
      handleResolve(args, (code) => {
        exitCode = code;
      });
    });
  } finally {
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
  return { exitCode, stdout, stderr };
}

describe("handleResolve — happy path (stdout JSON, exit 0)", () => {
  test("unset @ codex → selected subagent", () => {
    const out = driveResolve(undefined, ["--harness", "codex"]);
    expect(out.exitCode).toBe(0);
    expect(out.stderr).toEqual([]);
    expect(JSON.parse(out.stdout[0])).toEqual({ kind: "selected", driver: "subagent" });
  });

  test("claude-ultra @ claude → selected claude-ultra", () => {
    const out = driveResolve("claude-ultra", ["--harness", "claude"]);
    expect(out.exitCode).toBe(0);
    expect(out.stderr).toEqual([]);
    expect(JSON.parse(out.stdout[0])).toEqual({ kind: "selected", driver: "claude-ultra" });
  });

  test("codex-ultra @ claude → degraded subagent (requested preserved)", () => {
    const out = driveResolve("codex-ultra", ["--harness", "claude"]);
    expect(out.exitCode).toBe(0);
    expect(out.stderr).toEqual([]);
    expect(JSON.parse(out.stdout[0])).toEqual({
      kind: "degraded",
      driver: "subagent",
      requested: "codex-ultra",
    });
  });
});

describe("handleResolve — rejected env value (fail-closed: exit 1, empty stdout)", () => {
  for (const bad of ["1", "", "subagent", "ultracode", " claude-ultra"]) {
    test(`AMADEUS_USE_SWARM=${JSON.stringify(bad)} → exit 1, no stdout, error lists allowed values`, () => {
      const out = driveResolve(bad, ["--harness", "claude"]);
      expect(out.exitCode).toBe(1);
      expect(out.stdout).toEqual([]);
      const error = JSON.parse(out.stderr[0]).error as string;
      // BR-7: the message includes the three allowed driver values (not verbatim-pinned).
      for (const value of DRIVER_VALUES) {
        expect(error).toContain(value);
      }
      // SNR-1: the raw value is echoed, nothing else leaks.
      expect(error).toContain(JSON.stringify(bad));
    });
  }
});

describe("handleResolve — invalid --harness (fail-closed: exit 1, empty stdout)", () => {
  test("an unknown harness value is rejected", () => {
    const out = driveResolve("claude-ultra", ["--harness", "bogus"]);
    expect(out.exitCode).toBe(1);
    expect(out.stdout).toEqual([]);
    expect(JSON.parse(out.stderr[0]).error).toContain("--harness must be one of");
  });

  test("a missing --harness is rejected", () => {
    const out = driveResolve("claude-ultra", []);
    expect(out.exitCode).toBe(1);
    expect(out.stdout).toEqual([]);
    expect(JSON.parse(out.stderr[0]).error).toContain("--harness must be one of");
  });
});
