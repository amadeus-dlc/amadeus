// covers: function:issueEvidencePath, function:relativeIssueEvidencePath
// size: small
//
// t3181 — the issue-evidence path builders (#3181 C3).
//
// The `issue-evidence fetch` verb runs OUTSIDE the orchestrate loop, so it
// cannot use the engine's graph-compiled resolveArtifactPath; it needs the same
// deterministic answer from a pure function, exactly as codekb-path does. These
// resolve to the producing stage's own directory (intent-capture, ideation), so
// the sensor's producer-directory existence probe finds the file where the
// artifact vocabulary says it lives.
//
// Both are total functions over their arguments when the intent and space are
// passed explicitly — no filesystem, no git, no mkdir — so the whole surface
// runs in-process (the t400 shape).

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  issueEvidencePath,
  relativeIssueEvidencePath,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const PROJECT = join("/tmp", "amadeus-t3181");
const INTENT = "260817-inception-cost-batch-a1b2c3d4";
const SPACE = "default";

describe("t3181 issue-evidence path builders", () => {
  test("resolves under the producing stage's record directory", () => {
    expect(issueEvidencePath(PROJECT, INTENT, SPACE)).toBe(
      join(
        PROJECT,
        "amadeus",
        "spaces",
        SPACE,
        "intents",
        INTENT,
        "ideation",
        "intent-capture",
        "issue-evidence.md",
      ),
    );
  });

  test("emits the workspace-relative form with posix separators", () => {
    expect(relativeIssueEvidencePath(PROJECT, INTENT, SPACE)).toBe(
      `amadeus/spaces/${SPACE}/intents/${INTENT}/ideation/intent-capture/issue-evidence.md`,
    );
  });

  test("refuses to name a per-intent record when no intent resolves", () => {
    const empty = join("/tmp", "amadeus-t3181-no-intent");
    expect(issueEvidencePath(empty, undefined, SPACE)).toBeNull();
    expect(relativeIssueEvidencePath(empty, undefined, SPACE)).toBeNull();
  });
});
