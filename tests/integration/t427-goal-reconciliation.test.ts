// covers: file:tools/amadeus-goal-reconciliation.ts, function:parseGoalLineage, function:parseGoalReconciliationReceipt, function:authorizeGoalCompletion
// size: medium

import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  approveGoalRevision,
  authorizeGoalCompletion,
  buildApprovedGoalRevision,
  createGoalChangeProposal,
  createInitialGoalLineage,
  createLegacyGoalLineage,
  createLegacyGoalMigrationProposal,
  createGoalReconciliationReceipt,
  goalCompletionContextDigest,
  goalDigest,
  goalLineagePath,
  goalProposalPath,
  goalReceiptPath,
  legacyGoalProposalPath,
  parseGoalChangeProposal,
  parseGoalLineage,
  parseGoalReconciliationItems,
  parseGoalReconciliationReceipt,
  parseLegacyGoalMigrationProposal,
  readGoalChangeProposal,
  readGoalLineage,
  readGoalReconciliationReceipt,
  readLegacyGoalMigrationProposal,
  writeGoalChangeProposal,
  writeGoalLineage,
  writeGoalReconciliationReceipt,
  writeInitialGoalLineage,
  writeLegacyGoalMigrationProposal,
} from "../../packages/framework/core/tools/amadeus-goal-reconciliation.ts";
import {
  authorizePersistedCompletedWorkflow,
  authorizeWorkflowCompletion,
  workflowCompletionContextDigest,
} from "../../packages/framework/core/tools/amadeus-workflow-completion.ts";
import {
  createTestProject,
  DEFAULT_INTENT_UUID,
  seedGoalReceiptForFinalStage,
  seedStateFile,
  seededRecordDir,
} from "../harness/fixtures.ts";

const INTENT_ID = "0198a988-7bc3-7000-8000-000000000001";
const OTHER_INTENT_ID = "0198a988-7bc3-7000-8000-000000000002";
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const temporaryDirectories: string[] = [];
const originalStageGraph = process.env.AMADEUS_STAGE_GRAPH;
const originalScopeGrid = process.env.AMADEUS_SCOPE_GRID;
process.env.AMADEUS_STAGE_GRAPH = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "data",
  "stage-graph.json",
);
process.env.AMADEUS_SCOPE_GRID = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "data",
  "scope-grid.json",
);

afterAll(() => {
  if (originalStageGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
  else process.env.AMADEUS_STAGE_GRAPH = originalStageGraph;
  if (originalScopeGrid === undefined) delete process.env.AMADEUS_SCOPE_GRID;
  else process.env.AMADEUS_SCOPE_GRID = originalScopeGrid;
});

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryRecord(): string {
  const directory = mkdtempSync(join(tmpdir(), "amadeus-goal-unit-"));
  temporaryDirectories.push(directory);
  return directory;
}

function initialLineage(successMetrics: readonly string[] = []) {
  return createInitialGoalLineage({
    intentId: INTENT_ID,
    statement: "Ship a verified goal guard",
    scope: "self-fix",
    createdAt: "2026-08-04T00:00:00.000Z",
    successMetrics,
  });
}

function deterministicEvidence(reference = "tests/integration/t427-goal-reconciliation.test.ts") {
  return { kind: "deterministic-check" as const, reference, digest: SHA_A };
}

function completionState(
  lineage: ReturnType<typeof initialLineage>,
  overrides = "",
): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: Goal reconciliation unit test
- **Scope**: self-fix
- **Goal ID**: ${lineage.goalId}
- **Current Goal Revision**: ${lineage.currentRevision}
- **Current Goal Digest**: ${lineage.revisions[lineage.currentRevision].digest}

## Scope Configuration
- **Stages to Execute**: build-and-test
- **Stages to Skip**: all others
- **Execution Projection Digest**: projection-1

## Runtime State
- **Workflow Completion Instance**: terminal:build-and-test
- **Workflow Completion Stage**: build-and-test
- **Workflow Completion Status**: completed

## Stage Progress
- [x] build-and-test — EXECUTE

## Current Status
- **Status**: Completed
- **Last Completed Stage**: build-and-test
${overrides}`;
}

function achievedReceipt() {
  const lineage = createInitialGoalLineage({
    intentId: INTENT_ID,
    statement: "Ship a verified goal guard",
    scope: "self-fix",
    createdAt: "2026-08-04T00:00:00.000Z",
  });
  const completionContextDigest = goalCompletionContextDigest({
    scope: "self-fix",
    finalStage: "build-and-test",
    executionProjection: "3.6",
  });
  const receipt = createGoalReconciliationReceipt({
    lineage,
    scope: "self-fix",
    finalStage: "build-and-test",
    completionInstance: "terminal:build-and-test",
    completionContextDigest,
    items: [{
      id: "goal-statement",
      verdict: "ACHIEVED",
      evidence: [deterministicEvidence("tests/integration/t427.test.ts")],
    }],
    humanRulingReference: null,
    createdAt: "2026-08-04T01:00:00.000Z",
  });
  return { lineage, receipt, completionContextDigest };
}

describe("goal reconciliation codec", () => {
  test("initial goal revision is immutable and digest-bound", () => {
    const lineage = createInitialGoalLineage({
      intentId: INTENT_ID,
      statement: "Ship a verified goal guard",
      scope: "self-fix",
      createdAt: "2026-08-04T00:00:00.000Z",
    });

    expect(lineage.currentRevision).toBe(0);
    expect(lineage.revisions).toHaveLength(1);
    expect(lineage.revisions[0].parentRevision).toBeNull();
    expect(lineage.revisions[0].digest).toMatch(/^[0-9a-f]{64}$/);
    expect(parseGoalLineage(`${JSON.stringify(lineage)}\n`)).toEqual(lineage);
  });

  test("rejects a lineage whose approved content was changed", () => {
    const lineage = createInitialGoalLineage({
      intentId: INTENT_ID,
      statement: "Ship a verified goal guard",
      scope: "self-fix",
      createdAt: "2026-08-04T00:00:00.000Z",
    });
    const tampered = {
      ...lineage,
      revisions: [
        { ...lineage.revisions[0], statement: "Silently weakened goal" },
      ],
    };

    expect(() => parseGoalLineage(JSON.stringify(tampered))).toThrow(/digest/i);
  });

  test("rejects unknown verdicts instead of coercing them", () => {
    const { receipt } = achievedReceipt();
    const invalid = { ...receipt, overallVerdict: "COMPLETE" };

    expect(() => parseGoalReconciliationReceipt(JSON.stringify(invalid))).toThrow(
      /verdict/i,
    );
  });

  test("round-trips legacy lineage and rejects malformed lineage structure", () => {
    const legacy = createLegacyGoalLineage({
      intentId: INTENT_ID,
      statement: "Recover the approved legacy goal",
      scope: "self-fix",
      createdAt: "2026-08-04T00:00:00.000Z",
      successMetrics: ["The migration is auditable"],
      approvalReference: "audit:HUMAN_TURN:2026-08-04T00:00:00.000Z",
    });
    expect(legacy.revisions[0].source).toBe("legacy-migration");
    expect(parseGoalLineage(JSON.stringify(legacy))).toEqual(legacy);

    for (const invalid of [
      "{",
      JSON.stringify({ ...legacy, schemaVersion: 2 }),
      JSON.stringify({ ...legacy, revisions: [] }),
      JSON.stringify({ ...legacy, currentRevision: -1 }),
      JSON.stringify({ ...legacy, currentRevision: 1 }),
      JSON.stringify({ ...legacy, intentId: "" }),
    ]) {
      expect(() => parseGoalLineage(invalid)).toThrow();
    }

    const invalidSource = structuredClone(legacy) as unknown as {
      revisions: Array<Record<string, unknown>>;
    };
    invalidSource.revisions[0].source = "invented";
    expect(() => parseGoalLineage(JSON.stringify(invalidSource))).toThrow(/source/i);
  });

  test("rejects invalid primitive fields in approved revisions", () => {
    const lineage = initialLineage();
    const mutate = (field: string, value: unknown) => {
      const copy = structuredClone(lineage) as unknown as {
        revisions: Array<Record<string, unknown>>;
      };
      copy.revisions[0][field] = value;
      return JSON.stringify(copy);
    };

    expect(() => parseGoalLineage(mutate("statement", ""))).toThrow(/non-empty/i);
    expect(() => parseGoalLineage(mutate("revision", -1))).toThrow(/integer/i);
    expect(() => parseGoalLineage(mutate("createdAt", "yesterday"))).toThrow(/ISO/i);
    expect(() => parseGoalLineage(mutate("digest", "not-a-digest"))).toThrow(/SHA-256/i);
    expect(() => parseGoalLineage(mutate("successMetrics", "not-an-array"))).toThrow(/array/i);
  });

  test("rejects a digest-valid revision with the wrong immutable parent", () => {
    const lineage = initialLineage();
    const proposal = createGoalChangeProposal({
      lineage,
      statementAfter: "Approved next statement",
      successMetricsAfter: [],
      reason: "Exercise lineage validation",
      unmetCurrentGoalItems: [],
      impact: "No external impact",
      evidence: [],
      createdAt: "2026-08-04T01:00:00.000Z",
    });
    const approved = buildApprovedGoalRevision({
      lineage,
      proposal,
      approvalReference: "audit:HUMAN_TURN:2026-08-04T01:30:00.000Z",
      approvedAt: "2026-08-04T01:30:00.000Z",
    });
    const invalidRevision = {
      ...approved.revisions[1],
      parentRevision: null,
    };
    const { digest: _digest, ...digestInput } = invalidRevision;
    const invalid = {
      ...approved,
      revisions: [
        approved.revisions[0],
        { ...invalidRevision, digest: goalDigest(digestInput) },
      ],
    };
    expect(() => parseGoalLineage(JSON.stringify(invalid))).toThrow(/parent/i);
  });

  test("parses reconciliation items and enforces their evidence contract", () => {
    const items = [
      { id: "goal-statement", verdict: "ACHIEVED" as const, evidence: [deterministicEvidence()] },
      { id: "success-metric-1", verdict: "DEVIATED" as const, evidence: [deterministicEvidence("proof-2")] },
    ];
    expect(parseGoalReconciliationItems(JSON.stringify(items))).toEqual(items);

    for (const invalid of [
      "{",
      "[]",
      JSON.stringify({}),
      JSON.stringify([{ ...items[0], evidence: [] }]),
      JSON.stringify([{ ...items[0], verdict: "UNKNOWN" }]),
      JSON.stringify([{ ...items[0], evidence: [{ ...deterministicEvidence(), kind: "guess" }] }]),
      JSON.stringify([{ ...items[0], evidence: [{ ...deterministicEvidence(), reference: "" }] }]),
      JSON.stringify([{ ...items[0], evidence: [{ ...deterministicEvidence(), digest: "bad" }] }]),
    ]) {
      expect(() => parseGoalReconciliationItems(invalid)).toThrow();
    }
  });

  test("validates aggregate and human-ruling receipt invariants", () => {
    const { lineage, receipt, completionContextDigest } = achievedReceipt();
    const humanReference = "audit:HUMAN_TURN:2026-08-04T00:30:00.000Z";
    const human = createGoalReconciliationReceipt({
      lineage,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest,
      items: [{
        id: "goal-statement",
        verdict: "ACHIEVED",
        evidence: [{
          kind: "human-ruling",
          reference: humanReference,
          digest: SHA_A,
        }],
      }],
      humanRulingReference: humanReference,
      createdAt: "2026-08-04T01:00:00.000Z",
    });
    expect(parseGoalReconciliationReceipt(JSON.stringify(human))).toEqual(human);
    expect(() => parseGoalReconciliationReceipt(JSON.stringify({
      ...receipt,
      evidenceDigest: SHA_A,
    }))).toThrow(/evidenceDigest/i);
    expect(() => parseGoalReconciliationReceipt(JSON.stringify({
      ...receipt,
      receiptId: "receipt-tampered",
    }))).toThrow(/receiptId/i);

    for (const invalid of [
      "{",
      JSON.stringify({ ...receipt, schemaVersion: 2 }),
      JSON.stringify({ ...receipt, items: [] }),
      JSON.stringify({ ...receipt, items: [{ ...receipt.items[0], verdict: "DEVIATED" }] }),
      JSON.stringify({ ...human, humanRulingReference: null }),
      JSON.stringify({ ...receipt, completionContextDigest: "bad" }),
      JSON.stringify({ ...receipt, createdAt: "invalid" }),
    ]) {
      expect(() => parseGoalReconciliationReceipt(invalid)).toThrow();
    }
  });
});

describe("goal proposal and revision lifecycle", () => {
  test("creates, parses, persists, and approves a Goal change proposal", () => {
    const record = temporaryRecord();
    const lineage = initialLineage(["Old metric"]);
    writeInitialGoalLineage(record, lineage);
    const proposal = createGoalChangeProposal({
      lineage,
      statementAfter: "Ship the guard with an explicit human decision",
      successMetricsAfter: ["Every completion has a receipt"],
      reason: "The accepted intent was clarified during implementation",
      unmetCurrentGoalItems: ["Old metric"],
      impact: "The final contract is stronger and remains reviewable",
      evidence: [deterministicEvidence()],
      createdAt: "2026-08-04T02:00:00.000Z",
    });

    expect(proposal.createdBy).toBe("ai-change-proposal");
    expect(parseGoalChangeProposal(JSON.stringify(proposal))).toEqual(proposal);
    writeGoalChangeProposal(record, proposal);
    writeGoalChangeProposal(record, proposal);
    expect(readGoalChangeProposal(record, proposal.proposalId)).toEqual(proposal);
    expect(goalProposalPath(record, proposal.proposalId)).toContain(proposal.proposalId);

    const approved = approveGoalRevision({
      recordDir: record,
      proposal,
      approvalReference: "audit:HUMAN_TURN:2026-08-04T02:30:00.000Z",
      approvedAt: "2026-08-04T02:30:00.000Z",
    });
    expect(approved.currentRevision).toBe(1);
    expect(approved.revisions[1]).toMatchObject({
      parentRevision: 0,
      source: "approved-change-proposal",
      statement: proposal.statementAfter,
    });
    expect(readGoalLineage(record)).toEqual(approved);
  });

  test("rejects malformed, tampered, stale, missing, and colliding proposals", () => {
    const record = temporaryRecord();
    const lineage = initialLineage();
    const proposal = createGoalChangeProposal({
      lineage,
      statementAfter: "Revised statement",
      successMetricsAfter: [],
      reason: "Human-approved clarification",
      unmetCurrentGoalItems: [],
      impact: "No scope expansion",
      evidence: [],
      createdAt: "2026-08-04T02:00:00.000Z",
      createdBy: "human-change-proposal",
    });

    for (const invalid of [
      "{",
      JSON.stringify({ ...proposal, schemaVersion: 2 }),
      JSON.stringify({ ...proposal, evidence: "invalid" }),
      JSON.stringify({ ...proposal, createdBy: "agent-decided" }),
      JSON.stringify({ ...proposal, proposalId: "proposal-tampered" }),
    ]) {
      expect(() => parseGoalChangeProposal(invalid)).toThrow();
    }

    expect(() => readGoalChangeProposal(record, proposal.proposalId)).toThrow(/missing/i);
    writeGoalChangeProposal(record, proposal);
    writeFileSync(
      goalProposalPath(record, proposal.proposalId),
      JSON.stringify({ ...proposal, impact: "Different content" }),
    );
    expect(() => writeGoalChangeProposal(record, proposal)).toThrow(
      /same identity.*different content/i,
    );

    expect(() => buildApprovedGoalRevision({
      lineage,
      proposal: { ...proposal, intentId: OTHER_INTENT_ID },
      approvalReference: "audit:HUMAN_TURN:2026-08-04T02:30:00.000Z",
      approvedAt: "2026-08-04T02:30:00.000Z",
    })).toThrow(/stale|another Intent/i);
  });

  test("uses legacy migration source for an approved reconstruction", () => {
    const lineage = initialLineage();
    const proposal = createGoalChangeProposal({
      lineage,
      statementAfter: "Reconstructed approved statement",
      successMetricsAfter: [],
      reason: "Legacy evidence was reconstructed",
      unmetCurrentGoalItems: [],
      impact: "Restores the original authority chain",
      evidence: [],
      createdAt: "2026-08-04T02:00:00.000Z",
      createdBy: "legacy-reconstruction",
    });
    const approved = buildApprovedGoalRevision({
      lineage,
      proposal,
      approvalReference: "audit:HUMAN_TURN:2026-08-04T02:30:00.000Z",
      approvedAt: "2026-08-04T02:30:00.000Z",
    });
    expect(approved.revisions[1].source).toBe("legacy-migration");
  });
});

describe("legacy Goal migration proposal", () => {
  test("round-trips and persists proposals with and without requirements", () => {
    const record = temporaryRecord();
    const proposal = createLegacyGoalMigrationProposal({
      intentId: INTENT_ID,
      statement: "Restore the legacy goal",
      scope: "self-fix",
      successMetrics: ["Human authority is explicit"],
      stateProject: "Legacy project field",
      requirementsReference: "requirements.md",
      requirementsDigest: SHA_A,
      completionAuditDigest: SHA_B,
      uncertainties: ["The original metric wording was implicit"],
      createdAt: "2026-08-04T03:00:00.000Z",
    });
    expect(parseLegacyGoalMigrationProposal(JSON.stringify(proposal))).toEqual(proposal);
    writeLegacyGoalMigrationProposal(record, proposal);
    writeLegacyGoalMigrationProposal(record, proposal);
    expect(readLegacyGoalMigrationProposal(record, proposal.proposalId)).toEqual(proposal);
    expect(legacyGoalProposalPath(record, proposal.proposalId)).toContain(proposal.proposalId);

    const withoutRequirements = createLegacyGoalMigrationProposal({
      ...proposal,
      requirementsReference: null,
      requirementsDigest: null,
    });
    expect(withoutRequirements.requirementsReference).toBeNull();
  });

  test("rejects malformed, unpaired, tampered, missing, and colliding proposals", () => {
    const record = temporaryRecord();
    const input = {
      intentId: INTENT_ID,
      statement: "Restore the legacy goal",
      scope: "self-fix",
      successMetrics: [] as string[],
      stateProject: "Legacy project field",
      requirementsReference: "requirements.md",
      requirementsDigest: SHA_A,
      completionAuditDigest: SHA_B,
      uncertainties: [] as string[],
      createdAt: "2026-08-04T03:00:00.000Z",
    };
    const proposal = createLegacyGoalMigrationProposal(input);

    expect(() => createLegacyGoalMigrationProposal({
      ...input,
      requirementsDigest: null,
    })).toThrow(/both be present or absent/i);
    expect(() => createLegacyGoalMigrationProposal({
      ...input,
      requirementsDigest: "bad",
    })).toThrow(/SHA-256/i);
    for (const invalid of [
      "{",
      JSON.stringify({ ...proposal, schemaVersion: 2 }),
      JSON.stringify({ ...proposal, proposalId: "legacy-tampered" }),
    ]) {
      expect(() => parseLegacyGoalMigrationProposal(invalid)).toThrow();
    }

    expect(() => readLegacyGoalMigrationProposal(record, proposal.proposalId)).toThrow(/missing/i);
    writeLegacyGoalMigrationProposal(record, proposal);
    const otherProposal = createLegacyGoalMigrationProposal({
      ...input,
      createdAt: "2026-08-04T03:01:00.000Z",
    });
    writeFileSync(
      legacyGoalProposalPath(record, proposal.proposalId),
      JSON.stringify(otherProposal),
    );
    expect(() => writeLegacyGoalMigrationProposal(record, proposal)).toThrow(/collision/i);
  });
});

describe("Goal reconciliation persistence", () => {
  test("persists lineage and evidence-bound receipts", () => {
    const record = temporaryRecord();
    const lineage = initialLineage(["Every completion is checked"]);
    expect(goalLineagePath(record)).toContain("goal-lineage.json");
    writeInitialGoalLineage(record, lineage);
    expect(() => writeInitialGoalLineage(record, lineage)).toThrow(/already exists/i);
    writeGoalLineage(record, lineage);

    const completionContextDigest = goalCompletionContextDigest({
      scope: "self-fix",
      finalStage: "build-and-test",
      executionProjection: "3.6",
    });
    const receipt = createGoalReconciliationReceipt({
      lineage,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest,
      items: [
        { id: "goal-statement", verdict: "ACHIEVED", evidence: [deterministicEvidence()] },
        { id: "success-metric-1", verdict: "ACHIEVED", evidence: [deterministicEvidence("proof-2")] },
      ],
      humanRulingReference: null,
      createdAt: "2026-08-04T04:00:00.000Z",
    });
    writeGoalReconciliationReceipt(record, receipt);
    expect(readGoalReconciliationReceipt(record, receipt.completionInstance)).toEqual(receipt);
    expect(goalReceiptPath(record, receipt.completionInstance)).toContain("reconciliation-receipts");
  });

  test("refuses missing files and incomplete reconciliation coverage", () => {
    const record = temporaryRecord();
    const lineage = initialLineage(["Every completion is checked"]);
    expect(() => readGoalLineage(record)).toThrow(/missing/i);
    expect(() => readGoalReconciliationReceipt(record, "terminal:build-and-test")).toThrow(/missing/i);
    expect(() => createGoalReconciliationReceipt({
      lineage,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest: SHA_A,
      items: [],
      humanRulingReference: null,
      createdAt: "2026-08-04T04:00:00.000Z",
    })).toThrow(/non-empty/i);
    expect(() => createGoalReconciliationReceipt({
      lineage,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest: SHA_A,
      items: [{ id: "goal-statement", verdict: "ACHIEVED", evidence: [deterministicEvidence()] }],
      humanRulingReference: null,
      createdAt: "2026-08-04T04:00:00.000Z",
    })).toThrow(/every current Goal item/i);
  });
});

describe("workflow completion authorization", () => {
  function authorizedFixture() {
    const projectDir = createTestProject();
    temporaryDirectories.push(projectDir);
    const recordDir = seededRecordDir(projectDir);
    const lineage = createInitialGoalLineage({
      intentId: DEFAULT_INTENT_UUID,
      statement: "Ship a verified goal guard",
      scope: "self-fix",
      createdAt: "2026-08-04T00:00:00.000Z",
    });
    const content = completionState(lineage);
    const completionInstance = "terminal:build-and-test";
    writeInitialGoalLineage(recordDir, lineage);
    const receipt = createGoalReconciliationReceipt({
      lineage,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance,
      completionContextDigest: workflowCompletionContextDigest(
        content,
        "build-and-test",
      ),
      items: [{
        id: "goal-statement",
        verdict: "ACHIEVED",
        evidence: [deterministicEvidence()],
      }],
      humanRulingReference: null,
      createdAt: "2026-08-04T05:00:00.000Z",
    });
    writeGoalReconciliationReceipt(recordDir, receipt);
    return { projectDir, recordDir, lineage, content, completionInstance, receipt };
  }

  test("authorizes the current final-stage receipt directly and after persistence", () => {
    const fixture = authorizedFixture();
    expect(authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content: fixture.content,
      completedSlug: "build-and-test",
      completionInstance: fixture.completionInstance,
    })).toEqual(fixture.receipt);
    expect(authorizePersistedCompletedWorkflow({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content: fixture.content,
    })).toEqual(fixture.receipt);
  });

  test("rejects non-final, projection-mismatched, stale, and incomplete completion state", () => {
    const fixture = authorizedFixture();
    const flatRecordDir = join(fixture.projectDir, "amadeus-docs");
    writeInitialGoalLineage(flatRecordDir, fixture.lineage);
    writeGoalReconciliationReceipt(flatRecordDir, fixture.receipt);
    expect(() => authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: flatRecordDir,
      content: fixture.content,
      completedSlug: "build-and-test",
      completionInstance: fixture.completionInstance,
    })).toThrow(/not a registered Intent directory/i);

    const aliasRecordDir = join(
      temporaryRecord(),
      "foreign-space",
      "intents",
      "foreign-record",
    );
    writeInitialGoalLineage(aliasRecordDir, fixture.lineage);
    writeGoalReconciliationReceipt(aliasRecordDir, fixture.receipt);
    expect(() => authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: aliasRecordDir,
      content: fixture.content,
      completedSlug: "build-and-test",
      completionInstance: fixture.completionInstance,
    })).toThrow(/does not match the Intent registry/i);

    expect(() => authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content: fixture.content,
      completedSlug: "requirements-analysis",
      completionInstance: fixture.completionInstance,
    })).toThrow(/not the final/i);

    expect(() => authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content: fixture.content.replace(fixture.lineage.goalId, "another-goal"),
      completedSlug: "build-and-test",
      completionInstance: fixture.completionInstance,
    })).toThrow(/projection/i);

    expect(() => authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content: fixture.content.replace("- **Scope**: self-fix", "- **Scope**: invented"),
      completedSlug: "build-and-test",
      completionInstance: fixture.completionInstance,
    })).toThrow(/invalid Scope/i);

    const staleContent = fixture.content.replace(
      "- **Execution Projection Digest**: projection-1",
      "- **Execution Projection Digest**: projection-2",
    );
    expect(() => authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content: staleContent,
      completedSlug: "build-and-test",
      completionInstance: fixture.completionInstance,
    })).toThrow(/reconciliation refused completion/i);

    expect(() => authorizePersistedCompletedWorkflow({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content: fixture.content.replace(
        "- **Last Completed Stage**: build-and-test",
        "- **Last Completed Stage**: none",
      ),
    })).toThrow(/Last Completed Stage/i);
  });

  test("rejects a self-consistent lineage whose Intent ID differs from the registry", () => {
    const fixture = authorizedFixture();
    const foreignLineage = initialLineage();
    const content = completionState(foreignLineage);
    writeGoalLineage(fixture.recordDir, foreignLineage);
    const receipt = createGoalReconciliationReceipt({
      lineage: foreignLineage,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: fixture.completionInstance,
      completionContextDigest: workflowCompletionContextDigest(content, "build-and-test"),
      items: [{
        id: "goal-statement",
        verdict: "ACHIEVED",
        evidence: [deterministicEvidence()],
      }],
      humanRulingReference: null,
      createdAt: "2026-08-04T05:30:00.000Z",
    });
    writeGoalReconciliationReceipt(fixture.recordDir, receipt);

    expect(() => authorizeWorkflowCompletion({
      projectDir: fixture.projectDir,
      recordDir: fixture.recordDir,
      content,
      completedSlug: "build-and-test",
      completionInstance: fixture.completionInstance,
    })).toThrow(/another Intent/i);
  });

  test("fixture reconciliation covers every persisted success metric", () => {
    const projectDir = createTestProject();
    temporaryDirectories.push(projectDir);
    const recordDir = seededRecordDir(projectDir);
    seedStateFile(projectDir, "state-fix-final-construction.md");
    const lineage = createInitialGoalLineage({
      intentId: DEFAULT_INTENT_UUID,
      statement: "Ship a verified goal guard",
      successMetrics: ["Every completion is receipt-bound"],
      scope: "fix",
      createdAt: "2026-08-04T00:00:00.000Z",
    });
    writeInitialGoalLineage(recordDir, lineage);

    seedGoalReceiptForFinalStage(projectDir, "build-and-test");
    const receipt = readGoalReconciliationReceipt(
      recordDir,
      "terminal:build-and-test",
    );

    expect(receipt.items.map((item) => item.id)).toEqual([
      "goal-statement",
      "success-metric-1",
    ]);
  });
});

describe("completion authorization", () => {
  test("authorizes only a current ACHIEVED receipt", () => {
    const { lineage, receipt, completionContextDigest } = achievedReceipt();

    expect(
      authorizeGoalCompletion({
        intentId: INTENT_ID,
        lineage,
        receipt,
        scope: "self-fix",
        finalStage: "build-and-test",
        completionInstance: "terminal:build-and-test",
        completionContextDigest,
      }),
    ).toEqual({ kind: "authorized", receipt });
  });

  test.each([
    ["DEVIATED", "receipt verdict is DEVIATED"],
    ["UNVERIFIED", "receipt verdict is UNVERIFIED"],
  ] as const)("rejects %s", (verdict, expected) => {
    const { lineage, receipt, completionContextDigest } = achievedReceipt();
    const rejected = authorizeGoalCompletion({
      intentId: INTENT_ID,
      lineage,
      receipt: { ...receipt, overallVerdict: verdict },
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest,
    });

    expect(rejected).toEqual({ kind: "rejected", reason: expected });
  });

  test("rejects stale revision, another Intent, and changed completion context", () => {
    const { lineage, receipt, completionContextDigest } = achievedReceipt();
    const base = {
      intentId: INTENT_ID,
      lineage,
      receipt,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest,
    };

    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, goalRevision: 1 },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/revision/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, intentId: "0198a988-7bc3-7000-8000-000000000002" },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/Intent/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        completionContextDigest: "c".repeat(64),
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/context/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, goalId: "another-goal" },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/identity/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, goalDigest: SHA_A },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/digest/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, scope: "self-feature" },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/scope/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, completionInstance: "another-instance" },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/instance/i) });
  });
});
