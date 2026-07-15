// covers: function:foldUnitDispositions, function:changeUnitDisposition, subcommand:amadeus-bolt:park, subcommand:amadeus-bolt:skip, subcommand:amadeus-bolt:resume, audit:UNIT_DISPOSITION_CHANGED

import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEntry } from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  changeUnitDisposition,
  currentUnitDisposition,
  foldUnitDispositions,
  latestUnitDispositions,
  unitDispositionKey,
} from "../../packages/framework/core/tools/amadeus-unit-disposition.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

function project(): string {
  const root = createTestProject();
  seedStateFile(root, join(FIXTURES_DIR, "state-construction.md"));
  return root;
}

function change(
  root: string,
  to: "active" | "parked" | "skipped",
  expectedFrom: "active" | "parked" | "skipped",
) {
  return changeUnitDisposition({
    projectDir: root,
    stage: "code-generation",
    unit: "unit-a",
    to,
    reason: `move to ${to}`,
    expectedFrom,
  });
}

function event(
  timestamp: string,
  stage: string,
  unit: string,
  from: string,
  to: string,
): string {
  return `\n## Unit Disposition Changed\n**Timestamp**: ${timestamp}\n**Event**: UNIT_DISPOSITION_CHANGED\n**Stage**: ${stage}\n**Unit**: ${unit}\n**From**: ${from}\n**To**: ${to}\n**Reason**: fixture\n\n---\n`;
}

describe("Unit disposition ledger", () => {
  let root = "";
  afterEach(() => {
    if (root) cleanupTestProject(root);
    delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  });

  test("folds every Unit independently by timestamp rather than input order", () => {
    const folded = foldUnitDispositions(
      event("2026-07-15T12:02:00Z", "code-generation", "unit-a", "parked", "skipped") +
      event("2026-07-15T12:00:00Z", "code-generation", "unit-a", "active", "parked") +
      event("2026-07-15T12:01:00Z", "code-generation", "unit-b", "active", "parked"),
    );
    expect(folded.get(unitDispositionKey("code-generation", "unit-a"))?.disposition)
      .toBe("skipped");
    expect(folded.get(unitDispositionKey("code-generation", "unit-b"))?.disposition)
      .toBe("parked");
  });

  test("mutates with CAS, is idempotent, and persists the canonical event fields", () => {
    root = project();
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    const first = change(root, "parked", "active");
    expect(first.changed).toBe(true);
    expect(change(root, "parked", "active")).toEqual({
      changed: false,
      from: "parked",
      to: "parked",
    });
    expect(() => change(root, "skipped", "active")).toThrow("compare-and-swap failed");

    const record = latestUnitDispositions(root)
      .get(unitDispositionKey("code-generation", "unit-a"));
    expect(record).toMatchObject({
      stage: "code-generation",
      unit: "unit-a",
      disposition: "parked",
      reason: "move to parked",
    });
    expect(currentUnitDisposition(root, "code-generation", "unit-a")).toBe("parked");
    expect(currentUnitDisposition(root, "code-generation", "unit-b")).toBe("active");
  });

  test("rejects an unknown disposition before touching the ledger", () => {
    root = project();
    expect(() => changeUnitDisposition({
      projectDir: root,
      stage: "code-generation",
      unit: "unit-a",
      to: "unknown" as "active",
      reason: "invalid",
      expectedFrom: "active",
    })).toThrow("Unknown Unit disposition");
    expect(() => changeUnitDisposition({
      projectDir: root,
      stage: "code-generation",
      unit: "unit-a",
      to: "parked",
      reason: "invalid expected disposition",
      expectedFrom: "unknown" as "active",
    })).toThrow("Unknown expected Unit disposition");
    expect(latestUnitDispositions(root).size).toBe(0);
  });

  test("rejects invalid stage and Unit slugs", () => {
    root = project();
    expect(() => changeUnitDisposition({
      projectDir: root,
      stage: "Code Generation",
      unit: "unit-a",
      to: "parked",
      reason: "invalid stage",
      expectedFrom: "active",
    })).toThrow("Invalid stage");
    expect(() => changeUnitDisposition({
      projectDir: root,
      stage: "code-generation",
      unit: "../unit-a",
      to: "parked",
      reason: "invalid unit",
      expectedFrom: "active",
    })).toThrow("Invalid Unit");
  });

  test("rejects mutations from a per-Unit worktree state", () => {
    root = project();
    const path = seededStateFile(root);
    writeFileSync(
      path,
      readFileSync(path, "utf-8").replace(
        "- **Worktree Path**:",
        "- **Worktree Path**: /tmp/bolt-unit-a",
      ),
      "utf-8",
    );
    expect(() => change(root, "parked", "active")).toThrow("conductor-only");
  });

  test("rejects park while Construction autonomy is autonomous", () => {
    root = project();
    const path = seededStateFile(root);
    writeFileSync(
      path,
      `${readFileSync(path, "utf-8")}\n- **Construction Autonomy Mode**: autonomous\n`,
      "utf-8",
    );
    expect(() => change(root, "parked", "active")).toThrow("autonomous");
  });

  test("skip and resume each consume only a fresh stage answer without interpreting it", () => {
    root = project();
    expect(() => change(root, "skipped", "active")).toThrow("fresh QUESTION_ANSWERED");
    appendAuditEntry("QUESTION_ANSWERED", {
      Stage: "code-generation",
      Details: "自由文で続行を承認",
    }, root);
    expect(change(root, "skipped", "active").changed).toBe(true);
    expect(() => change(root, "active", "skipped")).toThrow("fresh QUESTION_ANSWERED");
    appendAuditEntry("QUESTION_ANSWERED", {
      Stage: "code-generation",
      Details: "1ではない回答でもよい",
    }, root);
    expect(change(root, "active", "skipped").changed).toBe(true);
  });

  test("one answer cannot authorize disposition changes for two Units", () => {
    root = project();
    appendAuditEntry("QUESTION_ANSWERED", {
      Stage: "code-generation",
      Details: "park one Unit",
    }, root);
    expect(change(root, "parked", "active").changed).toBe(true);
    expect(() => changeUnitDisposition({
      projectDir: root,
      stage: "code-generation",
      unit: "unit-b",
      to: "parked",
      reason: "must not reuse the answer",
      expectedFrom: "active",
    })).toThrow("fresh QUESTION_ANSWERED");
    appendAuditEntry("QUESTION_ANSWERED", {
      Stage: "code-generation",
      Details: "park the second Unit",
    }, root);
    expect(changeUnitDisposition({
      projectDir: root,
      stage: "code-generation",
      unit: "unit-b",
      to: "parked",
      reason: "freshly authorized",
      expectedFrom: "active",
    }).changed).toBe(true);
  });

  test("explicit guard bypass permits skip without an answer", () => {
    root = project();
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    expect(change(root, "skipped", "active").changed).toBe(true);
  });
});
