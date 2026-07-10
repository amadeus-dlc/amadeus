// covers: workflow:setup-install-flow
//
// Full install pipeline (resolve -> fetch -> plan -> apply -> verify ->
// manifest write) driven through cli.ts's main(), with only the network
// boundary (Http) faked — manifestIo/applyWrite/verifyRead/tmpWrite are all
// real, operating on a real temporary target directory. Mirrors U1's own
// setup-resolve-fetch-manifest.test.ts boundary-fake convention.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { main } from "../../packages/setup/src/cli.ts";
import type { CliPorts } from "../../packages/setup/src/cli.ts";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { createApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite, createTmpWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createVerifyRead } from "../../packages/setup/src/ports/verify-read.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildCodeloadFixture } from "../lib/setup-codeload-fixture.ts";
import type { TarFixtureEntry } from "../lib/setup-tar-fixture.ts";

const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases?per_page=100";

const CLAUDE_FIXTURE_ENTRIES: TarFixtureEntry[] = [
  { type: "file", name: "dist/claude/.claude/agents/amadeus-test-agent.md", content: Buffer.from("# test agent\n") },
  { type: "file", name: "dist/claude/.claude/tools/amadeus-runtime.ts", content: Buffer.from("export const runtime = 1;\n") },
  { type: "file", name: "dist/claude/.claude/rules/amadeus.md", content: Buffer.from("# rules\n") },
  { type: "file", name: "dist/claude/amadeus/spaces/default/memory/org.md", content: Buffer.from("# org rules\n") },
];

function fakeHttp(archive: Buffer): Http {
  return {
    async getJson(path: string) {
      if (path === RELEASES_PATH) return Result.ok([{ tag_name: "v1.2.3", draft: false, prerelease: false }]);
      throw new Error(`unexpected path in fixture: ${path}`);
    },
    async downloadArchive() {
      const stream = Readable.toWeb(Readable.from(archive)) as unknown as ReadableStream<Uint8Array>;
      return Result.ok(stream);
    },
  };
}

function realPorts(archive: Buffer): CliPorts {
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
    http: fakeHttp(archive),
    createTmpWrite,
    applyWrite: createApplyWrite(),
    verifyRead: createVerifyRead(),
  };
}

describe("install pipeline (fake network, real filesystem)", () => {
  test("installs claude's owned/shared/user-preserved files and writes a readable manifest", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-"));
    try {
      const archive = buildCodeloadFixture("amadeus-1.2.3", CLAUDE_FIXTURE_ENTRIES);
      const exitCode = await main(["install", "--harness", "claude", "--target", target, "--yes"], realPorts(archive));
      expect(exitCode).toBe(0);

      expect(existsSync(join(target, ".claude", "agents", "amadeus-test-agent.md"))).toBe(true);
      expect(existsSync(join(target, ".claude", "tools", "amadeus-runtime.ts"))).toBe(true);
      expect(existsSync(join(target, ".claude", "rules", "amadeus.md"))).toBe(true);
      expect(existsSync(join(target, "amadeus", "spaces", "default", "memory", "org.md"))).toBe(true);

      const manifestPath = join(target, "amadeus", ".installer", "amadeus-setup-manifest.json");
      expect(existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      expect(manifest.harness).toBe("claude");
      expect(manifest.sourceTag).toBe("v1.2.3");
      expect(manifest.files.some((f: { path: string }) => f.path === ".claude/tools/amadeus-runtime.ts")).toBe(true);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("edge case: a second install on the now-installed target refuses without --force (BR-I07)", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-repeat-"));
    try {
      const archive = buildCodeloadFixture("amadeus-1.2.3", CLAUDE_FIXTURE_ENTRIES);
      const first = await main(["install", "--harness", "claude", "--target", target, "--yes"], realPorts(archive));
      expect(first).toBe(0);

      const second = await main(["install", "--harness", "claude", "--target", target, "--yes"], realPorts(archive));
      expect(second).toBe(1);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("edge case: --force reinstalls over an already-installed target", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-force-"));
    try {
      const archive = buildCodeloadFixture("amadeus-1.2.3", CLAUDE_FIXTURE_ENTRIES);
      const first = await main(["install", "--harness", "claude", "--target", target, "--yes"], realPorts(archive));
      expect(first).toBe(0);

      const second = await main(["install", "--harness", "claude", "--target", target, "--yes", "--force"], realPorts(archive));
      expect(second).toBe(0);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("install pipeline — apply-failure order-of-operations (review correction 4: REL-I01/BR-I16)", () => {
  test("a partial apply failure returns exit 1 without ever writing the manifest or invoking verify", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-order-"));
    try {
      // Genuine (not faked) apply failure: pre-create ".claude/tools" as a
      // regular file, so the applier's real mkdir(".claude/tools") for the
      // "amadeus-runtime.ts" entry fails with EEXIST.
      mkdirSync(join(target, ".claude"), { recursive: true });
      writeFileSync(join(target, ".claude", "tools"), "not a directory");

      const archive = buildCodeloadFixture("amadeus-1.2.3", CLAUDE_FIXTURE_ENTRIES);
      const realManifestIo = createManifestIo(createFsRead(), createFsWrite());
      const ports: CliPorts = {
        ...realPorts(archive),
        manifestIo: {
          read: (dir) => realManifestIo.read(dir), // Installation.detect legitimately reads first
          write: () => {
            throw new Error("BR-I16 violation: manifestIo.write must not be called after an apply failure");
          },
        },
        verifyRead: {
          fileExists: () => {
            throw new Error("REL-I01/BR-I16 violation: verifyRead.fileExists must not be called after an apply failure");
          },
          dirExists: () => {
            throw new Error("REL-I01/BR-I16 violation: verifyRead.dirExists must not be called after an apply failure");
          },
        },
      };

      const exitCode = await main(["install", "--harness", "claude", "--target", target, "--yes"], ports);
      expect(exitCode).toBe(1);
      expect(existsSync(join(target, "amadeus", ".installer", "amadeus-setup-manifest.json"))).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
