import { describe, expect, test } from "bun:test";
import { claudePrintLiveRequirementsSkipReason, claudePrintLiveSkipReason } from "../harness/claude-print-live.ts";
import { createClaudeStructuredJourney } from "../harness/live-e2e/journey.ts";
import { capabilityById } from "../harness/live-e2e/registry.ts";
import { buildRedGreenEvidence } from "../harness/live-e2e/testing/evidence.ts";
import {
  adjudicateClaudePrintContract,
  type ClaudePrintContractObservation,
} from "../harness/live-e2e/testing/claude-print-contract.ts";

function baseline(): ClaudePrintContractObservation {
  return {
    ciDenied: true,
    boundaryCalls: [],
    optInValue: "1",
    gateAllowed: true,
    childEnvironmentKeys: ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "NO_COLOR", "ANTHROPIC_API_KEY"],
    authStrategy: "api-key",
    args: ["-p", "--setting-sources", "project", "--tools", ""],
    projectSettings: { hooks: {} },
  };
}

describe("Claude print live contract", () => {
  test("GHA hard deny takes precedence and does not probe an invalid binary", () => {
    expect(
      claudePrintLiveRequirementsSkipReason({
        env: { GITHUB_ACTIONS: "true", AMADEUS_CLAUDE_PRINT_LIVE: "1" },
        claudeBin: "/definitely/not/a/claude-binary",
        distributionDir: "/definitely/not/a/distribution",
      }),
    ).toContain("forbidden on GitHub Actions");
  });

  test.each([undefined, "", "0", "true", " 1", "1 "])(
    "only exact one enables Claude print (%s is denied)",
    (value) => {
      expect(claudePrintLiveSkipReason({ AMADEUS_CLAUDE_PRINT_LIVE: value })).toContain(
        "AMADEUS_CLAUDE_PRINT_LIVE=1",
      );
    },
  );

  test("registry and journey expose the approved closed contract", async () => {
    const capability = capabilityById("claude-print");
    expect(capability).toMatchObject({
      ok: true,
      value: {
        minimumVersion: "2.1.220",
        optInKey: "AMADEUS_CLAUDE_PRINT_LIVE",
        anchorKinds: ["exit", "schema", "state"],
      },
    });
    const assertion = await createClaudeStructuredJourney().assert(
      {
        exitCode: 0,
        timedOut: false,
        aborted: false,
        stdoutDigest: "stdout",
        stderrDigest: "stderr",
        structured: {
          is_error: false,
          num_turns: 1,
          structured_output: { amadeus_live_e2e: "ok" },
        },
      },
      { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" },
    );
    expect(assertion.passed).toBe(true);
  });

  test("claude-print-contract proves every approved baseline green and mutant red", () => {
    const cases = [
      {
        id: "ci-zero-calls",
        assertion: "POLICY_CI_ZERO_CALLS" as const,
        mutant: { ...baseline(), boundaryCalls: ["probe"] },
      },
      {
        id: "strict-opt-in",
        assertion: "POLICY_STRICT_OPT_IN" as const,
        mutant: { ...baseline(), optInValue: "true" },
      },
      {
        id: "environment-allowlist",
        assertion: "ENV_ALLOWLIST_EXACT" as const,
        mutant: { ...baseline(), childEnvironmentKeys: [...baseline().childEnvironmentKeys, "CLAUDE_CONFIG_DIR"] },
      },
      {
        id: "project-settings-only",
        assertion: "SETTINGS_PROJECT_ONLY" as const,
        mutant: { ...baseline(), args: ["-p", "--setting-sources", "user,project,local"] },
      },
      {
        id: "duplicate-setting-sources",
        assertion: "SETTINGS_PROJECT_ONLY" as const,
        mutant: {
          ...baseline(),
          args: ["-p", "--setting-sources", "project", "--setting-sources", "user"],
        },
      },
    ];
    for (const contractCase of cases) {
      expect(buildRedGreenEvidence({
        caseId: contractCase.id,
        seed: 1717,
        requirementIds: ["FR-10"],
        baseline: adjudicateClaudePrintContract(baseline()),
        mutant: adjudicateClaudePrintContract(contractCase.mutant),
        expectedAssertionIds: [contractCase.assertion],
      })).toMatchObject({
        baselineStatus: "green",
        mutantStatus: "red",
        failedAssertionIds: [contractCase.assertion],
        proven: true,
      });
    }
  });
});
