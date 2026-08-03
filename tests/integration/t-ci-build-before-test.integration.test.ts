// covers: FR-3.1, FR-4.1, NFR-1, BR-U7-1..6
// size: medium

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "../..");
const WORKFLOW_PATH = join(REPO_ROOT, ".github/workflows/ci.yml");

interface WorkflowStep {
  readonly name?: string;
  readonly run?: string;
  readonly with?: Readonly<Record<string, unknown>>;
}

interface WorkflowJob {
  readonly env?: Readonly<Record<string, string>>;
  readonly needs?: string | readonly string[];
  readonly steps?: readonly WorkflowStep[];
}

interface Workflow {
  readonly jobs?: Readonly<Record<string, WorkflowJob>>;
}

function workflow(): Workflow {
  return Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as Workflow;
}

function jobByName(name: string): WorkflowJob {
  const job = workflow().jobs?.[name];
  expect(job, `missing workflow job: ${name}`).toBeDefined();
  return job!;
}

function stepByName(job: WorkflowJob, name: string): WorkflowStep {
  const step = job.steps?.find((candidate) => candidate.name === name);
  expect(step, `missing workflow step: ${name}`).toBeDefined();
  return step!;
}

function stepIndex(job: WorkflowJob, name: string): number {
  return job.steps?.findIndex((step) => step.name === name) ?? -1;
}

function runRunnerFixture(dist: "missing" | "empty" | "present") {
  const root = mkdtempSync(join(tmpdir(), "amadeus-runner-dist-"));
  const testsDir = join(root, "tests");
  mkdirSync(testsDir, { recursive: true });
  cpSync(join(REPO_ROOT, "tests/run-tests.ts"), join(testsDir, "run-tests.ts"));
  cpSync(join(REPO_ROOT, "tests/lib"), join(testsDir, "lib"), { recursive: true });
  if (dist !== "missing") mkdirSync(join(root, "dist"));
  if (dist === "present") writeFileSync(join(root, "dist", "marker"), "generated\n");

  try {
    return spawnSync(
      process.execPath,
      [join(testsDir, "run-tests.ts"), "--smoke", "--filter", "__no_matching_test__"],
      { encoding: "utf8" },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("u7 CI build-before-test contract", () => {
  test("root build script generates dist before self-install surfaces", () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.build).toBe("bun run dist && bun run promote:self");
  });

  test("every head test job builds after install and before testing", () => {
    for (const [jobName, testStep] of [
      ["plugin-conformance-e2e", "Plugin conformance journey (e2e)"],
      ["tests", "Tests - smoke + unit + integration"],
      ["coverage-head", "Generate coverage reports"],
    ] as const) {
      const job = jobByName(jobName);
      const install = stepIndex(job, "Install dependencies");
      const build = stepIndex(job, "Build generated distributions");
      const testRun = stepIndex(job, testStep);
      expect(install, jobName).toBeGreaterThan(stepIndex(job, "Checkout"));
      expect(build, jobName).toBeGreaterThan(install);
      expect(testRun, jobName).toBeGreaterThan(build);
      expect(stepByName(job, "Build generated distributions").run).toBe("bun run build");
    }
  });

  test("every generated-distribution consumer builds before use", () => {
    for (const [jobName, consumerStep] of [
      ["typecheck", "Typecheck (tsc --noEmit, both tsconfigs)"],
      ["lint", "Deletion gate (legacy writer, six-condition machine verification)"],
      ["distribution-contract", "Intent Mirror distribution contract"],
    ] as const) {
      const job = jobByName(jobName);
      const install = stepIndex(job, "Install dependencies");
      const build = stepIndex(job, "Build generated distributions");
      const consumer = stepIndex(job, consumerStep);
      expect(build, jobName).toBeGreaterThan(install);
      expect(consumer, jobName).toBeGreaterThan(build);
      expect(stepByName(job, "Build generated distributions").run).toBe("bun run build");
    }
  });

  test("merge-base coverage builds before measuring without masking build failure", () => {
    const job = jobByName("coverage-base");
    const measure = stepByName(job, "Measure base coverage").run ?? "";
    expect(measure).toContain('build_script="$(bun -e');
    expect(measure).toContain("bun run build");
    expect(measure).toContain("bun run dist && bun run promote:self");
    expect(measure.indexOf("bun run build")).toBeLessThan(measure.indexOf("bun run coverage:ci"));
  });

  test("head patch coverage keeps tracked bootstrap rules available", () => {
    const job = jobByName("coverage-head");
    expect(job.steps?.some((step) => step.name === "Remove transitional generated Codex suffix"))
      .toBe(false);
    expect(stepIndex(job, "Patch coverage gate")).toBeGreaterThan(
      stepIndex(job, "Project coverage gate"),
    );
  });

  test("reproducibility job builds two isolated fixed-SHA trees sequentially", () => {
    const job = jobByName("reproducible-build");
    expect(stepByName(job, "Checkout").with?.["persist-credentials"]).toBe(false);
    const build = stepByName(job, "Build isolated distributions").run ?? "";
    expect(spawnSync("bash", ["-n"], { input: build }).status).toBe(0);
    expect(build).toContain('git clone --quiet --no-hardlinks "${GITHUB_WORKSPACE}" "${tree}"');
    expect(build).toContain('git -C "${tree}" checkout --quiet --detach "${GITHUB_SHA}"');
    expect(build).toContain('(cd "${tree}" && bun run build)');
    expect(build.indexOf('prepare_tree "${REPRO_ROOT}/tree-a"')).toBeLessThan(
      build.indexOf('prepare_tree "${REPRO_ROOT}/tree-b"'),
    );
  });

  test("reproducibility steps share a RUNNER_TEMP-derived isolated root", () => {
    const job = jobByName("reproducible-build");
    expect(job.env?.REPRO_ROOT).toBeUndefined();

    for (const stepName of ["Build isolated distributions", "Compare distribution bytes"]) {
      expect(stepByName(job, stepName).run).toContain(
        'REPRO_ROOT="${RUNNER_TEMP}/amadeus-reproducible-build"',
      );
    }
  });

  test("reproducibility comparison reports paths and fails on a byte difference", () => {
    const compare = stepByName(jobByName("reproducible-build"), "Compare distribution bytes").run
      ?? "";
    const runnerTemp = mkdtempSync(join(tmpdir(), "amadeus-repro-compare-"));
    const root = join(runnerTemp, "amadeus-reproducible-build");
    try {
      for (const tree of ["tree-a", "tree-b"]) {
        mkdirSync(join(root, tree, "dist", "codex"), { recursive: true });
        writeFileSync(join(root, tree, "dist", "codex", "asset"), "same\n");
      }
      const equal = spawnSync("bash", ["-c", compare], {
        encoding: "utf8",
        env: { ...process.env, RUNNER_TEMP: runnerTemp },
      });
      expect(equal.status).toBe(0);

      writeFileSync(join(root, "tree-b", "dist", "codex", "asset"), "SECRET-CONTENT\n");
      const different = spawnSync("bash", ["-c", compare], {
        encoding: "utf8",
        env: { ...process.env, RUNNER_TEMP: runnerTemp },
      });
      expect(different.status).toBe(1);
      expect(different.stdout + different.stderr).toContain("dist/codex/asset");
      expect(different.stdout + different.stderr).not.toContain("SECRET-CONTENT");
    } finally {
      rmSync(runnerTemp, { recursive: true, force: true });
    }
  });

  test("run-tests fails closed for missing or empty dist and stays silent when built", () => {
    for (const state of ["missing", "empty"] as const) {
      const result = runRunnerFixture(state);
      expect(result.status, state).toBe(1);
      expect(result.stderr, state).toContain(
        "run-tests: dist/ is missing or empty — run `bun run build` first",
      );
    }

    const present = runRunnerFixture("present");
    expect(present.status).toBe(0);
    expect(present.stderr).not.toContain("bun run build");
  });

  test("required reproducibility and legacy drift checks both block CI", () => {
    const jobs = workflow().jobs ?? {};
    const ciSuccess = jobByName("ci-success");
    expect(ciSuccess.needs).toContain("reproducible-build");
    expect(stepByName(ciSuccess, "All checks passed").run).toContain(
      'require_result "reproducible-build"',
    );

    const drift = jobByName("drift-check");
    expect(stepByName(drift, "Source-only boundary guard").run).toBe(
      "bun run source-only:check",
    );
    expect(stepByName(drift, "Build generated distributions").run).toBe("bun run build");
    expect(stepByName(drift, "Compiled graph invariant guard").run).toBe(
      "bun .claude/tools/amadeus-graph.ts compile --check",
    );
    expect(Object.keys(jobs)).toContain("drift-check");
  });
});
