import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, sha256, type MigrationPlan } from "../../scripts/amadeus-election-migrate";

let projectDir = "";
let root = "";

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "elections-migration-"));
  root = join(projectDir, "amadeus", "spaces", "default", "elections");
  mkdirSync(join(projectDir, "scripts"), { recursive: true });
  writeFileSync(
    join(projectDir, "scripts", "amadeus-election-store.ts"),
    "export function resolveElectionDir() {}\n",
  );
  mkdirSync(join(root, "E-A"), { recursive: true });
  writeFileSync(
    join(root, "E-A", "election.json"),
    JSON.stringify({ electionId: "E-A", state: "recorded" }),
  );
  writeFileSync(
    join(root, "E-A", "timeline.json"),
    JSON.stringify([{ kind: "recorded", at: "2026-07-20T12:34:56Z" }]),
  );
});

afterEach(() => rmSync(projectDir, { recursive: true, force: true }));

describe("migration CLI", () => {
  test("dry-run writes a complete stable plan without renaming or creating a registry", () => {
    const planPath = join(projectDir, "approved-plan.json");
    expect(main(["--project-dir", projectDir, "--plan", planPath])).toBe(0);
    const plan = JSON.parse(readFileSync(planPath, "utf8")) as MigrationPlan;
    expect(plan.renames).toEqual([
      {
        from: "E-A",
        to: "260720-e-a",
        electionId: "E-A",
        createdAt: "2026-07-20T12:34:56Z",
        createdAtSource: "timeline-oldest",
      },
    ]);
    expect(plan.conflicts).toEqual([]);
    expect(readFileSync(join(root, "E-A", "election.json"), "utf8")).toContain('"E-A"');
    expect(() => readFileSync(join(root, "elections.json"), "utf8")).toThrow();
  });

  test("--execute rejects a mismatched approved-plan hash before mutation", () => {
    const planPath = join(projectDir, "approved-plan.json");
    expect(main(["--project-dir", projectDir, "--plan", planPath])).toBe(0);
    const approvalPath = join(projectDir, "execution-approval.md");
    writeFileSync(
      approvalPath,
      [
        "user-approval: granted",
        `approved-plan-sha256: ${sha256("different bytes")}`,
        "removal-issue: https://github.com/amadeus-dlc/amadeus/issues/9999",
      ].join("\n"),
    );
    expect(() =>
      main([
        "--project-dir",
        projectDir,
        "--plan",
        planPath,
        "--approval",
        approvalPath,
        "--removal-issue-exists",
        "--execute",
      ]),
    ).toThrow(/--execute refused/);
    expect(readFileSync(join(root, "E-A", "election.json"), "utf8")).toContain('"E-A"');
  });
});
