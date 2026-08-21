// covers: file:packages/framework/core/tools/amadeus-reviewer-runtime.ts
// size: medium
//
// Issue #3415. After a quality-repair `repair` ruling that lands ON the spent
// review-iteration budget, §12a had no legal way to record the re-review:
// iteration+1 was refused by the directive limit and a same-iteration
// re-record was refused by the Review projection immutability check. This
// pins the repair-funded route that closes it, and pins that the two old
// refusals still hold everywhere the route does not apply.
//
// The route is bound to DURABLE repair evidence: the fingerprint the carrier
// names must be a `QUALITY_SNAPSHOT_OBSERVED` snapshot with unresolved
// obligations, recorded for THIS stage instance in the intent record's audit
// shards, and each fingerprint funds exactly one iteration. The fixture's
// audit row is validated by the framework's own decoder and re-read by the
// framework's own audit reader, so a row this test accepts is a row the
// production writer could have produced.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_INTENT_UUID,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  FIXTURE_CLONE_ID,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  decodeQualityRepairTransaction,
  readQualityRepairTransactionsFromAudit,
} from "../../packages/framework/core/tools/amadeus-quality-repair-replay.ts";
import {
  __resetGraphCache,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import {
  _resetStageGraphForTests,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleAdvance } from "../../packages/framework/core/tools/amadeus-state.ts";
import { runReviewerCommand } from "../../packages/framework/core/tools/amadeus-reviewer-runtime.ts";
import { scaleTestTime } from "../lib/test-time-factor.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const REVIEWER_TOOL = join(
  REPO_ROOT,
  "packages/framework/core/tools/amadeus-reviewer-runtime.ts",
);
const STAGE_GRAPH = join(REPO_ROOT, "dist/claude/.claude/tools/data/stage-graph.json");
const SCOPE_GRID = join(REPO_ROOT, "dist/claude/.claude/tools/data/scope-grid.json");

const UNIT = "repair-unit";
const STAGE = "functional-design";
const REVIEWER = "amadeus-architecture-reviewer-agent";
const STAGE_INSTANCE = `${STAGE}:${UNIT}`;
const FINGERPRINT = `sha256:${"5d30e8f1".repeat(8)}`;
const OTHER_FINGERPRINT = `sha256:${"aa11bb22".repeat(8)}`;
const ARTIFACTS = ["business-logic-model", "business-rules", "domain-entities"];

const projects: string[] = [];

afterEach(() => {
  while (projects.length > 0) cleanupTestProject(projects.pop());
  _resetStageGraphForTests();
  __resetGraphCache();
});

interface Fixture {
  root: string;
  directive: Record<string, unknown>;
  primary: string;
}

const RECORD = `amadeus/spaces/${DEFAULT_SPACE}/intents/${DEFAULT_RECORD_DIR}`;

function fixture(): Fixture {
  const root = createTestProject();
  projects.push(root);
  const unitDir = `${RECORD}/construction/${UNIT}/${STAGE}`;
  const stageFile = ".claude/amadeus-common/stages/construction/functional-design.md";
  const contract = `${RECORD}/inception/application-design/component-methods.md`;

  const produces = ARTIFACTS.map((name) => `${unitDir}/${name}.md`);
  for (const path of [stageFile, contract, ...produces]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), `# ${path}\n`, "utf-8");
  }

  return {
    root,
    directive: {
      kind: "run-stage",
      stage: STAGE,
      phase: "construction",
      lead_agent: "amadeus-developer-agent",
      support_agents: [],
      mode: "subagent",
      gate: false,
      memory_path: `${unitDir}/memory.md`,
      consumes: [contract],
      produces,
      rules_in_context: [],
      sensors_applicable: [],
      stage_file: stageFile,
      reviewer: REVIEWER,
      reviewer_max_iterations: 2,
      unit: UNIT,
    },
    primary: produces[0]!,
  };
}

function run(current: Fixture, mode: string, input: unknown) {
  return spawnSync(process.execPath, [REVIEWER_TOOL, mode], {
    cwd: current.root,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
}

function issued(current: Fixture): string {
  const scoped = run(current, "scope", current.directive);
  expect(scoped.status, scoped.stderr).toBe(0);
  return JSON.parse(scoped.stdout).invocationId as string;
}

// The same three modes driven IN-PROCESS over the same on-disk fixture. The
// spawned arms above are the production surface, but a subprocess is invisible
// to the parent LCOV, so the repair route would read as dead code. Real fs
// dependencies rather than a virtual tree: the audit shards, the ledger, and
// the artifact this route reads are exactly the ones `seedRepairEvidence` and
// the spawned arms already wrote.
interface RuntimeOutcome {
  status: number | undefined;
  stdout: string;
  stderr: string;
}

function inProcess(current: Fixture) {
  let stdin = "";
  let stdout = "";
  let stderr = "";
  let minted = 0;
  const exitCode: { exitCode?: number } = {};
  const deps = {
    cwd: () => current.root,
    fs: {
      exists: existsSync,
      stat: statSync,
      readFile: (path: string | 0, encoding: "utf8") =>
        path === 0 ? stdin : readFileSync(path, encoding),
      readdir: readdirSync,
      appendFile: appendFileSync,
      writeFile: writeFileSync,
      mkdir: (path: string) => {
        mkdirSync(path, { recursive: true });
      },
    },
    utc: {
      command: "date",
      args: ["-u", "+%Y-%m-%dT%H:%M:%SZ"],
      run: () => ({ status: 0, stdout: "2026-08-21T04:45:00Z\n" }),
    },
    stdin: 0 as const,
    stdout: { write: (text: string) => { stdout += text; } },
    stderr: { write: (text: string) => { stderr += text; } },
    invocationId: () => {
      minted += 1;
      return `00000000-0000-4000-8000-${String(minted).padStart(12, "0")}`;
    },
    exitCode,
  };
  return {
    call(mode: string, input: unknown): RuntimeOutcome {
      stdin = JSON.stringify(input);
      stdout = "";
      stderr = "";
      exitCode.exitCode = undefined;
      runReviewerCommand([mode], deps);
      return { status: exitCode.exitCode, stdout, stderr };
    },
    review(iteration: number, verdict: "READY" | "NOT-READY", repair?: unknown): RuntimeOutcome {
      const scoped = this.call("scope", current.directive);
      expect(scoped.status, scoped.stderr).toBe(0);
      const invocationId = JSON.parse(scoped.stdout).invocationId as string;
      const carrier: Record<string, unknown> = {
        directive: current.directive,
        invocationId,
        result: reviewResult(invocationId, iteration, verdict),
      };
      if (repair !== undefined) carrier.repair = repair;
      return this.call("complete-review", carrier);
    },
  };
}

function reviewResult(
  invocationId: string,
  iteration: number,
  verdict: "READY" | "NOT-READY",
) {
  return {
    invocationId,
    reviewer: REVIEWER,
    verdict,
    iteration,
    summary: `Iteration ${iteration} of the repair-funded review route.`,
    findings: verdict === "READY"
      ? ["FOLLOW-UP | carried to the completion gate"]
      : ["BLOCKER | the approved contract is not satisfied yet"],
    scopeTranscript: [],
    requestedReads: [],
  };
}

function completeReview(
  current: Fixture,
  iteration: number,
  verdict: "READY" | "NOT-READY",
  repair?: unknown,
) {
  const invocationId = issued(current);
  const carrier: Record<string, unknown> = {
    directive: current.directive,
    invocationId,
    result: reviewResult(invocationId, iteration, verdict),
  };
  if (repair !== undefined) carrier.repair = repair;
  return run(current, "complete-review", carrier);
}

// The audit row a real `observe-quality` repair ruling leaves behind. Shape
// provenance: the committed record of intent 260821-fmc-retirement (audit seq
// 399, `amadeus.quality_repair.transaction.committed`). Rather than trust that
// transcription, the builder runs the framework's OWN decoder over the
// transaction and the framework's OWN audit reader over the written shard, so
// a drift between this fixture and the production writer fails here.
function seedRepairEvidence(
  current: Fixture,
  fingerprint: string,
  stageInstance: string,
  unresolvedCount = 1,
): void {
  const qualityScopeId = `quality-scope:${stageInstance}`;
  const qualityEpochId = `quality-epoch:${stageInstance}`;
  const graphRevision = `sha256:${"0e".repeat(32)}`;
  const snapshot = {
    intentUuid: DEFAULT_INTENT_UUID,
    monitorId: "quality-repair",
    stageInstanceId: stageInstance,
    boltId: UNIT,
    graphRevision,
    qualityScopeId,
    epochStartEventIdentity: `${qualityEpochId}:start`,
    qualityEpochId,
    unresolved: Array.from({ length: unresolvedCount }, (_unused, index) => ({
      obligationId: `obligation-${index}`,
      sourceCategory: "review",
      failureKind: "verification",
      stageInstanceId: stageInstance,
      boltId: UNIT,
      artifactId: null,
      verifierId: REVIEWER,
      failureFingerprint: `sha256:${"1f".repeat(32)}`,
      status: "unresolved",
    })),
    resolvedIds: [],
    addedIds: [],
    retainedIds: [],
    snapshotFingerprint: fingerprint,
    verifierSuccessReceipts: [],
  };
  const progress = { kind: "collecting", consecutiveNonProgress: 1, threshold: 3 };
  const projection = {
    qualityScopeId,
    partition: {
      intentUuid: DEFAULT_INTENT_UUID,
      monitorId: "quality-repair",
      stageInstanceId: stageInstance,
      graphRevision,
    },
    epoch: {
      qualityScopeId,
      qualityEpochId,
      epochStartEventIdentity: `${qualityEpochId}:start`,
      threshold: 3,
      window: [],
      consecutiveNonProgress: 1,
      replanSinceLastProgress: false,
    },
    latestSnapshot: snapshot,
    lastProgress: progress,
    observationSequence: 1,
    stalledLatch: null,
    workflowExecutionState: "running",
    lastReplanReceipt: null,
    pendingReplan: null,
  };
  const transaction = {
    schemaVersion: 1,
    transactionId: `transaction:${fingerprint}`,
    qualityScopeId,
    qualityEvents: [
      { type: "QUALITY_SNAPSHOT_OBSERVED", snapshotFingerprint: fingerprint, progress, projection },
    ],
    loopEventSets: [],
  };
  // Canonical validator: a fixture the production decoder rejects is not evidence.
  expect(decodeQualityRepairTransaction(JSON.stringify(transaction)).transactionId)
    .toBe(transaction.transactionId);

  const dir = seededAuditDir(current.root);
  mkdirSync(dir, { recursive: true });
  const row = {
    schemaVersion: 2,
    eventId: `00000000-0000-4000-8000-${fingerprint.slice(-12)}`,
    seq: 1,
    timestamp: "2026-08-21T04:41:07Z",
    eventName: "amadeus.quality_repair.transaction.committed",
    attributes: {
      Event: "QUALITY_REPAIR_TRANSACTION_COMMITTED",
      "Quality Scope Id": qualityScopeId,
      "Transaction Id": transaction.transactionId,
      Transaction: JSON.stringify(transaction),
    },
    intentId: DEFAULT_RECORD_DIR,
    space: DEFAULT_SPACE,
    cloneId: FIXTURE_CLONE_ID,
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: `00000000-0000-4000-8000-${fingerprint.slice(-12)}`,
    canonical: true,
  };
  const shard = join(dir, `t3415-${fingerprint.slice(-8)}.jsonl`);
  writeFileSync(shard, `${JSON.stringify(row)}\n`, "utf-8");

  // Canonical reader: the row has to be findable by the framework's own audit
  // reader, not only by the reviewer runtime's narrow one.
  const readBack = readQualityRepairTransactionsFromAudit(
    current.root,
    DEFAULT_RECORD_DIR,
    DEFAULT_SPACE,
  );
  expect(readBack.some((item) => item.transactionId === transaction.transactionId)).toBe(true);
}

function spendBudget(current: Fixture): void {
  for (const iteration of [1, 2]) {
    const spent = completeReview(current, iteration, "NOT-READY");
    expect(spent.status, spent.stderr).toBe(0);
  }
}

describe("t3415 repair-funded review iteration", () => {
  test("records the post-budget re-review READY when durable repair evidence funds it", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    spendBudget(current);

    const funded = completeReview(current, 3, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(funded.status, funded.stderr).toBe(0);
    const output = JSON.parse(funded.stdout);
    expect(output.ready).toBe(true);
    expect(output.appended).toBe(true);

    const artifact = readFileSync(join(current.root, current.primary), "utf8");
    expect(artifact).toContain("## Review — Iteration 3");
    expect(artifact).toContain("- **Verdict:** READY");
    expect(artifact).toContain(`- **Repair evidence:** ${FINGERPRINT}`);

    // Re-entry with the same carrier is idempotent, exactly as it is for an
    // ordinary iteration: the stored projection is re-accepted, not rewritten.
    const again = completeReview(current, 3, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(again.status, again.stderr).toBe(0);
    expect(JSON.parse(again.stdout).appended).toBe(false);
  });

  test("keeps refusing a post-budget iteration that names no repair evidence", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    spendBudget(current);

    const refused = completeReview(current, 3, "READY");
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("review iteration exceeds the directive limit");
  });

  test("keeps refusing a same-iteration re-record whose result changed", () => {
    const current = fixture();
    const first = completeReview(current, 1, "NOT-READY");
    expect(first.status, first.stderr).toBe(0);

    const conflicting = completeReview(current, 1, "READY");
    expect(conflicting.status).toBe(1);
    expect(conflicting.stderr).toContain("existing Review projection conflicts with the result");
  });

  test("refuses repair evidence while the iteration budget still has room", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);

    const early = completeReview(current, 2, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(early.status).toBe(1);
    expect(early.stderr).toContain(
      "repair evidence applies only after the review iteration budget is spent",
    );
  });

  test("refuses a fingerprint that no durable quality-repair observation carries", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    spendBudget(current);

    const forged = completeReview(current, 3, "READY", {
      evidenceFingerprint: OTHER_FINGERPRINT,
    });
    expect(forged.status).toBe(1);
    expect(forged.stderr).toContain(
      "repair evidence is not a durable quality-repair observation for this stage",
    );
  });

  test("refuses repair evidence recorded against a different stage instance", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, `${STAGE}:other-unit`);
    spendBudget(current);

    const foreign = completeReview(current, 3, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(foreign.status).toBe(1);
    expect(foreign.stderr).toContain(
      "repair evidence is not a durable quality-repair observation for this stage",
    );
  });

  test("refuses a resolved observation: only unresolved obligations are a repair ruling", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE, 0);
    spendBudget(current);

    const ready = completeReview(current, 3, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(ready.status).toBe(1);
    expect(ready.stderr).toContain(
      "repair evidence is not a durable quality-repair observation for this stage",
    );
  });

  test("funds exactly one iteration per receipt and refuses replay at another iteration", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    spendBudget(current);

    const funded = completeReview(current, 3, "NOT-READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(funded.status, funded.stderr).toBe(0);

    // The same receipt cannot buy a second extension.
    const replayed = completeReview(current, 4, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(replayed.status).toBe(1);
    expect(replayed.stderr).toContain(
      "repair evidence is bound to a different review iteration",
    );

    // A second receipt funds the next iteration, and only the next one.
    seedRepairEvidence(current, OTHER_FINGERPRINT, STAGE_INSTANCE);
    const skipped = completeReview(current, 5, "READY", {
      evidenceFingerprint: OTHER_FINGERPRINT,
    });
    expect(skipped.status).toBe(1);
    expect(skipped.stderr).toContain(
      "repair-funded review iteration must follow the spent budget in sequence",
    );

    const second = completeReview(current, 4, "READY", {
      evidenceFingerprint: OTHER_FINGERPRINT,
    });
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout).ready).toBe(true);
  });

  // Every refusal arm of the admission, driven in-process for the same reason:
  // the spawned arms above are the production surface but carry no coverage, so
  // each guard would otherwise read as dead code.
  test("refuses every malformed or unbacked repair admission, in-process", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    const local = inProcess(current);
    for (const iteration of [1, 2]) {
      expect(local.review(iteration, "NOT-READY").status).toBe(0);
    }

    const malformed = local.review(3, "READY", { evidenceFingerprint: "not-a-digest" });
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toContain(
      "repair evidence fingerprint must be a sha256 quality snapshot digest",
    );

    const unbacked = local.review(3, "READY", { evidenceFingerprint: OTHER_FINGERPRINT });
    expect(unbacked.status).toBe(1);
    expect(unbacked.stderr).toContain(
      "repair evidence is not a durable quality-repair observation for this stage",
    );

    const outOfSequence = local.review(4, "READY", { evidenceFingerprint: FINGERPRINT });
    expect(outOfSequence.status).toBe(1);
    expect(outOfSequence.stderr).toContain(
      "repair-funded review iteration must follow the spent budget in sequence",
    );

    const funded = local.review(3, "READY", { evidenceFingerprint: FINGERPRINT });
    expect(funded.status, funded.stderr).toBe(0);
    // Re-offering the spent receipt at another iteration is a replay; offering
    // it again at the one it funded is the idempotent re-entry.
    const replayed = local.review(4, "READY", { evidenceFingerprint: FINGERPRINT });
    expect(replayed.status).toBe(1);
    expect(replayed.stderr).toContain("repair evidence is bound to a different review iteration");
    const reentry = local.review(3, "READY", { evidenceFingerprint: FINGERPRINT });
    expect(reentry.status, reentry.stderr).toBe(0);
    expect(JSON.parse(reentry.stdout).appended).toBe(false);
  });

  // A shard row that does not decode, or decodes to something other than a
  // repair ruling for this stage, is not evidence: the admission fails closed
  // rather than opening on a shape it never parsed. Each case gets its own
  // fixture, and the last case is the control that funds.
  test("admits only on a decodable repair ruling for this stage, in-process", () => {
    const mutate = {
      "an undecodable line": () => "{not json\n",
      "an undecodable Transaction": (row: Record<string, unknown>) =>
        `${JSON.stringify({
          ...row,
          attributes: {
            ...(row.attributes as Record<string, unknown>),
            Transaction: "{not json",
          },
        })}\n`,
    };

    for (const [name, rewrite] of Object.entries(mutate)) {
      const current = fixture();
      seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
      const shard = join(seededAuditDir(current.root), `t3415-${FINGERPRINT.slice(-8)}.jsonl`);
      const row = JSON.parse(readFileSync(shard, "utf8").trim());
      writeFileSync(shard, rewrite(row), "utf-8");

      const local = inProcess(current);
      for (const iteration of [1, 2]) {
        expect(local.review(iteration, "NOT-READY").status, name).toBe(0);
      }
      const refused = local.review(3, "READY", { evidenceFingerprint: FINGERPRINT });
      expect(refused.status, name).toBe(1);
      expect(refused.stderr, name).toContain(
        "repair evidence is not a durable quality-repair observation for this stage",
      );
    }

    // Decodable, but the observation resolved everything — the READY arm of
    // `observe-quality`, which orders no re-run.
    const resolved = fixture();
    seedRepairEvidence(resolved, FINGERPRINT, STAGE_INSTANCE, 0);
    const resolvedLocal = inProcess(resolved);
    for (const iteration of [1, 2]) {
      expect(resolvedLocal.review(iteration, "NOT-READY").status).toBe(0);
    }
    const refusedResolved = resolvedLocal.review(3, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(refusedResolved.status).toBe(1);
    expect(refusedResolved.stderr).toContain(
      "repair evidence is not a durable quality-repair observation for this stage",
    );

    // Control: the untouched row, with unresolved obligations, funds the same
    // iteration — so the refusals above are the mutations, not the fixture.
    const control = fixture();
    seedRepairEvidence(control, FINGERPRINT, STAGE_INSTANCE);
    const controlLocal = inProcess(control);
    for (const iteration of [1, 2]) {
      expect(controlLocal.review(iteration, "NOT-READY").status).toBe(0);
    }
    const funded = controlLocal.review(3, "READY", { evidenceFingerprint: FINGERPRINT });
    expect(funded.status, funded.stderr).toBe(0);
  });

  test("refuses a stage definition whose declared iteration cap is not positive", () => {
    const current = fixture();
    writeFileSync(
      join(current.root, current.directive.stage_file as string),
      "---\nslug: functional-design\nreviewer_max_iterations: 0\n---\n",
      "utf-8",
    );
    const refused = inProcess(current).review(1, "NOT-READY");
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("stage definition declares an invalid review iteration cap");
  });

  test("refuses a reviewer ledger whose repair or review lists are not arrays", () => {
    for (const [field, expected] of [
      ["repairs", "reviewer invocation store must list consumed repair evidence"],
      ["reviews", "reviewer invocation store must list recorded reviews"],
    ] as const) {
      const current = fixture();
      const local = inProcess(current);
      expect(local.review(1, "NOT-READY").status, field).toBe(0);
      const ledger = join(current.root, RECORD, ".amadeus-reviewer-invocations.json");
      const store = JSON.parse(readFileSync(ledger, "utf8"));
      writeFileSync(ledger, JSON.stringify({ ...store, [field]: "not-an-array" }), "utf-8");

      // Every path reads the ledger, so the refusal lands on the next call
      // into the runtime rather than waiting for the repair admission.
      const refused = local.call("scope", current.directive);
      expect(refused.status, field).toBe(1);
      expect(refused.stderr, field).toContain(expected);
    }
  });

  test("drives the repair-funded route in-process over the same fixture", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    const local = inProcess(current);

    for (const iteration of [1, 2]) {
      const spent = local.review(iteration, "NOT-READY");
      expect(spent.status, spent.stderr).toBe(0);
    }

    const funded = local.review(3, "READY", { evidenceFingerprint: FINGERPRINT });
    expect(funded.status, funded.stderr).toBe(0);
    expect(JSON.parse(funded.stdout).appended).toBe(true);
    const artifact = readFileSync(join(current.root, current.primary), "utf8");
    expect(artifact).toContain("## Review — Iteration 3");
    expect(artifact).toContain(`- **Repair evidence:** ${FINGERPRINT}`);
  });

  test("refuses repair evidence offered while the budget still has room, in-process", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    const local = inProcess(current);

    const early = local.review(2, "READY", { evidenceFingerprint: FINGERPRINT });
    expect(early.status).toBe(1);
    expect(early.stderr).toContain(
      "repair evidence applies only after the review iteration budget is spent",
    );
  });

  // The fail-open this change closes: the projection immutability check can only
  // speak about a block that is still in the artifact, so a rewrite that drops
  // the Review sections used to re-admit the same iteration with a different
  // verdict and no warning. Both arms run on the same fixture: the wipe is
  // refused, and the restored artifact is accepted again — so the refusal is the
  // missing block, not the re-record itself.
  test("refuses a re-record whose recorded projections were wiped from the artifact", () => {
    const current = fixture();
    const local = inProcess(current);
    const first = local.review(1, "NOT-READY");
    expect(first.status, first.stderr).toBe(0);

    const primaryPath = join(current.root, current.primary);
    const recorded = readFileSync(primaryPath, "utf8");
    writeFileSync(primaryPath, "# business-logic-model\n", "utf-8");

    const wiped = local.review(1, "READY");
    expect(wiped.status).toBe(1);
    expect(wiped.stderr).toContain(
      "recorded Review projection for iteration 1 is missing from the artifact",
    );
    expect(readFileSync(primaryPath, "utf8")).not.toContain("## Review — Iteration");

    writeFileSync(primaryPath, recorded, "utf-8");
    const restored = local.review(2, "NOT-READY");
    expect(restored.status, restored.stderr).toBe(0);
  });

  test("the engine completion gate reads the repair-funded verdict", () => {
    const current = fixture();
    seedRepairEvidence(current, FINGERPRINT, STAGE_INSTANCE);
    spendBudget(current);
    const funded = completeReview(current, 3, "READY", {
      evidenceFingerprint: FINGERPRINT,
    });
    expect(funded.status, funded.stderr).toBe(0);

    seedGateState(current.root);
    // Control: the gate refuses the same project when the reviewed primary is
    // replaced by one with no Review projection, so the accepted arm below is
    // not vacuous.
    const primaryPath = join(current.root, current.primary);
    const reviewed = readFileSync(primaryPath, "utf8");
    writeFileSync(primaryPath, "# business-logic-model\n", "utf-8");
    expect(advance(current.root).refused).toBe(true);

    writeFileSync(primaryPath, reviewed, "utf-8");
    const accepted = advance(current.root);
    expect(accepted.stderr).toBe("");
    expect(accepted.refused).toBe(false);
  }, scaleTestTime(30_000));
});

// The state the completion gate needs to reach the §12a review layer for this
// unit: a CONSTRUCTION state pointing at functional-design, the canonical unit
// list, and the runtime projection naming the same unit.
function seedGateState(project: string): void {
  const record = seededRecordDir(project);
  const unitsDir = join(record, "inception", "units-generation");
  mkdirSync(unitsDir, { recursive: true });
  writeFileSync(
    join(unitsDir, "unit-of-work-dependency.md"),
    `# Unit dependencies\n\n\`\`\`yaml\nunits:\n  - name: ${UNIT}\n    kind: service\n    depends_on: []\n\`\`\`\n`,
    "utf-8",
  );
  writeFileSync(
    join(record, "runtime-graph.json"),
    `${JSON.stringify(
      { bolt_dag: { units: [{ name: UNIT, kind: "service", depends_on: [] }], batches: [[UNIT]] } },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(
    seededStateFile(project),
    `# AI-DLC State Tracking

## Project Information
- **Project**: repair funded review iteration
- **Project Type**: Greenfield
- **Scope**: feature
- **State Version**: 7
- **Skeleton Stance**: on
- **Construction Autonomy Mode**: autonomous

## Scope Configuration
- **Stages to Execute**: all
- **Stages to Skip**: none
- **Depth**: Standard
- **Test Strategy**: Comprehensive

## Stage Progress

### CONSTRUCTION PHASE
- [-] functional-design — EXECUTE
- [ ] nfr-requirements — EXECUTE
- [ ] nfr-design — EXECUTE
- [ ] infrastructure-design — EXECUTE
- [ ] code-generation — EXECUTE
- [ ] build-and-test — EXECUTE

### INCEPTION PHASE
- [x] application-design — EXECUTE

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: functional-design
- **Status**: Running
`,
    "utf-8",
  );
}

function advance(project: string): { refused: boolean; stderr: string } {
  resetOtelPerProject();
  const keys = [
    "AMADEUS_STAGE_GRAPH",
    "AMADEUS_SCOPE_GRID",
    "AMADEUS_SKIP_HUMAN_PRESENCE_GUARD",
    "AMADEUS_SKIP_ARTIFACT_GUARD",
    "AMADEUS_DEFAULT_SCOPE",
    "CLAUDE_PROJECT_DIR",
  ];
  const saved = new Map(keys.map((key) => [key, process.env[key]]));
  process.env.AMADEUS_STAGE_GRAPH = STAGE_GRAPH;
  process.env.AMADEUS_SCOPE_GRID = SCOPE_GRID;
  process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
  process.env.CLAUDE_PROJECT_DIR = project;
  delete process.env.AMADEUS_DEFAULT_SCOPE;
  delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
  _resetStageGraphForTests();
  __resetGraphCache();
  const originalExit = process.exit;
  const originalError = console.error;
  const originalLog = console.log;
  let stderr = "";
  process.exit = ((code?: number) => {
    throw new Error(`exit ${code ?? 0}`);
  }) as typeof process.exit;
  console.error = (...args: unknown[]) => {
    stderr += args.map(String).join(" ");
  };
  console.log = () => {};
  try {
    handleAdvance([STAGE]);
    return { refused: false, stderr };
  } catch (cause) {
    if (!/exit 1/.test(String(cause))) throw cause;
    return { refused: true, stderr };
  } finally {
    process.exit = originalExit;
    console.error = originalError;
    console.log = originalLog;
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    _resetStageGraphForTests();
    __resetGraphCache();
  }
}
