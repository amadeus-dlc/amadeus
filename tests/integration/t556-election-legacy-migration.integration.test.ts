import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CanonicalBallot,
  CanonicalElectionDefinition,
  CanonicalTally,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  BallotV2Codec,
  ElectionDefinitionCodec,
  TallyV2Codec,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import { canonicalContractValueDigest } from "../../packages/framework/core/tools/amadeus-autonomy-review.ts";
import {
  applyMigrationPlan,
  createMigrationPlan,
  main as migrateMain,
  readMigrationReceipt,
  verifyMigrationPlan,
} from "../../scripts/amadeus-election-migrate.ts";

function withPlanDigest<T extends { planDigest: string }>(plan: T): T {
  const { planDigest: _planDigest, ...body } = plan;
  const digest = canonicalContractValueDigest("election-legacy-migration-plan", body);
  if (!digest.ok) throw new Error("plan digest");
  return { ...plan, planDigest: digest.value };
}

const ELECTION_ID = "E-LEGACY-ONE";
const OPERATION_ID = "migration-e-legacy-one";
const V2_ELECTION_ID = "E-V2-MULTI";
const V2_OPERATION_ID = "migration-e-v2-multi";

const V2_DEFINITION: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: V2_ELECTION_ID,
  kind: "decision",
  questions: [
    {
      questionId: "q1",
      text: "First?",
      choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }],
    },
    {
      questionId: "q2",
      text: "Second?",
      choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }],
    },
  ],
  voters: ["alice", "bob"],
};

let root = "";
let project = "";

function legacyBallot(voter: string) {
  return {
    electionId: ELECTION_ID,
    voter,
    voterKind: "member",
    choiceInternalNo: 1,
    goa: 1,
    reservation: null,
    rationale: `${voter} rationale`,
    submittedAt: voter === "alice" ? "2026-08-13T10:00:00Z" : "2026-08-13T10:01:00Z",
  };
}

function encodedBallot(voter: string): CanonicalBallot {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId: V2_ELECTION_ID,
    voter,
    voterKind: "member",
    responses: V2_DEFINITION.questions.map((question) => ({
      questionId: question.questionId,
      choiceInternalNo: 1,
      goa: 1,
      reservation: null,
      rationale: null,
    })),
    submittedAt: voter === "alice" ? "2026-08-13T10:00:00Z" : "2026-08-13T10:00:01Z",
    receivedAt: voter === "alice" ? "2026-08-13T10:00:02Z" : "2026-08-13T10:00:03Z",
  };
}

function encodedTally(): CanonicalTally {
  return {
    schemaVersion: 2,
    runId: "run-1",
    targetQuestionIds: ["q1", "q2"],
    results: V2_DEFINITION.questions.map((question) => ({
      questionId: question.questionId,
      kind: "established" as const,
      winner: { internalNo: 1, label: "yes" },
      choiceCounts: question.choices.map((choice) => ({
        internalNo: choice.internalNo,
        label: choice.label,
        count: choice.internalNo === 1 ? 2 : 0,
      })),
      goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
    })),
    preservedResultDigest: null,
    talliedAt: "2026-08-13T10:05:00Z",
  };
}

function writeEncoded(path: string, encoded: { ok: true; value: string } | { ok: false }): void {
  if (!encoded.ok) throw new Error("canonical fixture encode failed");
  writeFileSync(path, encoded.value);
}

function seedCanonicalElection(): void {
  const dir = join(root, V2_ELECTION_ID);
  mkdirSync(join(dir, "ballots"), { recursive: true });
  const definition = ElectionDefinitionCodec.encode(V2_DEFINITION);
  if (!definition.ok) throw new Error("canonical definition encode failed");
  writeFileSync(join(dir, "election.json"), JSON.stringify({
    ...JSON.parse(definition.value),
    state: "recorded",
  }, null, 2));
  const alice = encodedBallot("alice");
  const bob = encodedBallot("bob");
  const context = { targetQuestionIds: ["q1", "q2"] };
  const aliceBytes = BallotV2Codec.encode(alice, V2_DEFINITION, context);
  const bobBytes = BallotV2Codec.encode(bob, V2_DEFINITION, context);
  writeEncoded(join(dir, "ballots", "alice.json"), aliceBytes);
  writeEncoded(join(dir, "ballots", "bob.json"), bobBytes);
  if (!aliceBytes.ok || !bobBytes.ok) throw new Error("canonical ballot encode failed");
  writeFileSync(join(dir, "ledger.json"), JSON.stringify({
    schemaVersion: 2,
    ballots: [JSON.parse(aliceBytes.value), JSON.parse(bobBytes.value)],
  }, null, 2));
  writeEncoded(join(dir, "tally.json"), TallyV2Codec.encode(encodedTally(), V2_DEFINITION));
  writeFileSync(join(dir, "timeline.json"), JSON.stringify([
    { kind: "distributed", at: "2026-08-13T09:55:00Z", detail: "distributed" },
    { kind: "tallied", at: "2026-08-13T10:05:00Z", detail: "tallied" },
  ], null, 2));
}

function seedLegacyElection(): void {
  const dir = join(root, ELECTION_ID);
  mkdirSync(join(dir, "ballots"), { recursive: true });
  writeFileSync(join(dir, "election.json"), JSON.stringify({
    electionId: ELECTION_ID,
    kind: "decision",
    question: "Migrate this election?",
    choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }],
    voters: ["alice", "bob"],
    state: "recorded",
  }, null, 2));
  writeFileSync(join(dir, "ledger.json"), JSON.stringify({
    ballots: [legacyBallot("alice"), legacyBallot("bob")],
    late: [],
  }, null, 2));
  writeFileSync(join(dir, "ballots", "alice.json"), JSON.stringify(legacyBallot("alice")));
  writeFileSync(join(dir, "ballots", "bob.json"), JSON.stringify(legacyBallot("bob")));
  writeFileSync(join(dir, "tally.json"), JSON.stringify({
    result: {
      kind: "established",
      winner: { internalNo: 1, label: "yes" },
      choiceCounts: [
        { internalNo: 1, label: "yes", count: 2 },
        { internalNo: 2, label: "no", count: 0 },
      ],
      goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
    },
    talliedAt: "2026-08-13T10:05:00Z",
    ballots: ["alice", "bob"],
    resolutions: [],
  }, null, 2));
  writeFileSync(join(dir, "timeline.json"), JSON.stringify([
    { kind: "distributed", at: "2026-08-13T09:55:00Z", detail: "distributed" },
    { kind: "tallied", at: "2026-08-13T10:05:00Z", detail: "tallied" },
  ], null, 2));
}

function bytesUnder(dir: string): Map<string, Buffer> {
  const bytes = new Map<string, Buffer>();
  const visit = (current: string, relative = "") => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = join(relative, entry.name);
      if (entry.isDirectory()) visit(join(current, entry.name), child);
      else bytes.set(child, readFileSync(join(current, entry.name)));
    }
  };
  visit(dir);
  return bytes;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-legacy-migration-"));
  seedLegacyElection();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  if (project !== "") {
    rmSync(project, { recursive: true, force: true });
    project = "";
  }
});

describe("t556 explicit single-election legacy migration", () => {
  test("planning is write-free and captures canonical legacy identity and exact preconditions", () => {
    const before = bytesUnder(root);
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });

    expect(bytesUnder(root)).toEqual(before);
    expect(plan).toMatchObject({
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      sourcePath: ELECTION_ID,
      targetPath: "260813-e-legacy-one",
      registryBefore: null,
      beforeDigest: expect.stringMatching(/^sha256:/),
      planDigest: expect.stringMatching(/^sha256:/),
    });
    expect(plan.preconditions.files.map((file) => file.path)).toEqual([
      "ballots/alice.json",
      "ballots/bob.json",
      "election.json",
      "ledger.json",
      "tally.json",
      "timeline.json",
    ]);
    expect(plan.preconditions.directories).toEqual(["ballots"]);
    expect(plan.operations.map((operation) => operation.kind)).toEqual([
      "move-directory",
      "write-registry",
      "verify-fidelity",
    ]);
  });

  test("approval is bound to the immutable plan and successful apply preserves every schema byte", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    const beforeSchema = bytesUnder(join(root, plan.sourcePath));

    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: `sha256:${"0".repeat(64)}`,
    })).toThrow(/approval.*plan digest/i);
    expect(existsSync(join(root, plan.sourcePath))).toBe(true);
    expect(existsSync(join(root, plan.targetPath))).toBe(false);

    const receipt = applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    });
    const fidelity = verifyMigrationPlan(root, plan);

    expect(receipt.status).toBe("verified");
    expect(receipt.completedSteps).toEqual(["move-directory", "write-registry", "verify-fidelity"]);
    expect(fidelity).toMatchObject({
      beforeDigest: plan.beforeDigest,
      afterDigest: plan.beforeDigest,
      canonicalQuestionIds: ["legacy-question"],
      resultCount: 1,
      runCount: 1,
      match: true,
      findings: [],
    });
    expect(bytesUnder(join(root, plan.targetPath))).toEqual(beforeSchema);
    expect(existsSync(join(root, plan.sourcePath))).toBe(false);
    expect(readMigrationReceipt(root, OPERATION_ID)).toEqual(receipt);
  });

  test("collision and dirty source fail closed before the move", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    mkdirSync(join(root, plan.targetPath));
    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/collision/i);
    expect(existsSync(join(root, plan.sourcePath))).toBe(true);
    rmSync(join(root, plan.targetPath), { recursive: true });

    writeFileSync(join(root, plan.sourcePath, "unexpected.json"), "{}\n");
    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/dirty|unexpected/i);
    expect(existsSync(join(root, plan.sourcePath))).toBe(true);

    rmSync(join(root, plan.sourcePath, "unexpected.json"));
    writeFileSync(join(root, "elections.json"), "[]");
    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/registry conflict/i);
    expect(existsSync(join(root, plan.sourcePath))).toBe(true);
  });

  test("an unexpected empty directory is also treated as dirty source evidence", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    mkdirSync(join(root, plan.sourcePath, "unexpected-empty"));
    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/dirty|unexpected director/i);
    expect(existsSync(join(root, plan.sourcePath))).toBe(true);
  });

  test("same-plan retry advances after move while another plan cannot claim the evidence", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    mkdirSync(join(root, "elections.json.tmp"));
    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/registry/i);
    expect(existsSync(join(root, plan.sourcePath))).toBe(false);
    expect(existsSync(join(root, plan.targetPath))).toBe(true);
    expect(readMigrationReceipt(root, OPERATION_ID)).toMatchObject({
      status: "failed",
      completedSteps: ["move-directory"],
    });

    const otherPlan = {
      ...plan,
      operationId: "migration-other-plan",
      planDigest: plan.planDigest,
    };
    expect(() => applyMigrationPlan(root, otherPlan, {
      approved: true,
      planDigest: otherPlan.planDigest,
    })).toThrow(/plan integrity conflict: digest mismatch/);
    expect(existsSync(join(root, plan.targetPath))).toBe(true);

    rmSync(join(root, "elections.json.tmp"), { recursive: true });
    const recovered = applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    });
    expect(recovered).toMatchObject({
      status: "verified",
      completedSteps: ["move-directory", "write-registry", "verify-fidelity"],
    });
    expect(recovered.recoveryDetails.length).toBeGreaterThan(0);
  });

  test("a same-operation different plan is rejected without overwriting its durable receipt", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    const conflicting = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-14T09:55:00Z",
    });
    mkdirSync(join(root, "elections.json.tmp"));
    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow();
    const evidence = readFileSync(join(root, ".migration-receipts", `${OPERATION_ID}.json`));
    expect(() => applyMigrationPlan(root, conflicting, {
      approved: true,
      planDigest: conflicting.planDigest,
    })).toThrow(/different plan/i);
    expect(readFileSync(join(root, ".migration-receipts", `${OPERATION_ID}.json`))).toEqual(evidence);
    expect(existsSync(join(root, plan.targetPath))).toBe(true);
  });

  test("same-plan recovery recognizes a registry write durable before its receipt update", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    mkdirSync(join(root, ".migration-receipts"));
    writeFileSync(join(root, ".migration-receipts", `${OPERATION_ID}.json`), JSON.stringify({
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      planDigest: plan.planDigest,
      status: "planned",
      completedSteps: [],
      afterDigest: null,
      failureDetail: null,
      recoveryDetails: [],
    }));
    renameSync(join(root, plan.sourcePath), join(root, plan.targetPath));
    writeFileSync(join(root, "elections.json"), JSON.stringify(plan.registryAfter, null, 2));

    const recovered = applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    });
    expect(recovered.status).toBe("verified");
    expect(recovered.recoveryDetails).toEqual([
      "repaired completed move from source-absent target-present evidence",
      "repaired completed registry update from exact registry evidence",
    ]);
  });

  test("same-plan recovery rejects a target digest mismatch without deleting evidence", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    mkdirSync(join(root, ".migration-receipts"));
    writeFileSync(join(root, ".migration-receipts", `${OPERATION_ID}.json`), JSON.stringify({
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      planDigest: plan.planDigest,
      status: "planned",
      completedSteps: [],
      afterDigest: null,
      failureDetail: null,
      recoveryDetails: [],
    }));
    renameSync(join(root, plan.sourcePath), join(root, plan.targetPath));
    writeFileSync(join(root, plan.targetPath, "timeline.json"), "[]");

    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/dirty|digest|unexpected/i);
    expect(existsSync(join(root, plan.targetPath))).toBe(true);
    expect(readMigrationReceipt(root, OPERATION_ID)).toMatchObject({
      status: "failed",
      completedSteps: [],
    });
  });

  test("a verified retry rechecks fidelity and fails closed after later tampering", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    const approval = { approved: true as const, planDigest: plan.planDigest };
    const verified = applyMigrationPlan(root, plan, approval);
    expect(applyMigrationPlan(root, plan, approval)).toEqual(verified);

    writeFileSync(join(root, plan.targetPath, "timeline.json"), "[]");
    expect(() => applyMigrationPlan(root, plan, approval)).toThrow(/dirty|digest|unexpected/i);
    expect(readMigrationReceipt(root, OPERATION_ID)).toMatchObject({
      status: "failed",
      recoveryDetails: [`previous verified digest: ${plan.beforeDigest}`],
    });
    expect(existsSync(join(root, plan.targetPath))).toBe(true);
  });

  test("repeated retries against a permanently conflicting registry do not duplicate recovery details", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    const approval = { approved: true as const, planDigest: plan.planDigest };

    // Simulate a state where the directory move already completed but the
    // registry write never landed, and an unrelated registry now permanently
    // conflicts with both registryBefore and registryAfter.
    renameSync(join(root, plan.sourcePath), join(root, plan.targetPath));
    mkdirSync(join(root, ".migration-receipts"), { recursive: true });
    writeFileSync(join(root, ".migration-receipts", `${OPERATION_ID}.json`), JSON.stringify({
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      planDigest: plan.planDigest,
      status: "applied",
      completedSteps: [],
      afterDigest: null,
      failureDetail: null,
      recoveryDetails: [],
    }));
    writeFileSync(join(root, "elections.json"), JSON.stringify([{
      electionId: "UNRELATED",
      dirName: "unrelated-dir",
      createdAt: "2026-08-13T09:55:00Z",
      status: "recorded",
    }], null, 2));

    expect(() => applyMigrationPlan(root, plan, approval)).toThrow(/registry conflict after move/);
    expect(() => applyMigrationPlan(root, plan, approval)).toThrow(/registry conflict after move/);
    expect(() => applyMigrationPlan(root, plan, approval)).toThrow(/registry conflict after move/);
    const stored = readMigrationReceipt(root, OPERATION_ID);
    expect(stored?.recoveryDetails).toEqual([...new Set(stored?.recoveryDetails)]);
  });

  test("a canonical multi-question corpus keeps question IDs and digest across an approved move", () => {
    seedCanonicalElection();
    const plan = createMigrationPlan(root, {
      operationId: V2_OPERATION_ID,
      electionId: V2_ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    const beforeSchema = bytesUnder(join(root, plan.sourcePath));
    const receipt = applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    });
    const fidelity = verifyMigrationPlan(root, plan);

    expect(receipt.status).toBe("verified");
    expect(fidelity).toMatchObject({
      beforeDigest: plan.beforeDigest,
      afterDigest: plan.beforeDigest,
      canonicalQuestionIds: ["q1", "q2"],
      resultCount: 2,
      runCount: 1,
      match: true,
      findings: [],
    });
    expect(bytesUnder(join(root, plan.targetPath))).toEqual(beforeSchema);
    expect(existsSync(join(root, plan.sourcePath))).toBe(false);
  });

  test("a tampered multi-question target fails closed without deleting evidence", () => {
    seedCanonicalElection();
    const plan = createMigrationPlan(root, {
      operationId: V2_OPERATION_ID,
      electionId: V2_ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    mkdirSync(join(root, ".migration-receipts"));
    writeFileSync(join(root, ".migration-receipts", `${V2_OPERATION_ID}.json`), JSON.stringify({
      operationId: V2_OPERATION_ID,
      electionId: V2_ELECTION_ID,
      planDigest: plan.planDigest,
      status: "planned",
      completedSteps: [],
      afterDigest: null,
      failureDetail: null,
      recoveryDetails: [],
    }));
    renameSync(join(root, plan.sourcePath), join(root, plan.targetPath));
    writeFileSync(join(root, plan.targetPath, "timeline.json"), "[]");

    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/dirty|digest|unexpected/i);
    expect(existsSync(join(root, plan.targetPath))).toBe(true);
    expect(readMigrationReceipt(root, V2_OPERATION_ID)).toMatchObject({
      status: "failed",
    });
  });

  test("planner rejects invalid input and identity conflicts", () => {
    expect(() => createMigrationPlan(root, {
      operationId: "../escape",
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    })).toThrow(/invalid operationId/);
    expect(() => createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "not-a-timestamp",
    })).toThrow(/invalid createdAt/);
    expect(() => createMigrationPlan(root, {
      operationId: "missing-source",
      electionId: "missing-election",
      createdAt: "2026-08-13T09:55:00Z",
    })).toThrow(/source is missing/);

    writeFileSync(join(root, "elections.json"), JSON.stringify([{
      electionId: ELECTION_ID,
      dirName: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
      status: "recorded",
    }], null, 2));
    expect(() => createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    })).toThrow(/already registered/);
    rmSync(join(root, "elections.json"));

    const election = JSON.parse(readFileSync(join(root, ELECTION_ID, "election.json"), "utf8"));
    writeFileSync(join(root, ELECTION_ID, "election.json"), JSON.stringify({
      ...election,
      electionId: "OTHER",
    }, null, 2));
    expect(() => createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    })).toThrow(/identity mismatch|corrupt/);
    writeFileSync(join(root, ELECTION_ID, "election.json"), JSON.stringify(election, null, 2));
  });

  test("apply rejects plan integrity conflicts and a corrupt receipt", () => {
    const plan = createMigrationPlan(root, {
      operationId: OPERATION_ID,
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:55:00Z",
    });
    const otherSource = withPlanDigest({
      ...plan,
      sourcePath: "other-source",
    });
    expect(() => applyMigrationPlan(root, otherSource, {
      approved: true,
      planDigest: otherSource.planDigest,
    })).toThrow(/plan integrity conflict: source identity/);
    const reversed = withPlanDigest({
      ...plan,
      operations: plan.operations.slice().reverse(),
    });
    expect(() => applyMigrationPlan(root, reversed, {
      approved: true,
      planDigest: reversed.planDigest,
    })).toThrow(/plan integrity conflict: operation order/);
    const registryPre = withPlanDigest({
      ...plan,
      preconditions: { ...plan.preconditions, registryDigest: `sha256:${"0".repeat(64)}` },
    });
    expect(() => applyMigrationPlan(root, registryPre, {
      approved: true,
      planDigest: registryPre.planDigest,
    })).toThrow(/plan integrity conflict: registry precondition/);
    const sourcePre = withPlanDigest({
      ...plan,
      preconditions: { ...plan.preconditions, sourceTreeDigest: `sha256:${"0".repeat(64)}` },
    });
    expect(() => applyMigrationPlan(root, sourcePre, {
      approved: true,
      planDigest: sourcePre.planDigest,
    })).toThrow(/plan integrity conflict: source precondition/);
    expect(() => applyMigrationPlan(root, {
      ...plan,
      planDigest: `sha256:${"1".repeat(64)}`,
    }, { approved: true, planDigest: `sha256:${"1".repeat(64)}` })).toThrow(/plan integrity conflict: digest mismatch/);

    writeFileSync(join(root, ELECTION_ID, "timeline.json"), "[]");
    expect(() => applyMigrationPlan(root, plan, {
      approved: true,
      planDigest: plan.planDigest,
    })).toThrow(/dirty|unexpected files|canonical source digest/);
    mkdirSync(join(root, ".migration-receipts"), { recursive: true });
    writeFileSync(join(root, ".migration-receipts", `${OPERATION_ID}.json`), "{not-json");
    expect(() => readMigrationReceipt(root, OPERATION_ID)).toThrow(/corrupt/);
  });

  test("CLI plan-verify-apply round trip and rejects corrupted plan or approval input", () => {
    project = mkdtempSync(join(tmpdir(), "election-migrate-cli-"));
    const nested = join(project, "amadeus", "spaces", "default", "elections");
    mkdirSync(nested, { recursive: true });
    renameSync(join(root, ELECTION_ID), join(nested, ELECTION_ID));
    expect(() => migrateMain(["--project-dir", project])).toThrow(/plan requires/);
    expect(migrateMain([
      "--project-dir",
      project,
      "--election",
      ELECTION_ID,
      "--operation-id",
      "migration-cli-plan",
      "--created-at",
      "2026-08-13T09:56:00Z",
    ])).toBe(0);
    const nestedPlan = createMigrationPlan(nested, {
      operationId: "migration-cli-apply",
      electionId: ELECTION_ID,
      createdAt: "2026-08-13T09:57:00Z",
    });
    const planPath = join(project, "plan.json");
    const approvalPath = join(project, "approval.json");
    writeFileSync(planPath, JSON.stringify(nestedPlan));
    writeFileSync(approvalPath, JSON.stringify({ approved: true, planDigest: nestedPlan.planDigest }));
    expect(migrateMain(["--verify", "--project-dir", project, "--plan", planPath])).toBe(1);
    expect(migrateMain([
      "--apply",
      "--project-dir",
      project,
      "--plan",
      planPath,
      "--approval",
      approvalPath,
    ])).toBe(0);
    writeFileSync(planPath, JSON.stringify({ not: "a plan" }));
    expect(() => migrateMain(["--verify", "--project-dir", project, "--plan", planPath])).toThrow(/plan is corrupt/);
    writeFileSync(approvalPath, JSON.stringify({ approved: false }));
    writeFileSync(planPath, JSON.stringify(nestedPlan));
    expect(() => migrateMain([
      "--apply",
      "--project-dir",
      project,
      "--plan",
      planPath,
      "--approval",
      approvalPath,
    ])).toThrow(/approval/);
  });
});
