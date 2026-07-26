// size: small
// covers: file:packages/framework/core/tools/amadeus-swarm.ts
//
// t-kimi-swarm-resolve — the kimi harness joins the swarm driver resolution
// (core-harness-enums, FR-4b). Kimi adds ONLY a HARNESS_VALUES member: the
// resolution itself is the inherited resolveDriver contract (subagent floor,
// ultra drivers degrade off their native harness, anything else fail-closed —
// BR-5: no kimi ultra driver is ever introduced). The 16-cell matrix for the
// four original harnesses lives in t233-driver-resolution.test.ts; this file
// pins the kimi column and the CLI seam for `--harness kimi`.

import { describe, expect, spyOn, test } from "bun:test";
import {
  DRIVER_VALUES,
  HARNESS_VALUES,
  handleResolve,
  resolveDriver,
} from "../../packages/framework/core/tools/amadeus-swarm.ts";

describe("resolveDriver — kimi harness (inherited contract)", () => {
  test("raw unset @ kimi → the subagent floor (the only default)", () => {
    expect(resolveDriver(undefined, "kimi")).toEqual({ kind: "selected", driver: "subagent" });
  });

  test("claude-ultra @ kimi → degraded to the subagent floor (not native)", () => {
    expect(resolveDriver("claude-ultra", "kimi")).toEqual({
      kind: "degraded",
      driver: "subagent",
      requested: "claude-ultra",
    });
  });

  test("codex-ultra @ kimi → degraded to the subagent floor (not native)", () => {
    expect(resolveDriver("codex-ultra", "kimi")).toEqual({
      kind: "degraded",
      driver: "subagent",
      requested: "codex-ultra",
    });
  });

  test("an unknown driver @ kimi → rejected, fail-closed (never a floor)", () => {
    expect(resolveDriver("kimi-ultra", "kimi")).toEqual({
      kind: "rejected",
      raw: "kimi-ultra",
      reason: "unknown-value",
    });
  });

  test("the empty string @ kimi → rejected, not treated as unset", () => {
    expect(resolveDriver("", "kimi")).toEqual({ kind: "rejected", raw: "", reason: "unknown-value" });
  });
});

describe("HARNESS_VALUES / DRIVER_VALUES vocabulary (BR-5)", () => {
  test("kimi is a harness member, spelled out (not derived)", () => {
    expect(HARNESS_VALUES).toEqual(["claude", "codex", "kiro", "kiro-ide", "kimi"]);
  });

  test("no kimi ultra driver exists — the driver vocabulary is untouched", () => {
    expect(DRIVER_VALUES).toEqual(["subagent", "claude-ultra", "codex-ultra"]);
  });
});

// --- handleResolve CLI seam (in-process, exit injected — the t233 idiom) ----

const SWARM_ENV = "AMADEUS_USE_SWARM";

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
  const prior = process.env[SWARM_ENV];
  let exitCode = -1;
  try {
    if (swarmValue === undefined) delete process.env[SWARM_ENV];
    else process.env[SWARM_ENV] = swarmValue;
    handleResolve(args, (code) => {
      exitCode = code;
    });
  } finally {
    if (prior === undefined) delete process.env[SWARM_ENV];
    else process.env[SWARM_ENV] = prior;
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
  return { exitCode, stdout, stderr };
}

describe("handleResolve — --harness kimi", () => {
  test("unset → stdout JSON selected subagent, exit 0", () => {
    const out = driveResolve(undefined, ["--harness", "kimi"]);
    expect(out.exitCode).toBe(0);
    expect(out.stderr).toEqual([]);
    expect(JSON.parse(out.stdout[0])).toEqual({ kind: "selected", driver: "subagent" });
  });

  test("claude-ultra @ kimi → degraded subagent (requested preserved), exit 0", () => {
    const out = driveResolve("claude-ultra", ["--harness", "kimi"]);
    expect(out.exitCode).toBe(0);
    expect(JSON.parse(out.stdout[0])).toEqual({
      kind: "degraded",
      driver: "subagent",
      requested: "claude-ultra",
    });
  });

  test("an unknown driver → fail-closed: exit 1, empty stdout, error lists the drivers", () => {
    const out = driveResolve("kimi-ultra", ["--harness", "kimi"]);
    expect(out.exitCode).toBe(1);
    expect(out.stdout).toEqual([]);
    const error = JSON.parse(out.stderr[0]).error as string;
    for (const value of DRIVER_VALUES) {
      expect(error).toContain(value);
    }
    expect(error).toContain(JSON.stringify("kimi-ultra"));
  });
});
