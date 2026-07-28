// t344 — U1 `/amadeus plugin <verb>` delegation, pure surface.
// Layer: unit (fake spawn only — no fs, no child process; fs-tests-integration-first).
// Pins the three contract faces of handlePluginDelegate: the shape of the
// composed command, verbatim pass-through of every remaining argument, and the
// child exit code returned unchanged. The real-spawn crossing lives in the
// integration sibling t345.
import { describe, expect, test } from "bun:test";
import {
  handlePluginDelegate,
  type PluginDelegateDeps,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

/** Records the command it was handed and returns a caller-chosen exit code. */
function recordingDeps(exitCode: number): {
  deps: PluginDelegateDeps;
  calls: string[][];
} {
  const calls: string[][] = [];
  const deps: PluginDelegateDeps = {
    spawn: (cmd: readonly string[]): number => {
      calls.push([...cmd]);
      return exitCode;
    },
  };
  return { deps, calls };
}

describe("t344 handlePluginDelegate — composed command shape", () => {
  test("runs the plugin CLI through bun", () => {
    const { deps, calls } = recordingDeps(0);
    handlePluginDelegate(["status"], deps);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("bun");
  });

  test("targets amadeus-plugin.ts next to the utility tool", () => {
    const { deps, calls } = recordingDeps(0);
    handlePluginDelegate(["status"], deps);
    expect(calls[0][1].endsWith("/amadeus-plugin.ts")).toBe(true);
  });

  test("appends the verb after the script path", () => {
    const { deps, calls } = recordingDeps(0);
    handlePluginDelegate(["status"], deps);
    expect(calls[0].slice(2)).toEqual(["status"]);
  });

  test("spawns exactly once (no retry)", () => {
    const { deps, calls } = recordingDeps(1);
    handlePluginDelegate(["doctor"], deps);
    expect(calls).toHaveLength(1);
  });
});

describe("t344 handlePluginDelegate — verbatim argument pass-through", () => {
  test("forwards flags and their values untouched", () => {
    const { deps, calls } = recordingDeps(0);
    handlePluginDelegate(["compose", "--project-root", "/tmp/host"], deps);
    expect(calls[0].slice(2)).toEqual(["compose", "--project-root", "/tmp/host"]);
  });

  test("forwards an unknown verb without validating it", () => {
    const { deps, calls } = recordingDeps(2);
    handlePluginDelegate(["not-a-verb", "--weird"], deps);
    expect(calls[0].slice(2)).toEqual(["not-a-verb", "--weird"]);
  });

  test("forwards an empty argument list unchanged", () => {
    const { deps, calls } = recordingDeps(2);
    handlePluginDelegate([], deps);
    expect(calls[0].slice(2)).toEqual([]);
  });

  test("preserves argument order and duplicates", () => {
    const { deps, calls } = recordingDeps(0);
    handlePluginDelegate(["drop", "tla", "--project-root", "a", "--project-root", "b"], deps);
    expect(calls[0].slice(2)).toEqual([
      "drop",
      "tla",
      "--project-root",
      "a",
      "--project-root",
      "b",
    ]);
  });
});

describe("t344 handlePluginDelegate — exit code is returned unchanged", () => {
  test.each([0, 1, 2] as const)("child exit %d passes through", (code) => {
    const { deps } = recordingDeps(code);
    expect(handlePluginDelegate(["status"], deps)).toBe(code);
  });
});
