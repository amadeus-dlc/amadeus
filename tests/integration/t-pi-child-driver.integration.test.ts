import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, copyFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createExecutionLifecycleCoordinator,
  createMemoryExecutionRepository,
} from "../../packages/framework/core/tools/amadeus-execution-lifecycle.ts";
import { executePiChild } from "../../packages/framework/harness/pi/drivers/amadeus-pi-driver.ts";
import { createPiReplayStore } from "../../packages/framework/harness/pi/drivers/amadeus-pi-replay-store.ts";

const fixtureSource = fileURLToPath(new URL("../fixtures/pi-driver/fake-pi.ts", import.meta.url));
const liveChildren: ReturnType<typeof Bun.spawn>[] = [];

afterEach(() => {
  for (const child of liveChildren.splice(0)) {
    try {
      child.kill("SIGKILL");
    } catch {
      // Already reaped.
    }
  }
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "amadeus-pi-driver-"));
  const fakePi = join(root, "pi");
  copyFileSync(fixtureSource, fakePi);
  chmodSync(fakePi, 0o700);
  const repository = createMemoryExecutionRepository();
  const lifecycle = createExecutionLifecycleCoordinator({
    repository,
    clock: { wallNow: () => new Date().toISOString(), monotonicNowMs: () => performance.now() },
    projectionSink: {
      projectRequired(eventSet) {
        return {
          digest: eventSet.digest,
          stateProjectionReceiptId: `state-${eventSet.digest}`,
          runtimeProjectionReceiptId: `runtime-${eventSet.digest}`,
        };
      },
      rebuildRequired() {
        throw new Error("not used");
      },
      projectTelemetry() {
        return { projected: false };
      },
    },
  });
  const parent = lifecycle.startOperation({
    idempotencyKey: "root",
    input: {
      intentUuid: "intent",
      stageSlug: "code-generation",
      stageInstanceId: "pi-driver",
      revision: 1,
      kind: "stage",
      origin: { stage: "code-generation", agent: "amadeus-developer-agent", tool: "test" },
    },
  });
  if (!parent.ok) throw new Error("parent start failed");
  const base = {
    schemaVersion: 1,
    role: "swarm",
    projectDir: root,
    parentExecution: {
      operationId: parent.value.operation.operationId,
      rootOperationId: parent.value.operation.rootOperationId,
    },
    childOrdinal: 1,
    timeoutMs: 2_000,
    outputLimitBytes: 1_024,
  } as const;
  return { root, fakePi, lifecycle, base };
}

describe("Pi child driver process boundary", () => {
  test("runs one Pi child, extracts assistant text only, and terminal replay spawns zero children", async () => {
    const { root, fakePi, lifecycle, base } = fixture();
    const count = join(root, "count.txt");
    const request = { ...base, deliveryKey: "success-1", prompt: `success:${count}` };
    const options = { runtimeDir: join(root, "runtime"), piExecutable: fakePi, lifecycle };
    expect(await executePiChild(request, options)).toEqual({ kind: "succeeded", output: "OK", replayed: false });
    expect(await executePiChild(request, options)).toEqual({ kind: "succeeded", output: "OK", replayed: true });
    expect(readFileSync(count, "utf8").trim().split("\n")).toHaveLength(1);
  });

  test("passes an explicit non-secret provider identifier to the Pi RPC child", async () => {
    const { root, fakePi, lifecycle, base } = fixture();
    const result = await executePiChild(
      { ...base, deliveryKey: "provider-1", prompt: "provider-check" },
      {
        runtimeDir: join(root, "runtime"),
        piExecutable: fakePi,
        lifecycle,
        providerId: "openai-codex",
      },
    );

    expect(result).toEqual({ kind: "succeeded", output: "OK", replayed: false });
  });

  test("timeout and cancellation remain terminal failures and reap the guardian group", async () => {
    const timed = fixture();
    const timedResult = await executePiChild(
      { ...timed.base, deliveryKey: "timeout-1", prompt: "hang", timeoutMs: 100 },
      { runtimeDir: join(timed.root, "runtime"), piExecutable: timed.fakePi, lifecycle: timed.lifecycle },
    );
    expect(timedResult.kind).toBe("timed-out");

    const cancelled = fixture();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    const cancelledResult = await executePiChild(
      { ...cancelled.base, deliveryKey: "cancel-1", prompt: "cancel" },
      {
        runtimeDir: join(cancelled.root, "runtime"),
        piExecutable: cancelled.fakePi,
        lifecycle: cancelled.lifecycle,
        abortSignal: controller.signal,
      },
    );
    expect(cancelledResult.kind).toBe("cancelled");
  });

  test("pending recovery quarantines accepted identities without signalling a reused PID", async () => {
    const { root } = fixture();
    const foreign = Bun.spawn([process.execPath, "-e", "setInterval(() => {}, 1000)"], { stdout: "ignore", stderr: "ignore" });
    liveChildren.push(foreign);
    const store = createPiReplayStore(join(root, "runtime"));
    const key = "pid-reuse" as Parameters<typeof store.reserve>[0];
    expect(store.reserve(key, "fingerprint").kind).toBe("reserved");
    expect(store.acceptGuardian(key, "fingerprint", {
      pid: foreign.pid,
      pgid: foreign.pid,
      publicKey: "untrusted-old-identity",
      executableSnapshotDigest: "snapshot",
    })).toBe(true);
    expect(store.recoverPending(1)[0]?.status).toBe("quarantined");
    expect(() => process.kill(foreign.pid, 0)).not.toThrow();
    expect(existsSync(join(root, "runtime", "records"))).toBe(true);
  });
});
