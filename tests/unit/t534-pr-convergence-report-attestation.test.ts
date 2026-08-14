// covers: file:plugins/pr-convergence/tools/pr-convergence-attestation.ts, file:plugins/pr-convergence/tools/pr-convergence-git-runner.ts
import { describe, expect, test } from "bun:test";
import {
  attestationId,
  parseAttestation,
  renderAttestation,
  reportPayloadDigest,
  type ReportAttestation,
} from "../../plugins/pr-convergence/tools/pr-convergence-attestation.ts";
import {
  type GitSpawn,
  verifyCreatePrerequisites,
} from "../../plugins/pr-convergence/tools/pr-convergence-git-runner.ts";
import { requiredPluginStagesForScope } from "../../packages/framework/core/tools/amadeus-config.ts";

const SHA = "a".repeat(40);

function gitSpawn(overrides: Partial<Record<string, { code: number; stdout: string }>> = {}): GitSpawn {
  return (argv) => {
    const key = argv.slice(1).join(" ");
    const defaults: Record<string, { code: number; stdout: string }> = {
      "rev-parse --show-toplevel": { code: 0, stdout: "/repo\n" },
      "branch --show-current": { code: 0, stdout: "feature/2838\n" },
      "rev-parse HEAD": { code: 0, stdout: `${SHA}\n` },
      "diff --name-only main...HEAD": { code: 0, stdout: "src/change.ts\n" },
      "status --porcelain --untracked-files=no": { code: 0, stdout: "" },
      "ls-remote --exit-code --heads origin refs/heads/feature/2838": { code: 0, stdout: `${SHA}\trefs/heads/feature/2838\n` },
    };
    const result = overrides[key] ?? defaults[key] ?? { code: 1, stdout: "" };
    return { ...result, stderr: "" };
  };
}

describe("t534 report attestation", () => {
  test("round-trips a receipt whose id binds every identity field", () => {
    const unsigned = {
      intent: "pr-convergence-gate", intentUuid: "uuid-1", record: "amadeus/spaces/default/intents/record/",
      bolt: "delivery", unit: "cli", repo: "amadeus-dlc/amadeus", pr: 2838,
      localHead: SHA, remoteHead: SHA, prHead: SHA, contentDigest: reportPayloadDigest("payload\n"),
    };
    const receipt: ReportAttestation = { id: attestationId(unsigned), ...unsigned };
    expect(parseAttestation(renderAttestation(receipt))).toEqual(receipt);
    expect(attestationId({ ...unsigned, unit: "copied-unit" })).not.toBe(receipt.id);
  });

  test("binds a per-owner projection to the complete canonical member set", () => {
    const unsigned = {
      intent: "intent", intentUuid: "uuid-1", record: "amadeus/spaces/default/intents/record/",
      bolt: "delivery", unit: "unit-b", memberUnits: ["unit-a", "unit-b"],
      repo: "amadeus-dlc/amadeus", pr: 2985, localHead: SHA, remoteHead: SHA,
      prHead: SHA, contentDigest: reportPayloadDigest("payload\n"),
    };
    const receipt: ReportAttestation = { id: attestationId(unsigned), ...unsigned };
    expect(parseAttestation(renderAttestation(receipt))).toEqual(receipt);
    expect(attestationId({ ...unsigned, unit: "unit-a" })).not.toBe(receipt.id);
    expect(attestationId({ ...unsigned, memberUnits: ["unit-a"] })).not.toBe(receipt.id);
    const body = renderAttestation(receipt);
    expect(parseAttestation(body.replace("unit-a,unit-b", "unit-b,unit-a"))).toBeNull();
    expect(parseAttestation(body.replace("unit-a,unit-b", "unit-a,unit-a"))).toBeNull();
  });

  test("a one-byte payload change changes the digest", () => {
    expect(reportPayloadDigest("payload\n")).not.toBe(reportPayloadDigest("payload!\n"));
  });
});

describe("t534 self create git prerequisites", () => {
  test("accepts only a clean committed published branch whose SHAs agree", () => {
    expect(verifyCreatePrerequisites("/repo", "feature/2838", "main", gitSpawn())).toEqual({
      ok: true, localHead: SHA, remoteHead: SHA, base: "main",
    });
  });

  test("reads only the exact refs/heads line when ls-remote tail-matches extra refs", () => {
    // `ls-remote` matches patterns against the TAIL of ref names, so a decoy
    // branch sharing the tail can precede the real one; its SHA must not win.
    const decoy = "c".repeat(40);
    const result = verifyCreatePrerequisites("/repo", "feature/2838", "main", gitSpawn({
      "ls-remote --exit-code --heads origin refs/heads/feature/2838": {
        code: 0,
        stdout: `${decoy}\trefs/heads/other/feature/2838\n${SHA}\trefs/heads/feature/2838\n`,
      },
    }));
    expect(result).toEqual({ ok: true, localHead: SHA, remoteHead: SHA, base: "main" });
  });

  const failures: ReadonlyArray<readonly [string, Partial<Record<string, { code: number; stdout: string }>>, string]> = [
    ["dirty", { "status --porcelain --untracked-files=no": { code: 0, stdout: " M src/change.ts\n" } }, "dirty"],
    ["uncommitted", { "diff --name-only main...HEAD": { code: 0, stdout: "" } }, "no target changes"],
    ["unpublished", { "ls-remote --exit-code --heads origin refs/heads/feature/2838": { code: 2, stdout: "" } }, "missing"],
    // Exercises the no-matching-line exit of remoteBranchSha: ls-remote
    // succeeds but only tail-matched decoys come back, never the exact ref.
    ["decoy-only", { "ls-remote --exit-code --heads origin refs/heads/feature/2838": { code: 0, stdout: `${"c".repeat(40)}\trefs/heads/other/feature/2838\n` } }, "missing"],
    ["mismatch", { "ls-remote --exit-code --heads origin refs/heads/feature/2838": { code: 0, stdout: `${"b".repeat(40)}\trefs/heads/feature/2838\n` } }, "differ"],
  ];
  for (const [name, override, message] of failures) {
    test(`rejects ${name} before delivery`, () => {
      const result = verifyCreatePrerequisites("/repo", "feature/2838", "main", gitSpawn(override));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain(message);
    });
  }

  test("rejects base=head", () => {
    const result = verifyCreatePrerequisites("/repo", "main", "main", gitSpawn());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("differ from the base");
  });
});

describe("t534 mandatory plugin stage binding", () => {
  test("requires a bound stage only for the configured scopes", () => {
    const bindings = {
      "pr-convergence": {
        "pr-convergence": ["self-document", "self-feature", "self-fix", "self-refactor"],
      },
    };
    expect(requiredPluginStagesForScope(bindings, "self-fix")).toEqual(["pr-convergence"]);
    expect(requiredPluginStagesForScope(bindings, "fix")).toEqual([]);
  });
});
