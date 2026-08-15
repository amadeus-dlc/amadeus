import { scaleTestTime } from "../lib/test-time-factor.ts";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const fixtureRoots = new Set<string>();

afterEach(() => {
  for (const child of liveChildren.splice(0)) {
    try {
      child.kill("SIGKILL");
    } catch {
      // Already reaped.
    }
  }
  for (const root of fixtureRoots) rmSync(root, { recursive: true, force: true });
  fixtureRoots.clear();
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "amadeus-pi-driver-"));
  fixtureRoots.add(root);
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
    timeoutMs: scaleTestTime(2_000),
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
    expect(await executePiChild(request, options)).toMatchObject({
      kind: "succeeded",
      output: "OK",
      replayed: false,
      providerId: "openai-codex",
      modelId: "gpt-5.6-luna",
    });
    expect(await executePiChild(request, options)).toMatchObject({ kind: "succeeded", output: "OK", replayed: true });
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
        modelId: "gpt-5.6-luna",
      },
    );

    expect(result).toMatchObject({ kind: "succeeded", output: "OK", replayed: false });
  });

  test("launches a persona on the model its charter pins, outranking the driver default", async () => {
    const { root, fakePi, lifecycle, base } = fixture();
    mkdirSync(join(root, ".pi", "agents"), { recursive: true });
    writeFileSync(
      join(root, ".pi", "agents", "amadeus-architecture-reviewer-agent.md"),
      "---\nname: amadeus-architecture-reviewer-agent\nmodel: sonnet\n---\n\nreviewer charter\n",
    );

    expect(await executePiChild(
      {
        ...base,
        deliveryKey: "persona-1",
        persona: "amadeus-architecture-reviewer-agent",
        prompt: "expect-model:claude-sonnet-5",
      },
      { runtimeDir: join(root, "runtime"), piExecutable: fakePi, lifecycle, modelId: "gpt-5.6-luna" },
    )).toMatchObject({ kind: "succeeded", output: "OK", replayed: false });
  });

  test("fails dispatch closed rather than defaulting the model when a persona pin is unresolvable", async () => {
    const { root, fakePi, lifecycle, base } = fixture();
    mkdirSync(join(root, ".pi", "agents"), { recursive: true });
    writeFileSync(
      join(root, ".pi", "agents", "amadeus-unknown-tier-agent.md"),
      "---\nname: amadeus-unknown-tier-agent\nmodel: haiku\n---\n",
    );
    const options = { runtimeDir: join(root, "runtime"), piExecutable: fakePi, lifecycle };

    // No charter on any harness surface.
    expect(await executePiChild(
      { ...base, deliveryKey: "persona-missing", persona: "amadeus-absent-agent", prompt: "success:" },
      options,
    )).toMatchObject({ kind: "dispatch-not-started", reason: "persona-model-unresolved" });

    // Charter exists but pins a tier outside the closed alias table.
    expect(await executePiChild(
      { ...base, deliveryKey: "persona-unknown-tier", persona: "amadeus-unknown-tier-agent", prompt: "success:" },
      options,
    )).toMatchObject({ kind: "dispatch-not-started", reason: "persona-model-unresolved" });
  });

  test("lets Pi route the provider family to an account-specific model and records the actual selection", async () => {
    const { root, fakePi, lifecycle, base } = fixture();
    const result = await executePiChild(
      { ...base, deliveryKey: "routing-1", prompt: "routing-check" },
      {
        runtimeDir: join(root, "runtime"),
        piExecutable: fakePi,
        lifecycle,
        providerId: "openai-codex",
      },
    );

    expect(result).toMatchObject({
      kind: "succeeded",
      output: "OK",
      providerId: "openai-codex-account-2",
      modelId: "gpt-5.6-sol",
    });
  });

  test("closes a settled one-shot RPC child instead of timing out", async () => {
    const { root, fakePi, lifecycle, base } = fixture();
    const result = await executePiChild(
      { ...base, deliveryKey: "settled-1", prompt: "wait-for-eof", timeoutMs: scaleTestTime(1_000) },
      { runtimeDir: join(root, "runtime"), piExecutable: fakePi, lifecycle },
    );

    expect(result.kind).toBe("succeeded");
  });

  // #3040: the timeout raced every run, settled or not, so a child that had already answered and
  // was merely slow to close came back as timed-out. The close has its own deadline
  // (timeoutMs + the cleanup wait); the linger below lands between the two.
  test("a settled child whose close lags past the timeout is not timed out", async () => {
    const { root, fakePi, lifecycle, base } = fixture();
    // The child settles as soon as it starts and then holds itself open for a further timeoutMs,
    // so its close lands after the timeout has fired and inside the cleanup budget.
    const result = await executePiChild(
      {
        ...base,
        deliveryKey: "settled-late-close-1",
        prompt: `linger:${base.timeoutMs}`,
      },
      { runtimeDir: join(root, "runtime"), piExecutable: fakePi, lifecycle },
    );

    expect(result).toMatchObject({ kind: "succeeded", output: "OK" });
  }, scaleTestTime(30_000));

  test("timeout remains a terminal failure and reaps the guardian group", async () => {
    const timed = fixture();
    const timedResult = await executePiChild(
      { ...timed.base, deliveryKey: "timeout-1", prompt: "hang", timeoutMs: 100 },
      { runtimeDir: join(timed.root, "runtime"), piExecutable: timed.fakePi, lifecycle: timed.lifecycle },
    );
    expect(timedResult.kind).toBe("timed-out");
  });

  test("cancellation remains a terminal failure and reaps the guardian group", async () => {
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

  test("pending recovery applies its limit after filtering and preserves earlier successes", () => {
    const { root } = fixture();
    const runtimeDir = join(root, "runtime");
    const store = createPiReplayStore(runtimeDir);
    const keys = (["recover:a", "recover:b", "recover:c"].sort((left, right) =>
      createHash("sha256").update(left).digest("hex").localeCompare(createHash("sha256").update(right).digest("hex")))
    ) as Parameters<typeof store.reserve>[0][];
    for (const key of keys) expect(store.reserve(key, "fingerprint").kind).toBe("reserved");
    expect(store.closeNoLaunch(keys[0], "fingerprint", "already-terminal")).toBe(true);

    const limited = store.recoverPending(1);
    expect(limited.map((record) => record.deliveryKey)).toEqual([keys[1]]);

    const corruptPath = join(runtimeDir, "records", `${createHash("sha256").update(keys[1]).digest("hex")}.json`);
    writeFileSync(corruptPath, "not-json\n");
    const remaining = store.recoverPending(2);
    expect(remaining.map((record) => record.deliveryKey)).toEqual([keys[2]]);
  });

  test("a malformed delivery record fails closed across every replay transition", () => {
    const { root } = fixture();
    const runtimeDir = join(root, "runtime");
    const store = createPiReplayStore(runtimeDir);
    const key = "malformed-record" as Parameters<typeof store.reserve>[0];
    expect(store.reserve(key, "fingerprint").kind).toBe("reserved");

    const recordPath = join(runtimeDir, "records", `${createHash("sha256").update(key).digest("hex")}.json`);
    writeFileSync(recordPath, "not-json\n");

    expect(store.reserve(key, "fingerprint").kind).toBe("quarantined");
    expect(store.acceptGuardian(key, "fingerprint", {
      pid: process.pid,
      pgid: process.pid,
      publicKey: "unused",
      executableSnapshotDigest: "unused",
    })).toBe(false);
    expect(store.markRunning(key, "fingerprint")).toBe(false);
    expect(store.commitTerminal(key, "fingerprint", { kind: "failed", reason: "unused" }, "")).toBe(false);

    writeFileSync(recordPath, "{}\n");
    expect(store.reserve(key, "fingerprint").kind).toBe("quarantined");
  });

  test("a conflicting fingerprint quarantines the existing delivery", () => {
    const { root } = fixture();
    const store = createPiReplayStore(join(root, "runtime"));
    const key = "conflicting-fingerprint" as Parameters<typeof store.reserve>[0];

    expect(store.reserve(key, "first").kind).toBe("reserved");
    expect(store.reserve(key, "second").kind).toBe("conflict");
    expect(store.reserve(key, "first").kind).toBe("quarantined");
  });

  test("vault corruption and key loss never replay plaintext", () => {
    for (const [suffix, sealed] of [["short", Buffer.alloc(1)], ["bad-tag", Buffer.alloc(28)]] as const) {
      const { root } = fixture();
      const runtimeDir = join(root, "runtime");
      const store = createPiReplayStore(runtimeDir);
      const key = `vault-${suffix}` as Parameters<typeof store.reserve>[0];
      const leaf = createHash("sha256").update(key).digest("hex");
      expect(store.reserve(key, "fingerprint").kind).toBe("reserved");
      expect(store.commitTerminal(key, "fingerprint", { kind: "succeeded", reason: "done" }, "secret")).toBe(true);

      const recordPath = join(runtimeDir, "records", `${leaf}.json`);
      const record = JSON.parse(readFileSync(recordPath, "utf8"));
      record.terminal.vaultDigest = createHash("sha256").update(sealed).digest("hex");
      writeFileSync(recordPath, `${JSON.stringify(record)}\n`);
      writeFileSync(join(runtimeDir, "vault", `${leaf}.aead`), sealed);

      expect(store.reserve(key, "fingerprint").kind).toBe("vault-tampered");
    }

    const { root } = fixture();
    const runtimeDir = join(root, "runtime");
    const store = createPiReplayStore(runtimeDir);
    const key = "vault-key-loss" as Parameters<typeof store.reserve>[0];
    expect(store.reserve(key, "fingerprint").kind).toBe("reserved");
    expect(store.commitTerminal(key, "fingerprint", { kind: "succeeded", reason: "done" }, "secret")).toBe(true);
    rmSync(join(runtimeDir, "vault.key"));
    expect(store.reserve(key, "fingerprint").kind).toBe("key-loss");
  });

  test("unsafe record permissions and a missing record directory fail closed", () => {
    const { root } = fixture();
    const runtimeDir = join(root, "runtime");
    const store = createPiReplayStore(runtimeDir);
    const key = "unsafe-record" as Parameters<typeof store.reserve>[0];
    expect(store.reserve(key, "fingerprint").kind).toBe("reserved");
    const recordPath = join(runtimeDir, "records", `${createHash("sha256").update(key).digest("hex")}.json`);
    chmodSync(recordPath, 0o644);
    expect(store.reserve(key, "fingerprint").kind).toBe("visibility-failure");

    rmSync(join(runtimeDir, "records"), { recursive: true });
    expect(store.recoverPending(1)).toEqual([]);
  });

  test("filesystem write failures remain closed", () => {
    if (process.platform === "win32") return;

    const conflict = fixture();
    const conflictRuntime = join(conflict.root, "runtime");
    const conflictStore = createPiReplayStore(conflictRuntime);
    const conflictKey = "conflict-write-failure" as Parameters<typeof conflictStore.reserve>[0];
    expect(conflictStore.reserve(conflictKey, "first").kind).toBe("reserved");
    chmodSync(join(conflictRuntime, "records"), 0o500);
    try {
      expect(conflictStore.reserve(conflictKey, "second").kind).toBe("visibility-failure");
    } finally {
      chmodSync(join(conflictRuntime, "records"), 0o700);
    }

    const keyFailure = fixture();
    const keyRuntime = join(keyFailure.root, "runtime");
    const keyStore = createPiReplayStore(keyRuntime);
    const key = "key-write-failure" as Parameters<typeof keyStore.reserve>[0];
    expect(keyStore.reserve(key, "fingerprint").kind).toBe("reserved");
    chmodSync(keyRuntime, 0o500);
    try {
      expect(keyStore.commitTerminal(key, "fingerprint", { kind: "succeeded", reason: "done" }, "secret")).toBe(false);
    } finally {
      chmodSync(keyRuntime, 0o700);
    }
  });
});
