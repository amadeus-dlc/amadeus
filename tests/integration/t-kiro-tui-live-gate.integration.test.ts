import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  kiroTuiLiveRequirementsSkipReason,
  kiroTuiLiveSkipReason,
} from "../harness/kiro-tui-live.ts";
import { createKiroTuiJourney } from "../harness/live-e2e/journey.ts";
import { KIRO_HOME_BINDING_KEY, kiroHomeLayout } from "../harness/live-e2e/kiro.ts";
import { capabilityById } from "../harness/live-e2e/registry.ts";

function writeExecutable(path: string, body: string): void {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

describe("Kiro TUI live contract", () => {
  test("GHA hard deny takes precedence over probing invalid binaries", () => {
    expect(kiroTuiLiveRequirementsSkipReason({
      env: { GITHUB_ACTIONS: "true", AMADEUS_KIRO_TUI_LIVE: "1" },
      kiroBin: "/not/kiro-cli",
      tmuxBin: "/not/tmux",
      distributionDir: "/not/dist",
      sourceHome: "/not/home",
    })).toContain("forbidden on GitHub Actions");
  });

  test.each([undefined, "", "0", "true", " 1", "1 "])(
    "only exact one enables Kiro TUI (%s is denied)",
    (value) => {
      expect(kiroTuiLiveSkipReason({ AMADEUS_KIRO_TUI_LIVE: value })).toContain(
        "AMADEUS_KIRO_TUI_LIVE=1",
      );
    },
  );

  test("requirements probe checks tmux, Kiro version, distribution, and the home auth seam", () => {
    const root = mkdtempSync(join(tmpdir(), "kiro-tui-gate-"));
    const tmuxBin = join(root, "tmux");
    const kiroBin = join(root, "kiro-cli");
    const distributionDir = join(root, "dist");
    const sourceHome = join(root, "home");
    const layout = kiroHomeLayout(sourceHome);
    const env = { AMADEUS_KIRO_TUI_LIVE: "1", PATH: process.env.PATH };
    try {
      expect(kiroTuiLiveRequirementsSkipReason({ env, kiroBin, tmuxBin, distributionDir, sourceHome }))
        .toBe("tmux capability is unavailable");
      writeExecutable(tmuxBin, "printf '%s\\n' 'tmux 3.4'");
      writeExecutable(kiroBin, "printf '%s\\n' 'kiro-cli 2.5.9'");
      expect(kiroTuiLiveRequirementsSkipReason({ env, kiroBin, tmuxBin, distributionDir, sourceHome }))
        .toContain("kiro-cli >= 2.6.0 not found");
      writeExecutable(kiroBin, "printf '%s\\n' 'kiro-cli 2.13.0'");
      expect(kiroTuiLiveRequirementsSkipReason({ env, kiroBin, tmuxBin, distributionDir, sourceHome }))
        .toBe(`distributable missing: ${distributionDir}`);
      mkdirSync(distributionDir);
      expect(kiroTuiLiveRequirementsSkipReason({ env, kiroBin, tmuxBin, distributionDir, sourceHome }))
        .toBe("Kiro CLI is not authenticated (run `kiro-cli login`)");
      mkdirSync(layout.dataDir, { recursive: true });
      writeFileSync(layout.authFile, "");
      expect(kiroTuiLiveRequirementsSkipReason({ env, kiroBin, tmuxBin, distributionDir, sourceHome }))
        .toBe("Kiro CLI chat runtime is unavailable");
      mkdirSync(join(sourceHome, ".local", "bin"), { recursive: true });
      writeExecutable(layout.chatBinary, "exit 0");
      expect(kiroTuiLiveRequirementsSkipReason({ env, kiroBin, tmuxBin, distributionDir, sourceHome }))
        .toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("home layout keeps the auth seam relative to the owning home", () => {
    const layout = kiroHomeLayout("/source/home");
    expect(layout.dataDir.startsWith("/source/home/")).toBe(true);
    expect(layout.authFile).toBe(join(layout.dataDir, "data.sqlite3"));
    expect(layout.chatBinary).toBe(join("/source/home", ".local", "bin", "kiro-cli-chat"));
    expect(kiroHomeLayout("/scratch/home").dataDir.slice("/scratch/home".length))
      .toBe(layout.dataDir.slice("/source/home".length));
  });

  test("a source home on Linux honours XDG_DATA_HOME; scratch and macOS layouts do not", () => {
    expect(kiroHomeLayout("/source/home", "linux", { XDG_DATA_HOME: "/xdg/data" }).dataDir)
      .toBe("/xdg/data/kiro-cli");
    expect(kiroHomeLayout("/source/home", "linux", { XDG_DATA_HOME: "" }).dataDir)
      .toBe(join("/source/home", ".local", "share", "kiro-cli"));
    expect(kiroHomeLayout("/source/home", "darwin", { XDG_DATA_HOME: "/xdg/data" }).dataDir)
      .toBe(join("/source/home", "Library", "Application Support", "kiro-cli"));
    // No environment means the pure home offset — the scratch-side contract.
    expect(kiroHomeLayout("/scratch/home", "linux").dataDir)
      .toBe(join("/scratch/home", ".local", "share", "kiro-cli"));
  });

  test("registry and journey expose the closed Kiro TUI contract", async () => {
    expect(capabilityById("kiro-tui")).toMatchObject({
      ok: true,
      value: {
        harness: "kiro",
        minimumVersion: "2.6.0",
        transport: "tui",
        optInKey: "AMADEUS_KIRO_TUI_LIVE",
        anchorKinds: ["file", "state"],
      },
    });
    expect(KIRO_HOME_BINDING_KEY).toBe("KIRO_CLI_HOME_BINDING");
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
    const scratch = { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" } as const;
    expect(await createKiroTuiJourney().assert(execution, scratch)).toMatchObject({ passed: true });
    // One negation per term of the passed predicate, so dropping any term
    // from the journey assert turns at least one of these green-to-red.
    for (const failing of [
      { ...execution, exitCode: 1 },
      { ...execution, structured: { ...execution.structured, anchorVerified: false } },
      { ...execution, structured: { ...execution.structured, inputCount: 2 } },
      { ...execution, structured: { ...execution.structured, paneDigest: 7 } },
      { ...execution, structured: { ...execution.structured, sessionDigest: undefined } },
    ]) {
      expect(await createKiroTuiJourney().assert(failing, scratch))
        .toMatchObject({ passed: false });
    }
  });
});
