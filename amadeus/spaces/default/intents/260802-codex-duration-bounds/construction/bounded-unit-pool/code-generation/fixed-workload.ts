// Reproducible fixed-workload capacity probe for the bounded Unit pool.
// It compares the legacy whole-batch contract with the canonical cap=2 pool
// using the same four independent synthetic workers and timing procedure.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key && value) args.set(key, value);
}

const mode = args.get("--mode");
const repo = args.get("--repo");
if ((mode !== "control" && mode !== "treatment") || !repo) {
  throw new Error("usage: fixed-workload.ts --mode <control|treatment> --repo <checkout>");
}

const units = ["u0", "u1", "u2", "u3"] as const;
const workerDurationMs = 20;
const warmupCount = 3;
const measuredCount = 20;
const workload = {
  id: "codex-duration-bounds/four-independent-units/v1",
  units: units.map((unitId) => ({ unitId, dependsOn: [] })),
  workerDurationMs,
  warmupCount,
  measuredCount,
  outcome: "succeeded",
};
const inputDigest = `sha256:${createHash("sha256").update(JSON.stringify(workload)).digest("hex")}`;

const sleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

interface RunResult {
  readonly durationMs: number;
  readonly attempts: Readonly<Record<string, number>>;
  readonly maximumActive: number;
  readonly queueOrder: readonly string[];
  readonly terminationReason: string;
  readonly forbiddenEventFields: readonly string[];
}

function forbiddenEventFields(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) return value.flatMap((entry, index) => forbiddenEventFields(entry, `${path}[${index}]`));
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    const own = /^(prompt|credential|raw[_-]?output)$/i.test(key) ? [`${path}.${key}`] : [];
    return [...own, ...forbiddenEventFields(entry, `${path}.${key}`)];
  });
}

async function runControl(): Promise<RunResult> {
  const swarmSource = readFileSync(join(repo, "packages/framework/core/tools/amadeus-swarm.ts"), "utf8");
  if (!swarmSource.includes("units.length")) {
    throw new Error("control checkout does not expose the legacy whole-batch concurrency default");
  }
  if (existsSync(join(repo, "packages/framework/core/tools/amadeus-unit-pool.ts"))) {
    throw new Error("control checkout unexpectedly contains the bounded Unit pool");
  }

  let active = 0;
  let maximumActive = 0;
  const queueOrder: string[] = [];
  const startedAt = performance.now();
  await Promise.all(units.map(async (unitId) => {
    queueOrder.push(unitId);
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await sleep(workerDurationMs);
    active -= 1;
  }));
  return {
    durationMs: performance.now() - startedAt,
    attempts: Object.fromEntries(units.map((unitId) => [unitId, 1])),
    maximumActive,
    queueOrder,
    terminationReason: "completed",
    forbiddenEventFields: [],
  };
}

async function runTreatment(): Promise<RunResult> {
  const runtimePath = join(repo, "packages/framework/core/tools/amadeus-unit-pool-runtime.ts");
  if (!existsSync(runtimePath)) throw new Error("treatment checkout does not contain the bounded Unit pool");
  const runtime = await import(runtimePath);
  const repository = runtime.createMemoryUnitPoolRepository();
  const coordinator = runtime.createUnitPoolCoordinator(repository);
  coordinator.initialEnqueue({
    idempotencyKey: "init",
    batchId: "fixed-workload",
    cap: 2,
    units: workload.units,
  });

  let active = 0;
  let maximumActive = 0;
  let ordinal = 0;
  const queueOrder: string[] = [];
  const workers = new Set<Promise<void>>();
  const launchedAttempts = new Set<string>();
  const startedAt = performance.now();

  while (coordinator.readProjection("fixed-workload").phase !== "terminal") {
    while (true) {
      const acquired = coordinator.acquire({
        idempotencyKey: `acquire-${ordinal}`,
        batchId: "fixed-workload",
      });
      if (!acquired.ok) break;
      ordinal += 1;
    }
    const pendingAttempts = coordinator.readProjection("fixed-workload").active
      .filter((attempt: { readonly attemptId: string }) => !launchedAttempts.has(attempt.attemptId));
    for (const attempt of pendingAttempts) {
      launchedAttempts.add(attempt.attemptId);
      queueOrder.push(attempt.unitId);
      coordinator.confirmDispatch({
        idempotencyKey: `confirm-${attempt.attemptId}`,
        batchId: "fixed-workload",
        attemptId: attempt.attemptId,
        nativeHandle: attempt.unitId,
      });
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      const worker = sleep(workerDurationMs).then(() => {
        coordinator.settleRelease({
          idempotencyKey: `settle-${attempt.attemptId}`,
          batchId: "fixed-workload",
          attemptId: attempt.attemptId,
          outcome: "succeeded",
        });
        active -= 1;
      });
      workers.add(worker);
      void worker.finally(() => workers.delete(worker));
    }
    if (workers.size > 0) await Promise.race(workers);
  }
  await Promise.all(workers);
  const projection = coordinator.readProjection("fixed-workload");
  return {
    durationMs: performance.now() - startedAt,
    attempts: projection.attemptCounts,
    maximumActive,
    queueOrder,
    terminationReason: projection.result ?? "non-terminal",
    forbiddenEventFields: forbiddenEventFields(repository.readEventSets()),
  };
}

const allRuns: RunResult[] = [];
for (let index = 0; index < warmupCount + measuredCount; index += 1) {
  allRuns.push(mode === "control" ? await runControl() : await runTreatment());
}
const measured = allRuns.slice(warmupCount);
const durations = measured.map((run) => run.durationMs).sort((left, right) => left - right);
const medianDurationMs = durations[Math.floor(durations.length / 2)] ?? null;
const p95DurationMs = durations[Math.ceil(durations.length * 0.95) - 1] ?? null;
const representative = measured[0];

console.log(JSON.stringify({
  schemaVersion: 1,
  mode,
  workloadId: workload.id,
  inputDigest,
  warmupCount,
  measuredCount,
  medianDurationMs,
  p95DurationMs,
  attempts: representative?.attempts ?? {},
  maximumActive: Math.max(...measured.map((run) => run.maximumActive)),
  queueOrder: representative?.queueOrder ?? [],
  terminationReason: representative?.terminationReason ?? "missing",
  forbiddenEventFields: [...new Set(measured.flatMap((run) => run.forbiddenEventFields))],
}, null, 2));
