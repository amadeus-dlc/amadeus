import { describe, expect, test } from "bun:test";
import { claudeSdkLiveRequirementsSkipReason, claudeSdkLiveSkipReason } from "../harness/claude-sdk-live.ts";
import { createClaudeSdkJourney } from "../harness/live-e2e/journey.ts";
import { capabilityById } from "../harness/live-e2e/registry.ts";
import { buildRedGreenEvidence } from "../harness/live-e2e/testing/evidence.ts";
import {
  adjudicateClaudeSdkContract,
  type ClaudeSdkContractObservation,
} from "../harness/live-e2e/testing/claude-sdk-contract.ts";

function baseline(): ClaudeSdkContractObservation {
  return {
    ciDenied: true,
    boundaryCalls: [],
    optInValue: "1",
    gateAllowed: true,
    childEnvironmentKeys: ["PATH", "LANG", "LC_ALL", "NO_COLOR", "HOME", "TMPDIR"],
    settingSources: ["project"],
    credentialFrameWrites: 1,
    credentialFrameReads: 1,
    credentialReplayed: false,
    output: {
      singleEventBytes: 65_536,
      totalBytes: 1_048_576,
      eventCount: 4_096,
      queueEvents: 16,
      queueBytes: 262_144,
      truncated: false,
      aborted: false,
      reaped: true,
    },
  };
}

describe("Claude SDK live contract", () => {
  test("GHA hard deny returns before SDK, dist, or auth probes", () => {
    expect(claudeSdkLiveRequirementsSkipReason({
      env: { GITHUB_ACTIONS: "true", AMADEUS_CLAUDE_SDK_LIVE: "1" },
      claudeBin: "/missing/claude",
      distributionDir: "/missing/dist",
      packageJsonPath: "/missing/package.json",
    })).toContain("forbidden on GitHub Actions");
  });

  test.each([undefined, "", "0", "true", " 1", "1 "])(
    "only exact one enables Claude SDK (%s is denied)",
    (value) => {
      expect(claudeSdkLiveSkipReason({ AMADEUS_CLAUDE_SDK_LIVE: value })).toContain(
        "AMADEUS_CLAUDE_SDK_LIVE=1",
      );
    },
  );

  test("registry and journey expose the approved SDK contract", async () => {
    expect(capabilityById("claude-sdk")).toMatchObject({
      ok: true,
      value: {
        minimumVersion: "0.3.158",
        optInKey: "AMADEUS_CLAUDE_SDK_LIVE",
        anchorKinds: ["schema", "tool", "state", "audit"],
      },
    });
    const events = [
      { kind: "state", ordinal: 0, present: false, digest: "state" },
      { kind: "audit", ordinal: 1, eventCount: 0, digest: "audit" },
      { kind: "assistant", ordinal: 2, byteLength: 2, digest: "output" },
      {
        kind: "terminal",
        ordinal: 3,
        type: "result",
        subtype: "success",
        isError: false,
        numTurns: 1,
        permissionDenialsCount: 0,
        hasLateEvent: false,
      },
    ];
    const assertion = await createClaudeSdkJourney().assert(
      {
        exitCode: 0,
        timedOut: false,
        aborted: false,
        stdoutDigest: "stdout",
        stderrDigest: "stderr",
        structured: { sdkEvents: events, truncated: false },
      },
      { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" },
    );
    expect(assertion.passed).toBe(true);
    for (const mutant of [
      [...events, { ...events[3], ordinal: 4 }],
      events.map((event) => event.kind === "terminal" ? { ...event, permissionDenialsCount: 1 } : event),
      events.map((event) => event.kind === "terminal" ? { ...event, hasLateEvent: true } : event),
      events.filter((event) => event.kind !== "assistant"),
    ]) {
      const result = await createClaudeSdkJourney().assert(
        {
          exitCode: 0,
          timedOut: false,
          aborted: false,
          stdoutDigest: "stdout",
          stderrDigest: "stderr",
          structured: { sdkEvents: mutant, truncated: false },
        },
        { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" },
      );
      expect(result.passed).toBe(false);
    }
  });

  test("SDK contract proves approved baseline green and each stable mutant red", () => {
    const cases = [
      { id: "ci", assertion: "POLICY_CI_ZERO_CALLS" as const, mutant: { ...baseline(), boundaryCalls: ["probe"] } },
      { id: "opt-in", assertion: "POLICY_STRICT_OPT_IN" as const, mutant: { ...baseline(), optInValue: "true" } },
      { id: "env", assertion: "ENV_ALLOWLIST_EXACT" as const, mutant: { ...baseline(), childEnvironmentKeys: [...baseline().childEnvironmentKeys, "ANTHROPIC_API_KEY"] } },
      { id: "settings", assertion: "SETTINGS_PROJECT_ONLY" as const, mutant: { ...baseline(), settingSources: ["project", "user"] } },
      { id: "credential", assertion: "SDK_CREDENTIAL_PIPE_SINGLE_USE" as const, mutant: { ...baseline(), credentialFrameReads: 2 } },
      {
        id: "output",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, singleEventBytes: 65_537, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "total-output",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, totalBytes: 1_048_577, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "event-count",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, eventCount: 4_097, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "queue-events",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, queueEvents: 17, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "queue-bytes",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, queueBytes: 262_145, truncated: false, aborted: false, reaped: false },
        },
      },
    ];
    for (const item of cases) {
      expect(buildRedGreenEvidence({
        caseId: item.id,
        seed: 1717,
        requirementIds: ["FR-10"],
        baseline: adjudicateClaudeSdkContract(baseline()),
        mutant: adjudicateClaudeSdkContract(item.mutant),
        expectedAssertionIds: [item.assertion],
      })).toMatchObject({ baselineStatus: "green", mutantStatus: "red", proven: true });
    }
  });
});
