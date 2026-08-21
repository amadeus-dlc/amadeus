// covers: file:tests/harness/kimi-print-live.ts, file:tests/harness/live-e2e/kimi.ts
// size: medium
//
// The Kimi print live GATE, pinned at the boundary normal CI can prove without
// spending a credit: CI hard deny outranks everything, only an exact "1" opens
// the gate, each prerequisite maps to exactly one canonical skip arm, and the
// registry/journey pair states the closed contract. Integration placement
// because every probe touches the real filesystem (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  kimiPrintLiveRequirementsSkipReason,
  kimiPrintLiveSkipReason,
} from "../harness/kimi-print-live.ts";
import { createKimiPrintJourney } from "../harness/live-e2e/journey.ts";
import {
  defaultKimiJourneyModel,
  defaultKimiSourceHome,
  KIMI_HOME_BINDING_KEY,
  kimiHomeLayout,
} from "../harness/live-e2e/kimi.ts";
import { KIMI_PRINT_ANCHOR_FILE, KIMI_STREAM_LIMIT_BYTES } from "../harness/live-e2e/kimi-print.ts";
import { capabilityById } from "../harness/live-e2e/registry.ts";
import { skipReason } from "../harness/kimi-print-drive.ts";

function writeExecutable(path: string, body: string): void {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

describe("Kimi print live contract", () => {
  test("GHA hard deny takes precedence over probing invalid binaries", () => {
    expect(kimiPrintLiveRequirementsSkipReason({
      env: { GITHUB_ACTIONS: "true", AMADEUS_KIMI_PRINT_LIVE: "1" },
      kimiBin: "/not/kimi",
      distributionDir: "/not/dist",
      sourceHome: "/not/home",
    })).toContain("forbidden on GitHub Actions");
  });

  // The legacy driver entry answers the same gate. Before #1717 Phase 2 it had
  // its own opt-in check and no CI arm at all, so this is the assertion that
  // the two entries cannot drift back apart.
  test("the legacy driver gate is the same kernel decision, CI arm included", () => {
    expect(skipReason({ GITHUB_ACTIONS: "true", AMADEUS_KIMI_PRINT_LIVE: "1" }))
      .toContain("forbidden on GitHub Actions");
    expect(skipReason({ AMADEUS_KIMI_PRINT_LIVE: "1", GITHUB_ACTIONS: "true" }))
      .toBe(kimiPrintLiveSkipReason({ AMADEUS_KIMI_PRINT_LIVE: "1", GITHUB_ACTIONS: "true" }));
  });

  test.each([undefined, "", "0", "true", " 1", "1 ", "TRUE"])(
    "only exact one enables Kimi print (%s is denied)",
    (value) => {
      expect(kimiPrintLiveSkipReason({ AMADEUS_KIMI_PRINT_LIVE: value })).toContain(
        "AMADEUS_KIMI_PRINT_LIVE=1",
      );
      expect(skipReason({ AMADEUS_KIMI_PRINT_LIVE: value })).toContain(
        "AMADEUS_KIMI_PRINT_LIVE=1",
      );
    },
  );

  test("requirements probe checks binary, version, distribution, and the home auth seam", () => {
    const root = mkdtempSync(join(tmpdir(), "kimi-print-gate-"));
    const kimiBin = join(root, "kimi");
    const distributionDir = join(root, "dist");
    const sourceHome = join(root, "home");
    const layout = kimiHomeLayout(sourceHome);
    const env = { AMADEUS_KIMI_PRINT_LIVE: "1", PATH: process.env.PATH };
    try {
      expect(kimiPrintLiveRequirementsSkipReason({ env, kimiBin, distributionDir, sourceHome }))
        .toContain("kimi binary not found");
      writeExecutable(kimiBin, "printf '%s\\n' '0.27.9'");
      expect(kimiPrintLiveRequirementsSkipReason({ env, kimiBin, distributionDir, sourceHome }))
        .toContain("kimi >= 0.28.1 not found");
      writeExecutable(kimiBin, "printf '%s\\n' '0.37.2'");
      expect(kimiPrintLiveRequirementsSkipReason({ env, kimiBin, distributionDir, sourceHome }))
        .toBe(`distributable missing: ${distributionDir}`);
      mkdirSync(distributionDir);
      expect(kimiPrintLiveRequirementsSkipReason({ env, kimiBin, distributionDir, sourceHome }))
        .toBe("Kimi Code is not authenticated (run `kimi login`)");
      mkdirSync(layout.oauthDir, { recursive: true });
      expect(kimiPrintLiveRequirementsSkipReason({ env, kimiBin, distributionDir, sourceHome }))
        .toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("home layout keeps the auth seam relative to the owning home", () => {
    const layout = kimiHomeLayout("/source/home");
    expect(layout.credentialsDir).toBe(join("/source/home", "credentials"));
    expect(layout.oauthDir).toBe(join("/source/home", "oauth"));
    expect(layout.configFile).toBe(join("/source/home", "config.toml"));
    expect(kimiHomeLayout("/scratch/home").oauthDir.slice("/scratch/home".length))
      .toBe(layout.oauthDir.slice("/source/home".length));
  });

  test("the default source home prefers the override, then the CLI's own home", () => {
    expect(defaultKimiSourceHome({ AMADEUS_KIMI_SOURCE_HOME: "/pinned/home", KIMI_CODE_HOME: "/cli/home" }))
      .toBe("/pinned/home");
    expect(defaultKimiSourceHome({ KIMI_CODE_HOME: "/cli/home" })).toBe("/cli/home");
    expect(defaultKimiSourceHome({})).toBe(join(homedir(), ".kimi-code"));
  });

  test("the journey model accepts a bare id or the full managed alias", () => {
    expect(defaultKimiJourneyModel({})).toBe("k3");
    expect(defaultKimiJourneyModel({ AMADEUS_KIMI_MODEL: "kimi-for-coding" })).toBe("kimi-for-coding");
    expect(defaultKimiJourneyModel({ AMADEUS_KIMI_MODEL: "kimi-code/k3-turbo" })).toBe("k3-turbo");
  });

  test("registry and journey expose the closed Kimi print contract", async () => {
    expect(capabilityById("kimi-print")).toMatchObject({
      ok: true,
      value: {
        harness: "kimi",
        transport: "print",
        optInKey: "AMADEUS_KIMI_PRINT_LIVE",
        minimumVersion: "0.28.1",
        anchorKinds: ["exit", "file"],
        environment: {
          sensitiveKeys: ["KIMI_API_KEY", "MOONSHOT_API_KEY"],
          sourcePathKeys: ["HOME", "KIMI_CODE_HOME", "AMADEUS_KIMI_SOURCE_HOME"],
        },
      },
    });
    expect(KIMI_HOME_BINDING_KEY).toBe("KIMI_CODE_HOME_BINDING");
    // security-design.md pins the per-stream capture bound.
    expect(KIMI_STREAM_LIMIT_BYTES).toBe(4_096);

    const journey = createKimiPrintJourney();
    // business-rules BR-KIMI-15: the journey budget and the enclosing Bun test
    // timeout must not be the same number.
    expect(journey.timeoutMs).toBeGreaterThanOrEqual(600_000);
    expect(journey.retryPolicy.maxAttempts).toBe(1);

    const root = mkdtempSync(join(tmpdir(), "kimi-print-journey-"));
    try {
      const scratch = { root, homeDir: join(root, "home"), projectDir: root, state: "ready" } as const;
      const execution = {
        exitCode: 0,
        timedOut: false,
        aborted: false,
        stdoutDigest: "stdout",
        stderrDigest: "stderr",
        structured: { stdoutTruncated: false, stderrTruncated: false },
      } as const;

      // No anchor file yet: prose alone can never pass.
      expect(await journey.assert(execution, scratch)).toMatchObject({ passed: false });
      writeFileSync(join(root, KIMI_PRINT_ANCHOR_FILE), JSON.stringify({ amadeus_live_e2e: "ok" }));
      expect(await journey.assert(execution, scratch)).toMatchObject({ passed: true });

      // One negation per term of the passed predicate.
      for (const failing of [
        { ...execution, exitCode: 1 },
        { ...execution, exitCode: null },
        { ...execution, timedOut: true },
        { ...execution, aborted: true },
      ]) {
        expect(await journey.assert(failing, scratch)).toMatchObject({ passed: false });
      }
      writeFileSync(join(root, KIMI_PRINT_ANCHOR_FILE), JSON.stringify({ amadeus_live_e2e: "no" }));
      expect(await journey.assert(execution, scratch)).toMatchObject({ passed: false });
      writeFileSync(join(root, KIMI_PRINT_ANCHOR_FILE), "not json");
      expect(await journey.assert(execution, scratch)).toMatchObject({ passed: false });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
