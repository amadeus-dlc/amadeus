// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ADVISORY_CHOICE_OPTIONS,
  createPendingAdvisory,
  evaluateAdvisoryHold,
  parseAdvisoryChoiceReceipt,
  type AdvisoryChoiceReceipt,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  advisoryModelCheckOutputDir,
  verifyAdvisoryModelCheckOutcome,
} from "../../plugins/formal-model-check/tools/advisory-model-check.ts";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { FIXED_TLC_VERSION_LINE } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const base = {
  plugin: "formal-model-check",
  code: "changed" as const,
  checkpoint: "functional-design",
  target: "amadeus/spaces/default/specs/tla",
  specIdentity: "sha256:abc",
  intentRun: "019fc698-ba1f-7467-b6b6-57c4b5b50140",
  message: "advisory: formal-model-check spec hash CHANGED",
};

function receipt(
  pending = createPendingAdvisory(base, () => "019fc698-ba1f-7000-8000-000000000001"),
  choice: AdvisoryChoiceReceipt["choice"] = "defer-with-risk",
): AdvisoryChoiceReceipt {
  return {
    schema: 2,
    identity: pending.identity,
    choice,
    provenance: {
      kind: "human-turn",
      timestamp: "2026-08-03T12:00:00.000Z",
      shard: "host-clone.jsonl",
      eventIdentity: "human-turn-event-1",
    },
    recordedAt: "2026-08-03T12:00:00.001Z",
  };
}

describe("advisory human choice domain", () => {
  const roots: string[] = [];
  afterEach(() =>
    roots.splice(0).forEach((root) => {
      rmSync(root, { recursive: true, force: true });
    }),
  );
  test("列挙choiceは今すぐ実行とリスク付き延期の2択だけ", () => {
    expect(ADVISORY_CHOICE_OPTIONS).toEqual([
      { choice: "run-now", label: "今すぐ実行する" },
      { choice: "defer-with-risk", label: "リスクを承知して延期する" },
    ]);
  });

  test("同一入力はfactoryが同じなら同一instance identityになる", () => {
    const factory = () => "019fc698-ba1f-7000-8000-000000000001";
    expect(createPendingAdvisory(base, factory).identity).toEqual(
      createPendingAdvisory(base, factory).identity,
    );
  });

  test("receipt parserは完全なprovenanceだけを受理する", () => {
    expect(parseAdvisoryChoiceReceipt(receipt()).ok).toBe(true);
    expect(parseAdvisoryChoiceReceipt({
      ...receipt(),
      provenance: { kind: "human-turn", timestamp: "", shard: "x" },
    }).ok).toBe(false);
    expect(parseAdvisoryChoiceReceipt({ ...receipt(), provenance: { kind: "unknown" } }).ok).toBe(false);
    expect(parseAdvisoryChoiceReceipt({ ...receipt(), choice: "approve" }).ok).toBe(false);
  });

  test("auto-decision provenanceのprojectionRevisionは整数でなければ拒否する", () => {
    const autoProvenance = {
      kind: "auto-decision" as const,
      decisionId: "decision-1",
      basisKind: "norm",
      basisFingerprint: `sha256:${"a".repeat(64)}`,
      projectionRevision: 3,
      phase: "construction",
      graphRevision: `sha256:${"b".repeat(64)}`,
    };
    expect(parseAdvisoryChoiceReceipt({ ...receipt(), provenance: autoProvenance }).ok).toBe(true);
    expect(parseAdvisoryChoiceReceipt({
      ...receipt(),
      provenance: { ...autoProvenance, projectionRevision: 3.5 },
    })).toEqual({ ok: false, reason: "provenance.projectionRevision is invalid" });
    expect(parseAdvisoryChoiceReceipt({
      ...receipt(),
      provenance: { ...autoProvenance, projectionRevision: "3" },
    })).toEqual({ ok: false, reason: "provenance.projectionRevision is invalid" });
  });

  test("receiptなし・別instance・別specはfail-closed hold", () => {
    const pending = createPendingAdvisory(base, () => "019fc698-ba1f-7000-8000-000000000001");
    expect(evaluateAdvisoryHold([pending], [])).toEqual({ kind: "hold", unresolved: [pending] });

    const staleInstance = receipt(pending);
    staleInstance.identity = { ...staleInstance.identity, advisoryInstance: "019fc698-ba1f-7000-8000-000000000002" };
    expect(evaluateAdvisoryHold([pending], [staleInstance]).kind).toBe("hold");

    const staleSpec = receipt(pending);
    staleSpec.identity = { ...staleSpec.identity, specIdentity: "sha256:old" };
    expect(evaluateAdvisoryHold([pending], [staleSpec]).kind).toBe("hold");
  });

  test("複数advisoryは全件に相関receiptがある場合だけ解決", () => {
    const first = createPendingAdvisory(base, () => "019fc698-ba1f-7000-8000-000000000001");
    const second = createPendingAdvisory(
      { ...base, plugin: "other-check", code: "never-run" },
      () => "019fc698-ba1f-7000-8000-000000000002",
    );
    expect(evaluateAdvisoryHold([first, second], [receipt(first)]).kind).toBe("hold");
    expect(evaluateAdvisoryHold([first, second], [receipt(first), receipt(second)])).toEqual({
      kind: "resolved",
      receipts: [receipt(first), receipt(second)],
    });
  });

  test("run-nowはverdict前に解決扱いにならない", () => {
    const pending = createPendingAdvisory(base, () => "019fc698-ba1f-7000-8000-000000000001");
    expect(evaluateAdvisoryHold([pending], [receipt(pending, "run-now")])).toEqual({
      kind: "run-required",
      pending: [pending],
      receipts: [receipt(pending, "run-now")],
    });
  });

  test("run-now verifierは相関済みcomplete NOT_DETECTEDだけを解除する", () => {
    const root = mkdtempSync(join(tmpdir(), "advisory-verdict-"));
    roots.push(root);
    const pending = createPendingAdvisory(base, () => "019fc698-ba1f-7000-8000-000000000001");
    const out = advisoryModelCheckOutputDir(root, pending.identity.advisoryInstance);
    mkdirSync(out, { recursive: true });
    const modelPath = join(root, "amadeus/spaces/default/specs/tla/FormalElection.tla");
    const cfgPath = join(root, "amadeus/spaces/default/specs/tla/FormalElection.cfg");
    mkdirSync(join(root, "amadeus/spaces/default/specs/tla"), { recursive: true });
    writeFileSync(modelPath, "---- MODULE FormalElection ----\n====\n");
    writeFileSync(cfgPath, "SPECIFICATION Spec\n");
    const runId = "00000000-0000-4000-8000-000000000001";
    const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value)}\n`);
    const provenanceBody = {
      modelPath: "amadeus/spaces/default/specs/tla/FormalElection.tla",
      cfgPath: "amadeus/spaces/default/specs/tla/FormalElection.cfg",
      modelIdentity: "registered-model",
      moduleIdentity: canonicalIdentity(
        readFileSync(modelPath, "utf8"),
        "amadeus.formal-verif.tla.module.v1",
      ).sha256,
      cfgIdentity: canonicalIdentity(
        readFileSync(cfgPath, "utf8"),
        "amadeus.formal-verif.tla.cfg.v1",
      ).sha256,
      moduleSha256: createHash("sha256").update(readFileSync(modelPath)).digest("hex"),
      cfgSha256: createHash("sha256").update(readFileSync(cfgPath)).digest("hex"),
      auxiliaries: [],
      implementations: [],
      constants: [],
    };
    const sourceProvenance = {
      ...provenanceBody,
      sourceIdentity: canonicalIdentity(
        provenanceBody,
        "amadeus.formal-verif.model-check-source.v1",
      ).sha256,
    };
    writeJson(join(out, "completion-marker.json"), {
      complete: true,
      runId,
      sourceIdentity: sourceProvenance.sourceIdentity,
    });
    writeJson(join(out, "env-receipt.json"), {
      schema: "amadeus.env-receipt.v1",
      runId,
      planner: "test",
      inspections: [{ id: "network-deny", status: "passed", expected: "deny", observed: "deny", reason: "" }],
    });
    writeFileSync(join(out, "tlc-stdout.bin"), "complete");
    writeFileSync(join(out, "tlc-stderr.bin"), "");
    const expectedArtifacts = ["env-receipt.json", "tlc-stdout.bin", "tlc-stderr.bin", "completion-marker.json"];
    const artifacts = expectedArtifacts.map((path) => {
      const bytes = readFileSync(join(out, path));
      return { path, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
    });
    const manifest = {
      schema: "amadeus.model-check-manifest.v1",
      runId,
      outcome: "NOT_DETECTED",
      exitCode: 0,
      partial: false,
      expectedArtifacts,
      artifacts,
      advisory: {
        target: pending.identity.target,
        specIdentity: pending.identity.specIdentity,
        instance: pending.identity.advisoryInstance,
      },
      sourceProvenance,
      verification: {
        toolchainVersion: FIXED_TLC_VERSION_LINE,
        constants: [],
        completionMarker: "Model checking completed. No error has been found.",
        generatedStates: 3,
        distinctStates: 2,
        statesLeftOnQueue: 0,
        searchDepth: 2,
        sourceIdentity: sourceProvenance.sourceIdentity,
      },
      errorCode: null,
      errorDetail: null,
    };
    writeJson(join(out, "manifest.json"), manifest);

    expect(verifyAdvisoryModelCheckOutcome(root, pending)).toEqual({ kind: "verified-not-detected", runId });
    writeJson(join(out, "manifest.json"), { ...manifest, partial: true });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeJson(join(out, "counterexample.json"), { runId, counterexampleIdentity: "counterexample-1" });
    const counterexampleBytes = readFileSync(join(out, "counterexample.json"));
    writeJson(join(out, "manifest.json"), {
      ...manifest,
      outcome: "DETECTED",
      exitCode: 1,
      expectedArtifacts: [...expectedArtifacts, "counterexample.json"],
      artifacts: [
        ...artifacts,
        {
          path: "counterexample.json",
          bytes: counterexampleBytes.byteLength,
          sha256: createHash("sha256").update(counterexampleBytes).digest("hex"),
        },
      ],
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("detected");
    writeJson(join(out, "manifest.json"), { ...manifest, advisory: { ...manifest.advisory, specIdentity: "sha256:old" } });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");

    writeJson(join(out, "manifest.json"), {
      ...manifest,
      sourceProvenance: { ...sourceProvenance, auxiliaries: ["not-an-object"] },
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeFileSync(join(root, "amadeus/spaces/default/specs/tla/Aux.tla"), "---- MODULE Aux ----\n====\n");
    writeJson(join(out, "manifest.json"), {
      ...manifest,
      sourceProvenance: {
        ...sourceProvenance,
        auxiliaries: [{ path: "amadeus/spaces/default/specs/tla/Aux.tla", identity: "wrong" }],
      },
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeJson(join(out, "manifest.json"), {
      ...manifest,
      sourceProvenance: { ...sourceProvenance, implementations: ["not-an-object"] },
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeFileSync(join(root, "impl.ts"), "export {}\n");
    writeJson(join(out, "manifest.json"), {
      ...manifest,
      sourceProvenance: {
        ...sourceProvenance,
        auxiliaries: [{ path: "impl.ts", identity: "wrong" }],
      },
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeJson(join(out, "manifest.json"), {
      ...manifest,
      sourceProvenance: {
        ...sourceProvenance,
        implementations: [{ path: "../escape.ts", identity: "wrong" }],
      },
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeJson(join(out, "manifest.json"), {
      ...manifest,
      sourceProvenance: {
        ...sourceProvenance,
        implementations: [{ path: "impl.ts", identity: "wrong" }],
      },
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeJson(join(out, "manifest.json"), {
      ...manifest,
      sourceProvenance: { ...sourceProvenance, sourceIdentity: `sha256:${"0".repeat(64)}` },
    });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
    writeJson(join(out, "manifest.json"), { ...manifest, verification: "missing" });
    expect(verifyAdvisoryModelCheckOutcome(root, pending).kind).toBe("invalid");
  });
});
