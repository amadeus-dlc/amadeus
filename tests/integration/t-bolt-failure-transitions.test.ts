// covers: file:packages/framework/core/tools/amadeus-bolt.ts

import { afterEach, describe, expect, mock, test } from "bun:test";
import * as childProcess from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  resetAidlcEnv,
  seedAuditFile,
  seededAuditShard,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

type SiblingTool = "amadeus-state.ts" | "amadeus-audit.ts" | "amadeus-runtime.ts";

let failedTool: SiblingTool | null = null;

mock.module("node:child_process", () => ({
  ...childProcess,
  spawnSync: ((command: unknown, commandArgs?: unknown) => {
    const args = Array.isArray(commandArgs) ? commandArgs.map(String) : [];
    const tool = (["amadeus-state.ts", "amadeus-audit.ts", "amadeus-runtime.ts"] as const)
      .find((candidate) => args.some((value) => value.endsWith(candidate)));
    const failed = tool !== undefined && tool === failedTool;
    return {
      pid: 1,
      output: [null, failed ? "" : "ok", failed ? "synthetic sibling failure" : ""],
      stdout: failed ? "" : "ok",
      stderr: failed ? "synthetic sibling failure" : "",
      status: failed ? 1 : 0,
      signal: null,
    };
  }) as typeof childProcess.spawnSync,
}));

const { handleBoltCommand, handleComplete } = await import(
  "../../packages/framework/core/tools/amadeus-bolt.ts"
);

type Run = { status: number; out: string };

const projects: string[] = [];

afterEach(() => {
  failedTool = null;
  resetOtelPerProject();
  while (projects.length > 0) cleanupTestProject(projects.pop());
  resetAidlcEnv();
});

function setupProject(slug: string): string {
  const projectDir = createTestProject();
  projects.push(projectDir);
  seedStateFile(projectDir, "state-construction.md");
  seedAuditFile(projectDir);
  mkdirSync(join(projectDir, ".amadeus", "worktrees", `bolt-${slug}`), { recursive: true });
  return projectDir;
}

function directArgs(
  projectDir: string,
  handler: (args: string[], explicitProjectDir?: string) => void,
  args: string[],
): Run {
  let status = 0;
  let out = "";
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;
  const originalStderr = process.stderr.write;
  class ExitSignal extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = ((value: unknown) => {
    out += `${String(value)}\n`;
  }) as typeof console.log;
  console.error = ((value: unknown) => {
    out += `${String(value)}\n`;
  }) as typeof console.error;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    out += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    handler(args, projectDir);
  } catch (error) {
    if (error instanceof ExitSignal) status = error.code;
    else throw error;
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
    process.stderr.write = originalStderr;
  }
  return { status, out };
}

function start(projectDir: string, slug: string, worktree = false): Run {
  return directArgs(projectDir, (args, explicitProjectDir) => {
    handleBoltCommand("start", args, explicitProjectDir);
  }, [
    "--name",
    slug,
    "--batch",
    "1",
    ...(worktree ? ["--worktree", "--slug", slug] : []),
  ]);
}

describe("bolt lifecycle failure transitions", () => {
  test("plain start emits immutable solo correlation fields", () => {
    const projectDir = setupProject("plain-correlation");

    const result = start(projectDir, "plain-correlation");

    expect(result.status).toBe(0);
    const envelope = JSON.parse(result.out) as Record<string, unknown>;
    expect(envelope).toMatchObject({
      emitted: "BOLT_STARTED",
      stage: "functional-design",
      batch_id: "solo:1:plain-correlation",
    });
    expect(envelope.attempt_id).toBeString();
  });

  test.each([
    ["plain", false, "Active workflow state not found"],
    ["worktree", true, "state-read-failed"],
  ] as const)("%s start rejects a missing state before audit emission", (slug, worktree, message) => {
    const projectDir = createTestProject();
    projects.push(projectDir);
    seedAuditFile(projectDir);

    const result = start(projectDir, slug, worktree);

    expect(result.status).toBe(1);
    expect(result.out).toContain(message);
  });

  test("worktree start reports an audit emission failure", () => {
    const projectDir = setupProject("audit-emit");
    rmSync(seededAuditShard(projectDir), { force: true });
    mkdirSync(seededAuditShard(projectDir));

    const result = start(projectDir, "audit-emit", true);

    expect(result.status).toBe(1);
    expect(result.out).toContain("audit-emit-failed");
  });

  test.each([
    ["amadeus-state.ts", "state-fork-failed"],
    ["amadeus-audit.ts", "audit-fork-failed"],
    ["amadeus-runtime.ts", "fragment-fork-failed"],
  ] as const)("worktree start preserves a %s failure", (tool, reason) => {
    const slug = tool.replace("amadeus-", "").replace(".ts", "");
    const projectDir = setupProject(slug);
    failedTool = tool;

    const result = start(projectDir, slug, true);

    expect(result.status).toBe(1);
    expect(result.out).toContain(reason);
    expect(result.out).toContain("synthetic sibling failure");
  });

  test("solo completion records its immutable correlation fields", () => {
    const projectDir = setupProject("solo-complete");

    const result = directArgs(projectDir, handleComplete, [
      "--name",
      "solo-complete",
      "--batch",
      "1",
      "--attempt",
      "attempt-a",
      "--stage",
      "code-generation",
      "--batch-id",
      "solo:1:solo-complete",
    ]);

    expect(result.status).toBe(0);
    const audit = readFileSync(seededAuditShard(projectDir), "utf8");
    expect(audit).toContain('"Attempt Id":"attempt-a"');
    expect(audit).toContain('"Batch Id":"solo:1:solo-complete"');
  });

  test("solo completion refuses state without a current stage", () => {
    const projectDir = setupProject("solo-no-stage");
    writeFileSync(
      seededStateFile(projectDir),
      readFileSync(seededStateFile(projectDir), "utf8").replace(/^- \*\*Current Stage\*\*:.*$/m, ""),
    );

    const result = directArgs(projectDir, handleComplete, [
      "--name",
      "solo-no-stage",
      "--batch",
      "1",
      "--attempt",
      "attempt-a",
    ]);

    expect(result.status).toBe(1);
    expect(result.out).toContain("no Current Stage for solo correlation");
  });

  test("solo completion reports state-read failure as state correlation failure", () => {
    const projectDir = setupProject("solo-missing-state");
    rmSync(seededStateFile(projectDir), { force: true });

    const result = directArgs(projectDir, handleComplete, [
      "--name",
      "solo-missing-state",
      "--batch",
      "1",
      "--attempt",
      "attempt-a",
    ]);

    expect(result.status).toBe(1);
    expect(result.out).toContain("Active workflow state not found");
    expect(result.out).not.toContain("Audit emission failed");
  });

  test("fail records the explicit batch identity from --batch-id", () => {
    const projectDir = setupProject("failed-correlation");

    const result = directArgs(projectDir, (args, explicitProjectDir) => {
      handleBoltCommand("fail", args, explicitProjectDir);
    }, [
      "--name",
      "failed-correlation",
      "--slug",
      "failed-correlation",
      "--stage",
      "code-generation",
      "--attempt",
      "attempt-a",
      "--batch-id",
      "solo:1:failed-correlation",
      "--error",
      "red",
    ]);

    expect(result.status).toBe(0);
    expect(readFileSync(seededAuditShard(projectDir), "utf8")).toContain(
      '"Batch Id":"solo:1:failed-correlation"',
    );
  });

  test("abort preserves every supplied failure correlation field", () => {
    const projectDir = setupProject("aborted-correlation");

    const result = directArgs(projectDir, (args, explicitProjectDir) => {
      handleBoltCommand("abort", args, explicitProjectDir);
    }, [
      "--name",
      "aborted-correlation",
      "--slug",
      "aborted-correlation",
      "--stage",
      "code-generation",
      "--attempt",
      "attempt-a",
      "--batch-id",
      "batch-custom",
      "--reason",
      "operator-stop",
    ]);

    expect(result.status).toBe(0);
    const audit = readFileSync(seededAuditShard(projectDir), "utf8");
    expect(audit).toContain('"Stage":"code-generation"');
    expect(audit).toContain('"Attempt Id":"attempt-a"');
    expect(audit).toContain('"Batch Id":"batch-custom"');
  });

  test("merge completion preserves a runtime fragment failure", () => {
    const projectDir = setupProject("fragment-merge");
    expect(start(projectDir, "fragment-merge", true).status).toBe(0);
    writeFileSync(
      seededStateFile(projectDir),
      readFileSync(seededStateFile(projectDir), "utf8").replace(
        /^- \*\*Bolt Refs\*\*:.*$/m,
        "- **Bolt Refs**: [fragment-merge]",
      ),
    );
    failedTool = "amadeus-runtime.ts";

    const result = directArgs(projectDir, handleComplete, [
      "--name",
      "fragment-merge",
      "--batch",
      "1",
      "--merge",
      "--slug",
      "fragment-merge",
    ]);

    expect(result.status).toBe(1);
    expect(result.out).toContain("fragment-merge-failed");
  });

  test("merge completion reports an audit emission failure", () => {
    const projectDir = setupProject("merge-audit-emit");
    expect(start(projectDir, "merge-audit-emit", true).status).toBe(0);
    writeFileSync(
      seededStateFile(projectDir),
      readFileSync(seededStateFile(projectDir), "utf8").replace(
        /^- \*\*Bolt Refs\*\*:.*$/m,
        "- **Bolt Refs**: [merge-audit-emit]",
      ),
    );
    rmSync(seededAuditShard(projectDir), { force: true });
    mkdirSync(seededAuditShard(projectDir));

    const result = directArgs(projectDir, handleComplete, [
      "--name",
      "merge-audit-emit",
      "--batch",
      "1",
      "--merge",
      "--slug",
      "merge-audit-emit",
    ]);

    expect(result.status).toBe(1);
    expect(result.out).toContain("audit-emit-failed");
  });
});
