import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  _resetCloneIdForTests,
  auditCloneId,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  CloneIdDoctorBoundaryError,
  runCloneIdDoctorBoundaries,
} from "../helpers/clone-id-doctor-boundary-fixture.ts";

const scratchDirs: string[] = [];

afterEach(() => {
  _resetCloneIdForTests();
  for (const dir of scratchDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("clone-id doctor boundary fixture", () => {
  test("runs all boundaries in order and returns the observed values", () => {
    const events: string[] = [];
    const observation = runCloneIdDoctorBoundaries({
      resolveSymlink: () => {
        events.push("symlink-resolution");
        return "/tmp/target";
      },
      deriveCloneId: () => {
        events.push("clone-id-derivation");
        return "abc123";
      },
      launchProcess: () => {
        events.push("process-launch");
        return { status: 0 };
      },
      cleanup: () => {
        events.push("fixture-cleanup");
      },
    });

    expect(events).toEqual([
      "symlink-resolution",
      "clone-id-derivation",
      "process-launch",
      "fixture-cleanup",
    ]);
    expect(observation).toEqual({
      targetPath: "/tmp/target",
      cloneId: "abc123",
      processResult: { status: 0 },
    });
  });

  test.each([
    ["symlink-resolution", 0],
    ["clone-id-derivation", 1],
    ["process-launch", 2],
  ] as const)(
    "injects a deterministic failure at %s and still cleans up",
    (failingBoundary, failingIndex) => {
      const boundaries = [
        "symlink-resolution",
        "clone-id-derivation",
        "process-launch",
      ] as const;
      const events: string[] = [];
      const invoke = (boundary: (typeof boundaries)[number], value: unknown): unknown => {
        events.push(boundary);
        if (boundary === failingBoundary) throw new Error(`injected ${boundary}`);
        return value;
      };

      let failure: unknown;
      try {
        runCloneIdDoctorBoundaries({
          resolveSymlink: () => invoke("symlink-resolution", "/tmp/target") as string,
          deriveCloneId: () => invoke("clone-id-derivation", "abc123") as string,
          launchProcess: () => invoke("process-launch", { status: 0 }) as { status: number },
          cleanup: () => {
            events.push("fixture-cleanup");
          },
        });
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(CloneIdDoctorBoundaryError);
      expect((failure as CloneIdDoctorBoundaryError).boundary).toBe(failingBoundary);
      expect((failure as Error).message).toContain(`injected ${failingBoundary}`);
      expect(events).toEqual([...boundaries.slice(0, failingIndex + 1), "fixture-cleanup"]);
    },
  );

  test("injects a deterministic cleanup failure after successful process launch", () => {
    let failure: unknown;
    try {
      runCloneIdDoctorBoundaries({
        resolveSymlink: () => "/tmp/target",
        deriveCloneId: () => "abc123",
        launchProcess: () => ({ status: 0 }),
        cleanup: () => {
          throw new Error("injected fixture-cleanup");
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(CloneIdDoctorBoundaryError);
    expect((failure as CloneIdDoctorBoundaryError).boundary).toBe("fixture-cleanup");
    expect((failure as Error).message).toContain("injected fixture-cleanup");
  });

  test("a symlink clone id is stable across cache resets without changing target metadata", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "clone-id-boundary-unit-"));
    scratchDirs.push(projectDir);
    const workspace = join(projectDir, "amadeus");
    const external = join(projectDir, "external");
    const target = join(external, "sentinel.txt");
    mkdirSync(workspace, { recursive: true });
    mkdirSync(external, { recursive: true });
    writeFileSync(target, "CLONE_ID_SENTINEL\n", "utf-8");
    symlinkSync(target, join(workspace, ".amadeus-clone-id"));
    const before = statSync(target);

    const first = auditCloneId(projectDir);
    _resetCloneIdForTests();
    const second = auditCloneId(projectDir);
    const after = statSync(target);

    expect(first).toMatch(/^[a-f0-9]{12}$/);
    expect(second).toBe(first);
    expect({
      mode: after.mode,
      uid: after.uid,
      gid: after.gid,
      size: after.size,
      mtimeMs: after.mtimeMs,
      ino: after.ino,
    }).toEqual({
      mode: before.mode,
      uid: before.uid,
      gid: before.gid,
      size: before.size,
      mtimeMs: before.mtimeMs,
      ino: before.ino,
    });
  });
});
