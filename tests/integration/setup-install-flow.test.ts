// covers: workflow:setup-install-flow
//
// Full install pipeline (resolve -> fetch -> plan -> apply -> verify ->
// manifest write) driven through cli.ts's main(), with only the network
// boundary (Http) faked — manifestIo/applyWrite/verifyRead/tmpWrite are all
// real, operating on a real temporary target directory. Mirrors U1's own
// setup-resolve-fetch-manifest.test.ts boundary-fake convention.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../packages/setup/src/cli.ts";
import type { CliPorts } from "../../packages/setup/src/cli.ts";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { createApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite, createTmpWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createVerifyRead } from "../../packages/setup/src/ports/verify-read.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { SetupTransactionCoordinator } from "../../packages/setup/src/modules/setup-transaction-coordinator.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildCodeloadFixture } from "../lib/setup-codeload-fixture.ts";
import {
  buildReleaseAssetChecksums,
  releaseAssetFixtureBytes,
  toReadableStream,
} from "../lib/setup-release-asset-fixture.ts";
import type { TarFixtureEntry } from "../lib/setup-tar-fixture.ts";

const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases?per_page=100";

// A codeload fixture subtree for one harness: dist/<harness>/<engineDir>/...
// mirrors the shipped layout (owned tools/agents, shared rules, user-preserved
// memory). Path classification in the installer is engine-dir-agnostic, so the
// same four-file shape exercises every harness — only the harness key and its
// dot-directory differ.
function harnessFixtureEntries(harness: string, engineDir: string): TarFixtureEntry[] {
  return [
    { type: "file", name: `dist/${harness}/${engineDir}/agents/amadeus-test-agent.md`, content: Buffer.from("# test agent\n") },
    { type: "file", name: `dist/${harness}/${engineDir}/tools/amadeus-runtime.ts`, content: Buffer.from("export const runtime = 1;\n") },
    { type: "file", name: `dist/${harness}/${engineDir}/rules/amadeus.md`, content: Buffer.from("# rules\n") },
    { type: "file", name: `dist/${harness}/amadeus/spaces/default/memory/org.md`, content: Buffer.from("# org rules\n") },
  ];
}

const CLAUDE_FIXTURE_ENTRIES: TarFixtureEntry[] = harnessFixtureEntries("claude", ".claude");
// Bolt 1 (#1048): opencode/cursor join the installer's known-harness enum, so
// the full install→verify pipeline must complete for them exactly as it does
// for the original four. Their engine dirs are .opencode / .cursor.
const OPENCODE_FIXTURE_ENTRIES: TarFixtureEntry[] = harnessFixtureEntries("opencode", ".opencode");
const CURSOR_FIXTURE_ENTRIES: TarFixtureEntry[] = harnessFixtureEntries("cursor", ".cursor");
const PI_FIXTURE_ENTRIES: TarFixtureEntry[] = [
  ...harnessFixtureEntries("pi", ".pi"),
  {
    type: "file",
    name: "dist/pi/.pi/tools/data/harness.json",
    content: Buffer.from('{"name":"pi"}\n'),
  },
];

function treeSnapshot(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();
  function walk(dir: string, prefix = ""): void {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      const rel = prefix === "" ? name : `${prefix}/${name}`;
      if (statSync(full).isDirectory()) walk(full, rel);
      else snapshot.set(rel, readFileSync(full).toString("base64"));
    }
  }
  walk(root);
  return snapshot;
}

function fakeHttp(archive: Buffer): Http {
  const checksums = buildReleaseAssetChecksums(archive, "v1.2.3");
  return {
    async getJson(path: string) {
      if (path === RELEASES_PATH) return Result.ok([{ tag_name: "v1.2.3", draft: false, prerelease: false }]);
      if (path === "/repos/amadeus-dlc/amadeus/git/ref/tags/v1.2.3") {
        return Result.ok({ ref: "refs/tags/v1.2.3", object: { type: "commit", sha: "0".repeat(40) } });
      }
      throw new Error(`unexpected path in fixture: ${path}`);
    },
    async downloadArchive(url) {
      return Result.ok(toReadableStream(releaseAssetFixtureBytes(url, archive, checksums, "v1.2.3")));
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

function transactionalPorts(archive: Buffer, privateRoot: string): CliPorts {
  return {
    ...realPorts(archive),
    transactionCoordinator: SetupTransactionCoordinator.create({ privateRoot: () => privateRoot }),
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

describe("install pipeline — opencode / cursor / pi harnesses", () => {
  test("installs opencode into .opencode and writes a manifest tagged opencode", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-opencode-"));
    try {
      const archive = buildCodeloadFixture("amadeus-1.2.3", OPENCODE_FIXTURE_ENTRIES);
      const exitCode = await main(["install", "--harness", "opencode", "--target", target, "--yes"], realPorts(archive));
      expect(exitCode).toBe(0);

      expect(existsSync(join(target, ".opencode", "agents", "amadeus-test-agent.md"))).toBe(true);
      expect(existsSync(join(target, ".opencode", "tools", "amadeus-runtime.ts"))).toBe(true);
      expect(existsSync(join(target, ".opencode", "rules", "amadeus.md"))).toBe(true);
      expect(existsSync(join(target, "amadeus", "spaces", "default", "memory", "org.md"))).toBe(true);

      const manifestPath = join(target, "amadeus", ".installer", "amadeus-setup-manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      expect(manifest.harness).toBe("opencode");
      expect(manifest.files.some((f: { path: string }) => f.path === ".opencode/tools/amadeus-runtime.ts")).toBe(true);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("installs cursor into .cursor and writes a manifest tagged cursor", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-cursor-"));
    try {
      const archive = buildCodeloadFixture("amadeus-1.2.3", CURSOR_FIXTURE_ENTRIES);
      const exitCode = await main(["install", "--harness", "cursor", "--target", target, "--yes"], realPorts(archive));
      expect(exitCode).toBe(0);

      expect(existsSync(join(target, ".cursor", "tools", "amadeus-runtime.ts"))).toBe(true);
      expect(existsSync(join(target, "amadeus", "spaces", "default", "memory", "org.md"))).toBe(true);

      const manifestPath = join(target, "amadeus", ".installer", "amadeus-setup-manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      expect(manifest.harness).toBe("cursor");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("installs pi into .pi without changing the target package metadata", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-pi-"));
    const packageJson = '{"name":"consumer","private":true}\n';
    try {
      writeFileSync(join(target, "package.json"), packageJson);
      const archive = buildCodeloadFixture("amadeus-1.2.3", PI_FIXTURE_ENTRIES);
      const exitCode = await main(["install", "--harness", "pi", "--target", target, "--yes"], realPorts(archive));
      expect(exitCode).toBe(0);

      expect(existsSync(join(target, ".pi", "tools", "amadeus-runtime.ts"))).toBe(true);
      expect(readFileSync(join(target, "package.json"), "utf8")).toBe(packageJson);
      const manifest = JSON.parse(readFileSync(join(target, "amadeus", ".installer", "amadeus-setup-manifest.json"), "utf8"));
      expect(manifest.harness).toBe("pi");
      expect(manifest.files.some((f: { path: string }) => f.path === "package.json")).toBe(false);
      expect(manifest.files.find((f: { path: string }) => f.path === ".pi/tools/data/harness.json")).toMatchObject({
        class: "owned",
        required: true,
      });
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("updates pi N to N+1 transactionally, retires unchanged owned resources, and makes same-version update a no-op", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-update-flow-pi-"));
    const privateRoot = `${target}-private`;
    const packageJson = '{"name":"consumer","private":true}\n';
    const oldResource = { type: "file", name: "dist/pi/.pi/tools/amadeus-retired.ts", content: Buffer.from("old\n") } as const;
    const newResource = { type: "file", name: "dist/pi/.pi/tools/amadeus-current.ts", content: Buffer.from("new\n") } as const;
    try {
      writeFileSync(join(target, "package.json"), packageJson);
      const installed = await main(
        ["install", "--harness", "pi", "--target", target, "--yes"],
        transactionalPorts(buildCodeloadFixture("amadeus-1.2.3", [...PI_FIXTURE_ENTRIES, oldResource]), privateRoot),
      );
      expect(installed).toBe(0);

      const manifestPath = join(target, "amadeus", ".installer", "amadeus-setup-manifest.json");
      const priorManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      priorManifest.distributionVersion = "1.2.2";
      priorManifest.sourceTag = "v1.2.2";
      writeFileSync(manifestPath, `${JSON.stringify(priorManifest, null, 2)}\n`);

      const nextArchive = buildCodeloadFixture("amadeus-1.2.3", [...PI_FIXTURE_ENTRIES, newResource]);
      const upgraded = await main(
        ["upgrade", "--harness", "pi", "--target", target, "--yes"],
        transactionalPorts(nextArchive, privateRoot),
      );
      expect(upgraded).toBe(0);
      expect(existsSync(join(target, ".pi", "tools", "amadeus-retired.ts"))).toBe(false);
      expect(readFileSync(join(target, ".pi", "tools", "amadeus-current.ts"), "utf8")).toBe("new\n");
      expect(readFileSync(join(target, "package.json"), "utf8")).toBe(packageJson);

      const beforeNoop = treeSnapshot(target);
      const noop = await main(
        ["upgrade", "--harness", "pi", "--target", target, "--version", "1.2.3", "--yes"],
        transactionalPorts(nextArchive, privateRoot),
      );
      expect(noop).toBe(0);
      expect(treeSnapshot(target)).toEqual(beforeNoop);
    } finally {
      rmSync(privateRoot, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("edge case: an unknown --harness value is a usage error (exit 2) listing all eight harnesses", async () => {
    const target = mkdtempSync(join(tmpdir(), "amadeus-setup-install-flow-badharness-"));
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    };
    try {
      const archive = buildCodeloadFixture("amadeus-1.2.3", CLAUDE_FIXTURE_ENTRIES);
      const exitCode = await main(["install", "--harness", "foo", "--target", target, "--yes"], realPorts(archive));
      expect(exitCode).toBe(2);
      const message = errors.join("\n");
      for (const name of ["claude", "codex", "kiro", "kiro-ide", "opencode", "cursor", "kimi", "pi"]) {
        expect(message).toContain(name);
      }
    } finally {
      console.error = originalError;
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
