// covers: subcommand:amadeus-bolt:complete, subcommand:amadeus-audit:audit-merge

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { auditRowsFrom } from "../harness/audit-records.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  resetAidlcEnv,
  seedAuditFile,
  seededAuditDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const BOLT_TOOL = join(AMADEUS_SRC, "tools", "amadeus-bolt.ts");

type Run = { status: number; out: string };

function runBolt(projectDir: string, args: string[]): Run {
  const result = spawnSync(BUN, [BOLT_TOOL, "--project-dir", projectDir, ...args], {
    cwd: projectDir,
    encoding: "utf-8",
  });
  return {
    status: result.status ?? -1,
    out: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function setupProject(slug: string): string {
  const projectDir = createTestProject();
  seedStateFile(projectDir, "state-construction.md");
  seedAuditFile(projectDir);
  mkdirSync(join(projectDir, ".amadeus", "worktrees", `bolt-${slug}`), { recursive: true });
  return projectDir;
}

function start(projectDir: string, slug: string): Run {
  return runBolt(projectDir, [
    "start",
    "--name",
    slug,
    "--batch",
    "2",
    "--worktree",
    "--slug",
    slug,
  ]);
}

function complete(projectDir: string, slug: string): Run {
  return runBolt(projectDir, [
    "complete",
    "--name",
    slug,
    "--batch",
    "2",
    "--merge",
    "--slug",
    slug,
  ]);
}

function allAudit(projectDir: string): string {
  return readdirSync(seededAuditDir(projectDir))
    .filter((name) => name.endsWith(".jsonl"))
    .sort()
    .map((name) => readFileSync(join(seededAuditDir(projectDir), name), "utf-8"))
    .join("\n");
}

function eventCount(projectDir: string, event: string, slug?: string): number {
  return auditRowsFrom(allAudit(projectDir)).filter(
    (row) => row.event === event && (slug === undefined || row.fields["Bolt slug"] === slug),
  ).length;
}

function boltRefs(projectDir: string): string {
  return (
    readFileSync(seededStateFile(projectDir), "utf-8")
      .split("\n")
      .find((line) => line.includes("Bolt Refs")) ?? ""
  );
}

function worktreeAuditDir(projectDir: string, slug: string): string {
  return join(
    projectDir,
    ".amadeus",
    "worktrees",
    `bolt-${slug}`,
    "amadeus",
    "spaces",
    DEFAULT_SPACE,
    "intents",
    DEFAULT_RECORD_DIR,
    "audit",
  );
}

let projects: string[] = [];

beforeEach(() => resetAidlcEnv());
afterEach(() => {
  for (const projectDir of projects) cleanupTestProject(projectDir);
  projects = [];
});

describe("t414 complete --merge partial-success recovery", () => {
  test("resumes after STATE_MERGED when audit merge failed without duplicating lifecycle evidence", () => {
    const projectDir = setupProject("partial");
    projects.push(projectDir);
    expect(start(projectDir, "partial").status).toBe(0);

    const auditDir = worktreeAuditDir(projectDir, "partial");
    const auditName = readdirSync(auditDir).find((name) => name.endsWith(".jsonl"));
    expect(auditName).toBeDefined();
    const auditPath = join(auditDir, auditName!);
    const hiddenPath = `${auditPath}.saved`;
    renameSync(auditPath, hiddenPath);

    const first = complete(projectDir, "partial");
    expect(first.status).toBe(1);
    expect(boltRefs(projectDir)).not.toContain("partial");
    expect(eventCount(projectDir, "STATE_MERGED", "partial")).toBe(1);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "partial")).toBe(1);

    renameSync(hiddenPath, auditPath);
    const retry = complete(projectDir, "partial");
    expect(retry.status).toBe(0);
    expect(eventCount(projectDir, "STATE_MERGED", "partial")).toBe(1);
    expect(eventCount(projectDir, "AUDIT_MERGED", "partial")).toBe(1);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "partial")).toBe(1);
  });

  test("finds the unique fork shard after the main clone cursor is regenerated", () => {
    const projectDir = setupProject("cursor");
    projects.push(projectDir);
    expect(start(projectDir, "cursor").status).toBe(0);

    rmSync(join(projectDir, "amadeus", ".amadeus-clone-id"), { force: true });
    const result = complete(projectDir, "cursor");

    expect(result.status).toBe(0);
    expect(eventCount(projectDir, "STATE_MERGED", "cursor")).toBe(1);
    expect(eventCount(projectDir, "AUDIT_MERGED", "cursor")).toBe(1);
  });

  test("a fully merged Bolt replays as an idempotent success", () => {
    const projectDir = setupProject("replay");
    projects.push(projectDir);
    expect(start(projectDir, "replay").status).toBe(0);
    expect(complete(projectDir, "replay").status).toBe(0);

    const replay = complete(projectDir, "replay");
    expect(replay.status).toBe(0);
    expect(eventCount(projectDir, "STATE_MERGED", "replay")).toBe(1);
    expect(eventCount(projectDir, "AUDIT_MERGED", "replay")).toBe(1);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "replay")).toBe(1);
  });

  test("never-merged slug fails closed without minting BOLT_COMPLETED", () => {
    const projectDir = setupProject("never");
    projects.push(projectDir);

    const result = complete(projectDir, "never");
    expect(result.status).toBe(1);
    expect(eventCount(projectDir, "STATE_MERGED", "never")).toBe(0);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "never")).toBe(0);
  });

  test("STATE_MERGED evidence for another slug cannot authorize recovery", () => {
    const projectDir = setupProject("target");
    projects.push(projectDir);
    mkdirSync(join(projectDir, ".amadeus", "worktrees", "bolt-other"), { recursive: true });
    expect(start(projectDir, "other").status).toBe(0);
    expect(complete(projectDir, "other").status).toBe(0);

    const result = complete(projectDir, "target");
    expect(result.status).toBe(1);
    expect(result.out).toContain("has no canonical STATE_MERGED evidence");
    expect(eventCount(projectDir, "BOLT_COMPLETED", "target")).toBe(0);
  });

  test("ambiguous STATE_MERGED evidence fails closed", () => {
    const projectDir = setupProject("ambiguous");
    projects.push(projectDir);
    expect(start(projectDir, "ambiguous").status).toBe(0);

    const auditDir = worktreeAuditDir(projectDir, "ambiguous");
    const auditName = readdirSync(auditDir).find((name) => name.endsWith(".jsonl"))!;
    const auditPath = join(auditDir, auditName);
    const hiddenPath = `${auditPath}.saved`;
    renameSync(auditPath, hiddenPath);
    expect(complete(projectDir, "ambiguous").status).toBe(1);

    const stateMergedLine = allAudit(projectDir)
      .split("\n")
      .find((line) => line.includes('"STATE_MERGED"'));
    expect(stateMergedLine).toBeDefined();
    writeFileSync(join(seededAuditDir(projectDir), "tampered.jsonl"), `${stateMergedLine}\n`);
    renameSync(hiddenPath, auditPath);

    const retry = complete(projectDir, "ambiguous");
    expect(retry.status).toBe(1);
    expect(retry.out).toContain("ambiguous STATE_MERGED evidence");
    expect(eventCount(projectDir, "AUDIT_MERGED", "ambiguous")).toBe(0);
  });
});
