// covers: file:tests/harness/kiro-acp-live.ts
// size: medium
//
// The Kiro ACP live GATE, pinned at the boundary normal CI can prove without
// spending a credit: CI hard deny outranks everything, only an exact "1" opens
// the gate, each prerequisite maps to one canonical skip arm, and the
// registry/journey pair states the closed contract. Integration placement
// because every probe touches the real filesystem
// (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  kiroAcpLiveRequirementsSkipReason,
  kiroAcpLiveSkipReason,
} from "../harness/kiro-acp-live.ts";
import { createKiroAcpJourney } from "../harness/live-e2e/journey.ts";
import { kiroHomeLayout } from "../harness/live-e2e/kiro.ts";
import {
  ACP_PROTOCOL_VERSION,
  KIRO_ACP_ANCHOR_FILE,
  KIRO_ACP_TOOL_OUTPUT_LIMIT,
} from "../harness/live-e2e/kiro-acp.ts";
import { capabilityById } from "../harness/live-e2e/registry.ts";

function writeExecutable(path: string, body: string): void {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

describe("Kiro ACP live contract", () => {
  test("GHA hard deny takes precedence over probing invalid binaries", () => {
    expect(kiroAcpLiveRequirementsSkipReason({
      env: { GITHUB_ACTIONS: "true", AMADEUS_KIRO_ACP_LIVE: "1" },
      kiroBin: "/not/kiro-cli",
      distributionDir: "/not/dist",
      sourceHome: "/not/home",
    })).toContain("forbidden on GitHub Actions");
  });

  test.each([undefined, "", "0", "true", " 1", "1 ", "TRUE"])(
    "only exact one enables Kiro ACP (%s is denied)",
    (value) => {
      expect(kiroAcpLiveSkipReason({ AMADEUS_KIRO_ACP_LIVE: value })).toContain(
        "AMADEUS_KIRO_ACP_LIVE=1",
      );
    },
  );

  test("requirements probe checks binary, version, distribution, and the home auth seam", () => {
    const root = mkdtempSync(join(tmpdir(), "kiro-acp-gate-"));
    const kiroBin = join(root, "kiro-cli");
    const distributionDir = join(root, "dist");
    const sourceHome = join(root, "home");
    const layout = kiroHomeLayout(sourceHome);
    const env = { AMADEUS_KIRO_ACP_LIVE: "1", PATH: process.env.PATH };
    try {
      expect(kiroAcpLiveRequirementsSkipReason({ env, kiroBin, distributionDir, sourceHome }))
        .toContain("kiro-cli not found");
      writeExecutable(kiroBin, "printf '%s\\n' 'kiro-cli 2.5.9'");
      expect(kiroAcpLiveRequirementsSkipReason({ env, kiroBin, distributionDir, sourceHome }))
        .toContain("kiro-cli >= 2.6.0 not found");
      writeExecutable(kiroBin, "printf '%s\\n' 'kiro-cli 2.19.0'");
      expect(kiroAcpLiveRequirementsSkipReason({ env, kiroBin, distributionDir, sourceHome }))
        .toBe(`distributable missing: ${distributionDir}`);
      mkdirSync(distributionDir);
      expect(kiroAcpLiveRequirementsSkipReason({ env, kiroBin, distributionDir, sourceHome }))
        .toBe("Kiro CLI is not authenticated (run `kiro-cli login`)");
      mkdirSync(layout.dataDir, { recursive: true });
      writeFileSync(layout.authFile, "");
      expect(kiroAcpLiveRequirementsSkipReason({ env, kiroBin, distributionDir, sourceHome }))
        .toBeNull();
      // The distribution probe is optional: the driver's calibration runs
      // against a fixture project rather than a shipped tree.
      expect(kiroAcpLiveRequirementsSkipReason({ env, kiroBin, sourceHome })).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("registry and journey expose the closed Kiro ACP contract", async () => {
    expect(capabilityById("kiro-acp")).toMatchObject({
      ok: true,
      value: {
        harness: "kiro",
        transport: "acp",
        optInKey: "AMADEUS_KIRO_ACP_LIVE",
        minimumVersion: "2.6.0",
        anchorKinds: ["tool", "file"],
        environment: {
          sensitiveKeys: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"],
          sourcePathKeys: ["HOME", "XDG_DATA_HOME", "KIRO_HOME"],
        },
      },
    });
    expect(ACP_PROTOCOL_VERSION).toBe(1);
    expect(KIRO_ACP_TOOL_OUTPUT_LIMIT).toBe(4_096);

    const journey = createKiroAcpJourney();
    expect(journey.retryPolicy.maxAttempts).toBe(1);

    const root = mkdtempSync(join(tmpdir(), "kiro-acp-journey-"));
    try {
      const scratch = { root, homeDir: join(root, "home"), projectDir: root, state: "ready" } as const;
      const execution = {
        exitCode: 0,
        timedOut: false,
        aborted: false,
        stdoutDigest: "stdout",
        stderrDigest: "stderr",
        structured: {
          stopReason: "end_turn",
          toolCallCount: 1,
          toolTitleDigest: "titles",
          permissionCount: 0,
          violations: [] as string[],
        },
      } as const;

      // A completed turn with no anchor file is prose, and prose never passes.
      expect(await journey.assert(execution, scratch)).toMatchObject({ passed: false });
      writeFileSync(join(root, KIRO_ACP_ANCHOR_FILE), JSON.stringify({ amadeus_live_e2e: "ok" }));
      expect(await journey.assert(execution, scratch)).toMatchObject({ passed: true });

      // One negation per term of the passed predicate, so dropping any term
      // from the journey assert turns at least one of these green-to-red.
      for (const failing of [
        { ...execution, exitCode: 1 },
        { ...execution, timedOut: true },
        { ...execution, aborted: true },
        { ...execution, structured: { ...execution.structured, stopReason: "cancelled" } },
        { ...execution, structured: { ...execution.structured, toolCallCount: 0 } },
        { ...execution, structured: { ...execution.structured, violations: ["response-id-mismatch"] } },
      ]) {
        expect(await journey.assert(failing, scratch)).toMatchObject({ passed: false });
      }
      writeFileSync(join(root, KIRO_ACP_ANCHOR_FILE), "not json");
      expect(await journey.assert(execution, scratch)).toMatchObject({ passed: false });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
