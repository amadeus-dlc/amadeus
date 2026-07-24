import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface WorkflowStep {
  readonly id?: string;
  readonly run?: string;
}

const roots: string[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

function command(cwd: string, executable: string, argv: readonly string[], env = {}) {
  return spawnSync(executable, [...argv], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: false,
  });
}

function commit(cwd: string, message: string): string {
  expect(command(cwd, "git", ["add", "."]).status).toBe(0);
  expect(command(cwd, "git", ["commit", "-m", message]).status).toBe(0);
  return command(cwd, "git", ["rev-parse", "HEAD"]).stdout.trim();
}

function changesScript(): string {
  const workflow = Bun.YAML.parse(readFileSync(".github/workflows/ci.yml", "utf8")) as {
    jobs: { changes: { steps: WorkflowStep[] } };
  };
  return workflow.jobs.changes.steps.find((step) => step.id === "filter")!.run!;
}

function repository(): { root: string; base: string; head: string } {
  const root = mkdtempSync(join(tmpdir(), "u4-ci-event-"));
  roots.push(root);
  mkdirSync(join(root, "scripts"));
  copyFileSync("scripts/detect-ci-changes.sh", join(root, "scripts/detect-ci-changes.sh"));
  chmodSync(join(root, "scripts/detect-ci-changes.sh"), 0o700);
  expect(command(root, "git", ["init"]).status).toBe(0);
  expect(command(root, "git", ["config", "user.email", "ci@example.invalid"]).status).toBe(0);
  expect(command(root, "git", ["config", "user.name", "CI Test"]).status).toBe(0);
  writeFileSync(join(root, "README.md"), "base\n");
  const base = commit(root, "base");
  writeFileSync(join(root, "README.md"), "head\n");
  const head = commit(root, "head");
  return { root, base, head };
}

function executeChanges(
  fixture: { root: string; base: string; head: string },
  eventName: "workflow_dispatch" | "push" | "pull_request",
  baseSha: string,
): { status: number | null; output: string; stderr: string } {
  const outputPath = join(fixture.root, `github-output-${eventName}`);
  const result = command(
    fixture.root,
    "bash",
    ["-c", changesScript()],
    {
      EVENT_NAME: eventName,
      BASE_SHA: baseSha,
      HEAD_SHA: fixture.head,
      GITHUB_OUTPUT: outputPath,
    },
  );
  return {
    status: result.status,
    output: readFileSync(outputPath, "utf8"),
    stderr: result.stderr,
  };
}

describe("U4 CI event behavior", () => {
  test("dispatch avoids an empty git diff and returns the explicit no-band decision", () => {
    const fixture = repository();
    expect(executeChanges(fixture, "workflow_dispatch", "")).toEqual({
      status: 0,
      output: "full=false\ndrift=false\ncoverage=false\n",
      stderr: "",
    });
  });

  test("push and pull_request keep the existing changed-file decision", () => {
    const fixture = repository();
    const push = executeChanges(fixture, "push", fixture.base);
    const pullRequest = executeChanges(fixture, "pull_request", fixture.base);
    expect(push.status).toBe(0);
    expect(pullRequest.status).toBe(0);
    expect(push.output).toBe(pullRequest.output);
    expect(push.output).toContain("full=false");
    expect(push.output).toContain("drift=false");
    expect(push.output).toContain("coverage=false");
  });

  test("all workflow run blocks are valid Bash and the CI verifier fails closed", () => {
    const workflow = Bun.YAML.parse(readFileSync(".github/workflows/ci.yml", "utf8")) as {
      jobs: Record<string, { steps?: WorkflowStep[] }>;
    };
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      for (const [index, step] of (job.steps ?? []).entries()) {
        if (!step.run) continue;
        const checked = spawnSync("bash", ["-n"], {
          input: step.run,
          encoding: "utf8",
          shell: false,
        });
        expect(checked.status, `${jobName} step ${index}: ${checked.stderr}`).toBe(0);
      }
    }
    const root = mkdtempSync(join(tmpdir(), "u4-ci-cli-invalid-"));
    roots.push(root);
    const verified = command(
      process.cwd(),
      process.execPath,
      ["scripts/formal-verif/run-model-check-ci.ts", "verify", "--root", root],
    );
    expect(verified.status).toBe(2);
    expect(verified.stderr).toContain('"code":"CI_ARTIFACTS_INVALID"');
  });
});
