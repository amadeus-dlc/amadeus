import { describe, expect, test } from "bun:test";
import { claudeTuiLiveRequirementsSkipReason, claudeTuiLiveSkipReason } from "../harness/claude-tui-live.ts";
import { createClaudeTuiJourney } from "../harness/live-e2e/journey.ts";
import { capabilityById } from "../harness/live-e2e/registry.ts";

describe("Claude TUI live contract", () => {
  test("GHA hard deny takes precedence over probing invalid binaries", () => {
    expect(claudeTuiLiveRequirementsSkipReason({
      env: { GITHUB_ACTIONS: "true", AMADEUS_TUI_LIVE: "1" },
      claudeBin: "/not/claude",
      tmuxBin: "/not/tmux",
      distributionDir: "/not/dist",
    })).toContain("forbidden on GitHub Actions");
  });

  test.each([undefined, "", "0", "true", " 1", "1 "])(
    "only exact one enables Claude TUI (%s is denied)",
    (value) => {
      expect(claudeTuiLiveSkipReason({ AMADEUS_TUI_LIVE: value })).toContain("AMADEUS_TUI_LIVE=1");
    },
  );

  test("registry and journey expose the closed TUI contract", async () => {
    expect(capabilityById("claude-tui")).toMatchObject({
      ok: true,
      value: {
        minimumVersion: "2.1.220",
        transport: "tui",
        optInKey: "AMADEUS_TUI_LIVE",
        anchorKinds: ["file", "state"],
      },
    });
    const execution = {
        exitCode: 0,
        timedOut: false,
        aborted: false,
        stdoutDigest: "stdout",
        stderrDigest: "stderr",
        structured: {
          anchorVerified: true,
          inputCount: 1,
          paneDigest: "pane",
          sessionDigest: "session",
        },
      } as const;
    expect(await createClaudeTuiJourney().assert(
      execution,
      { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" },
    )).toMatchObject({ passed: true });
    for (const structured of [
      { ...execution.structured, anchorVerified: false },
      { ...execution.structured, inputCount: 2 },
    ]) {
      expect(await createClaudeTuiJourney().assert(
        { ...execution, structured },
        { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" },
      )).toMatchObject({ passed: false });
    }
  });
});
