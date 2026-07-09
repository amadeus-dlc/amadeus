// covers: modules:setup-verifier
// size: small
//
// Verifier.create(fsRead).verify — required-files existence + the 4-point
// doctor-equivalent check (BR-I14), against a fake VerifyRead port.

import { describe, expect, test } from "bun:test";
import { Verifier } from "../../packages/setup/src/modules/verifier.ts";
import type { VerifyRead } from "../../packages/setup/src/ports/verify-read.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import type { Manifest } from "../../packages/setup/src/domain/manifest.ts";

function claudeHarness(): HarnessName {
  const claude = HarnessName.all.find((h) => (h as string) === "claude");
  if (!claude) throw new Error("fixture setup: 'claude' must be a known harness");
  return claude;
}

function fakeManifest(requiredPaths: readonly string[]): Manifest {
  return {
    schemaVersion: 1,
    installerPackageVersion: "0.1.0",
    distributionVersion: undefined as never,
    sourceTag: "v1.0.0",
    installedAt: "2026-07-08T12:00:00.000Z",
    harness: claudeHarness(),
    dispositionFor: () => ({ type: "overwrite" }),
    isNewerThan: () => false,
    requiredPaths: () => requiredPaths,
    upgradedTo: () => {
      throw new Error("not used in this test");
    },
    toJSON: () => {
      throw new Error("not used in this test");
    },
  };
}

function fakeVerifyRead(files: Set<string>, dirs: Set<string>): VerifyRead {
  return {
    async fileExists(path) {
      return files.has(path);
    },
    async dirExists(path) {
      return dirs.has(path);
    },
  };
}

describe("Verifier.verify — required-files", () => {
  test("all required files present passes the required-files check", async () => {
    const fsRead = fakeVerifyRead(
      new Set(["/t/settings.json", "/t/.claude/tools", "/t/amadeus/spaces/default/memory"]),
      new Set(["/t/.claude", "/t/.claude/tools", "/t/amadeus/spaces/default/memory"]),
    );
    const verify = await Verifier.create(fsRead).verify("/t", fakeManifest(["settings.json"]));
    const check = verify.checks().find((c) => c.name === "required-files");
    expect(check?.ok).toBe(true);
  });

  test("edge case: a missing required file fails required-files and overall allPassed()", async () => {
    const fsRead = fakeVerifyRead(new Set(), new Set(["/t/.claude", "/t/.claude/tools", "/t/amadeus/spaces/default/memory"]));
    const verify = await Verifier.create(fsRead).verify("/t", fakeManifest(["settings.json"]));
    expect(verify.allPassed()).toBe(false);
    expect(verify.failures().map((c) => c.name)).toContain("required-files");
  });
});

describe("Verifier.verify — doctor-equivalent checks (BR-I14)", () => {
  test("harness-dir/tools-dir/memory-shell all pass when present", async () => {
    const fsRead = fakeVerifyRead(new Set(), new Set(["/t/.claude", "/t/.claude/tools", "/t/amadeus/spaces/default/memory"]));
    const verify = await Verifier.create(fsRead).verify("/t", fakeManifest([]));
    for (const name of ["harness-dir", "tools-dir", "memory-shell"] as const) {
      expect(verify.checks().find((c) => c.name === name)?.ok).toBe(true);
    }
  });

  test("edge case: a missing tools directory fails only tools-dir", async () => {
    const fsRead = fakeVerifyRead(new Set(), new Set(["/t/.claude", "/t/amadeus/spaces/default/memory"]));
    const verify = await Verifier.create(fsRead).verify("/t", fakeManifest([]));
    expect(verify.checks().find((c) => c.name === "tools-dir")?.ok).toBe(false);
    expect(verify.checks().find((c) => c.name === "harness-dir")?.ok).toBe(true);
  });

  test("state-absence always passes: it reports, but never fails, verification (FR-013 graceful handling)", async () => {
    const noState = fakeVerifyRead(new Set(), new Set(["/t/.claude", "/t/.claude/tools", "/t/amadeus/spaces/default/memory"]));
    const withState = fakeVerifyRead(
      new Set(["/t/amadeus/spaces/default/intents/active-intent"]),
      new Set(["/t/.claude", "/t/.claude/tools", "/t/amadeus/spaces/default/memory"]),
    );
    const verifyNoState = await Verifier.create(noState).verify("/t", fakeManifest([]));
    const verifyWithState = await Verifier.create(withState).verify("/t", fakeManifest([]));
    expect(verifyNoState.checks().find((c) => c.name === "state-absence")?.ok).toBe(true);
    expect(verifyWithState.checks().find((c) => c.name === "state-absence")?.ok).toBe(true);
    expect(verifyNoState.checks().find((c) => c.name === "state-absence")?.detail).not.toBe(
      verifyWithState.checks().find((c) => c.name === "state-absence")?.detail,
    );
  });
});
