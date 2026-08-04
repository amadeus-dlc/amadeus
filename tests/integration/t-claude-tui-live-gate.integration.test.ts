import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claudeTuiLiveRequirementsSkipReason, claudeTuiLiveSkipReason } from "../harness/claude-tui-live.ts";
import { SpawnSyncTmuxCommandPort } from "../harness/live-e2e/claude-tui.ts";
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

  test("requirements probe checks tmux, Claude version, help flags, distribution, and auth", () => {
    const root = mkdtempSync(join(tmpdir(), "claude-tui-gate-"));
    const tmuxBin = join(root, "tmux");
    const claudeBin = join(root, "claude");
    const distributionDir = join(root, "dist");
    const env = { AMADEUS_TUI_LIVE: "1", ANTHROPIC_API_KEY: "fixture-key", PATH: process.env.PATH };
    const writeExecutable = (path: string, body: string) => {
      writeFileSync(path, `#!/bin/sh\n${body}\n`);
      chmodSync(path, 0o755);
    };
    try {
      expect(claudeTuiLiveRequirementsSkipReason({ env, claudeBin, tmuxBin, distributionDir }))
        .toBe("tmux capability is unavailable");
      writeExecutable(tmuxBin, "printf '%s\\n' 'tmux 3.4'");
      writeExecutable(claudeBin, "printf '%s\\n' '2.1.219'");
      expect(claudeTuiLiveRequirementsSkipReason({ env, claudeBin, tmuxBin, distributionDir }))
        .toContain("claude >= 2.1.220 not found");
      writeExecutable(
        claudeBin,
        "if [ \"$1\" = \"--version\" ]; then printf '%s\\n' '2.1.220'; else printf '%s\\n' '--setting-sources'; fi",
      );
      expect(claudeTuiLiveRequirementsSkipReason({ env, claudeBin, tmuxBin, distributionDir }))
        .toBe("claude TUI capability is unavailable");
      writeExecutable(
        claudeBin,
        "if [ \"$1\" = \"--version\" ]; then printf '%s\\n' '2.1.220'; else printf '%s\\n' '--setting-sources --permission-mode'; fi",
      );
      expect(claudeTuiLiveRequirementsSkipReason({ env, claudeBin, tmuxBin, distributionDir }))
        .toBe(`distributable missing: ${distributionDir}`);
      expect(new SpawnSyncTmuxCommandPort(tmuxBin).run(["-V"], { cwd: root, env: { PATH: "/bin" } }))
        .toMatchObject({ exitCode: 0, stdout: expect.stringContaining("tmux 3.4"), stderr: "" });
      mkdirSync(distributionDir);
      expect(claudeTuiLiveRequirementsSkipReason({
        env: { ...env, ANTHROPIC_API_KEY: undefined },
        claudeBin,
        tmuxBin,
        distributionDir,
      })).toBe("provide ANTHROPIC_API_KEY");
      expect(claudeTuiLiveRequirementsSkipReason({ env, claudeBin, tmuxBin, distributionDir })).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

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
