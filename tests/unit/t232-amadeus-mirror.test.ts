// covers: harness-instrument:amadeus-mirror
//
// t232 — amadeus-mirror CLI pure functions.
//
// Drives the exported pure functions in-process (no spawn, no fs): the args
// parser's usage rejections (S-3 falling proofs), core-root resolution across
// path semantics, and the status comparison against the canonical record view
// (StatusRecordView.expectedBody = renderMirrorIssueContent, the SAME body the
// sync writer emits). The real fs/gh/lifecycle boundary and the v1 read
// regression (#1547/#1534) live in the integration tests
// (t232/t299-amadeus-mirror-*.integration.test.ts).

import { describe, expect, test } from "bun:test";
import { posix, win32 } from "node:path";
import {
  compareMirrorStatus,
  exitOfStatus,
  parseArgs,
  projectDirFromToolsDir,
  sectionValue,
  type StatusRecordView,
} from "../../packages/framework/core/tools/amadeus-mirror.ts";

// A canonical-shaped issue body (renderMirrorIssueContent format) is enough to
// exercise the section-aware comparison without importing the presentation
// renderer; the only load-bearing section for the status split is `## Status`.
function body(status: string, summary = "s"): string {
  return [
    "## Intent UUID",
    "u",
    "",
    "## Summary",
    summary,
    "",
    "## Status",
    status,
    "",
    "## Mirror Marker",
    "m",
  ].join("\n");
}

function view(over: Partial<StatusRecordView> = {}): StatusRecordView {
  const currentStatus = over.currentStatus ?? "Running";
  return {
    kind: "ok",
    intentDir: over.intentDir ?? "260726-mirror-state-read-a1b2c3d4",
    issueNumber: over.issueNumber === undefined ? 101 : over.issueNumber,
    currentStatus,
    expectedBody: over.expectedBody ?? body(currentStatus),
  };
}

describe("t232 parseArgs (C1, S-3 boundary)", () => {
  test("requires --instance for mutations and keeps status unchanged", () => {
    expect(parseArgs(["create"]).kind).toBe("usage");
    expect(parseArgs(["sync"]).kind).toBe("usage");
    expect(parseArgs(["close"]).kind).toBe("usage");
    expect(parseArgs(["status"])).toEqual({ kind: "status", intentDir: null });
    expect(parseArgs(["create", "--instance", "create-1"])).toEqual({
      kind: "create",
      intentDir: null,
      instance: "create-1",
    });
  });

  test("accepts --intent <dirName>", () => {
    expect(
      parseArgs([
        "sync",
        "--instance",
        "sync-1",
        "--intent",
        "260717-mirror-issue-tool",
      ]),
    ).toEqual({
      kind: "sync",
      intentDir: "260717-mirror-issue-tool",
      instance: "sync-1",
    });
  });

  test("rejects unknown subcommand, missing subcommand, unknown flag, dangling --intent", () => {
    expect(parseArgs(["destroy"]).kind).toBe("usage");
    expect(parseArgs([]).kind).toBe("usage");
    expect(parseArgs(["create", "--force"]).kind).toBe("usage");
    expect(parseArgs(["create", "--intent"]).kind).toBe("usage");
    expect(parseArgs(["create", "--intent", "--intent"]).kind).toBe("usage");
  });
});

describe("t232 core tools project-root resolution (FR-1 platform parity)", () => {
  test("derives the same repository depth under POSIX and Windows path semantics", () => {
    expect(
      projectDirFromToolsDir("/repo/packages/framework/core/tools", posix.join),
    ).toBe("/repo");
    expect(
      projectDirFromToolsDir("C:\\repo\\packages\\framework\\core\\tools", win32.join),
    ).toBe("C:\\repo");
  });

  test("derives the repository root from an emitted harness tools directory", () => {
    expect(projectDirFromToolsDir("/repo/.codex/tools", posix.join)).toBe("/repo");
    expect(
      projectDirFromToolsDir("C:\\repo\\.codex\\tools", win32.join),
    ).toBe("C:\\repo");
  });
});

describe("t232 sectionValue (canonical body section reader)", () => {
  test("reads the value under a `## <heading>` up to the next heading", () => {
    expect(sectionValue(body("Completed"), "Status")).toBe("Completed");
    expect(sectionValue(body("Running"), "Summary")).toBe("s");
  });

  test("returns null when the section is absent", () => {
    expect(sectionValue(body("Running"), "Nope")).toBeNull();
  });
});

describe("t232 status comparison (against the canonical record view)", () => {
  test("returns clean and exit 0 when the issue body matches the record body", () => {
    const v = view();
    const result = compareMirrorStatus(v, v.expectedBody);
    expect(result).toEqual({ kind: "clean" });
    expect(exitOfStatus(result)).toBe(0);
  });

  test("reports mirror-missing when no issue is recorded (null body)", () => {
    const result = compareMirrorStatus(view({ issueNumber: null }), null);
    expect(result).toEqual({
      kind: "diverged",
      findings: [{
        kind: "mirror-missing",
        detail: expect.stringContaining("no mirror issue recorded"),
      }],
    });
    expect(exitOfStatus(result)).toBe(1);
  });

  test("reports an absent numbered issue as mirror-missing", () => {
    const result = compareMirrorStatus(view({ issueNumber: 1161 }), null);
    expect(result).toEqual({
      kind: "diverged",
      findings: [{
        kind: "mirror-missing",
        detail: expect.stringContaining("#1161"),
      }],
    });
  });

  test("reports stale status with the record-side status in detail", () => {
    const v = view({ currentStatus: "Running" });
    const stale = body("Completed");
    const result = compareMirrorStatus(v, stale);
    expect(result.kind).toBe("diverged");
    if (result.kind === "diverged") {
      expect(result.findings.map((finding) => finding.kind)).toContain(
        "stale-status-line",
      );
      expect(result.findings[0]?.detail).toContain('Status="Running"');
    }
  });

  test("reports body drift alone when only a non-status section differs", () => {
    const v = view({ currentStatus: "Running" });
    const drifted = body("Running", "a different summary");
    const result = compareMirrorStatus(v, drifted);
    expect(result).toEqual({
      kind: "diverged",
      findings: [{
        kind: "issue-drifted",
        detail: expect.any(String),
      }],
    });
  });

  test("lists stale-status-line and issue-drifted together in deterministic order", () => {
    const result = compareMirrorStatus(view(), "manually replaced body");
    expect(result.kind).toBe("diverged");
    if (result.kind === "diverged") {
      expect(result.findings.map((finding) => finding.kind)).toEqual([
        "stale-status-line",
        "issue-drifted",
      ]);
    }
  });

  test("maps a precondition outcome to exit 2", () => {
    expect(exitOfStatus({ kind: "precondition", reason: "gh not ready" })).toBe(2);
  });
});
