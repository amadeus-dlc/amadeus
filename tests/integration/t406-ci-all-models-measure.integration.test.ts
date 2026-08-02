import { describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  ciModelTargetFor,
  type CiAcceptanceEvidence,
  type CiModelTarget,
  validateCiAcceptanceEvidence,
} from "../../plugins/formal-model-check/tools/ci-model-check-domain.ts";
import { executeCiModelCheckAcceptance } from "../../plugins/formal-model-check/tools/ci-model-check-runner.ts";
import {
  NodeCiModelCheckPort,
  type NodeCiModelCheckDependencies,
} from "../../plugins/formal-model-check/tools/node-ci-model-check-port.ts";
import {
  main as runCiMain,
  parseCiArguments,
} from "../../plugins/formal-model-check/tools/run-model-check-ci.ts";
import {
  beginModelCheckArtifacts,
  publishModelCheckArtifacts,
} from "../../plugins/formal-model-check/tools/run-model-check-artifacts.ts";
import {
  buildEnvReceipt,
  notApplicableInspection,
  passedInspection,
} from "../../plugins/formal-model-check/tools/run-model-check-domain.ts";
import {
  loadVerifiedTlaSources,
  selectVerifiedModel,
} from "../../plugins/formal-model-check/tools/tla-model-loader.ts";
import { FIXED_DOCKER_IMAGE } from "../../plugins/formal-model-check/tools/tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const MODEL_NAMES = ["FormalElection", "MirrorLifecycle"] as const;
const MODEL_TARGETS: Readonly<Record<(typeof MODEL_NAMES)[number], CiModelTarget>> = {
  FormalElection: {
    name: "FormalElection",
    modelPath: "specs/tla/FormalElection.tla",
    cfgPath: "specs/tla/FormalElection.cfg",
    layer: "frozen",
  },
  MirrorLifecycle: {
    name: "MirrorLifecycle",
    modelPath: "specs/tla/MirrorLifecycle.tla",
    cfgPath: "specs/tla/MirrorLifecycle.cfg",
    layer: "verified-source",
  },
};

function replaceOnce(source: string, before: string, after: string): string {
  const pieces = source.split(before);
  if (pieces.length !== 2) throw new Error("semantic mutation anchor must occur exactly once");
  return `${pieces[0]}${after}${pieces[1]}`;
}

function semanticMutation(model: (typeof MODEL_NAMES)[number], source: string): string {
  if (model === "FormalElection") {
    return replaceOnce(
      source,
      "Resolve(prior, ballot) == IF prior = NoBallot \\/ Later(ballot, prior) THEN ballot ELSE prior",
      "Resolve(prior, ballot) == prior",
    );
  }
  return replaceOnce(
    source,
    "WITH CaptureBoundaryAlwaysCreates <- FALSE",
    "WITH CaptureBoundaryAlwaysCreates <- TRUE",
  );
}

function semanticPortDependencies(
  workspace: string,
  model: (typeof MODEL_NAMES)[number],
): NodeCiModelCheckDependencies {
  let ordinal = 0;
  let nowMs = 0;
  const nextRunId = () => {
    ordinal += 1;
    return `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`;
  };
  const modelPath = join(workspace, MODEL_TARGETS[model].modelPath);
  const isMutated = (invokedModelPath: string | undefined) => {
    if (invokedModelPath === undefined || resolve(workspace, invokedModelPath) !== modelPath) {
      throw new Error(`CI port invoked an unexpected model path: ${invokedModelPath ?? "missing"}`);
    }
    const source = readFileSync(resolve(workspace, invokedModelPath), "utf8");
    return model === "FormalElection"
      ? source.includes("Resolve(prior, ballot) == prior")
      : source.includes("WITH CaptureBoundaryAlwaysCreates <- TRUE");
  };
  const writeTrace = (prefix: string, argv: readonly string[], exitCode: number) => {
    writeFileSync(`${prefix}.argv`, `${argv.join("\0")}\0`);
    writeFileSync(`${prefix}.timing`, `1000000000\n2000000000\n${exitCode}\n`);
  };
  const runFrozenLayer = (argv: readonly string[]) => {
    const trace = readFileSync(
      join(workspace, ".amadeus-ci-docker-wrapper", "trace-prefix"),
      "utf8",
    ).trim();
    const runId = nextRunId();
    const dockerArgs = [
      "run", "--rm", "--network=none", "--name", `amadeus-tlc-${runId}`,
      "--mount", `type=bind,src=${join(workspace, "specs/tla")},dst=${join(workspace, "specs/tla")},readonly`,
      "--mount", "type=bind,src=/cache/tla2tools.jar,dst=/cache/tla2tools.jar,readonly",
      "--mount", "type=bind,src=/scratch/.scratch,dst=/scratch/.scratch",
      FIXED_DOCKER_IMAGE,
    ];
    const mutated = isMutated(argv[argv.indexOf("--model") + 1]);
    writeTrace(trace, dockerArgs, mutated ? 1 : 0);
    if (mutated) return { status: 1, stdout: "", stderr: "Invariant resolution is violated" };

    const outDir = argv[argv.indexOf("--out") + 1]!;
    const artifacts = beginModelCheckArtifacts(outDir, runId);
    if (!artifacts.ok) throw new Error(artifacts.error.detail);
    const published = publishModelCheckArtifacts({
      workspace: artifacts.value,
      outcome: { kind: "NOT_DETECTED" },
      exitCode: 0,
      environmentReceipt: buildEnvReceipt(runId, "docker-planner", [
        passedInspection("image-digest", FIXED_DOCKER_IMAGE),
        passedInspection("jar-sha256", FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256),
        passedInspection("network-deny", "--network=none"),
        notApplicableInspection("jdk-snapshot", "Docker image supplies the isolated JDK"),
        notApplicableInspection("sandbox-profile", "Docker isolation replaces sandbox-exec"),
      ]),
      stdout: new TextEncoder().encode([
        "3 states generated, 2 distinct states found, 0 states left on queue.",
        "The depth of the complete state graph search is 2.",
        "Model checking completed. No error has been found.",
      ].join("\n")),
      stderr: new Uint8Array(),
      startedAt: "2026-08-02T00:00:00.000Z",
      finishedAt: "2026-08-02T00:00:01.000Z",
    });
    if (!published.ok) throw new Error(published.error.detail);
    return { status: 0, stdout: "", stderr: "" };
  };
  const runVerifiedSourceLayer = (argv: readonly string[]) => {
    const trace = readFileSync(
      join(workspace, ".amadeus-ci-docker-wrapper", "trace-prefix"),
      "utf8",
    ).trim();
    const mutated = isMutated(argv.at(-1));
    writeTrace(trace, argv, mutated ? 1 : 0);
    if (mutated) return { status: 1, stdout: "", stderr: "NoDuplicateCreate is violated" };
    return {
      status: 0,
      stdout: [
        "208,628 states generated, 89,099 distinct states found, 0 states left on queue.",
        "The depth of the complete state graph search is 18.",
        "Model checking completed. No error has been found.",
      ].join("\n"),
      stderr: "",
    };
  };
  return {
    resolveDocker: () => "/usr/bin/docker",
    download: async () => new Uint8Array([1, 2, 3]),
    digest: () => FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    nowMs: () => {
      nowMs += 1_000;
      return nowMs;
    },
    randomUuid: nextRunId,
    command: (executable, argv) => {
      if (executable === process.execPath) return runFrozenLayer(argv);
      if (argv[0] === "run" && executable.endsWith("/docker")) {
        return runVerifiedSourceLayer(argv);
      }
      if (argv[0] === "image") {
        return {
          status: 0,
          stdout: `eclipse-temurin${FIXED_DOCKER_IMAGE.slice(FIXED_DOCKER_IMAGE.indexOf("@sha256:"))}\n`,
          stderr: "",
        };
      }
      if (argv[0] === "ps") return { status: 0, stdout: "", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    },
  };
}

function runtime() {
  return {
    bunVersion: "1.3.13",
    runnerOs: "Linux",
    runnerArch: "X64",
    githubRunId: "406",
    githubRunAttempt: "1",
    headSha: "a".repeat(40),
  };
}

async function assertSemanticMutationRoundTrip(model: (typeof MODEL_NAMES)[number]): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), `t406-${model}-mutation-`));
  const workspace = join(root, "workspace");
  mkdirSync(join(workspace, "specs"), { recursive: true });
  cpSync("specs/tla", join(workspace, "specs/tla"), { recursive: true });
  const modelPath = join(workspace, MODEL_TARGETS[model].modelPath);
  const original = readFileSync(modelPath, "utf8");
  try {
    writeFileSync(modelPath, semanticMutation(model, original));
    const redRoot = join(root, "red");
    const red = await executeCiModelCheckAcceptance(
      { evidenceRoot: redRoot, runtime: runtime(), models: [MODEL_TARGETS[model]] },
      new NodeCiModelCheckPort(workspace, semanticPortDependencies(workspace, model)),
    );
    expect(red).toEqual({ exitCode: 2, reason: "RUN_FAILURE" });
    expect(JSON.parse(readFileSync(join(redRoot, "run-failure.json"), "utf8"))).toMatchObject({
      errorCode: "DETECTED",
      model,
    });

    writeFileSync(modelPath, original);
    const greenRoot = join(root, "green");
    const green = await executeCiModelCheckAcceptance(
      { evidenceRoot: greenRoot, runtime: runtime(), models: [MODEL_TARGETS[model]] },
      new NodeCiModelCheckPort(workspace, semanticPortDependencies(workspace, model)),
    );
    expect(green).toEqual({ exitCode: 0, reason: "NOT_DETECTED" });
    expect(JSON.parse(readFileSync(join(greenRoot, "verification.json"), "utf8"))).toMatchObject({
      pass: true,
      completedRuns: 6,
    });
    expect(readFileSync(modelPath, "utf8")).toBe(original);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

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

  test("accepts the 2 x 6 evidence matrix", () => {
    const evidence = acceptanceEvidence();
    expect(validateCiAcceptanceEvidence(evidence)).toEqual({ ok: true, value: undefined });
  });

  test("rejects model-specific completion, statistics, and block-order drift", () => {
    const incomplete = acceptanceEvidence();
    (incomplete.runs[0]!.stats as { completionMarker: boolean }).completionMarker = false;
    expect(validateCiAcceptanceEvidence(incomplete).ok).toBe(false);

    const statisticsDrift = acceptanceEvidence();
    (statisticsDrift.runs[7]!.stats as { generatedStates: number }).generatedStates = 1;
    expect(validateCiAcceptanceEvidence(statisticsDrift)).toEqual({
      ok: false,
      error: expect.stringContaining("statistics drifted"),
    });

    const duplicateBlock = acceptanceEvidence();
    (duplicateBlock.runs[6] as { model: string }).model = "FormalElection";
    expect(validateCiAcceptanceEvidence(duplicateBlock)).toEqual({
      ok: false,
      error: expect.stringContaining("model ordering"),
    });
  });

  test("injects a semantic defect into each model, observes red, restores bytes, and returns green", async () => {
    await assertSemanticMutationRoundTrip("FormalElection");
    await assertSemanticMutationRoundTrip("MirrorLifecycle");
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
      expect(parseCiArguments(["run", "--root", "relative"])).toBeNull();
      expect(parseCiArguments(["run", "--root", root, "extra"])).toBeNull();
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

  test("drives every CI CLI branch in-process", async () => {
    const root = mkdtempSync(join(tmpdir(), "t406-ci-main-"));
    const writes: string[] = [];
    const writeError = (value: string) => writes.push(value);
    try {
      expect(await runCiMain([], { writeError })).toBe(2);
      expect(writes.at(-1)).toContain("usage:");

      expect(await runCiMain(["verify", "--root", root, "--model", "NoSuch"], {
        writeError,
      })).toBe(2);
      expect(writes.at(-1)).toContain("MODEL_MAP_INVALID");

      expect(await runCiMain(["verify", "--root", root], { writeError })).toBe(2);
      expect(writes.at(-1)).toContain("CI_ARTIFACTS_INVALID");

      let selected: readonly string[] = [];
      expect(await runCiMain(["run", "--root", root], {
        writeError,
        execute: async (options) => {
          selected = options.models.map((model) => model.name);
          return { exitCode: 0, reason: "NOT_DETECTED" };
        },
      })).toBe(0);
      expect(selected).toEqual(MODEL_NAMES);
      expect(writes.at(-1)).toBe('{"exitCode":0,"reason":"NOT_DETECTED"}\n');

      expect(await runCiMain(["run", "--root", root, "--model", "MirrorLifecycle"], {
        writeError,
        execute: async (options) => {
          selected = options.models.map((model) => model.name);
          return { exitCode: 0, reason: "NOT_DETECTED" };
        },
      })).toBe(0);
      expect(selected).toEqual(["MirrorLifecycle"]);

      expect(await runCiMain(["run", "--root", root], {
        writeError,
        loadSources: () => ({
          ok: false,
          error: {
            kind: "MODEL_LOAD",
            code: "MODEL_MAP_INVALID",
            relativePath: "specs/tla/model-map.json",
            detail: "injected load failure",
          },
        }),
      })).toBe(2);
      expect(writes.at(-1)).toContain("injected load failure");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects unknown and empty run-skeleton model options before JDK setup", () => {
    const root = mkdtempSync(join(tmpdir(), "t406-skeleton-args-"));
    try {
      for (const args of [
        [root, "--unknown", "MirrorLifecycle"],
        [root, "--model", ""],
      ]) {
        const result = Bun.spawnSync([
          process.execPath,
          "plugins/formal-model-check/tools/run-skeleton-ci.ts",
          ...args,
        ], {
          cwd: resolve("."),
          env: { ...process.env, JAVA_HOME: "" },
        });
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain("usage:");
      }
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
      `bun plugins/formal-model-check/tools/run-model-check-ci.ts run --root "\${EVIDENCE_ROOT}"`,
    );
    expect(workflow).toContain(
      `bun plugins/formal-model-check/tools/run-model-check-ci.ts verify --root "\${EVIDENCE_ROOT}"`,
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
