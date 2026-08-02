import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  ciModelTargetFor,
  type CiAcceptanceEvidence,
  validateCiAcceptanceEvidence,
} from "../../plugins/formal-model-check/tools/ci-model-check-domain.ts";
import { parseCiArguments } from "../../plugins/formal-model-check/tools/run-model-check-ci.ts";
import {
  loadVerifiedTlaSources,
  selectVerifiedModel,
} from "../../plugins/formal-model-check/tools/tla-model-loader.ts";
import { FIXED_DOCKER_IMAGE } from "../../plugins/formal-model-check/tools/tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const MODEL_NAMES = ["FormalElection", "MirrorLifecycle"] as const;

function acceptanceEvidence(): CiAcceptanceEvidence {
  let ordinal = 0;
  const runs = MODEL_NAMES.flatMap((model) => [
    ["warm-up", 0],
    ["measured", 1],
    ["measured", 2],
    ["measured", 3],
    ["measured", 4],
    ["measured", 5],
  ].map(([kind, index]) => {
    ordinal += 1;
    const runId = `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`;
    return {
      model,
      kind: kind as "warm-up" | "measured",
      index: index as number,
      runId,
      artifactDirectory: `${model}/runs/${kind}-${index}`,
      outcome: "NOT_DETECTED" as const,
      exitCode: 0 as const,
      cliMs: 1_000,
      spawnMs: 900,
      docker: {
        imageRef: FIXED_DOCKER_IMAGE,
        argv: [
          "run", "--rm", "--network=none", "--name", `amadeus-tlc-${runId}`,
          "--mount", "type=bind,src=$WORKSPACE/specs/tla,dst=$WORKSPACE/specs/tla,readonly",
          "--mount", "type=bind,src=$JAR,dst=$JAR,readonly",
          "--mount", "type=bind,src=$SCRATCH,dst=$SCRATCH",
          FIXED_DOCKER_IMAGE,
        ],
        exitCode: 0,
      },
      cleanup: {
        containerName: `amadeus-tlc-${runId}`,
        remainingContainers: 0,
        forced: false,
      },
      stats: {
        model,
        completionMarker: true,
        generatedStates: model === "MirrorLifecycle" ? 208_628 : 1,
        distinctStates: model === "MirrorLifecycle" ? 89_099 : 1,
        statesLeftOnQueue: 0,
        searchDepth: model === "MirrorLifecycle" ? 18 : 1,
      },
    };
  }));
  return {
    schema: "amadeus.ci-model-check-acceptance.v1",
    imageRef: FIXED_DOCKER_IMAGE,
    jar: FIXED_TLC_ARTIFACT_DESCRIPTOR,
    runtime: {
      bunVersion: "1.3.13",
      runnerOs: "Linux",
      runnerArch: "X64",
      githubRunId: "1",
      githubRunAttempt: "1",
      headSha: "a".repeat(40),
    },
    runs,
  };
}

describe("t406 CI all-model acceptance", () => {
  test("loads both targets in declaration order and keeps the two verification layers explicit", () => {
    const loaded = loadVerifiedTlaSources();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.models.map((source) => ciModelTargetFor(source))).toEqual([
      {
        name: "FormalElection",
        modelPath: "specs/tla/FormalElection.tla",
        cfgPath: "specs/tla/FormalElection.cfg",
        layer: "frozen",
      },
      {
        name: "MirrorLifecycle",
        modelPath: "specs/tla/MirrorLifecycle.tla",
        cfgPath: "specs/tla/MirrorLifecycle.cfg",
        layer: "verified-source",
      },
    ]);
    expect(selectVerifiedModel(loaded.value, "NoSuch").ok).toBe(false);
  });

  test("accepts the 2 x 6 matrix and rejects each layer's injected red surface before green restoration", () => {
    const evidence = acceptanceEvidence();
    expect(validateCiAcceptanceEvidence(evidence)).toEqual({ ok: true, value: undefined });

    const formalRed = structuredClone(evidence);
    const formalRun = formalRed.runs[1] as {
      outcome: "NOT_DETECTED" | "DETECTED" | "HARNESS_ERROR";
      exitCode: 0 | 1 | 2;
    };
    formalRun.outcome = "DETECTED";
    formalRun.exitCode = 1;
    expect(validateCiAcceptanceEvidence(formalRed).ok).toBe(false);

    const mirrorRed = structuredClone(evidence);
    (mirrorRed.runs[7]!.stats as { completionMarker: boolean }).completionMarker = false;
    expect(validateCiAcceptanceEvidence(mirrorRed).ok).toBe(false);

    expect(validateCiAcceptanceEvidence(acceptanceEvidence())).toEqual({
      ok: true,
      value: undefined,
    });
  });

  test("parses default-all and single-model CLI forms and rejects an unknown model without evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "t406-unknown-model-"));
    try {
      expect(parseCiArguments(["run", "--root", root])).toEqual({
        command: "run",
        root,
        modelName: null,
      });
      expect(parseCiArguments(["verify", "--root", root, "--model", "MirrorLifecycle"])).toEqual({
        command: "verify",
        root,
        modelName: "MirrorLifecycle",
      });
      const result = Bun.spawnSync([
        process.execPath,
        "plugins/formal-model-check/tools/run-model-check-ci.ts",
        "verify",
        "--root",
        root,
        "--model",
        "NoSuch",
      ], { cwd: resolve(".") });
      expect(result.exitCode).toBe(2);
      expect(result.stderr.toString()).toContain("MODEL_MAP_INVALID");
      expect(result.stdout.toString()).toBe("");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("keeps the workflow control plane fixed and documents the all-model default", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("timeout-minutes: 30");
    expect(workflow).toContain("permissions:\n      contents: read");
    expect(workflow).toContain(
      'bun plugins/formal-model-check/tools/run-model-check-ci.ts run --root "${EVIDENCE_ROOT}"',
    );
    expect(workflow).toContain(
      'bun plugins/formal-model-check/tools/run-model-check-ci.ts verify --root "${EVIDENCE_ROOT}"',
    );
    expect(workflow).toContain("all registered models");

    const stage = readFileSync(
      "plugins/formal-model-check/stages/formal-model-check.md",
      "utf8",
    );
    expect(stage).toContain("checks every pair declared");
    expect(stage).toContain("optional `--model <registered-name>` selector");
    expect(stage).toContain("verified-source path");
  });
});
