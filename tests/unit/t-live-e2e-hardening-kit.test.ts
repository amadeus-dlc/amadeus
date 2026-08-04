import { describe, expect, test } from "bun:test";
import { evaluateLiveGate } from "../harness/live-e2e/policy.ts";
import { capabilityById, LIVE_CAPABILITIES } from "../harness/live-e2e/registry.ts";
import {
  strictOptInPropertyCases,
  type ContractCase,
  validateContractCase,
} from "../harness/live-e2e/testing/contract-case.ts";
import { buildRedGreenEvidence } from "../harness/live-e2e/testing/evidence.ts";
import { ScriptedLiveAdapter } from "../harness/live-e2e/testing/fakes.ts";
import { cleanupReceiptFromRegistrar, ResourceRegistrar } from "../harness/live-e2e/resources.ts";
import {
  adjudicateContractCase,
  type BoundaryCall,
  type ContractObservation,
} from "../harness/live-e2e/testing/oracle.ts";

function validated(overrides: Partial<ContractCase> = {}) {
  const result = validateContractCase({
    id: "baseline-contract",
    requirementIds: ["FR-4"],
    seed: 1717,
    faults: [],
    expectedTerminal: {
      kind: "live-code",
      status: "success",
      code: "AMADEUS_LIVE_E2E:PASS:SUCCESS",
    },
    requiredTrace: ["probe", "spawn", "cleanup", "leak-scan"],
    allowedEnvironmentKeys: ["PATH", "FIXTURE_CREDENTIAL"],
    forbiddenCanaryIds: ["ambient-secret", "source-pointer"],
    ...overrides,
  });
  if (!result.ok) throw new Error(result.error.kind);
  return result.value;
}

function calls(runId: string, boundaries: readonly string[]): readonly BoundaryCall[] {
  return boundaries.map((boundary, index) => ({ boundary, ordinal: index + 1, runId }));
}

function observation(overrides: Partial<ContractObservation> = {}): ContractObservation {
  const runId = "run-1717";
  return {
    runId,
    terminal: {
      kind: "live-code",
      status: "success",
      code: "AMADEUS_LIVE_E2E:PASS:SUCCESS",
    },
    trace: calls(runId, ["probe", "spawn", "cleanup", "leak-scan"]),
    childEnvironmentKeys: ["PATH", "FIXTURE_CREDENTIAL"],
    observedCanaryIds: [],
    resources: [
      {
        id: "credential-child",
        parentId: "run-1717",
        credentialBearing: true,
        state: "released",
        escaped: false,
      },
    ],
    ...overrides,
  };
}

describe("live E2E adversarial test kit", () => {
  test("cleanup receipts reflect registrar state instead of failure count", () => {
    const registrar = new ResourceRegistrar();
    registrar.registerPlanned({ id: "planned", kind: "fixture", locator: "planned", credentialBearing: false });
    registrar.registerPlanned({ id: "created", kind: "fixture", locator: "created", credentialBearing: true });
    registrar.registerPlanned({ id: "released", kind: "fixture", locator: "released", credentialBearing: true });
    registrar.markCreated("created");
    registrar.markCreated("released");
    registrar.markReleased("released");
    const registeredResources = registrar.snapshot();
    expect(cleanupReceiptFromRegistrar(registrar, {
      scratch: { root: ".", homeDir: ".", projectDir: ".", state: "ready" },
      registeredResources,
    }, [])).toMatchObject({
      attemptedResourceIds: ["planned", "created", "released"],
      releasedResourceIds: ["released"],
      retainedResourceIds: ["created"],
    });
  });

  test("scripted timeout handles an already-aborted signal", async () => {
    const adapter = new ScriptedLiveAdapter({ runId: "pre-aborted", fault: "timeout" });
    const controller = new AbortController();
    controller.abort();
    const result = await adapter.execute({
      cwd: ".",
      executable: "offline-fake",
      args: [],
      environmentKeys: [],
      resolveEnvironment: () => ({}),
      registeredResourceIds: [],
    }, controller.signal);
    expect(result).toMatchObject({ timedOut: true, aborted: true });
    expect(adapter.calls.map((call) => call.boundary)).toEqual(["spawn", "abort", "reap"]);
  });

  test("validates deterministic single-fault cases and the one cleanup/leak aggregate", () => {
    expect(validateContractCase({
      id: "valid-case",
      requirementIds: ["FR-10"],
      seed: 1717,
      faults: [],
      expectedTerminal: {
        kind: "live-code",
        status: "success",
        code: "AMADEUS_LIVE_E2E:PASS:SUCCESS",
      },
    }).ok).toBe(true);
    expect(validateContractCase({
      id: "cleanup-leak-case",
      requirementIds: ["FR-10"],
      seed: 1717,
      faults: ["cleanup", "leak"],
      expectedTerminal: { kind: "run-error", errorKind: "cleanup-barrier-failed" },
    }).ok).toBe(true);
    expect(validateContractCase({
      ...validated(),
      faults: ["cleanup"],
      expectedTerminal: { kind: "run-error", errorKind: "cleanup-barrier-failed" },
    })).toMatchObject({ ok: true });
    expect(validateContractCase({ ...validated(), faults: ["timeout", "leak"] })).toMatchObject({
      ok: false,
      error: { kind: "invalid-fault-plan" },
    });
    expect(validateContractCase({ ...validated(), faults: ["typo" as never] })).toMatchObject({
      ok: false,
      error: { kind: "invalid-fault-plan" },
    });
  });

  test("generates a reproducible strict opt-in property corpus", () => {
    const first = strictOptInPropertyCases(1717);
    expect(first).toEqual(strictOptInPropertyCases(1717));
    for (const propertyCase of first) {
      const decision = evaluateLiveGate(
        { AMADEUS_CODEX_EXEC_LIVE: propertyCase.value },
        (() => {
          const capability = capabilityById("codex-exec");
          if (!capability.ok) throw new Error("codex-exec capability is unavailable");
          return capability.value;
        })(),
      );
      expect(decision.kind).toBe(propertyCase.expected === "allow" ? "allow" : "skip");
    }
  });

  test("proves CI precedence and rejects side effects on a skip terminal", () => {
    const contract = validated({
      id: "ci-hard-deny",
      requirementIds: ["FR-1", "FR-2"],
      expectedTerminal: {
        kind: "live-code",
        status: "skip",
        code: "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN",
      },
      requiredTrace: [],
    });
    const baseline = adjudicateContractCase(contract, observation({
      terminal: {
        kind: "live-code",
        status: "skip",
        code: "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN",
      },
      trace: [],
    }));
    const mutant = adjudicateContractCase(contract, observation({
      terminal: {
        kind: "live-code",
        status: "skip",
        code: "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN",
      },
      trace: calls("run-1717", ["spawn"]),
    }));
    expect(baseline.pass).toBe(true);
    expect(mutant).toMatchObject({
      pass: false,
      violations: expect.arrayContaining([{ assertionId: "SKIP_NO_SIDE_EFFECTS" }]),
    });
  });

  test("rejects unknown and status-incompatible taxonomy values", () => {
    expect(adjudicateContractCase(validated(), observation()).pass).toBe(true);
    const unknown = adjudicateContractCase(validated(), observation({
      terminal: { kind: "live-code", status: "success", code: "UNKNOWN" },
    }));
    expect(unknown).toMatchObject({
      pass: false,
      violations: expect.arrayContaining([{ assertionId: "CLOSED_TAXONOMY" }]),
    });
    const mismatch = adjudicateContractCase(validated(), observation({
      terminal: {
        kind: "live-code",
        status: "success",
        code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED",
      },
    }));
    expect(mismatch).toMatchObject({
      pass: false,
      violations: expect.arrayContaining([{ assertionId: "STATUS_CODE_MATCH" }]),
    });
  });

  test("detects env, canary, credential-descendant, and run ownership escapes", () => {
    const baseline = adjudicateContractCase(validated(), observation());
    const mutant = adjudicateContractCase(validated(), observation({
      childEnvironmentKeys: ["PATH", "HOME"],
      observedCanaryIds: ["source-pointer"],
      trace: [{ boundary: "probe", ordinal: 1, runId: "foreign-run" }],
      resources: [
        {
          id: "escaped-credential",
          parentId: "run-1717",
          credentialBearing: true,
          state: "created",
          escaped: true,
        },
      ],
    }));
    expect(baseline.pass).toBe(true);
    expect(mutant).toMatchObject({
      pass: false,
      violations: expect.arrayContaining([
        { assertionId: "ENV_ALLOW_LIST" },
        { assertionId: "SECRET_CANARY_ABSENT" },
        { assertionId: "CREDENTIAL_DESCENDANT_RELEASED" },
        { assertionId: "RUN_OWNERSHIP" },
      ]),
    });
  });

  test("requires timeout abort/reap order and bounded discard-drain", () => {
    const contract = validated({
      id: "timeout-cleanup",
      requirementIds: ["FR-5", "FR-6", "NFR-1"],
      expectedTerminal: {
        kind: "live-code",
        status: "timeout",
        code: "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT",
      },
      requiredTrace: ["abort", "reap", "cleanup", "leak-scan"],
    });
    const terminal = {
      kind: "live-code" as const,
      status: "timeout" as const,
      code: "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT",
    };
    const baseline = adjudicateContractCase(contract, observation({
      terminal,
      trace: calls("run-1717", ["spawn", "abort", "reap", "cleanup", "leak-scan"]),
      output: {
        stdoutBytes: 1_048_577,
        stderrBytes: 0,
        combinedBufferedBytes: 1_048_576,
        truncated: true,
        aborted: true,
        reaped: true,
      },
    }));
    const mutant = adjudicateContractCase(contract, observation({
      terminal,
      trace: calls("run-1717", ["spawn", "cleanup", "leak-scan"]),
      output: {
        stdoutBytes: 1_048_577,
        stderrBytes: 262_145,
        combinedBufferedBytes: 1_310_721,
        truncated: false,
        aborted: false,
        reaped: false,
      },
    }));
    expect(baseline.pass).toBe(true);
    expect(mutant).toMatchObject({
      pass: false,
      violations: expect.arrayContaining([
        { assertionId: "TIMEOUT_ABORT_REAP" },
        { assertionId: "OUTPUT_BOUNDED_DRAIN" },
      ]),
    });
  });

  test("builds sanitized evidence only when the expected guard turns red", () => {
    const baseline = adjudicateContractCase(validated(), observation());
    const mutant = adjudicateContractCase(validated(), observation({
      childEnvironmentKeys: ["PATH", "HOME"],
    }));
    expect(buildRedGreenEvidence({
      caseId: "env-allow-list",
      seed: 1717,
      requirementIds: ["FR-4"],
      baseline,
      mutant,
      expectedAssertionIds: ["ENV_ALLOW_LIST"],
    })).toEqual({
      caseId: "env-allow-list",
      seed: 1717,
      requirementIds: ["FR-4"],
      baselineStatus: "green",
      mutantStatus: "red",
      failedAssertionIds: ["ENV_ALLOW_LIST"],
      proven: true,
    });
    expect(() => buildRedGreenEvidence({
      caseId: "empty-assertions",
      seed: 1717,
      requirementIds: ["FR-4"],
      baseline,
      mutant,
      expectedAssertionIds: [],
    })).toThrow("expected assertions must not be empty");
    const multiFailure = adjudicateContractCase(validated(), observation({
      childEnvironmentKeys: ["HOME"],
      observedCanaryIds: ["ambient-secret"],
    }));
    expect(() => buildRedGreenEvidence({
      caseId: "unexpected-assertion",
      seed: 1717,
      requirementIds: ["FR-4"],
      baseline,
      mutant: multiFailure,
      expectedAssertionIds: ["ENV_ALLOW_LIST"],
    })).toThrow("mutant failed unexpected assertions");
  });
});
