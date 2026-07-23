import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyPlan,
  inventoryDirectPathReferences,
  main,
  readCandidates,
  sha256,
  verifyFidelity,
  type MigrationPlan,
} from "../../scripts/amadeus-election-migrate";

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
        "approval-provenance: agmsg:2026-07-23T05:00:00Z",
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

  test("git history is queried only for an empty-timeline directory", () => {
    mkdirSync(join(root, "E-B"));
    writeFileSync(
      join(root, "E-B", "election.json"),
      JSON.stringify({ electionId: "E-B", state: "recorded" }),
    );
    writeFileSync(join(root, "E-B", "timeline.json"), "[]");
    const calls: string[][] = [];
    const candidates = readCandidates(projectDir, root, (_cwd, args) => {
      calls.push(args);
      return "2026-07-18T08:00:00Z";
    });
    expect(candidates).toHaveLength(2);
    expect(calls).toHaveLength(1);
    expect(calls[0].at(-1)).toEndWith("E-B/election.json");
  });

  test("apply changes only directory names and elections.json, preserving election contents", () => {
    const before = new Map(
      readdirSync(join(root, "E-A")).map((file) => [
        file,
        sha256(readFileSync(join(root, "E-A", file))),
      ]),
    );
    const plan: MigrationPlan = {
      renames: [{
        from: "E-A",
        to: "260720-e-a",
        electionId: "E-A",
        createdAt: "2026-07-20T12:34:56Z",
        createdAtSource: "timeline-oldest",
      }],
      registry: [{
        electionId: "E-A",
        dirName: "260720-e-a",
        createdAt: "2026-07-20T12:34:56Z",
        status: "recorded",
      }],
      conflicts: [],
      degraded: [],
      skipped: [],
    };
    applyPlan(root, plan);
    expect(existsSync(join(root, "E-A"))).toBe(false);
    expect(existsSync(join(root, "elections.json"))).toBe(true);
    for (const [file, digest] of before) {
      expect(sha256(readFileSync(join(root, "260720-e-a", file)))).toBe(digest);
    }
  });

  test("fidelity independently verifies resolver, counts, and direct-path inventory", () => {
    const plan: MigrationPlan = {
      renames: [{
        from: "E-A",
        to: "260720-e-a",
        electionId: "E-A",
        createdAt: "2026-07-20T12:34:56Z",
        createdAtSource: "timeline-oldest",
      }],
      registry: [{
        electionId: "E-A",
        dirName: "260720-e-a",
        createdAt: "2026-07-20T12:34:56Z",
        status: "recorded",
      }],
      conflicts: [],
      degraded: [],
      skipped: [],
    };
    applyPlan(root, plan);
    mkdirSync(join(projectDir, "docs"));
    writeFileSync(join(projectDir, "docs", "reference.md"), "amadeus/.../elections/E-A/record.md");
    expect(inventoryDirectPathReferences(projectDir, plan)).toEqual([
      "docs/reference.md: elections/E-A",
    ]);
    expect(verifyFidelity(projectDir, root, plan, ["E-A"], () => 0)).toEqual({
      ok: true,
      baselineVerified: ["E-A"],
      verified: ["E-A"],
      resolutionFailures: [],
      verificationFailures: [],
      registryRows: 1,
      directories: 1,
      directPathReferences: ["docs/reference.md: elections/E-A"],
    });
    expect(verifyFidelity(projectDir, root, plan, ["E-X"], () => 0).ok).toBe(false);
  });

  test("migration module cannot create its own execution approval record", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "..", "scripts", "amadeus-election-migrate.ts"),
      "utf8",
    );
    const writeTargets = [...source.matchAll(/writeFileSync\(([^,\n]+)/g)].map(
      (match) => match[1].trim(),
    );
    expect(writeTargets).toEqual(["options.planPath", "options.fidelityRecordPath"]);
  });
});
