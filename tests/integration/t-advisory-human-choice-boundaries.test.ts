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
  advisoryModelCheckOutputDir,
  advisoryReportHoldReason,
  choiceFromExactPrompt,
  closeAdvisoryInstancesForStage,
  createPendingAdvisory,
  guardAdvisoryChoices,
  recordProtectedAdvisoryChoice,
  verifyAdvisoryModelCheckOutcome,
  type AdvisoryChoiceStore,
  type PendingAdvisory,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  auditFilePath,
  auditShardName,
  docsRoot,
  findAllEvents,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { validateDirective } from "../../packages/framework/core/tools/amadeus-directive.ts";
import type { Advisory } from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";

const identity = {
  plugin: "formal-model-check",
  code: "changed" as const,
  checkpoint: "requirements-analysis",
  target: "specs/tla",
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
  const modelPath = join(projectDir, "specs/tla/FormalElection.tla");
  const cfgPath = join(projectDir, "specs/tla/FormalElection.cfg");
  mkdirSync(join(projectDir, "specs/tla"), { recursive: true });
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
      modelPath: "specs/tla/FormalElection.tla",
      cfgPath: "specs/tla/FormalElection.cfg",
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

    provenance.modelPath = "specs/tla/FormalElection.tla";
    provenance.moduleSha256 = sha256(join(root, "specs/tla/FormalElection.tla"));
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

  test("a grounded HUMAN_TURN records run-now once and routes the formal check", () => {
    const { projectDir } = project();
    const humanTurn = plantHumanTurn(projectDir);
    expect(recordProtectedAdvisoryChoice(projectDir, "1", humanTurn, "2026-08-03T12:00:00.001Z")).toBe(true);
    expect(recordProtectedAdvisoryChoice(projectDir, "1", humanTurn)).toBe(false);
    expect(recordProtectedAdvisoryChoice(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);
    const rerun = guardAdvisoryChoices(projectDir, identity.checkpoint, [advisory]);
    expect(rerun).toMatchObject({ kind: "hold", runRequired: true });
    if (rerun.kind === "hold") {
      expect(rerun.formalChecks[0]?.command).toContain("run-model-check.ts");
      expect(rerun.advisories[0]?.result).toContain("artifacts are missing");
    }
    expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("advisory hold remains");
  });

  test("invalid store, shard, audit provenance, closed instances, and repeat-after-defer are rejected", () => {
    {
      const { projectDir } = project();
      const turn = plantHumanTurn(projectDir);
      expect(recordProtectedAdvisoryChoice(projectDir, "approve", turn)).toBe(false);
      expect(recordProtectedAdvisoryChoice(projectDir, "1", { ...turn, shard: "other.jsonl" })).toBe(false);
      expect(recordProtectedAdvisoryChoice(projectDir, "1", { ...turn, eventIdentity: "not-grounded" })).toBe(false);
    }
    {
      const { projectDir } = project();
      const turn = plantHumanTurn(projectDir);
      writeFileSync(storePath(projectDir), "{");
      expect(recordProtectedAdvisoryChoice(projectDir, "1", turn)).toBe(false);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
      closeAdvisoryInstancesForStage(projectDir, identity.checkpoint);
    }
    {
      const { projectDir } = project();
      const turn = plantHumanTurn(projectDir);
      unlinkSync(auditFilePath(projectDir));
      expect(recordProtectedAdvisoryChoice(projectDir, "1", turn)).toBe(false);
    }
    {
      const { projectDir } = project();
      closeAdvisoryInstancesForStage(projectDir, identity.checkpoint, "2026-08-03T12:00:00.000Z");
      closeAdvisoryInstancesForStage(projectDir, identity.checkpoint, "2026-08-03T12:00:01.000Z");
      expect(readStore(projectDir).pending[0]?.closedAt).toBe("2026-08-03T12:00:00.000Z");
      expect(recordProtectedAdvisoryChoice(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toBeNull();
    }
    {
      const { projectDir } = project();
      expect(recordProtectedAdvisoryChoice(projectDir, "2", plantHumanTurn(projectDir))).toBe(true);
      expect(recordProtectedAdvisoryChoice(projectDir, "1", plantHumanTurn(projectDir))).toBe(false);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toBeNull();
    }
  });

  test("invalid pending and receipt store members fail closed", () => {
    for (const mutate of [
      (store: AdvisoryChoiceStore) => { store.pending[0]!.identity.code = "unknown" as "changed"; },
      (store: AdvisoryChoiceStore) => { store.pending[0]!.message = ""; },
      (store: AdvisoryChoiceStore) => { store.pending[0]!.closedAt = ""; },
      (store: AdvisoryChoiceStore) => { (store as unknown as Record<string, unknown>).schema = 2; },
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
        schema: 1,
        identity: store.pending[0]!.identity,
        choice: "run-now",
        humanTurn: { timestamp: "", shard: "shard", eventIdentity: "event" },
        recordedAt: "2026-08-03T12:00:00.000Z",
      });
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
    {
      const { projectDir } = project();
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 1,
        identity: store.pending[0]!.identity,
        choice: "run-now",
        humanTurn: { timestamp: "2026-08-03T12:00:00.000Z", shard: "shard", eventIdentity: "" },
        recordedAt: "invalid",
      });
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
    {
      const { projectDir } = project();
      const store = readStore(projectDir);
      store.receipts.push({
        schema: 1,
        identity: store.pending[0]!.identity,
        choice: "run-now",
        humanTurn: {
          timestamp: "2026-08-03T12:00:00.000Z",
          shard: "shard",
          eventIdentity: "event",
        },
        recordedAt: "invalid",
      });
      writeJson(storePath(projectDir), store);
      expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("evidence is invalid");
    }
  });

  test("run-now hold reports detected, harness-error, invalid, and verified outcomes", () => {
    const { projectDir, pending } = project();
    expect(recordProtectedAdvisoryChoice(projectDir, "1", plantHumanTurn(projectDir))).toBe(true);

    writeEvidence(projectDir, pending, "DETECTED");
    expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("DETECTED counterexample-1");

    writeEvidence(projectDir, pending, "HARNESS_ERROR");
    expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("HARNESS_ERROR TOOL_FAILED");

    const invalidEvidence = writeEvidence(projectDir, pending);
    invalidEvidence.manifest.outcome = "UNKNOWN";
    invalidEvidence.writeManifest(invalidEvidence.manifest);
    expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toContain("manifest outcome is invalid");

    writeEvidence(projectDir, pending);
    expect(advisoryReportHoldReason(projectDir, identity.checkpoint)).toBeNull();
    expect(guardAdvisoryChoices(projectDir, identity.checkpoint, [advisory]).kind).toBe("allow");
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

  test("malformed optional routes and advisory items fail closed in the source validator", () => {
    expect(errors({ ...base(), run_required: "yes" })).toContain("run_required must be boolean");
    expect(errors({ ...base(), run_required: true, formal_checks: [null] })).toContain("must be object");
    expect(errors({
      ...base(),
      run_required: true,
      formal_checks: [{
        stage: "other",
        command: "",
        output_dir: "/evidence",
        target: "specs/tla",
        spec_identity: "sha256:abc",
        advisory_instance: "instance-1",
      }],
    })).toContain("command must be non-empty string");
    expect(errors({
      ...base(),
      run_required: true,
      formal_checks: [{
        stage: "other",
        command: "run",
        output_dir: "/evidence",
        target: "specs/tla",
        spec_identity: "sha256:abc",
        advisory_instance: "instance-1",
      }],
    })).toContain("stage must be formal-model-check");
    expect(errors({ ...base(), advisories: [] })).toContain("advisories must be a non-empty array");
    expect(errors({ ...base(), advisories: [null] })).toContain("advisories[0] must be object");
    expect(errors({ ...base(), advisories: [{ ...base().advisories[0], code: "unknown" }] })).toContain(
      "code must be one of",
    );
    expect(errors({ ...base(), advisories: [{ ...base().advisories[0], result: "" }] })).toContain(
      "result must be non-empty string",
    );
  });
});
