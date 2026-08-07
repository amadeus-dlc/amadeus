// @test-size large
import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { performance } from "node:perf_hooks";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NodeTlcProcessPort,
  type TlcChildProcessPort,
  type TlcProcessPort,
  type TlcProcessRequest,
} from "../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import {
  createDefaultModelCheckToolchain,
  runModelCheck,
} from "../../plugins/formal-model-check/tools/run-model-check.ts";
import { beginModelCheckArtifacts } from "../../plugins/formal-model-check/tools/run-model-check-artifacts.ts";
import { DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER } from "../../plugins/formal-model-check/tools/run-model-check-execution.ts";
import { NODE_RUN_MODEL_CHECK_FILESYSTEM } from "../../plugins/formal-model-check/tools/run-model-check-paths.ts";
import { StderrModelCheckReporter } from "../../plugins/formal-model-check/tools/run-model-check-reporter.ts";
import { extractDiagnosticStatistics } from "../../plugins/formal-model-check/tools/run-model-check-diagnostic.ts";
import { NodePlannerEnvironmentPort } from "../../plugins/formal-model-check/tools/tlc-spawn-planner.ts";

const REAL_TLC_AVAILABLE = process.env.AMADEUS_RUN_REAL_TLC === "1"
  && process.platform === "darwin"
  && process.env.JAVA_HOME !== undefined;
const PERFORMANCE_ENABLED = REAL_TLC_AVAILABLE
  && process.env.AMADEUS_RUN_REAL_TLC_PERFORMANCE === "1";
const REAL_TLC_ENABLED = REAL_TLC_AVAILABLE && !PERFORMANCE_ENABLED;

class TimingProcessPort implements TlcProcessPort {
  readonly spawnDurationsMs: number[] = [];

  constructor(private readonly delegate = new NodeTlcProcessPort()) {}

  spawn(input: TlcProcessRequest): TlcChildProcessPort {
    const startedAt = performance.now();
    const child = this.delegate.spawn(input);
    return {
      stdout: child.stdout,
      stderr: child.stderr,
      signalGroup: (signal) => child.signalGroup(signal),
      wait: async () => {
        const status = await child.wait();
        this.spawnDurationsMs.push(performance.now() - startedAt);
        return status;
      },
    };
  }
}

describe("run-model-check real Darwin acceptance", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  for (const target of [
    { name: "FormalElection", auxiliaryModules: [] },
    { name: "MirrorLifecycle", auxiliaryModules: ["MirrorLifecycleCore"] },
  ] as const) {
    test.skipIf(!REAL_TLC_ENABLED)(
      `runs the ${target.name} production composition in-process with completion evidence`,
      async () => {
        const root = mkdtempSync(join(tmpdir(), "run-model-check-real-"));
        roots.push(root);
        const workspace = join(root, "workspace");
        const evidence = join(root, "evidence");
        mkdirSync(workspace);
        mkdirSync(evidence);
        const model = join(workspace, `${target.name}.tla`);
        const cfg = join(workspace, `${target.name}.cfg`);
        cpSync(`amadeus/spaces/default/specs/tla/${target.name}.tla`, model);
        cpSync(`amadeus/spaces/default/specs/tla/${target.name}.cfg`, cfg);
        for (const auxiliary of target.auxiliaryModules) {
          cpSync(`amadeus/spaces/default/specs/tla/${auxiliary}.tla`, join(workspace, `${auxiliary}.tla`));
        }

        const result = await runModelCheck([
          "--model", model,
          "--cfg", cfg,
          "--out", join(evidence, "run"),
          "--provider", "sandbox-exec",
        ]);

        expect(result).toMatchObject({
          exitCode: 0,
          outcome: { kind: "NOT_DETECTED" },
        });
        expect(result.publishedDirectory).not.toBeNull();
        const publishedDirectory = result.publishedDirectory!;
        const completion = JSON.parse(
          readFileSync(join(publishedDirectory, "completion-marker.json"), "utf8"),
        );
        expect(completion).toMatchObject({ complete: true });
        const statistics = extractDiagnosticStatistics(
          readFileSync(join(publishedDirectory, "tlc-stdout.bin"), "utf8"),
        );
        expect(statistics).toMatchObject({
          completionMarker: "Model checking completed. No error has been found.",
          statesLeftOnQueue: 0,
        });
        expect(statistics.generatedStates).toBeGreaterThan(0);
        expect(statistics.distinctStates).toBeGreaterThan(0);
        expect(statistics.searchDepth).toBeGreaterThan(0);
        expect(readdirSync(workspace).sort()).toEqual([
          `${target.name}.cfg`,
          `${target.name}.tla`,
          ...target.auxiliaryModules.map((name) => `${name}.tla`),
        ].sort());
      },
      180_000,
    );
  }

  test.skipIf(!PERFORMANCE_ENABLED)(
    "measures one warm-up and five Darwin production runs",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "run-model-check-performance-"));
      roots.push(root);
      const workspace = join(root, "workspace");
      const evidence = join(root, "evidence");
      mkdirSync(workspace);
      mkdirSync(evidence);
      const model = join(workspace, "FormalElection.tla");
      const cfg = join(workspace, "FormalElection.cfg");
      cpSync("amadeus/spaces/default/specs/tla/FormalElection.tla", model);
      cpSync("amadeus/spaces/default/specs/tla/FormalElection.cfg", cfg);
      const before = {
        files: readdirSync(workspace).sort(),
        model: readFileSync(model),
        cfg: readFileSync(cfg),
      };
      const samples: Array<{
        phase: "warm-up" | "measured";
        cliMs: number;
        spawnMs: number;
        workspaceWrites: number;
      }> = [];

      for (let index = 0; index < 6; index++) {
        const processes = new TimingProcessPort();
        const cliStartedAt = performance.now();
        const result = await runModelCheck(
          [
            "--model", model,
            "--cfg", cfg,
            "--out", join(evidence, `run-${index}`),
            "--provider", "sandbox-exec",
          ],
          {
            randomUuid: () => crypto.randomUUID(),
            utcNow: () => new Date().toISOString(),
            platform: process.platform,
            environment: new NodePlannerEnvironmentPort(),
            filesystem: NODE_RUN_MODEL_CHECK_FILESYSTEM,
            publisher: DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
            reserveArtifacts: beginModelCheckArtifacts,
            createToolchain: (cacheRoot, workspaceRoot) =>
              createDefaultModelCheckToolchain(cacheRoot, workspaceRoot, processes),
            reporter: new StderrModelCheckReporter(() => {}),
          },
        );
        const cliMs = performance.now() - cliStartedAt;
        const currentFiles = readdirSync(workspace).sort();
        const workspaceWrites = Number(
          JSON.stringify(currentFiles) !== JSON.stringify(before.files)
          || !readFileSync(model).equals(before.model)
          || !readFileSync(cfg).equals(before.cfg),
        );
        expect(result).toMatchObject({
          exitCode: 0,
          outcome: { kind: "NOT_DETECTED" },
        });
        expect(processes.spawnDurationsMs).toHaveLength(1);
        samples.push({
          phase: index === 0 ? "warm-up" : "measured",
          cliMs,
          spawnMs: processes.spawnDurationsMs[0]!,
          workspaceWrites,
        });
      }

      const measured = samples.slice(1);
      expect(measured.every((sample) => sample.spawnMs < 180_000)).toBe(true);
      expect(measured.every((sample) => sample.cliMs < 180_000)).toBe(true);
      expect(samples.every((sample) => sample.workspaceWrites === 0)).toBe(true);
      console.log(`U3_PERFORMANCE_RAW ${JSON.stringify({
        os: process.platform,
        arch: process.arch,
        bun: Bun.version,
        samples,
        measuredMaxSpawnMs: Math.max(...measured.map((sample) => sample.spawnMs)),
        measuredMaxCliMs: Math.max(...measured.map((sample) => sample.cliMs)),
      })}`);
    },
    1_200_000,
  );
});
