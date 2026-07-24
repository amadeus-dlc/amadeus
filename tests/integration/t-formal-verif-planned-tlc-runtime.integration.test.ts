import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FIXED_TLC_RESERVATION_BYTES,
  FsTlcToolchain,
  type FsTlcToolchainDependencies,
} from "../../scripts/formal-verif/fs-tlc-toolchain.ts";
import type {
  EnvSnapshot,
  TlcSpawnPlanner,
} from "../../scripts/formal-verif/run-model-check-domain.ts";
import { loadRunModelCheckSource } from "../../scripts/formal-verif/run-model-check-source.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  MAX_TLC_STREAM_BYTES,
} from "../../scripts/formal-verif/tlc-toolchain.ts";

const artifactBytes = new TextEncoder().encode("planned-runtime-artifact");
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("planned TLC filesystem runtime", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  test("rechecks the planner immediately before spawn and falls closed on drift", async () => {
    const root = mkdtempSync(join(tmpdir(), "planned-tlc-runtime-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    const scratch = join(root, "scratch");
    mkdirSync(workspace);
    mkdirSync(scratch);
    const modelPath = join(workspace, "FormalElection.tla");
    const cfgPath = join(workspace, "FormalElection.cfg");
    cpSync("specs/tla/FormalElection.tla", modelPath);
    cpSync("specs/tla/FormalElection.cfg", cfgPath);
    const source = loadRunModelCheckSource(modelPath, cfgPath);
    if (!source.ok) throw new Error(JSON.stringify(source.error));

    let mode: "drift" | "overflow" | "timeout" = "drift";
    let spawns = 0;
    const signals: string[] = [];
    const reservations = new Set<string>();
    const dependencies: FsTlcToolchainDependencies = {
      network: {
        request: async (input) => ({
          status: 200,
          headers: { "content-length": String(artifactBytes.byteLength) },
          connectedAtMs: input.startedAtMs,
          headersAtMs: input.startedAtMs,
          body: (async function* () { yield artifactBytes; })(),
        }),
      },
      digest: {
        createStreamingDigest: () => ({
          update: () => {},
          digest: () => FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
        }),
        digest: (path) => ({
          sha256: readFileSync(path).byteLength === artifactBytes.byteLength
            ? FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
            : sha256(new Uint8Array(readFileSync(path))),
          byteLength: readFileSync(path).byteLength,
        }),
      },
      reservation: {
        availableBytes: () => FIXED_TLC_RESERVATION_BYTES,
        reserve: (path) => { reservations.add(path); },
        release: (path) => { reservations.delete(path); },
        isReserved: (path) => reservations.has(path),
      },
      clock: { nowMs: () => 0, utcNow: () => "2026-07-24T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-start" },
      liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000001",
      jdkVersion: "OpenJDK 26.0.1",
      workspaceRoot: workspace,
      timer: {
        wait: () => mode === "timeout"
          ? Promise.resolve()
          : new Promise<void>(() => {}),
      },
      process: {
        spawn: () => {
          spawns += 1;
          let resolveStatus!: (status: { exitCode: number | null; signal: string | null }) => void;
          const status = new Promise<{ exitCode: number | null; signal: string | null }>(
            (resolve) => { resolveStatus = resolve; },
          );
          return {
            stdout: mode === "overflow"
              ? (async function* () {
                  yield new Uint8Array(MAX_TLC_STREAM_BYTES + 1);
                })()
              : (async function* () {})(),
            stderr: (async function* () {})(),
            wait: () => status,
            signalGroup: async (signal) => {
              signals.push(signal);
              if (signal === "SIGKILL") resolveStatus({ exitCode: null, signal });
            },
          };
        },
      },
      suiteRemainingMs: () => 130_000,
      evidencePublishReserveMs: 5_000,
    };
    const snapshot: EnvSnapshot = Object.freeze({
      kind: "DOCKER",
      plannerIdentity: "planner",
      imageRef: "image@sha256:a",
      jarSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    });
    const planner: TlcSpawnPlanner = {
      identity: "planner",
      buildArgv: (manifestArgv) => {
        if (mode === "drift") throw new Error("buildArgv must not run after drift");
        return ["/usr/bin/true", ...manifestArgv];
      },
      snapshotEnvironment: async () => ({ ok: true, value: snapshot }),
      verifyEnvironment: async () => mode === "drift"
        ? {
            ok: false,
            error: {
              kind: "InvocationError",
              code: "ENVIRONMENT_DRIFT",
              message: "injected Docker jar drift",
            },
          }
        : {
            ok: true,
            value: {
              schema: "amadeus.env-receipt.v1",
              runId: "00000000-0000-4000-8000-000000000001",
              planner: "planner",
              inspections: [],
            },
          },
    };
    const toolchain = new FsTlcToolchain(join(root, "cache"), dependencies);
    const acquired = await toolchain.acquire();
    if (!acquired.ok) throw new Error(JSON.stringify(acquired.error));
    const prepared = await toolchain.preparePlanned({
      artifact: acquired.value,
      modelReceipt: source.value.modelReceipt,
      modulePath: modelPath,
      cfgPath,
      subjectAlias: "run-model-check",
      deadlineMs: 120_000,
      runId: "00000000-0000-4000-8000-000000000001",
      scratchRoot: scratch,
      planner,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.value.manifestArgv).toContain("-metadir");
    expect(prepared.value.manifestArgv).toContain(
      join(prepared.value.scratchRoot, "states"),
    );

    expect(await toolchain.runPlanned(prepared.value)).toMatchObject({
      ok: false,
      error: { code: "ENVIRONMENT_DRIFT" },
    });
    expect(spawns).toBe(0);

    mode = "overflow";
    const overflow = await toolchain.runPlanned(prepared.value);
    expect(overflow.ok && overflow.value.exploration).toMatchObject({
      kind: "HARNESS_ERROR",
      reason: "OUTPUT_CAPACITY",
    });
    expect(signals.splice(0)).toEqual(["SIGTERM", "SIGKILL"]);

    mode = "timeout";
    const timeout = await toolchain.runPlanned(prepared.value);
    expect(timeout.ok && timeout.value.raw.timedOut).toBe(true);
    expect(timeout.ok && timeout.value.exploration).toMatchObject({
      kind: "HARNESS_ERROR",
      reason: "TIMEOUT",
    });
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
  });
});
