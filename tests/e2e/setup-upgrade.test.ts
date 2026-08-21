// covers: e2e:setup-upgrade
//
// Upgrade E2E (NFR-002, US-B1~B4): spawns the *real built* amadeus-setup
// binary as its own child process against a real installed target, using a
// real dist/claude archive fixture (tests/lib/setup-dist-fixture.ts, same
// convention as U2's setup-install.test.ts). FIXTURE_TAG sits above ADR-003's
// ASSET_INTRO_VERSION, so every run here walks the verified release-asset
// path — asset download, SHA256SUMS download, real checksum verification. The
// network boundary is faked by rewriting fetch() at process start
// (tests/lib/setup-fetch-shim.ts) — offline
// by default (infrastructure-design/cicd-pipeline.md). REL-U02's 6 no-change
// paths are verified with a real recursive fs snapshot (path -> md5) taken
// before and after each run, rather than spot-checking individual files.
//
// Fixtures are derived from one real "installed target" by post-install file
// operations (manifest deletion, VERSION rewrite, anchor removal) plus direct
// manifest.json edits for the version-boundary paths — infra-design's
// explicit "distributionVersion 書き換え" technique, avoiding the need for a
// second distinct real archive body.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";
import { buildDistAssetFixture } from "../lib/setup-dist-fixture.ts";
import { startFakeGitHubServer } from "../lib/setup-fake-github-server.ts";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const SHIM_PATH = join(TESTS_DIR, "..", "lib", "setup-fetch-shim.ts");
const FIXTURE_TAG = "v9.9.8";
const FIXTURE_VERSION = "9.9.8";
const MANIFEST_RELATIVE_PATH = join("amadeus", ".installer", "amadeus-setup-manifest.json");

// Every scenario below advertises the same single release/tag, so the fake
// server's defaults are exactly what these tests need.
function startFixtureServer(archive: Buffer): Promise<{ port: number; close: () => Promise<void> }> {
  return startFakeGitHubServer({ tag: FIXTURE_TAG, archive });
}

type SpawnResult = { status: number | null; stdout: string; stderr: string };

// Async spawn (not spawnSync): the fake server above lives in this process's
// event loop and must stay free to service requests while the child runs
// (same rationale as U2's setup-install.test.ts).
function spawnAsync(command: string, args: readonly string[], env: NodeJS.ProcessEnv): Promise<SpawnResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolveResult({ status, stdout, stderr }));
  });
}

function snapshot(root: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!existsSync(root)) return result;
  function walk(dir: string): void {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        const relPath = relative(root, full);
        result.set(relPath, createHash("md5").update(readFileSync(full)).digest("hex"));
      }
    }
  }
  walk(root);
  return result;
}

function installerPrivateRoot(target: string): string {
  const canonical = realpathSync(target);
  const identity = createHash("sha256").update(canonical).digest("hex").slice(0, 20);
  return join(dirname(canonical), `.amadeus-installer-private-${identity}`);
}

async function runCli(cliPath: string, args: readonly string[], port: number): Promise<SpawnResult> {
  return spawnAsync(
    process.execPath,
    ["--preload", SHIM_PATH, cliPath, ...args],
    { ...process.env, AMADEUS_SETUP_TEST_FAKE_GITHUB_PORT: String(port) },
  );
}

function rewriteManifestDistributionVersion(target: string, version: string): void {
  const path = join(target, MANIFEST_RELATIVE_PATH);
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.distributionVersion = version;
  manifest.sourceTag = `v${version}`;
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}

describe("amadeus-setup upgrade (E2E, offline fixture)", () => {
  test(
    "a real install followed by a customized-file upgrade backs up the customization and stays green (FR-008/NFR-002)",
    async () => {
      const cliPath = await ensureSetupCliBuilt();
      const archive = buildDistAssetFixture(["claude"], FIXTURE_VERSION);
      const { port, close } = await startFixtureServer(archive);
      const target = mkdtempSync(join(tmpdir(), "amadeus-setup-e2e-upgrade-"));

      try {
        const installed = await runCli(cliPath, ["install", "--harness", "claude", "--target", target, "--yes"], port);
        expect(installed.status).toBe(0);

        // The fake server only advertises one real archive (FIXTURE_TAG); to
        // exercise a genuine "proceed" upgrade against it (rather than
        // already-up-to-date), back-date the installed manifest's recorded
        // version first (infra-design's "distributionVersion 書き換え"
        // technique — content-identical, but a real version-boundary crossing).
        rewriteManifestDistributionVersion(target, "9.0.0");

        // Hand-customize one recorded shared (non-amadeus-*, non-memory/) file
        // so this upgrade has something concrete to back up.
        const manifestBefore = JSON.parse(readFileSync(join(target, MANIFEST_RELATIVE_PATH), "utf8"));
        const sharedEntry = (manifestBefore.files as Array<{ path: string; class: string }>).find((f) => f.class === "shared");
        expect(sharedEntry).toBeDefined();
        if (sharedEntry === undefined) throw new Error("fixture setup: expected at least one shared manifest entry");
        const sharedRelPath = sharedEntry.path;
        const sharedPath = join(target, sharedRelPath);
        const customizedContent = `${readFileSync(sharedPath, "utf8")}\n// hand-edited by this test\n`;
        writeFileSync(sharedPath, customizedContent);

        const upgraded = await runCli(cliPath, ["upgrade", "--harness", "claude", "--target", target, "--yes"], port);
        expect(upgraded.stderr).toBe("");
        expect(upgraded.status).toBe(0);

        // Credential-bearing shared files are retained outside the project in
        // the owner-only installer store, never as an inventory-visible .bk.
        expect(readdirSync(dirname(sharedPath)).some((name) => name.endsWith(".bk"))).toBe(false);
        const privateSnapshot = snapshot(installerPrivateRoot(target));
        const customizedDigest = createHash("md5").update(customizedContent).digest("hex");
        expect([...privateSnapshot.values()]).toContain(customizedDigest);

        // The manifest still records the upgrade (BR-U14: upgradedTo).
        const manifestAfter = JSON.parse(readFileSync(join(target, MANIFEST_RELATIVE_PATH), "utf8"));
        expect(manifestAfter.sourceTag).toBe(FIXTURE_TAG);
      } finally {
        rmSync(installerPrivateRoot(target), { recursive: true, force: true });
        rmSync(target, { recursive: true, force: true });
        await close();
      }
    },
    scaleTestTime(60_000),
  );
});

describe("amadeus-setup upgrade (E2E, REL-U02: all 6 no-change paths write nothing)", () => {
  async function withInstalledTarget(fn: (target: string, port: number, cliPath: string) => Promise<void>): Promise<void> {
    const cliPath = await ensureSetupCliBuilt();
    const archive = buildDistAssetFixture(["claude"], FIXTURE_VERSION);
    const { port, close } = await startFixtureServer(archive);
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-e2e-upgrade-noop-"));
    try {
      const installed = await runCli(cliPath, ["install", "--harness", "claude", "--target", target, "--yes"], port);
      expect(installed.status).toBe(0);
      await fn(target, port, cliPath);
    } finally {
      rmSync(installerPrivateRoot(target), { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
      await close();
    }
  }

  test(
    "already-up-to-date (BR-U01): upgrading to the installed version changes nothing",
    async () => {
      await withInstalledTarget(async (target, port, cliPath) => {
        const before = snapshot(target);
        const result = await runCli(
          cliPath,
          ["upgrade", "--harness", "claude", "--target", target, "--version", FIXTURE_VERSION, "--yes"],
          port,
        );
        expect(result.status).toBe(0);
        expect(snapshot(target)).toEqual(before);
      });
    },
    scaleTestTime(60_000),
  );

  test(
    "downgrade-unsupported (BR-U02): an explicit older --version changes nothing",
    async () => {
      await withInstalledTarget(async (target, port, cliPath) => {
        rewriteManifestDistributionVersion(target, "9.9.9");
        const before = snapshot(target);
        const result = await runCli(
          cliPath,
          ["upgrade", "--harness", "claude", "--target", target, "--version", FIXTURE_VERSION, "--yes"],
          port,
        );
        expect(result.status).toBe(1);
        expect(snapshot(target)).toEqual(before);
      });
    },
    scaleTestTime(60_000),
  );

  test(
    "installed-newer-than-latest (BR-U03): a default (no --version) resolution older than installed changes nothing",
    async () => {
      await withInstalledTarget(async (target, port, cliPath) => {
        rewriteManifestDistributionVersion(target, "9.9.9");
        const before = snapshot(target);
        const result = await runCli(cliPath, ["upgrade", "--harness", "claude", "--target", target, "--yes"], port);
        expect(result.status).toBe(1);
        expect(snapshot(target)).toEqual(before);
      });
    },
    scaleTestTime(60_000),
  );

  test(
    "no-installation (BR-U06): an empty target changes nothing",
    async () => {
      const cliPath = await ensureSetupCliBuilt();
      const archive = buildDistAssetFixture(["claude"], FIXTURE_VERSION);
      const { port, close } = await startFixtureServer(archive);
      const target = mkdtempSync(join(tmpdir(), "amadeus-setup-e2e-upgrade-none-"));
      try {
        const before = snapshot(target);
        const result = await runCli(cliPath, ["upgrade", "--harness", "claude", "--target", target, "--yes"], port);
        expect(result.status).toBe(1);
        expect(snapshot(target)).toEqual(before);
      } finally {
        rmSync(target, { recursive: true, force: true });
        await close();
      }
    },
    scaleTestTime(60_000),
  );

  test(
    "partial-refused (BR-U08): a manifest-absent, anchor-incomplete target changes nothing without --force",
    async () => {
      await withInstalledTarget(async (target, port, cliPath) => {
        // Installation.detect only reaches the anchor scan when no manifest
        // is present (a manifest recording files that later vanish from disk
        // still classifies as "manifested") — deleting the manifest here is
        // required to actually reach "partial", not merely deleting a file.
        rmSync(join(target, MANIFEST_RELATIVE_PATH), { force: true });
        rmSync(join(target, ".claude", "amadeus-common"), { recursive: true, force: true });
        const before = snapshot(target);
        const result = await runCli(cliPath, ["upgrade", "--harness", "claude", "--target", target, "--yes"], port);
        expect(result.status).toBe(1);
        expect(snapshot(target)).toEqual(before);
      });
    },
    scaleTestTime(60_000),
  );

  test(
    "unsupported-layout, condition (a) (BR-U07): a non-SemVer VERSION file changes nothing",
    async () => {
      await withInstalledTarget(async (target, port, cliPath) => {
        rmSync(join(target, MANIFEST_RELATIVE_PATH), { force: true });
        writeFileSync(join(target, ".claude", "VERSION"), "legacy-build-2024\n");
        const before = snapshot(target);
        const result = await runCli(cliPath, ["upgrade", "--harness", "claude", "--target", target, "--yes"], port);
        expect(result.status).toBe(1);
        expect(snapshot(target)).toEqual(before);
      });
    },
    scaleTestTime(60_000),
  );

  // Note (deviation, flagged to the architect): infrastructure-design/
  // cicd-pipeline.md describes a 4th derived fixture exercising LegacyLayout
  // condition (b) by deleting both tools/ and amadeus-common/ while leaving
  // amadeus-* files in place. Installation.detect (U2, frozen) classifies
  // "either anchor missing" as "partial" regardless of which anchor(s) are
  // missing — it never reaches the manual-or-unknown branch that condition
  // (b) is checked from, and InstallationEvidence.paths only ever contains
  // the tools/amadeus-common/VERSION marker strings themselves (never a
  // loose amadeus-* file), so no evidence value Installation.detect can
  // actually produce satisfies condition (b) once anchors.amadeusCommon must
  // be false (that anchor being false is exactly what keeps its own path out
  // of evidence.paths). This makes condition (b) unreachable via the live
  // detect() pipeline; it stays covered by tests/unit/setup-upgrade.test.ts
  // against a synthetic InstallationEvidence value instead, and the "both
  // anchors missing" shape is already exercised above via the
  // partial-refused test.
});
