// covers: packages/framework/core/tools/amadeus-mirror-lifecycle.ts
// size: medium
//
// t374 (fs boundary) — regression for the completion-window write⇔check
// asymmetry surfaced while fixing #1816. The completion boundary's last body
// write is a sync, and while a completion is pending the lifecycle snapshot
// forces Status=Running; presentation therefore derives the rendered Status
// from a pending completionInstance. buildMirrorStatusRecordView must derive
// `currentStatus` from that SAME canonical rule, otherwise `repair status`
// compares a body reading "Completed" against a currentStatus reading
// "Running" and reports a false stale-status-line for a mirror that is in
// sync. Drives the real record view over a real state document in the
// completion window and asserts the comparison is clean.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareMirrorStatus } from "../../packages/framework/core/tools/amadeus-mirror.ts";
import { buildMirrorStatusRecordView } from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import { sectionValue } from "../../packages/framework/core/tools/amadeus-mirror.ts";
import type { RepositoryIdentity } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const SPACE = "default";
const DIR = "260731-mirror-completion-status-b2c3d4e5";
const NOW = "2026-07-31T00:00:00Z";
const STAGE = "build-and-test";
const REPO: RepositoryIdentity = { owner: "acme", name: "app", canonical: "acme/app" };

const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

// A record parked in the completion window: the completion is prepared and
// still pending, so Status stays Running and Current Stage still names the
// completing stage (the pairing assertSnapshotConsistency enforces).
function makeWorkspace(completion: "pending" | "absent"): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-t374-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", SPACE, "intents");
  mkdirSync(join(intents, DIR), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    JSON.stringify([
      {
        uuid: "019f7003-e273-7c0b-85ba-0a6c99d0aa9e",
        slug: "mirror-completion-status",
        dirName: DIR,
        scope: "self-fix",
        repos: [REPO.canonical],
        status: "in-flight",
      },
    ]),
  );
  writeFileSync(
    join(intents, DIR, "amadeus-state.md"),
    [
      "# Amadeus State",
      "",
      "- **Project**: mirror completion status view regression",
      "- **Lifecycle Phase**: CONSTRUCTION",
      `- **Current Stage**: ${STAGE}`,
      "- **Status**: Running",
      `- **Last Updated**: ${NOW}`,
      "",
      "## Runtime State",
      "",
      ...(completion === "pending"
        ? [
            "- **Workflow Completion Instance**: completion-1",
            `- **Workflow Completion Stage**: ${STAGE}`,
            "- **Workflow Completion Status**: pending",
            "",
          ]
        : []),
    ].join("\n"),
  );
  writeFileSync(join(root, "amadeus", "config.json"), JSON.stringify({ "auto-mirror": "auto" }));
  return root;
}

function view(root: string) {
  const built = buildMirrorStatusRecordView({
    projectDir: root,
    space: SPACE,
    intentDir: DIR,
    repository: REPO,
  });
  if (built.kind !== "ok") throw new Error(`record view failed: ${built.message}`);
  return built;
}

describe("t374 completion-window status view", () => {
  test("reports the mirror in sync when a completion is pending", () => {
    const built = view(makeWorkspace("pending"));
    // The body the sync writer last wrote carries the derived terminal Status.
    expect(sectionValue(built.expectedBody, "Status")).toBe("Completed");
    // The scalar the drift check compares against must use the same rule.
    expect(built.currentStatus).toBe("Completed");
    // An untouched mirror holding exactly that body is in sync, not diverged.
    expect(compareMirrorStatus(built, built.expectedBody)).toEqual({ kind: "clean" });
  });

  // Negative control: with no completion prepared, the raw workflow status is
  // still what both surfaces report, so the derivation cannot mask real drift.
  test("keeps reporting the raw workflow status when no completion is pending", () => {
    const built = view(makeWorkspace("absent"));
    expect(sectionValue(built.expectedBody, "Status")).toBe("Running");
    expect(built.currentStatus).toBe("Running");
    expect(compareMirrorStatus(built, built.expectedBody)).toEqual({ kind: "clean" });
    const drifted = built.expectedBody.replace("## Status\nRunning", "## Status\nCompleted");
    expect(compareMirrorStatus(built, drifted).kind).toBe("diverged");
  });
});
