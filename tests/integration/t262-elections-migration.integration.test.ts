import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMigrationPlan,
  main,
  type MigrationPlan,
} from "../../scripts/amadeus-election-migrate.ts";

let projectDir = "";
let root = "";

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "explicit-election-migration-cli-"));
  root = join(projectDir, "amadeus", "spaces", "default", "elections");
  const dir = join(root, "E-ONLY");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "election.json"), JSON.stringify({
    electionId: "E-ONLY",
    kind: "decision",
    question: "Only this Election?",
    choices: [{ internalNo: 1, label: "yes" }],
    voters: ["alice"],
    state: "draft",
  }));
  writeFileSync(join(dir, "ledger.json"), JSON.stringify({ ballots: [], late: [] }));
  writeFileSync(join(dir, "timeline.json"), "[]");
});

afterEach(() => rmSync(projectDir, { recursive: true, force: true }));

describe("migration CLI", () => {
  test("requires an explicit Election and emits a write-free plan", () => {
    expect(() => main(["--project-dir", projectDir])).toThrow(/--election/);
    const writesBefore = [
      readFileSync(join(root, "E-ONLY", "election.json")),
      readFileSync(join(root, "E-ONLY", "ledger.json")),
      readFileSync(join(root, "E-ONLY", "timeline.json")),
    ];
    expect(main([
      "--project-dir", projectDir,
      "--election", "E-ONLY",
      "--operation-id", "migration-e-only",
      "--created-at", "2026-08-13T00:00:00Z",
    ])).toBe(0);
    expect(existsSync(join(root, "elections.json"))).toBe(false);
    expect(existsSync(join(root, ".migration-receipts"))).toBe(false);
    expect([
      readFileSync(join(root, "E-ONLY", "election.json")),
      readFileSync(join(root, "E-ONLY", "ledger.json")),
      readFileSync(join(root, "E-ONLY", "timeline.json")),
    ]).toEqual(writesBefore);
  });

  test("apply consumes explicit plan and approval files", () => {
    const plan = createMigrationPlan(root, {
      electionId: "E-ONLY",
      operationId: "migration-e-only",
      createdAt: "2026-08-13T00:00:00Z",
    });
    const planPath = join(projectDir, "plan.json");
    const approvalPath = join(projectDir, "approval.json");
    writeFileSync(planPath, JSON.stringify(plan));
    writeFileSync(approvalPath, JSON.stringify({ approved: true, planDigest: plan.planDigest }));
    expect(main([
      "--project-dir", projectDir,
      "--plan", planPath,
      "--approval", approvalPath,
      "--apply",
    ])).toBe(0);
    const stored = JSON.parse(readFileSync(planPath, "utf8")) as MigrationPlan;
    expect(existsSync(join(root, stored.targetPath))).toBe(true);
  });
});
