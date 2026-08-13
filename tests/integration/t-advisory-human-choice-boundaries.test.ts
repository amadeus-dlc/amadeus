// covers: subcommand:amadeus-log:advisory-decision
// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  advisoryChoicePresentationFields,
  advisoryReportHoldReason,
  choiceFromExactPrompt,
  closeAdvisoryInstancesForStage,
  createPendingAdvisory,
  guardAdvisoryChoices,
  recordAdvisoryChoice,
  revokeMisattributedAdvisoryChoice,
  type AdvisoryChoiceStore,
  type PendingAdvisory,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  advisoryModelCheckOutputDir,
  verifyAdvisoryModelCheckOutcome,
} from "../../plugins/formal-model-check/tools/advisory-model-check.ts";
import {
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { validateDirective } from "../../packages/framework/core/tools/amadeus-directive.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";

// #2253 replaced the prompt-classifying acceptance entry point with one that
// takes an already-classified choice and a provenance union. These tests were
// written against the prompt shape, and what they pin — which prompts count and
// which provenance is refused — is unchanged, so they keep exercising the same
// route through the same two steps the hook now performs.
function recordAdvisoryChoiceViaPrompt(
  projectDir: string,
  prompt: string,
  humanTurn: { timestamp: string; shard: string; eventIdentity: string },
  now?: string,
): boolean {
  const choice = choiceFromExactPrompt(prompt);
  if (choice === null) return false;
  // True only when a receipt was WRITTEN, which is what this boolean has always
  // meant; an already-settled replay stays false here (#2967 FR-ADV-4).
  const outcome = now === undefined
    ? recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn })
    : recordAdvisoryChoice(projectDir, choice, { kind: "human-turn", ...humanTurn }, now);
  return outcome.kind === "recorded";
}


const identity = {
  plugin: "formal-model-check",
  code: "changed" as const,
  checkpoint: "requirements-analysis",
  target: "amadeus/spaces/default/specs/tla",
  specIdentity: "sha256:abc",
  intentRun: "019fc698-ba1f-7467-b6b6-57c4b5b50140",
  message: "advisory: formal-model-check spec hash CHANGED",
};

const advisory: Advisory = {
  plugin: identity.plugin,
  code: identity.code,
  message: identity.message,
  stage: identity.checkpoint,
  target: identity.target,
  specIdentity: identity.specIdentity,
};

type EvidenceFixture = {
  directory: string;
  manifest: Record<string, unknown>;
  writeManifest: (manifest: Record<string, unknown>) => void;
};

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function writeEvidence(
  projectDir: string,
  pending: PendingAdvisory,
  outcome: "NOT_DETECTED" | "DETECTED" | "HARNESS_ERROR" = "NOT_DETECTED",
): EvidenceFixture {
  const modelPath = join(projectDir, "amadeus/spaces/default/specs/tla/FormalElection.tla");
  const cfgPath = join(projectDir, "amadeus/spaces/default/specs/tla/FormalElection.cfg");
  mkdirSync(join(projectDir, "amadeus/spaces/default/specs/tla"), { recursive: true });
  writeFileSync(modelPath, "---- MODULE FormalElection ----\n====\n");
  writeFileSync(cfgPath, "SPECIFICATION Spec\n");

  const directory = advisoryModelCheckOutputDir(projectDir, pending.identity.advisoryInstance);
  mkdirSync(directory, { recursive: true });
  const runId = "00000000-0000-4000-8000-000000000001";
  const expectedArtifacts: string[] = [];
  if (outcome === "NOT_DETECTED") {
    writeJson(join(directory, "completion-marker.json"), { complete: true, runId });
    writeJson(join(directory, "env-receipt.json"), {
      schema: "amadeus.env-receipt.v1",
      runId,
      inspections: [{ id: "network-deny", status: "passed" }],
    });
    expectedArtifacts.push("completion-marker.json", "env-receipt.json");
  } else if (outcome === "DETECTED") {
    writeJson(join(directory, "counterexample.json"), { runId, counterexampleIdentity: "counterexample-1" });
    expectedArtifacts.push("counterexample.json");
  }
  const artifacts = expectedArtifacts.map((path) => ({
    path,
    bytes: readFileSync(join(directory, path)).byteLength,
    sha256: sha256(join(directory, path)),
  }));
  const manifest: Record<string, unknown> = {
    schema: "amadeus.model-check-manifest.v1",
    runId,
    outcome,
    exitCode: outcome === "NOT_DETECTED" ? 0 : outcome === "DETECTED" ? 1 : 2,
    partial: outcome === "HARNESS_ERROR",
    expectedArtifacts,
    artifacts,
    advisory: {
      target: pending.identity.target,
      specIdentity: pending.identity.specIdentity,
      instance: pending.identity.advisoryInstance,
    },
    sourceProvenance: {
      modelPath: "amadeus/spaces/default/specs/tla/FormalElection.tla",
      cfgPath: "amadeus/spaces/default/specs/tla/FormalElection.cfg",
      moduleIdentity: "registered-module",
      cfgIdentity: "registered-cfg",
      moduleSha256: sha256(modelPath),
      cfgSha256: sha256(cfgPath),
    },
    errorCode: outcome === "HARNESS_ERROR" ? "TOOL_FAILED" : null,
    errorDetail: outcome === "HARNESS_ERROR" ? "synthetic failure" : null,
  };
  const writeManifest = (value: Record<string, unknown>) => writeJson(join(directory, "manifest.json"), value);
  writeManifest(manifest);
  return { directory, manifest, writeManifest };
}

function storePath(projectDir: string): string {
  return join(docsRoot(projectDir), ".amadeus-advisory-choice.json");
}

function readStore(projectDir: string): AdvisoryChoiceStore {
  return JSON.parse(readFileSync(storePath(projectDir), "utf-8")) as AdvisoryChoiceStore;
}

function seedPendingProject(): { projectDir: string; pending: PendingAdvisory } {
  const projectDir = createTestProject();
  seedStateFile(projectDir, join(FIXTURES_DIR, "state-mid-inception.md"));
  const guarded = guardAdvisoryChoices(projectDir, identity.checkpoint, [advisory]);
  expect(guarded.kind).toBe("hold");
  return { projectDir, pending: readStore(projectDir).pending[0]! };
}

function plantHumanTurn(projectDir: string): { timestamp: string; shard: string; eventIdentity: string } {
  const planted = plantV1AuditRow("HUMAN_TURN", {}, projectDir);
  const event = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN").at(-1)!;
  return {
    timestamp: planted.timestamp,
    shard: auditShardName(projectDir),
    eventIdentity: createHash("sha256").update(event.block).digest("hex"),
  };
}

function plantAdvisoryPresentation(projectDir: string, pending: PendingAdvisory): void {
  const fields = advisoryChoicePresentationFields(
    projectDir,
    pending.identity.checkpoint,
    [pending.identity.advisoryInstance],
  );
  if (!fields.ok) throw new Error(fields.reason);
  plantV1AuditRow("DECISION_RECORDED", fields.value, projectDir);
}

describe("advisory model-check evidence boundaries", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  }));

  function fixture(): { root: string; pending: PendingAdvisory; evidence: EvidenceFixture } {
    const root = mkdtempSync(join(tmpdir(), "advisory-evidence-boundary-"));
    roots.push(root);
    const pending = createPendingAdvisory(identity, () => "019fc698-ba1f-7000-8000-000000000001");
    return { root, pending, evidence: writeEvidence(root, pending) };
  }

  test("missing, failure-directory, detected, and harness-error outcomes are classified", () => {
    const root = mkdtempSync(join(tmpdir(), "advisory-evidence-outcome-"));
    roots.push(root);
    const pending = createPendingAdvisory(identity, () => "019fc698-ba1f-7000-8000-000000000001");
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("not-run");

    const failureDir = `${advisoryModelCheckOutputDir(root, pending.identity.advisoryInstance)}.failure-001`;
    const detected = writeEvidence(root, pending, "DETECTED");
    mkdirSync(failureDir, { recursive: true });
    for (const name of ["manifest.json", "counterexample.json"]) {
      writeFileSync(join(failureDir, name), readFileSync(join(detected.directory, name)));
    }
    rmSync(detected.directory, { recursive: true, force: true });
    expect(verifyAdvisoryModelCheckOutcome(root, pending)).toMatchObject({
      kind: "detected",
      counterexampleIdentity: "counterexample-1",
    });

    const harness = writeEvidence(root, pending, "HARNESS_ERROR");
    expect(verifyAdvisoryModelCheckOutcome(root, pending)).toEqual({
      kind: "harness-error",
      runId: String(harness.manifest.runId),
      code: "TOOL_FAILED",
      detail: "synthetic failure",
    });
  });

  test("failure-directory lookup uses the sanitized advisory instance", () => {
    const root = mkdtempSync(join(tmpdir(), "advisory-evidence-safe-instance-"));
    roots.push(root);
    const pending = createPendingAdvisory(identity, () => "unsafe/instance");
    const detected = writeEvidence(root, pending, "DETECTED");
    const failureDir = `${advisoryModelCheckOutputDir(root, pending.identity.advisoryInstance)}.failure-001`;
    mkdirSync(failureDir, { recursive: true });
    for (const name of ["manifest.json", "counterexample.json"]) {
      writeFileSync(join(failureDir, name), readFileSync(join(detected.directory, name)));
    }
    rmSync(detected.directory, { recursive: true, force: true });
    expect(verifyAdvisoryModelCheckOutcome(root, pending)).toMatchObject({ kind: "detected" });
  });

  test("manifest correlation and provenance reject every mismatched identity or byte source", () => {
    const cases: Array<(manifest: Record<string, unknown>) => void> = [
      (manifest) => { manifest.schema = "wrong"; },
      (manifest) => { manifest.runId = ""; },
      (manifest) => { manifest.partial = true; },
      (manifest) => { manifest.advisory = null; },
      (manifest) => { manifest.advisory = { ...(manifest.advisory as object), target: "other" }; },
      (manifest) => { manifest.advisory = { ...(manifest.advisory as object), specIdentity: "sha256:old" }; },
      (manifest) => { manifest.advisory = { ...(manifest.advisory as object), instance: "other" }; },
      (manifest) => { manifest.sourceProvenance = null; },
      (manifest) => { manifest.sourceProvenance = { ...(manifest.sourceProvenance as object), modelPath: "missing.tla" }; },
      (manifest) => { manifest.sourceProvenance = { ...(manifest.sourceProvenance as object), modelPath: "other/FormalElection.tla" }; },
      (manifest) => { manifest.sourceProvenance = { ...(manifest.sourceProvenance as object), cfgPath: "other/FormalElection.cfg" }; },
      (manifest) => { manifest.sourceProvenance = { ...(manifest.sourceProvenance as object), moduleIdentity: "" }; },
      (manifest) => { manifest.sourceProvenance = { ...(manifest.sourceProvenance as object), moduleSha256: "0".repeat(64) }; },
      (manifest) => { manifest.sourceProvenance = { ...(manifest.sourceProvenance as object), cfgSha256: "0".repeat(64) }; },
    ];
    for (const mutate of cases) {
      const { root, pending, evidence } = fixture();
      mutate(evidence.manifest);
      evidence.writeManifest(evidence.manifest);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
  });

  test("existing provenance files outside the advisory target are rejected", () => {
    const { root, pending, evidence } = fixture();
    mkdirSync(join(root, "other"), { recursive: true });
    writeFileSync(join(root, "other/FormalElection.tla"), "---- MODULE Other ----\n====\n");
    writeFileSync(join(root, "other/FormalElection.cfg"), "SPECIFICATION Other\n");
    const provenance = evidence.manifest.sourceProvenance as Record<string, unknown>;
    provenance.modelPath = "other/FormalElection.tla";
    provenance.moduleSha256 = sha256(join(root, "other/FormalElection.tla"));
    evidence.writeManifest(evidence.manifest);
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");

    provenance.modelPath = "amadeus/spaces/default/specs/tla/FormalElection.tla";
    provenance.moduleSha256 = sha256(join(root, "amadeus/spaces/default/specs/tla/FormalElection.tla"));
    provenance.cfgPath = "other/FormalElection.cfg";
    provenance.cfgSha256 = sha256(join(root, "other/FormalElection.cfg"));
    evidence.writeManifest(evidence.manifest);
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
  });

  test("artifact inventory rejects unsafe, missing, and byte-mismatched entries", () => {
    const cases: Array<(evidence: EvidenceFixture) => void> = [
      ({ manifest }) => { manifest.expectedArtifacts = null; },
      ({ manifest }) => { manifest.expectedArtifacts = ["../escape"]; },
      ({ manifest }) => { manifest.artifacts = []; },
      ({ manifest }) => {
        manifest.artifacts = [{ ...((manifest.artifacts as object[])[0] as object), bytes: -1 }, (manifest.artifacts as object[])[1]];
      },
      ({ manifest }) => {
        manifest.artifacts = [{ ...((manifest.artifacts as object[])[0] as object), sha256: "bad" }, (manifest.artifacts as object[])[1]];
      },
    ];
    for (const mutate of cases) {
      const { root, pending, evidence } = fixture();
      mutate(evidence);
      evidence.writeManifest(evidence.manifest);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
  });

  test("outcome-specific receipts and malformed JSON fail closed", () => {
    {
      const { root, pending, evidence } = fixture();
      evidence.manifest.exitCode = 1;
      evidence.writeManifest(evidence.manifest);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
    for (const mutate of [
      (marker: Record<string, unknown>) => { marker.complete = false; },
      (marker: Record<string, unknown>) => { marker.runId = "other"; },
    ]) {
      const { root, pending, evidence } = fixture();
      const markerPath = join(evidence.directory, "completion-marker.json");
      const marker = JSON.parse(readFileSync(markerPath, "utf-8")) as Record<string, unknown>;
      mutate(marker);
      writeJson(markerPath, marker);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
    for (const receipt of [
      { schema: "wrong" },
      { schema: "amadeus.env-receipt.v1", runId: "other", inspections: [] },
      { schema: "amadeus.env-receipt.v1", runId: "00000000-0000-4000-8000-000000000001", inspections: [{}] },
    ]) {
      const { root, pending, evidence } = fixture();
      writeJson(join(evidence.directory, "env-receipt.json"), receipt);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
    {
      const root = mkdtempSync(join(tmpdir(), "advisory-detected-invalid-"));
      roots.push(root);
      const pending = createPendingAdvisory(identity, () => "019fc698-ba1f-7000-8000-000000000001");
      const evidence = writeEvidence(root, pending, "DETECTED");
      writeJson(join(evidence.directory, "counterexample.json"), { runId: "other" });
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
      evidence.manifest.expectedArtifacts = [];
      evidence.manifest.artifacts = [];
      evidence.writeManifest(evidence.manifest);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
    {
      const root = mkdtempSync(join(tmpdir(), "advisory-harness-invalid-"));
      roots.push(root);
      const pending = createPendingAdvisory(identity, () => "019fc698-ba1f-7000-8000-000000000001");
      const evidence = writeEvidence(root, pending, "HARNESS_ERROR");
      evidence.manifest.errorCode = "";
      evidence.writeManifest(evidence.manifest);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
      evidence.manifest.errorCode = "TOOL_FAILED";
      evidence.manifest.errorDetail = null;
      evidence.writeManifest(evidence.manifest);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
    {
      const { root, pending, evidence } = fixture();
      evidence.manifest.outcome = "UNKNOWN";
      evidence.writeManifest(evidence.manifest);
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
      writeFileSync(join(evidence.directory, "manifest.json"), "{");
      expect(verifyAdvisoryModelCheckOutcome(root, pending)).toMatchObject({ kind: "invalid" });
    }
  });

  test("outcome payload validation runs after a valid artifact inventory", () => {
    const refreshArtifact = (evidence: EvidenceFixture, name: string): void => {
      evidence.manifest.artifacts = (evidence.manifest.artifacts as Array<Record<string, unknown>>).map((artifact) =>
        artifact.path === name
          ? { ...artifact, bytes: readFileSync(join(evidence.directory, name)).byteLength, sha256: sha256(join(evidence.directory, name)) }
          : artifact
      );
      evidence.writeManifest(evidence.manifest);
    };

    for (const receipt of [
      { schema: "wrong" },
      { schema: "amadeus.env-receipt.v1", runId: "other", inspections: [] },
      { schema: "amadeus.env-receipt.v1", runId: "00000000-0000-4000-8000-000000000001", inspections: [{}] },
    ]) {
      const { root, pending, evidence } = fixture();
      writeJson(join(evidence.directory, "env-receipt.json"), receipt);
      refreshArtifact(evidence, "env-receipt.json");
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }

    for (const marker of [
      { complete: false, runId: "00000000-0000-4000-8000-000000000001" },
      { complete: true, runId: "other" },
    ]) {
      const { root, pending, evidence } = fixture();
      writeJson(join(evidence.directory, "completion-marker.json"), marker);
      refreshArtifact(evidence, "completion-marker.json");
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }

    for (const counterexample of [
      { runId: "other", counterexampleIdentity: "counterexample-1" },
      { runId: "00000000-0000-4000-8000-000000000001", counterexampleIdentity: "" },
    ]) {
      const root = mkdtempSync(join(tmpdir(), "advisory-counterexample-boundary-"));
      roots.push(root);
      const pending = createPendingAdvisory(identity, () => "019fc698-ba1f-7000-8000-000000000001");
      const evidence = writeEvidence(root, pending, "DETECTED");
      writeJson(join(evidence.directory, "counterexample.json"), counterexample);
      refreshArtifact(evidence, "counterexample.json");
      expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    }
  });
});

describe("protected advisory choice persistence", () => {
  const projects: string[] = [];
  afterEach(() => projects.splice(0).forEach(cleanupTestProject));

  function project(): { projectDir: string; pending: PendingAdvisory } {
    const value = seedPendingProject();
    projects.push(value.projectDir);
    return value;
  }

  test("only the exact two canonical answers are accepted", () => {
    expect(choiceFromExactPrompt(" 1 ")).toBe("run-now");
    expect(choiceFromExactPrompt("今すぐ実行する")).toBe("run-now");
    expect(choiceFromExactPrompt("run-now")).toBe("run-now");
    expect(choiceFromExactPrompt("2")).toBe("defer-with-risk");
    expect(choiceFromExactPrompt("リスクを承知して延期する")).toBe("defer-with-risk");
    expect(choiceFromExactPrompt("defer-with-risk")).toBe("defer-with-risk");
    expect(choiceFromExactPrompt("approve")).toBeNull();
  });

  test("pendingだけでは別gateの1を消費せず、提示直後の1だけを相関する", () => {
    const { projectDir, pending } = project();
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);

    plantAdvisoryPresentation(projectDir, pending);
    const humanTurn = plantHumanTurn(projectDir);
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", humanTurn, "2026-08-03T12:00:00.001Z")).toBe(true);
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", humanTurn)).toBe(false);
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);
    const rerun = guardAdvisoryChoices(projectDir, identity.checkpoint, [advisory]);
    expect(rerun.kind).toBe("hold");
    if (rerun.kind === "hold") {
      expect(rerun.advisories[0]?.result).toContain("plugin's own evaluator");
    }
    expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("advisory hold remains");
  });

  test("advisory提示は次の人間ターンだけに有効で、非choiceを挟むと失効する", () => {
    const { projectDir, pending } = project();
    plantAdvisoryPresentation(projectDir, pending);
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "not a choice", plantHumanTurn(projectDir))).toBe(false);
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);
    expect(readStore(projectDir).receipts).toHaveLength(0);
  });

  test("未提示run-nowをplugin固有の証跡解釈なしで補正する", () => {
    {
      const { projectDir, pending } = project();
      const humanTurn = plantHumanTurn(projectDir);
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 2,
        identity: pending.identity,
        choice: "run-now",
        provenance: { kind: "human-turn", ...humanTurn },
        recordedAt: "2026-08-03T12:00:00.001Z",
      });
      writeJson(storePath(projectDir), store);
      expect(revokeMisattributedAdvisoryChoice(
        projectDir,
        pending.identity.advisoryInstance,
        humanTurn.eventIdentity,
        "2026-08-03T12:00:01.000Z",
      )).toEqual({ ok: true });
      expect(advisoryReportHoldReason(projectDir, pending.identity.checkpoint)).toContain("unresolved advisory choice");
    }
    {
      const { projectDir, pending } = project();
      const humanTurn = plantHumanTurn(projectDir);
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 2,
        identity: pending.identity,
        choice: "run-now",
        provenance: { kind: "human-turn", ...humanTurn },
        recordedAt: "2026-08-03T12:00:00.001Z",
      });
      writeJson(storePath(projectDir), store);
      writeEvidence(projectDir, pending);
      expect(revokeMisattributedAdvisoryChoice(
        projectDir,
        pending.identity.advisoryInstance,
        humanTurn.eventIdentity,
      )).toEqual({ ok: true });
    }
    {
      const { projectDir, pending } = project();
      const humanTurn = plantHumanTurn(projectDir);
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 2,
        identity: pending.identity,
        choice: "run-now",
        provenance: { kind: "human-turn", ...humanTurn },
        recordedAt: "2026-08-03T12:00:00.001Z",
      });
      writeJson(storePath(projectDir), store);
      unlinkSync(auditFilePath(projectDir));
      expect(revokeMisattributedAdvisoryChoice(
        projectDir,
        pending.identity.advisoryInstance,
        humanTurn.eventIdentity,
      )).toEqual({ ok: true });
    }
  });

  test("invalid store, shard, audit provenance, closed instances, and repeat-after-defer are rejected", () => {
    {
      const { projectDir } = project();
      const turn = plantHumanTurn(projectDir);
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "approve", turn)).toBe(false);
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", { ...turn, shard: "other.jsonl" })).toBe(false);
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", { ...turn, eventIdentity: "not-grounded" })).toBe(false);
    }
    {
      const { projectDir } = project();
      const turn = plantHumanTurn(projectDir);
      writeFileSync(storePath(projectDir), "{");
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", turn)).toBe(false);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
      closeAdvisoryInstancesForStage(projectDir, identity.checkpoint);
    }
    {
      const { projectDir } = project();
      const turn = plantHumanTurn(projectDir);
      unlinkSync(auditFilePath(projectDir));
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", turn)).toBe(false);
    }
    {
      const { projectDir } = project();
      closeAdvisoryInstancesForStage(projectDir, identity.checkpoint, "2026-08-03T12:00:00.000Z");
      closeAdvisoryInstancesForStage(projectDir, identity.checkpoint, "2026-08-03T12:00:01.000Z");
      expect(readStore(projectDir).pending[0]?.closedAt).toBe("2026-08-03T12:00:00.000Z");
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toBeNull();
    }
    {
      const { projectDir, pending } = project();
      plantAdvisoryPresentation(projectDir, pending);
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "2", plantHumanTurn(projectDir))).toBe(true);
      expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toBeNull();
    }
  });

  test("stage completion closes only the active intent run", () => {
    const { projectDir } = project();
    const store = readStore(projectDir);
    store.pending.push({
      ...store.pending[0]!,
      identity: {
        ...store.pending[0]!.identity,
        intentRun: "00000000-0000-7000-8000-000000000002",
        advisoryInstance: "019fc698-ba1f-7000-8000-000000000002",
      },
    });
    writeJson(storePath(projectDir), store);

    closeAdvisoryInstancesForStage(projectDir, identity.checkpoint, "2026-08-03T12:00:00.000Z");

    const closed = readStore(projectDir).pending;
    expect(closed[0]?.closedAt).toBe("2026-08-03T12:00:00.000Z");
    expect(closed[1]?.closedAt).toBeUndefined();
  });

  test("invalid pending and receipt store members fail closed", () => {
    for (const mutate of [
      // A malformed code still fails closed. The set of ACCEPTED codes is no
      // longer the three activation kinds alone: a composed plugin declares its
      // own advisory code (ADR-6 revision), so a well-formed slug like
      // "unknown" is now a legitimate declared code and only a code that
      // cannot be one — e.g. one carrying spaces — is invalid.
      (store: AdvisoryChoiceStore) => { store.pending[0]!.identity.code = "not a code" as "changed"; },
      (store: AdvisoryChoiceStore) => { store.pending[0]!.message = ""; },
      (store: AdvisoryChoiceStore) => { store.pending[0]!.closedAt = ""; },
      (store: AdvisoryChoiceStore) => { (store as unknown as Record<string, unknown>).schema = 3; },
    ]) {
      const { projectDir } = project();
      const store = readStore(projectDir);
      mutate(store);
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
    {
      const { projectDir } = project();
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 2,
        identity: store.pending[0]!.identity,
        choice: "run-now",
        provenance: { kind: "human-turn", timestamp: "", shard: "shard", eventIdentity: "event" },
        recordedAt: "2026-08-03T12:00:00.000Z",
      });
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
    {
      const { projectDir } = project();
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 2,
        identity: store.pending[0]!.identity,
        choice: "run-now",
        provenance: { kind: "human-turn", timestamp: "2026-08-03T12:00:00.000Z", shard: "shard", eventIdentity: "" },
        recordedAt: "invalid",
      });
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
    {
      const { projectDir } = project();
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 2,
        identity: store.pending[0]!.identity,
        choice: "run-now",
        provenance: {
          kind: "human-turn",
          timestamp: "2026-08-03T12:00:00.000Z",
          shard: "shard",
          eventIdentity: "event",
        },
        recordedAt: "invalid",
      });
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
    for (const revoked of [
      { revokedAt: "2026-08-03T12:00:01.000Z" },
      { revokedAt: "invalid", revocationReason: "misattributed-human-turn" },
    ]) {
      const { projectDir } = project();
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 2,
        identity: store.pending[0]!.identity,
        choice: "run-now",
        provenance: {
          kind: "human-turn",
          timestamp: "2026-08-03T12:00:00.000Z",
          shard: "shard",
          eventIdentity: "event",
        },
        recordedAt: "2026-08-03T12:00:00.000Z",
        ...revoked,
      } as AdvisoryChoiceStore["receipts"][number]);
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
  });

  test("run-now holdはplugin証跡を解釈せずevaluatorのno-holdを待つ", () => {
    const { projectDir, pending } = project();
    const hostRoot = join(projectDir, ".harness");
    mkdirSync(hostRoot, { recursive: true });
    writeJson(join(hostRoot, ".amadeus-plugin-composition.json"), {
      plugins: [[identity.plugin, { stageIndex: [] }]],
    });
    mkdirSync(join(projectDir, "plugins", identity.plugin), { recursive: true });
    writeJson(join(projectDir, "plugins", identity.plugin, "plugin.json"), {
      name: identity.plugin,
      tools: [],
      advisories: [{
        code: identity.code,
        checkpoints: [identity.checkpoint],
        evaluator: { argv: ["bun", "tools/evaluate.ts"] },
      }],
    });
    plantAdvisoryPresentation(projectDir, pending);
    expect(recordAdvisoryChoiceViaPrompt(projectDir, "1", plantHumanTurn(projectDir))).toBe(true);

    writeEvidence(projectDir, pending, "DETECTED");
    let evaluatorCalls = 0;
    const reportHold = advisoryReportHoldReason(projectDir, identity.checkpoint, hostRoot, () => {
      evaluatorCalls += 1;
      return {
        status: 1,
        stdout: JSON.stringify({ verdict: { kind: "hold", reasons: [{ kind: "changed" }] } }),
      };
    });
    expect(evaluatorCalls).toBe(1);
    expect(reportHold).toContain("plugin's own evaluator");
    expect(guardAdvisoryChoices(projectDir, identity.checkpoint, [advisory], hostRoot).kind).toBe("hold");
    expect(existsSync(storePath(projectDir))).toBe(true);
  });
});

describe("core advisory directive validation boundaries", () => {
  const base = () => ({
    kind: "await-advisory-choice",
    stage: "requirements-analysis",
    question: "形式検査advisoryについて選択してください。",
    options: ["今すぐ実行する", "リスクを承知して延期する"],
    advisories: [{
      plugin: "formal-model-check",
      code: "changed",
      message: identity.message,
      checkpoint: identity.checkpoint,
      target: identity.target,
      spec_identity: identity.specIdentity,
      intent_run: identity.intentRun,
      advisory_instance: "019fc698-ba1f-7000-8000-000000000001",
    }],
  });
  const errors = (value: unknown): string => {
    const result = validateDirective(value);
    return result.valid ? "" : result.errors.join("|");
  };

  test("malformed advisory items fail closed in the source validator", () => {
    expect(errors({ ...base(), advisories: [] })).toContain("advisories must be a non-empty array");
    expect(errors({ ...base(), advisories: [null] })).toContain("advisories[0] must be object");
    expect(errors({ ...base(), advisories: [{ ...base().advisories[0], code: "Not A Slug" }] })).toContain(
      "code must be a slug",
    );
    expect(errors({ ...base(), advisories: [{ ...base().advisories[0], result: "" }] })).toContain(
      "result must be non-empty string",
    );
  });
});
