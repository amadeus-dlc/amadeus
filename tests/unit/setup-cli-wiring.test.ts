// covers: cli:setup-cli-wiring
//
// main()'s dispatch and orchestration wiring (code-generation-plan.md Step
// 10), exercised against fake CliPorts so no real network/filesystem I/O
// happens here. Each fake port method throws unless overridden, so a test
// that reaches an unexpected port call fails loudly instead of silently
// doing real I/O.

import { describe, expect, test } from "bun:test";
import type { CliPorts } from "../../packages/setup/src/cli.ts";
import { main } from "../../packages/setup/src/cli.ts";
import type { Manifest } from "../../packages/setup/src/domain/manifest.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";

function unreachable(name: string): never {
  throw new Error(`unexpected call to ${name} in this test`);
}

function fakePorts(overrides: Partial<CliPorts> = {}): CliPorts {
  return {
    tty: {
      isTTY: false,
      select: () => unreachable("tty.select"),
      input: () => unreachable("tty.input"),
      confirm: () => unreachable("tty.confirm"),
    },
    manifestIo: {
      read: () => unreachable("manifestIo.read"),
      write: () => unreachable("manifestIo.write"),
    },
    http: {
      getJson: () => unreachable("http.getJson"),
      downloadArchive: () => unreachable("http.downloadArchive"),
    },
    createTmpWrite: () => unreachable("createTmpWrite"),
    applyWrite: {
      exists: () => unreachable("applyWrite.exists"),
      mkdir: () => unreachable("applyWrite.mkdir"),
      copyFile: () => unreachable("applyWrite.copyFile"),
      backup: () => unreachable("applyWrite.backup"),
    },
    verifyRead: {
      fileExists: () => unreachable("verifyRead.fileExists"),
      dirExists: () => unreachable("verifyRead.dirExists"),
    },
    ...overrides,
  };
}

describe("main — dispatch", () => {
  test("no arguments prints help and exits 0 without touching any port", async () => {
    const exitCode = await main([], fakePorts());
    expect(exitCode).toBe(0);
  });

  test("an unknown subcommand exits 2 without touching any port", async () => {
    const exitCode = await main(["frobnicate"], fakePorts());
    expect(exitCode).toBe(2);
  });

  test("upgrade is accepted syntactically but reports not-yet-implemented (exit 1)", async () => {
    const exitCode = await main(["upgrade", "--harness", "claude", "--target", "/tmp/x", "--yes"], fakePorts());
    expect(exitCode).toBe(1);
  });
});

describe("main — install, non-interactive (BR-I03)", () => {
  test("missing --harness/--target exits 2 before touching any port", async () => {
    const exitCode = await main(["install", "--yes"], fakePorts());
    expect(exitCode).toBe(2);
  });
});

describe("main — install, already-installed guard (BR-I07, REL-I02)", () => {
  test("a manifested target refuses before any network port is touched", async () => {
    const fakeManifest = { harness: "claude", sourceTag: "v1.0.0", installedAt: "2026-07-08T00:00:00.000Z" } as unknown as Manifest;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "ok", value: fakeManifest }),
        write: () => unreachable("manifestIo.write"),
      },
    });
    const exitCode = await main(["install", "--harness", "claude", "--target", "/tmp/x", "--yes"], ports);
    expect(exitCode).toBe(1);
  });

  test("edge case: the same target with --force proceeds past the guard (and only then touches the network)", async () => {
    const fakeManifest = { harness: "claude", sourceTag: "v1.0.0", installedAt: "2026-07-08T00:00:00.000Z" } as unknown as Manifest;
    let resolveVersionCalled = false;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "ok", value: fakeManifest }),
        write: () => unreachable("manifestIo.write"),
      },
      http: {
        getJson: async () => {
          resolveVersionCalled = true;
          return { type: "err", error: { type: "conn", detail: "stub network failure", status: null, isTransient: () => false, guidance: () => "n/a" } };
        },
        downloadArchive: () => unreachable("http.downloadArchive"),
      },
    });
    const exitCode = await main(["install", "--harness", "claude", "--target", "/tmp/x", "--yes", "--force"], ports);
    expect(resolveVersionCalled).toBe(true);
    expect(exitCode).toBe(1); // stubbed network failure, but proves the guard let it through
  });
});

describe("main — install, interactive wizard abort (BR-I18)", () => {
  test("rejecting the wizard's confirmation exits 1 without touching any network/write port", async () => {
    const ports = fakePorts({
      tty: {
        isTTY: true,
        select: async (_prompt, options) => options[0] as string,
        input: async (_prompt, defaultValue) => defaultValue,
        confirm: async () => false,
      },
    });
    const exitCode = await main(["install"], ports);
    expect(exitCode).toBe(1);
  });
});

describe("main — HarnessName sanity", () => {
  test("fixture setup: 'claude' is a recognized harness", () => {
    expect(HarnessName.all.some((h) => (h as string) === "claude")).toBe(true);
  });
});
