#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { emitAuditEvent } from "../otel/audit-emit.ts";
import {
  activeIntent,
  activeSpace,
  auditShardName,
  findAllEvents,
  getField,
  isoTimestamp,
  readAllAuditShards,
  readIntentRegistry,
  readStateFile,
  recordDir,
  recordDirMatches,
  resolveProjectDir,
  setOrInsertField,
  withAuditLock,
  writeStateFile,
} from "./amadeus-lib.ts";
import { appendLifecycleAuditEntryUnlocked } from "./amadeus-audit.ts";
import {
  buildApprovedGoalRevision,
  createGoalChangeProposal,
  createLegacyGoalLineage,
  createLegacyGoalMigrationProposal,
  createGoalReconciliationReceipt,
  goalDigest,
  goalLineagePath,
  parseGoalReconciliationItems,
  readGoalChangeProposal,
  readLegacyGoalMigrationProposal,
  readGoalLineage,
  writeGoalChangeProposal,
  writeInitialGoalLineage,
  writeLegacyGoalMigrationProposal,
  writeGoalLineage,
  writeGoalReconciliationReceipt,
} from "./amadeus-goal-reconciliation.ts";
import { workflowCompletionContextDigest } from "./amadeus-workflow-completion.ts";

type GoalTarget = {
  readonly projectDir: string;
  readonly space: string;
  readonly intent: string;
  readonly recordDir: string;
};

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    fail(`${name} requires a value`);
  }
  return value;
}

function requiredFlag(args: readonly string[], name: string): string {
  const value = flag(args, name)?.trim();
  if (!value) fail(`${name} is required`);
  return value;
}

function target(args: readonly string[]): GoalTarget {
  const projectDir = resolveProjectDir(flag(args, "--project-dir"));
  const space = flag(args, "--space") ?? activeSpace(projectDir);
  const intent = flag(args, "--intent") ?? activeIntent(projectDir, space);
  if (!intent) fail("Goal operation could not resolve an Intent");
  const resolvedRecord = recordDir(projectDir, intent, space);
  if (!resolvedRecord) fail(`Goal operation could not resolve record ${intent}`);
  return { projectDir, space, intent, recordDir: resolvedRecord };
}

function jsonStringArray(raw: string | undefined, label: string): string[] {
  if (raw === undefined) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (cause) {
    fail(`${label} must be a JSON string array: ${String(cause)}`);
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail(`${label} must be a JSON string array`);
  }
  return value as string[];
}

function latestHumanTurnAfter(target: GoalTarget, timestamp: string): string | null {
  const audit = readAllAuditShards(target.projectDir, target.intent, target.space);
  const turns = findAllEvents(audit, "HUMAN_TURN")
    .map((event) => event.timestamp)
    .filter((observed) => observed >= timestamp)
    .sort();
  return turns.at(-1) ?? null;
}

function emitGoalAudit(
  target: GoalTarget,
  event: string,
  fields: Record<string, string>,
): void {
  emitAuditEvent(
    event,
    fields,
    target.projectDir,
    target.intent,
    target.space,
  );
}

function targetIntentId(selected: GoalTarget): string {
  const entry = readIntentRegistry(selected.projectDir, selected.space).find(
    (candidate) => recordDirMatches(candidate, selected.intent),
  );
  if (!entry) fail(`Goal operation could not resolve Intent UUID for ${selected.intent}`);
  return entry.uuid;
}

function completionAuditDigest(selected: GoalTarget): string {
  const audit = readAllAuditShards(selected.projectDir, selected.intent, selected.space);
  return goalDigest(findAllEvents(audit, "WORKFLOW_COMPLETED"));
}

function emitSealedGoalAudit(
  selected: GoalTarget,
  event: "GOAL_CHANGE_PROPOSED" | "LEGACY_GOAL_MIGRATED",
  fields: Record<string, string>,
): void {
  appendLifecycleAuditEntryUnlocked(
    event,
    fields,
    selected.projectDir,
    selected.intent,
    selected.space,
    auditShardName(selected.projectDir),
  );
}

function handlePropose(args: readonly string[]): void {
  const selected = target(args);
  const lineage = readGoalLineage(selected.recordDir);
  const createdAt = isoTimestamp();
  const proposal = createGoalChangeProposal({
    lineage,
    statementAfter: requiredFlag(args, "--statement"),
    successMetricsAfter: jsonStringArray(flag(args, "--success-metrics"), "--success-metrics"),
    reason: requiredFlag(args, "--reason"),
    unmetCurrentGoalItems: jsonStringArray(
      flag(args, "--unmet-current-items"),
      "--unmet-current-items",
    ),
    impact: requiredFlag(args, "--impact"),
    evidence: [],
    createdAt,
    createdBy: args.includes("--human-proposal")
      ? "human-change-proposal"
      : "ai-change-proposal",
  });
  withAuditLock(
    selected.projectDir,
    () => {
      writeGoalChangeProposal(selected.recordDir, proposal);
      emitGoalAudit(selected, "GOAL_CHANGE_PROPOSED", {
        Intent: selected.intent,
        "Goal Id": proposal.goalId,
        "Proposal Id": proposal.proposalId,
        "Parent Revision": String(proposal.parentRevision),
        "Proposal Digest": goalDigest(proposal),
      });
    },
    selected.intent,
    selected.space,
  );
  process.stdout.write(`${JSON.stringify({ kind: "goal-change-proposed", proposal })}\n`);
}

function handleApproveRevision(args: readonly string[]): void {
  const selected = target(args);
  const proposalId = requiredFlag(args, "--proposal");
  requiredFlag(args, "--user-input");
  withAuditLock(
    selected.projectDir,
    () => {
      const proposal = readGoalChangeProposal(selected.recordDir, proposalId);
      const humanTurn = latestHumanTurnAfter(selected, proposal.createdAt);
      if (humanTurn === null) {
        fail(
          "Goal revision requires a direct HUMAN_TURN after the proposal; stage approval, standing delegation, and LLM input are not accepted",
        );
      }
      const approvalReference = `HUMAN_TURN:${humanTurn}:proposal:${proposal.proposalId}`;
      const before = readGoalLineage(selected.recordDir);
      const existing = before.revisions[before.currentRevision];
      let updated = before;
      if (existing.approvalReference !== approvalReference) {
        updated = buildApprovedGoalRevision({
          lineage: before,
          proposal,
          approvalReference,
          approvedAt: isoTimestamp(),
        });
        const approved = updated.revisions[updated.currentRevision];
        emitGoalAudit(selected, "GOAL_REVISION_APPROVED", {
          Intent: selected.intent,
          "Goal Id": proposal.goalId,
          "Goal Revision": String(proposal.parentRevision + 1),
          "Goal Digest": approved.digest,
          "Proposal Id": proposal.proposalId,
          "Human Turn Timestamp": humanTurn,
        });
        writeGoalLineage(selected.recordDir, updated);
      }
      const current = updated.revisions[updated.currentRevision];
      let state = readStateFile(selected.projectDir, selected.intent, selected.space);
      state = setOrInsertField(state, "## Runtime State", "Goal ID", updated.goalId);
      state = setOrInsertField(
        state,
        "## Runtime State",
        "Current Goal Revision",
        String(updated.currentRevision),
      );
      state = setOrInsertField(
        state,
        "## Runtime State",
        "Current Goal Digest",
        current.digest,
      );
      writeStateFile(selected.projectDir, state, selected.intent, selected.space);
      process.stdout.write(
        `${JSON.stringify({
          kind: "goal-revision-approved",
          goalId: updated.goalId,
          revision: updated.currentRevision,
          digest: current.digest,
          humanTurn,
        })}\n`,
      );
    },
    selected.intent,
    selected.space,
  );
}

function handleLegacyPropose(args: readonly string[]): void {
  const selected = target(args);
  if (existsSync(goalLineagePath(selected.recordDir))) {
    fail("Legacy migration is only available when Goal lineage is missing");
  }
  const state = readStateFile(selected.projectDir, selected.intent, selected.space);
  const scope = getField(state, "Scope")?.trim();
  const stateProject = getField(state, "Project")?.trim();
  if (!scope || !stateProject) fail("Legacy state requires Scope and Project fields");
  const requirementsReference = flag(args, "--requirements") ?? null;
  let requirementsDigest: string | null = null;
  if (requirementsReference !== null) {
    const path = evidenceFilePath(selected.projectDir, requirementsReference);
    if (!existsSync(path)) fail(`Legacy requirements file is missing: ${requirementsReference}`);
    requirementsDigest = createHash("sha256").update(readFileSync(path)).digest("hex");
  }
  const successMetrics = jsonStringArray(
    flag(args, "--success-metrics"),
    "--success-metrics",
  );
  const explicitUncertainties = jsonStringArray(
    flag(args, "--uncertainties"),
    "--uncertainties",
  );
  const proposal = createLegacyGoalMigrationProposal({
    intentId: targetIntentId(selected),
    statement: flag(args, "--statement")?.trim() || stateProject,
    scope,
    successMetrics,
    stateProject,
    requirementsReference,
    requirementsDigest,
    completionAuditDigest: completionAuditDigest(selected),
    uncertainties: explicitUncertainties.length > 0
      ? explicitUncertainties
      : successMetrics.length === 0
        ? ["Original success metrics were not recorded"]
        : [],
    createdAt: isoTimestamp(),
  });
  withAuditLock(
    selected.projectDir,
    () => {
      writeLegacyGoalMigrationProposal(selected.recordDir, proposal);
      emitSealedGoalAudit(selected, "GOAL_CHANGE_PROPOSED", {
        Intent: selected.intent,
        "Goal Id": `legacy-pending:${proposal.proposalId}`,
        "Proposal Id": proposal.proposalId,
        "Parent Revision": "legacy-none",
        "Proposal Digest": goalDigest(proposal),
      });
    },
    selected.intent,
    selected.space,
  );
  process.stdout.write(`${JSON.stringify({ kind: "legacy-goal-proposed", proposal })}\n`);
}

function handleApproveLegacyMigration(args: readonly string[]): void {
  const selected = target(args);
  const proposalId = requiredFlag(args, "--proposal");
  const itemsPath = requiredFlag(args, "--items");
  requiredFlag(args, "--user-input");
  withAuditLock(
    selected.projectDir,
    () => {
      const proposal = readLegacyGoalMigrationProposal(
        selected.recordDir,
        proposalId,
      );
      if (proposal.intentId !== targetIntentId(selected)) {
        fail("Legacy Goal proposal belongs to another Intent");
      }
      const humanTurn = latestHumanTurnAfter(selected, proposal.createdAt);
      if (humanTurn === null) {
        fail("Legacy Goal migration requires a direct HUMAN_TURN after the proposal");
      }
      const state = readStateFile(selected.projectDir, selected.intent, selected.space);
      if (
        getField(state, "Project")?.trim() !== proposal.stateProject ||
        getField(state, "Scope")?.trim() !== proposal.scope ||
        completionAuditDigest(selected) !== proposal.completionAuditDigest
      ) {
        fail("Legacy Goal proposal sources changed after reconstruction");
      }
      if (proposal.requirementsReference !== null) {
        const requirementsPath = evidenceFilePath(
          selected.projectDir,
          proposal.requirementsReference,
        );
        if (!existsSync(requirementsPath)) fail("Legacy requirements evidence is missing");
        const digest = createHash("sha256")
          .update(readFileSync(requirementsPath))
          .digest("hex");
        if (digest !== proposal.requirementsDigest) {
          fail("Legacy requirements evidence changed after reconstruction");
        }
      }
      const items = parseGoalReconciliationItems(
        readFileSync(evidenceFilePath(selected.projectDir, itemsPath), "utf8"),
      );
      const expectedRuling = `audit:HUMAN_TURN:${humanTurn}`;
      for (const item of items) {
        if (!item.evidence.some(
          (evidence) =>
            evidence.kind === "human-ruling" &&
            evidence.reference === expectedRuling,
        )) {
          fail(`Legacy Goal item ${item.id} lacks the approving HUMAN_TURN ruling`);
        }
      }
      validateReceiptEvidence(selected, items);
      const approvalReference =
        `HUMAN_TURN:${humanTurn}:legacy:${proposal.proposalId}`;
      const lineage = existsSync(goalLineagePath(selected.recordDir))
        ? readGoalLineage(selected.recordDir)
        : createLegacyGoalLineage({
          intentId: proposal.intentId,
          statement: proposal.statement,
          scope: proposal.scope,
          successMetrics: proposal.successMetrics,
          createdAt: isoTimestamp(),
          approvalReference,
        });
      if (
        lineage.intentId !== proposal.intentId ||
        lineage.revisions[0].source !== "legacy-migration" ||
        lineage.revisions[0].approvalReference !== approvalReference
      ) {
        fail("Existing Goal lineage does not match this legacy migration");
      }
      const finalStage = flag(args, "--final-stage") ??
        getField(state, "Last Completed Stage")?.trim();
      if (!finalStage || finalStage === "none") fail("Legacy state has no final stage");
      const completionInstance = flag(args, "--completion-instance") ??
        `terminal:${finalStage}`;
      const receipt = createGoalReconciliationReceipt({
        lineage,
        scope: proposal.scope,
        finalStage,
        completionInstance,
        completionContextDigest: workflowCompletionContextDigest(state, finalStage),
        items,
        humanRulingReference: expectedRuling,
        createdAt: isoTimestamp(),
      });
      const audit = readAllAuditShards(
        selected.projectDir,
        selected.intent,
        selected.space,
      );
      if (findAllEvents(audit, "LEGACY_GOAL_MIGRATED").length === 0) {
        emitSealedGoalAudit(selected, "LEGACY_GOAL_MIGRATED", {
          Intent: selected.intent,
          "Goal Id": lineage.goalId,
          "Goal Revision": "0",
          "Goal Digest": lineage.revisions[0].digest,
          "Goal Receipt Id": receipt.receiptId,
          "Human Turn Timestamp": humanTurn,
        });
      }
      if (!existsSync(goalLineagePath(selected.recordDir))) {
        writeInitialGoalLineage(selected.recordDir, lineage);
      }
      writeGoalReconciliationReceipt(selected.recordDir, receipt);
      let updatedState = setOrInsertField(state, "## Runtime State", "Goal ID", lineage.goalId);
      updatedState = setOrInsertField(
        updatedState,
        "## Runtime State",
        "Current Goal Revision",
        "0",
      );
      updatedState = setOrInsertField(
        updatedState,
        "## Runtime State",
        "Current Goal Digest",
        lineage.revisions[0].digest,
      );
      writeStateFile(
        selected.projectDir,
        updatedState,
        selected.intent,
        selected.space,
      );
      process.stdout.write(
        `${JSON.stringify({ kind: "legacy-goal-migrated", lineage, receipt })}\n`,
      );
    },
    selected.intent,
    selected.space,
  );
}

function evidenceFilePath(projectDir: string, reference: string): string {
  return isAbsolute(reference) ? reference : resolve(projectDir, reference);
}

function validateReceiptEvidence(
  selected: GoalTarget,
  items: ReturnType<typeof parseGoalReconciliationItems>,
): string | null {
  let humanRulingReference: string | null = null;
  const audit = readAllAuditShards(selected.projectDir, selected.intent, selected.space);
  const humanTurns = new Set(
    findAllEvents(audit, "HUMAN_TURN").map((event) => event.timestamp),
  );
  for (const item of items) {
    for (const evidence of item.evidence) {
      if (evidence.kind === "deterministic-check") {
        const path = evidenceFilePath(selected.projectDir, evidence.reference);
        if (!existsSync(path)) fail(`Evidence file is missing: ${evidence.reference}`);
        const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
        if (digest !== evidence.digest) {
          fail(`Evidence digest mismatch: ${evidence.reference}`);
        }
        continue;
      }
      const prefix = "audit:HUMAN_TURN:";
      if (!evidence.reference.startsWith(prefix)) {
        fail("Human ruling evidence must reference audit:HUMAN_TURN:<timestamp>");
      }
      const timestamp = evidence.reference.slice(prefix.length);
      if (!humanTurns.has(timestamp)) fail("Human ruling does not reference a real HUMAN_TURN");
      if (humanRulingReference !== null && humanRulingReference !== evidence.reference) {
        fail("One reconciliation receipt cannot bind multiple human rulings");
      }
      humanRulingReference = evidence.reference;
    }
  }
  return humanRulingReference;
}

function handleReconcile(args: readonly string[]): void {
  const selected = target(args);
  const itemsPath = requiredFlag(args, "--items");
  const finalStage = requiredFlag(args, "--final-stage");
  const completionInstance = requiredFlag(args, "--completion-instance");
  const sourcePath = evidenceFilePath(selected.projectDir, itemsPath);
  const items = parseGoalReconciliationItems(readFileSync(sourcePath, "utf8"));
  const humanRulingReference = validateReceiptEvidence(selected, items);
  withAuditLock(
    selected.projectDir,
    () => {
      const lineage = readGoalLineage(selected.recordDir);
      const state = readStateFile(selected.projectDir, selected.intent, selected.space);
      const scope = getField(state, "Scope")?.trim();
      if (!scope) fail("Workflow state has no Scope");
      const receipt = createGoalReconciliationReceipt({
        lineage,
        scope,
        finalStage,
        completionInstance,
        completionContextDigest: workflowCompletionContextDigest(state, finalStage),
        items,
        humanRulingReference,
        createdAt: isoTimestamp(),
      });
      writeGoalReconciliationReceipt(selected.recordDir, receipt);
      emitGoalAudit(selected, "GOAL_RECONCILED", {
        Intent: selected.intent,
        "Goal Id": receipt.goalId,
        "Goal Revision": String(receipt.goalRevision),
        "Goal Digest": receipt.goalDigest,
        "Goal Receipt Id": receipt.receiptId,
        "Goal Receipt Digest": receipt.evidenceDigest,
        "Goal Verdict": receipt.overallVerdict,
        "Completion Instance": receipt.completionInstance,
        ...(receipt.humanRulingReference === null
          ? {}
          : { "Goal Human Ruling": receipt.humanRulingReference }),
      });
      process.stdout.write(`${JSON.stringify({ kind: "goal-reconciled", receipt })}\n`);
    },
    selected.intent,
    selected.space,
  );
}

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);
  try {
    if (command === "propose") {
      handlePropose(rest);
      return;
    }
    if (command === "approve-revision") {
      handleApproveRevision(rest);
      return;
    }
    if (command === "reconcile") {
      handleReconcile(rest);
      return;
    }
    if (command === "legacy-propose") {
      handleLegacyPropose(rest);
      return;
    }
    if (command === "approve-legacy-migration") {
      handleApproveLegacyMigration(rest);
      return;
    }
    fail(
      "Usage: amadeus-goal.ts <propose|approve-revision|reconcile|legacy-propose|approve-legacy-migration> [options]",
    );
  } catch (cause) {
    fail(cause instanceof Error ? cause.message : String(cause));
  }
}

if (import.meta.main) main();
