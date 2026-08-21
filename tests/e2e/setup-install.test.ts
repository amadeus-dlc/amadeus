// covers: e2e:setup-install
//
// Install E2E (NFR-001, US-A1): spawns the *real built* amadeus-setup binary
// as its own child process against a real temp target directory, using a
// real dist/claude archive fixture. Because FIXTURE_TAG is above ADR-003's
// ASSET_INTRO_VERSION, this walks the verified release-asset path end to end
// — asset download, SHA256SUMS download, real checksum verification. The
// network boundary is faked by rewriting fetch() calls at process start
// (tests/lib/setup-fetch-shim.ts, via `bun --preload`) rather than by editing
// the frozen ports/http.ts — offline by default (cicd-pipeline.md). A
// separate, real-network variant is gated behind AMADEUS_SETUP_E2E_NETWORK=1
// and skipped otherwise.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSetupCliBuilt } from "../lib/setup-lazy-build.ts";
import { buildDistAssetFixture } from "../lib/setup-dist-fixture.ts";
import { startFakeGitHubServer } from "../lib/setup-fake-github-server.ts";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const SHIM_PATH = join(TESTS_DIR, "..", "lib", "setup-fetch-shim.ts");
const FIXTURE_TAG = "v9.9.9";
const FIXTURE_VERSION = "9.9.9";

type SpawnResult = { status: number | null; stdout: string; stderr: string };

// The fake GitHub server above lives in *this* process's event loop. A
// synchronous spawnSync would block that event loop for the CLI subprocess's
// entire run, so the server could accept the TCP connection but never get a
// chance to run its request handler — the child would hang until its own
// internal fetch timeout fired. Using async spawn keeps this process's event
// loop free to service the fake server while the child runs.
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

describe("amadeus-setup install (E2E, offline fixture)", () => {
  test(
    "installs claude end-to-end within the NFR-001 time budget",
    async () => {
      const cliPath = await ensureSetupCliBuilt();
      const archive = buildDistAssetFixture(["claude"], FIXTURE_VERSION);
      const { port, close } = await startFakeGitHubServer({ tag: FIXTURE_TAG, archive });
      const target = mkdtempSync(join(tmpdir(), "amadeus-setup-e2e-install-"));

      try {
        const result = await spawnAsync(
          process.execPath, // tests always run under bun (see setup-cli-smoke.test.ts)
          ["--preload", SHIM_PATH, cliPath, "install", "--harness", "claude", "--target", target, "--yes"],
          { ...process.env, AMADEUS_SETUP_TEST_FAKE_GITHUB_PORT: String(port) },
        );
        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);
        expect(existsSync(join(target, ".claude"))).toBe(true);
        expect(existsSync(join(target, ".claude", "tools"))).toBe(true);
        expect(existsSync(join(target, "amadeus", "spaces", "default", "memory", "org.md"))).toBe(true);

        const manifestPath = join(target, "amadeus", ".installer", "amadeus-setup-manifest.json");
        expect(existsSync(manifestPath)).toBe(true);
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        expect(manifest.harness).toBe("claude");
        expect(manifest.sourceTag).toBe(FIXTURE_TAG);

      } finally {
        rmSync(target, { recursive: true, force: true });
        await close();
      }
    },
    scaleTestTime(60_000),
  );
});

describe("amadeus-setup install (E2E, real network — release gate)", () => {
  // Guarded per cicd-pipeline.md: off by default so `--e2e`/`--release` stay
  // offline locally; the release procedure sets this before running it.
  test.skipIf(process.env.AMADEUS_SETUP_E2E_NETWORK !== "1")(
    "installs the real latest claude release from GitHub",
    async () => {
      const cliPath = await ensureSetupCliBuilt();
      const target = mkdtempSync(join(tmpdir(), "amadeus-setup-e2e-real-network-"));
      try {
        const result = spawnSync(process.execPath, [cliPath, "install", "--harness", "claude", "--target", target, "--yes"], {
          encoding: "utf8",
        });
        expect(result.status).toBe(0);
        expect(existsSync(join(target, ".claude"))).toBe(true);
      } finally {
        rmSync(target, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
