// covers: module:amadeus-swarm-driver-supervisor, requirement:NFR-03, requirement:NFR-04
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  armRun,
  consumeArm,
  createPlannedRun,
  executeArmedProcess,
  observeProcessIdentity,
  parseArmedProcessProgress,
  readRunIdentity,
  sameProcess,
  writeRunIdentity,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-supervisor.ts";
import { digestValue } from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "amadeus-supervisor-"));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) rmSync(value, { recursive: true, force: true });
});

describe("t230 armed process supervisor", () => {
  test("observes a hashed identity for the current macOS/Linux process", () => {
    const identity = observeProcessIdentity(process.pid);
    expect(identity.type).toBe("ok");
    if (identity.type === "ok") {
      expect(identity.value.startTokenHash).toHaveLength(64);
      expect(identity.value.pid).toBe(process.pid);
    }
  });

  test("rejects Windows instead of inferring liveness", () => {
    expect(observeProcessIdentity(process.pid, "win32")).toEqual({
      type: "err",
      error: { code: "PLATFORM_UNSUPPORTED" },
    });
  });

  test("confines identity and arm files to the attempt directory", () => {
    const dir = root();
    expect(
      createPlannedRun({
        rootDir: dir,
        runId: "run-1",
        identityPath: join(dir, "..", "identity.json"),
        armPath: join(dir, "arm.json"),
        armDeadline: "2026-07-14T00:00:30.000Z",
        armCoordinates: {},
      }),
    ).toEqual({ type: "err", error: { code: "PATH_ESCAPE" } });
  });

  test("materializes identity before accepting a one-time arm", () => {
    const dir = root();
    const coordinates = {
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
    };
    const planResult = createPlannedRun({
      rootDir: dir,
      runId: "run-1",
      identityPath: join(dir, "identity.json"),
      armPath: join(dir, "arm.json"),
      armDeadline: "2026-07-14T00:00:30.000Z",
      armCoordinates: coordinates,
    });
    if (planResult.type === "err") throw new Error("fixture failed");
    expect(readRunIdentity(planResult.value).type).toBe("err");
    const processIdentity = observeProcessIdentity(process.pid);
    if (processIdentity.type === "err") throw new Error("identity unavailable");
    const identity = writeRunIdentity(planResult.value, processIdentity.value);
    const read = readRunIdentity(planResult.value);
    expect(read.type).toBe("ok");
    const receipt = {
      schemaVersion: 1 as const,
      runId: "run-1",
      ...coordinates,
      identityDigest: digestValue(identity),
    };
    expect(armRun(planResult.value, identity, receipt).type).toBe("ok");
    expect(armRun(planResult.value, identity, receipt)).toEqual({
      type: "err",
      error: { code: "ARM_ALREADY_CONSUMED" },
    });
    expect(consumeArm(planResult.value, identity).type).toBe("ok");
    expect(consumeArm(planResult.value, identity)).toEqual({
      type: "err",
      error: { code: "ARM_ALREADY_CONSUMED" },
    });
  });

  test("rejects a replay bound to another identity", () => {
    const dir = root();
    const coordinates = {
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
    };
    const plan = createPlannedRun({
      rootDir: dir,
      runId: "run-1",
      identityPath: join(dir, "identity.json"),
      armPath: join(dir, "arm.json"),
      armDeadline: "2026-07-14T00:00:30.000Z",
      armCoordinates: coordinates,
    });
    const observed = observeProcessIdentity(process.pid);
    if (plan.type === "err" || observed.type === "err") throw new Error("fixture failed");
    const identity = writeRunIdentity(plan.value, observed.value);
    const altered = { ...identity, process: { ...identity.process, startTokenHash: "different" } };
    const receipt = {
      schemaVersion: 1 as const,
      runId: "run-1",
      ...coordinates,
      identityDigest: digestValue(altered),
    };
    expect(armRun(plan.value, identity, receipt)).toEqual({
      type: "err",
      error: { code: "ARM_INVALID" },
    });
    expect(sameProcess(identity.process, altered.process)).toBeFalse();
  });

  test("rejects secret-like arm coordinates without persisting the value", () => {
    const dir = root();
    const result = createPlannedRun({
      rootDir: dir,
      runId: "run-1",
      identityPath: join(dir, "identity.json"),
      armPath: join(dir, "arm.json"),
      armDeadline: "2026-07-14T00:00:30.000Z",
      armCoordinates: { providerToken: "canary-secret" },
    });
    expect(result).toEqual({ type: "err", error: { code: "ARM_INVALID" } });
    expect(JSON.stringify(result)).not.toContain("canary-secret");
  });

  test("establishes identity and consumes an arm before launching the child", async () => {
    const phases: string[] = [];
    const result = await executeArmedProcess({
      rootDir: root(),
      runId: "run-success",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 7,
      executable: process.execPath,
      args: ["-e", "console.log('armed-child')"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "" },
      stdin: "closed",
      timeoutMs: 5_000,
      onProgress: (progress) => {
        expect(parseArmedProcessProgress(progress).type).toBe("ok");
        phases.push(progress.phase);
      },
    });
    expect(result.type).toBe("ok");
    if (result.type === "ok") {
      expect(result.value.exitCode).toBe(0);
      expect(result.value.stdout.trim()).toBe("armed-child");
      expect(result.value.identity.startTokenHash).toHaveLength(64);
    }
    expect(phases).toEqual(["planned", "identity-established", "arm-approved", "armed", "terminal"]);
  });

  test("does not arm or launch the child when arm approval persistence fails", async () => {
    const dir = root();
    const marker = join(dir, "child-started");
    const phases: string[] = [];
    const result = await executeArmedProcess({
      rootDir: dir,
      runId: "run-progress-failure",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
      executable: process.execPath,
      args: ["-e", "await Bun.write(process.env.MARKER, 'started')"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "", MARKER: marker },
      stdin: "closed",
      timeoutMs: 5_000,
      onProgress: (progress) => {
        phases.push(progress.phase);
        if (progress.phase === "arm-approved") throw new Error("injected progress failure");
      },
    });
    expect(result).toEqual({ type: "err", error: { code: "PROGRESS_PERSIST_FAILED" } });
    expect(phases).toEqual(["planned", "identity-established", "arm-approved"]);
    expect(existsSync(marker)).toBeFalse();
  });

  test("closes child stdin instead of inheriting the caller stream", async () => {
    const result = await executeArmedProcess({
      rootDir: root(),
      runId: "run-closed-stdin",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
      executable: process.execPath,
      args: ["-e", "console.log((await Bun.stdin.text()).length)"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "" },
      stdin: "closed",
      timeoutMs: 5_000,
    });
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.stdout.trim()).toBe("0");
  });

  test("terminates the exact process group when the armed child times out", async () => {
    const result = await executeArmedProcess({
      rootDir: root(),
      runId: "run-timeout",
      executionId: "exec",
      attemptId: "attempt",
      planDigest: "plan",
      waveDigest: "wave",
      fencingToken: 1,
      executable: process.execPath,
      args: ["-e", "await Bun.sleep(10_000)"],
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "" },
      stdin: "closed",
      timeoutMs: 50,
    });
    expect(result).toEqual({ type: "err", error: { code: "PROCESS_TIMEOUT" } });
  });
});
