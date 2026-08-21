// covers: workflow:setup-upgrade-flow
//
// Full upgrade pipeline (detect -> classify source -> assess version boundary
// -> resolve -> fetch -> plan -> apply -> verify -> manifest update) driven
// through cli.ts's main(), with only the network boundary (Http) faked —
// manifestIo/applyWrite/verifyRead/tmpWrite are all real, operating on a real
// temporary target directory. Mirrors U2's own setup-install-flow.test.ts
// boundary-fake convention; installs a real v1 target first via the same
// pipeline, then derives each scenario from it (infrastructure-design/
// cicd-pipeline.md: fixtures are derived by post-install file operations, not
// hand-built from scratch).

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../packages/setup/src/cli.ts";
import type { CliPorts } from "../../packages/setup/src/cli.ts";
import { ManifestError } from "../../packages/setup/src/domain/manifest.ts";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { createApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite, createTmpWrite, IoError } from "../../packages/setup/src/ports/fsops.ts";
import { createVerifyRead } from "../../packages/setup/src/ports/verify-read.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildCodeloadFixture } from "../lib/setup-codeload-fixture.ts";
import {
  buildReleaseAssetChecksums,
  releaseAssetFixtureBytes,
  toReadableStream,
} from "../lib/setup-release-asset-fixture.ts";
import type { TarFixtureEntry } from "../lib/setup-tar-fixture.ts";

const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases?per_page=100";
const TAGS_PATH = "/repos/amadeus-dlc/amadeus/tags?per_page=100";
const MANIFEST_RELATIVE_PATH = join("amadeus", ".installer", "amadeus-setup-manifest.json");

function v1Entries(): TarFixtureEntry[] {
  return [
    { type: "file", name: "dist/claude/.claude/agents/amadeus-test-agent.md", content: Buffer.from("# test agent v1\n") },
    { type: "file", name: "dist/claude/.claude/tools/amadeus-runtime.ts", content: Buffer.from("export const runtime = 1;\n") },
    { type: "file", name: "dist/claude/.claude/amadeus-common/placeholder.md", content: Buffer.from("# placeholder v1\n") },
    { type: "file", name: "dist/claude/.claude/VERSION", content: Buffer.from("1.0.0\n") },
    { type: "file", name: "dist/claude/.claude/settings.json", content: Buffer.from('{"v":1}\n') },
    { type: "file", name: "dist/claude/amadeus/spaces/default/memory/org.md", content: Buffer.from("# org rules v1\n") },
  ];
}

function v2Entries(): TarFixtureEntry[] {
  return [
    { type: "file", name: "dist/claude/.claude/agents/amadeus-test-agent.md", content: Buffer.from("# test agent v2\n") },
    { type: "file", name: "dist/claude/.claude/tools/amadeus-runtime.ts", content: Buffer.from("export const runtime = 2;\n") },
    { type: "file", name: "dist/claude/.claude/amadeus-common/placeholder.md", content: Buffer.from("# placeholder v2\n") },
    { type: "file", name: "dist/claude/.claude/VERSION", content: Buffer.from("1.1.0\n") },
    { type: "file", name: "dist/claude/.claude/settings.json", content: Buffer.from('{"v":2}\n') },
    { type: "file", name: "dist/claude/amadeus/spaces/default/memory/org.md", content: Buffer.from("# org rules v2\n") },
  ];
}

function withOnboarding(entries: TarFixtureEntry[], content: string): TarFixtureEntry[] {
  return [...entries, { type: "file", name: "dist/claude/CLAUDE.md", content: Buffer.from(content) }];
}

function fakeHttp(archive: Buffer, tag: `v${string}`): Http {
  const checksums = buildReleaseAssetChecksums(archive, tag);
  return {
    async getJson(path: string) {
      if (path === RELEASES_PATH) return Result.ok([{ tag_name: tag, draft: false, prerelease: false }]);
      // --version resolves as an "exact" VersionSpec via the git ref direct
      // lookup (single object, not a listing) since #774.
      if (path === `/repos/amadeus-dlc/amadeus/git/ref/tags/${tag}`)
        return Result.ok({ ref: `refs/tags/${tag}`, object: { sha: "0".repeat(40), type: "commit" } });
      if (path === TAGS_PATH) return Result.ok([{ name: tag }]);
      throw new Error(`unexpected path in fixture: ${path}`);
    },
    async downloadArchive(url) {
      return Result.ok(toReadableStream(releaseAssetFixtureBytes(url, archive, checksums, tag)));
    },
  };
}

function realPorts(archive: Buffer, tag: `v${string}`): CliPorts {
  return {
    tty: {
      isTTY: false,
      select: () => {
        throw new Error("non-interactive run must not prompt");
      },
      input: () => {
        throw new Error("non-interactive run must not prompt");
      },
      confirm: () => {
        throw new Error("non-interactive run must not prompt");
      },
    },
    manifestIo: createManifestIo(createFsRead(), createFsWrite()),
    http: fakeHttp(archive, tag),
    createTmpWrite,
    applyWrite: createApplyWrite(),
    verifyRead: createVerifyRead(),
    // These suites never install kimi, so the hook-wiring ports stay inert;
    // any prompt or print from them fails loudly like the outer tty.
    kimiHooks: {
      tty: {
        isTTY: false,
        select: () => {
          throw new Error("kimi hook wiring must not run in this suite");
        },
        input: () => {
          throw new Error("kimi hook wiring must not run in this suite");
        },
        confirm: () => {
          throw new Error("kimi hook wiring must not run in this suite");
        },
      },
      fsRead: createFsRead(),
      fsWrite: createFsWrite(),
      applyWrite: createApplyWrite(),
      out: () => {
        throw new Error("kimi hook wiring must not run in this suite");
      },
    },
  };
}

function readManifest(target: string): { sourceTag: string; distributionVersion: string; files: readonly { path: string }[] } {
  return JSON.parse(readFileSync(join(target, MANIFEST_RELATIVE_PATH), "utf8"));
}

function findBackupFiles(target: string): string[] {
  return readdirSync(join(target, ".claude")).filter((name) => name.endsWith(".bk"));
}

async function installV1(target: string): Promise<number> {
  const archive = buildCodeloadFixture("amadeus-1.0.0", v1Entries());
  return main(["install", "--harness", "claude", "--target", target, "--yes"], realPorts(archive, "v1.0.0"));
}

async function installV1WithOnboarding(target: string): Promise<number> {
  const archive = buildCodeloadFixture("amadeus-1.0.0", withOnboarding(v1Entries(), "# shipped onboarding v1\n"));
  return main(["install", "--harness", "claude", "--target", target, "--yes"], realPorts(archive, "v1.0.0"));
}

describe("upgrade pipeline — normal upgrade, no customization (FR-005/FR-016)", () => {
  test("owned/shared files update to v2 content and the manifest advances", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-normal-"));
    try {
      expect(await installV1(target)).toBe(0);

      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const exitCode = await main(["upgrade", "--harness", "claude", "--target", target, "--yes"], realPorts(archive, "v1.1.0"));
      expect(exitCode).toBe(0);

      expect(readFileSync(join(target, ".claude", "agents", "amadeus-test-agent.md"), "utf8")).toBe("# test agent v2\n");
      expect(readFileSync(join(target, ".claude", "tools", "amadeus-runtime.ts"), "utf8")).toBe("export const runtime = 2;\n");
      expect(readFileSync(join(target, ".claude", "settings.json"), "utf8")).toBe('{"v":2}\n'); // unmodified shared file: matches expected md5, overwritten
      expect(findBackupFiles(target)).toEqual([]); // nothing was customized, so nothing needed backing up

      const manifest = readManifest(target);
      expect(manifest.sourceTag).toBe("v1.1.0");
      expect(manifest.distributionVersion).toBe("v1.1.0");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("upgrade pipeline — customization preserved (FR-008/NFR-002)", () => {
  test("a hand-edited shared file is backed up before the new version is copied in", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-customized-"));
    try {
      expect(await installV1(target)).toBe(0);
      writeFileSync(join(target, ".claude", "settings.json"), '{"v":1,"customized":true}\n');

      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const exitCode = await main(["upgrade", "--harness", "claude", "--target", target, "--yes"], realPorts(archive, "v1.1.0"));
      expect(exitCode).toBe(0);

      expect(readFileSync(join(target, ".claude", "settings.json"), "utf8")).toBe('{"v":2}\n');
      const backups = findBackupFiles(target);
      expect(backups.length).toBe(1);
      expect(readFileSync(join(target, ".claude", backups[0] as string), "utf8")).toBe('{"v":1,"customized":true}\n');

      // user-preserved (memory/) content is never touched, customized or not.
      expect(readFileSync(join(target, "amadeus", "spaces", "default", "memory", "org.md"), "utf8")).toBe("# org rules v1\n");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("upgrade pipeline — manifest-unknown onboarding under --force (#3403)", () => {
  test("backs up the user's CLAUDE.md before replacing the manifest-unknown primary", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-manifest-unknown-onboarding-"));
    const userContent = "# the user's own instructions\n";
    try {
      writeFileSync(join(target, "CLAUDE.md"), userContent);
      expect(await installV1WithOnboarding(target)).toBe(0);
      expect(existsSync(join(target, "CLAUDE-AMADEUS.md"))).toBe(true);

      const archive = buildCodeloadFixture("amadeus-1.1.0", withOnboarding(v2Entries(), "# shipped onboarding v2\n"));
      const exitCode = await main(
        ["upgrade", "--harness", "claude", "--target", target, "--yes", "--force"],
        realPorts(archive, "v1.1.0"),
      );
      expect(exitCode).toBe(0);
      expect(readFileSync(join(target, "CLAUDE.md"), "utf8")).toBe("# shipped onboarding v2\n");

      const backups = readdirSync(target).filter((name) => /^CLAUDE\.md\.\d{8}T\d{6}Z\.bk$/.test(name));
      expect(backups).toHaveLength(1);
      expect(readFileSync(join(target, backups[0] as string), "utf8")).toBe(userContent);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("upgrade pipeline — already-up-to-date is a no-op success (BR-U01, REL-U02)", () => {
  test("upgrading to the currently-installed version exits 0 and changes nothing", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-noop-"));
    try {
      expect(await installV1(target)).toBe(0);
      const beforeManifest = readManifest(target);
      const beforeContent = readFileSync(join(target, ".claude", "tools", "amadeus-runtime.ts"), "utf8");

      const archive = buildCodeloadFixture("amadeus-1.0.0", v1Entries());
      const exitCode = await main(
        ["upgrade", "--harness", "claude", "--target", target, "--version", "1.0.0", "--yes"],
        realPorts(archive, "v1.0.0"),
      );
      expect(exitCode).toBe(0);

      expect(readFileSync(join(target, ".claude", "tools", "amadeus-runtime.ts"), "utf8")).toBe(beforeContent);
      expect(readManifest(target)).toEqual(beforeManifest);
      expect(findBackupFiles(target)).toEqual([]);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("upgrade pipeline — no installation refuses without writing anything (BR-U06, REL-U02)", () => {
  test("an empty target stays empty", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-none-"));
    try {
      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const exitCode = await main(["upgrade", "--harness", "claude", "--target", target, "--yes"], realPorts(archive, "v1.1.0"));
      expect(exitCode).toBe(1);
      expect(readdirSync(target)).toEqual([]);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("upgrade pipeline — partial installation (BR-U08, REL-U02/U03)", () => {
  test("without --force, a partial installation refuses and changes nothing", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-partial-"));
    try {
      expect(await installV1(target)).toBe(0);
      // Installation.detect only reaches the anchor scan when no manifest is
      // present; deleting the manifest here alongside one anchor directory
      // is what actually reaches the "partial" classification (a manifest
      // present with files missing on disk still classifies as "manifested").
      rmSync(join(target, MANIFEST_RELATIVE_PATH), { force: true });
      rmSync(join(target, ".claude", "amadeus-common"), { recursive: true, force: true });
      const beforeContent = readFileSync(join(target, ".claude", "settings.json"), "utf8");

      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const exitCode = await main(["upgrade", "--harness", "claude", "--target", target, "--yes"], realPorts(archive, "v1.1.0"));
      expect(exitCode).toBe(1);
      expect(readFileSync(join(target, ".claude", "settings.json"), "utf8")).toBe(beforeContent);
      expect(existsSync(join(target, MANIFEST_RELATIVE_PATH))).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("edge case: --force proceeds conservatively (partial-forced) and writes a fresh manifest", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-partial-forced-"));
    try {
      expect(await installV1(target)).toBe(0);
      rmSync(join(target, MANIFEST_RELATIVE_PATH), { force: true });
      rmSync(join(target, ".claude", "amadeus-common"), { recursive: true, force: true });

      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const exitCode = await main(
        ["upgrade", "--harness", "claude", "--target", target, "--yes", "--force"],
        realPorts(archive, "v1.1.0"),
      );
      expect(exitCode).toBe(0);
      expect(readFileSync(join(target, ".claude", "settings.json"), "utf8")).toBe('{"v":2}\n'); // backed up then copied (no known expected md5)
      // Both shared files (settings.json and VERSION) are conservatively
      // backed up — BR-U09 applies to every shared file, not just one.
      expect(findBackupFiles(target).length).toBe(2);
      expect(readManifest(target).sourceTag).toBe("v1.1.0");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("upgrade pipeline — unsupported legacy layout, condition (a) (BR-U07)", () => {
  test("a non-SemVer VERSION file refuses and changes nothing", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-legacy-"));
    try {
      expect(await installV1(target)).toBe(0);
      rmSync(join(target, MANIFEST_RELATIVE_PATH), { force: true });
      writeFileSync(join(target, ".claude", "VERSION"), "legacy-build-2024\n");
      const beforeContent = readFileSync(join(target, ".claude", "settings.json"), "utf8");

      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const exitCode = await main(["upgrade", "--harness", "claude", "--target", target, "--yes"], realPorts(archive, "v1.1.0"));
      expect(exitCode).toBe(1);
      expect(readFileSync(join(target, ".claude", "settings.json"), "utf8")).toBe(beforeContent);
      expect(existsSync(join(target, MANIFEST_RELATIVE_PATH))).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("upgrade pipeline — apply-failure order-of-operations (REL-U01/BR-U15, mirrors install's review correction 4)", () => {
  test("a partial apply failure exits 1 without ever rewriting the manifest or invoking verify", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-order-"));
    try {
      expect(await installV1(target)).toBe(0);
      const beforeManifest = readManifest(target);

      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const realManifestIo = createManifestIo(createFsRead(), createFsWrite());
      const realApplyWrite = createApplyWrite();
      const ports: CliPorts = {
        ...realPorts(archive, "v1.1.0"),
        manifestIo: {
          read: (dir) => realManifestIo.read(dir), // Installation.detect legitimately reads first
          write: () => {
            throw new Error("BR-U15 violation: manifestIo.write must not be called after an apply failure");
          },
        },
        applyWrite: {
          ...realApplyWrite,
          copyFile: async () => Result.err(IoError.of("fixture apply failure")),
        },
        verifyRead: {
          fileExists: () => {
            throw new Error("REL-U01 violation: verifyRead.fileExists must not be called after an apply failure");
          },
          dirExists: () => {
            throw new Error("REL-U01 violation: verifyRead.dirExists must not be called after an apply failure");
          },
        },
      };

      const exitCode = await main(["upgrade", "--harness", "claude", "--target", target, "--yes"], ports);
      expect(exitCode).toBe(1);
      expect(readManifest(target)).toEqual(beforeManifest);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("a manifest write failure is surfaced after apply and before verification", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-flow-manifest-error-"));
    try {
      expect(await installV1(target)).toBe(0);
      const beforeManifest = readManifest(target);
      const archive = buildCodeloadFixture("amadeus-1.1.0", v2Entries());
      const realManifestIo = createManifestIo(createFsRead(), createFsWrite());
      const ports: CliPorts = {
        ...realPorts(archive, "v1.1.0"),
        manifestIo: {
          read: (dir) => realManifestIo.read(dir),
          write: async () => Result.err(ManifestError.io("fixture manifest write failure")),
        },
        verifyRead: {
          fileExists: () => {
            throw new Error("verification must not run after a manifest write failure");
          },
          dirExists: () => {
            throw new Error("verification must not run after a manifest write failure");
          },
        },
      };

      const exitCode = await main(["upgrade", "--harness", "claude", "--target", target, "--yes"], ports);
      expect(exitCode).toBe(1);
      expect(readManifest(target)).toEqual(beforeManifest);
      expect(readFileSync(join(target, ".claude", "tools", "amadeus-runtime.ts"), "utf8")).toBe("export const runtime = 2;\n");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
