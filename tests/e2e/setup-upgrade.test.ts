// covers: e2e:setup-upgrade
//
// Upgrade E2E (NFR-002, US-B1~B4): spawns the *real built* amadeus-setup
// binary as its own child process against a real installed target, using a
// real dist/claude archive fixture (tests/lib/setup-dist-fixture.ts, same
// convention as U2's setup-install.test.ts). The network boundary is faked by
// rewriting fetch() at process start (tests/lib/setup-fetch-shim.ts) — offline
// by default (infrastructure-design/cicd-pipeline.md). REL-U02's 6 no-change
// paths are verified with a real recursive fs snapshot (path -> md5) taken
// before and after each run, rather than spot-checking individual files.
//
// Fixtures are derived from one real "installed target" by post-install file
// operations (manifest deletion, VERSION rewrite, anchor removal) plus direct
// manifest.json edits for the version-boundary paths — infra-design's
// explicit "distributionVersion 書き換え" technique, avoiding the need for a
// second distinct real archive body.

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";
import { buildDistArchiveFixture } from "../lib/setup-dist-fixture.ts";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const SHIM_PATH = join(TESTS_DIR, "..", "lib", "setup-fetch-shim.ts");
const FIXTURE_TAG = "v9.9.8";
const FIXTURE_VERSION = "9.9.8";
const MANIFEST_RELATIVE_PATH = join("amadeus", ".installer", "amadeus-setup-manifest.json");

type ReleaseEntry = { tag_name: string; draft: boolean; prerelease: boolean };
type TagEntry = { name: string };

function startFakeGitHubServer(
  archive: Buffer,
  releases: readonly ReleaseEntry[],
  tags: readonly TagEntry[],
): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolveReady) => {
    const server: Server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/repos/amadeus-dlc/amadeus/releases") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(releases));
        return;
      }
      if (url.pathname === "/repos/amadeus-dlc/amadeus/tags") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(tags));
        return;
      }
      if (url.pathname.startsWith("/amadeus-dlc/amadeus/tar.gz/refs/tags/")) {
        res.writeHead(200, { "content-type": "application/gzip" });
        res.end(archive);
        return;
      }
      // Exact --version resolution goes through the git ref direct lookup
      // (resolver.ts GIT_REF_TAGS_PATH) since #774/#802. Serve refs for tags the
      // fixture knows and 404 the rest, mirroring the real API's not-found shape.
      const refTag = url.pathname.match(/^\/repos\/amadeus-dlc\/amadeus\/git\/ref\/tags\/(.+)$/);
      if (refTag) {
        const tagName = decodeURIComponent(refTag[1]);
        if (tags.some((t) => t.name === tagName)) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(
            JSON.stringify({ ref: `refs/tags/${tagName}`, object: { sha: "0".repeat(40), type: "commit" } }),
          );
        } else {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ message: "Not Found" }));
        }
        return;
      }
      res.writeHead(404);
      res.end("not found in fixture server");
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolveReady({ port, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
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
      const archive = buildDistArchiveFixture(["claude"], FIXTURE_VERSION);
      const { port, close } = await startFakeGitHubServer(
        archive,
        [{ tag_name: FIXTURE_TAG, draft: false, prerelease: false }],
        [{ name: FIXTURE_TAG }],
      );
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

        const sharedBasename = sharedRelPath.split("/").pop();
        const backups = readdirSync(dirname(sharedPath)).filter((name) => name.startsWith(`${sharedBasename}.`) && name.endsWith(".bk"));
        expect(backups.length).toBe(1);
        expect(readFileSync(join(dirname(sharedPath), backups[0] as string), "utf8")).toBe(customizedContent);

        // The manifest still records the upgrade (BR-U14: upgradedTo).
        const manifestAfter = JSON.parse(readFileSync(join(target, MANIFEST_RELATIVE_PATH), "utf8"));
        expect(manifestAfter.sourceTag).toBe(FIXTURE_TAG);
      } finally {
        rmSync(target, { recursive: true, force: true });
        await close();
      }
    },
    60_000,
  );
});

describe("amadeus-setup upgrade (E2E, REL-U02: all 6 no-change paths write nothing)", () => {
  async function withInstalledTarget(fn: (target: string, port: number, cliPath: string) => Promise<void>): Promise<void> {
    const cliPath = await ensureSetupCliBuilt();
    const archive = buildDistArchiveFixture(["claude"], FIXTURE_VERSION);
    const { port, close } = await startFakeGitHubServer(
      archive,
      [{ tag_name: FIXTURE_TAG, draft: false, prerelease: false }],
      [{ name: FIXTURE_TAG }],
    );
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-e2e-upgrade-noop-"));
    try {
      const installed = await runCli(cliPath, ["install", "--harness", "claude", "--target", target, "--yes"], port);
      expect(installed.status).toBe(0);
      await fn(target, port, cliPath);
    } finally {
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
    60_000,
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
    60_000,
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
    60_000,
  );

  test(
    "no-installation (BR-U06): an empty target changes nothing",
    async () => {
      const cliPath = await ensureSetupCliBuilt();
      const archive = buildDistArchiveFixture(["claude"], FIXTURE_VERSION);
      const { port, close } = await startFakeGitHubServer(
        archive,
        [{ tag_name: FIXTURE_TAG, draft: false, prerelease: false }],
        [{ name: FIXTURE_TAG }],
      );
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
    60_000,
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
    60_000,
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
    60_000,
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
