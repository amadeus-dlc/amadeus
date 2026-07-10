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
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { createTmpWrite } from "../../packages/setup/src/ports/fsops.ts";

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

});

function semverOf(raw: string): SemVer {
  const result = SemVer.parse(raw);
  if (result.type === "err") throw new Error("fixture setup: invalid semver");
  return result.value;
}

const NONEXISTENT_TARGET = "/tmp/amadeus-setup-cli-wiring-does-not-exist-2af0c1";

describe("main — upgrade, dispatch (U3)", () => {
  test("missing --harness/--target exits 2 before touching any port", async () => {
    const exitCode = await main(["upgrade", "--yes"], fakePorts());
    expect(exitCode).toBe(2);
  });

  test("no recognizable installation refuses before any network port is touched (BR-U06, REL-U02)", async () => {
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "ok", value: null }),
        write: () => unreachable("manifestIo.write"),
      },
    });
    const exitCode = await main(["upgrade", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--yes"], ports);
    expect(exitCode).toBe(1);
  });

  test("edge case: rejecting the wizard's confirmation exits 1 without touching any network/write port", async () => {
    const ports = fakePorts({
      tty: {
        isTTY: true,
        select: async (_prompt, options) => options[0] as string,
        input: async (_prompt, defaultValue) => defaultValue,
        confirm: async () => false,
      },
    });
    const exitCode = await main(["upgrade"], ports);
    expect(exitCode).toBe(1);
  });
});

describe("main — upgrade, already-up-to-date (BR-U01)", () => {
  test("installed version equal to the resolved version exits 0 without touching apply/write ports", async () => {
    const fakeManifest = {
      harness: "claude",
      sourceTag: "v1.0.0",
      installedAt: "2026-07-08T00:00:00.000Z",
      distributionVersion: semverOf("1.0.0"),
      requiredPaths: () => [], // FR-656-2: no required files to check against disk in this dispatch-only fixture
    } as unknown as Manifest;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "ok", value: fakeManifest }),
        write: () => unreachable("manifestIo.write"),
      },
      http: {
        getJson: async () => ({ type: "ok", value: [{ tag_name: "v1.0.0", draft: false, prerelease: false }] }),
        downloadArchive: () => unreachable("http.downloadArchive"),
      },
    });
    const exitCode = await main(["upgrade", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--yes"], ports);
    expect(exitCode).toBe(0);
  });
});

describe("main — upgrade, version boundary refusals are no-ops (BR-U02/U03, REL-U02)", () => {
  test("a requested version older than installed refuses without touching apply/write ports", async () => {
    const fakeManifest = {
      harness: "claude",
      sourceTag: "v2.0.0",
      installedAt: "2026-07-08T00:00:00.000Z",
      distributionVersion: semverOf("2.0.0"),
      requiredPaths: () => [], // FR-656-2: no required files to check against disk in this dispatch-only fixture
    } as unknown as Manifest;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "ok", value: fakeManifest }),
        write: () => unreachable("manifestIo.write"),
      },
      http: {
        // --version is an "exact" VersionSpec, which resolves via the tags
        // endpoint's "name" field (not the releases endpoint's "tag_name").
        getJson: async () => ({ type: "ok", value: [{ name: "v1.0.0", tag_name: "v1.0.0", draft: false, prerelease: false }] }),
        downloadArchive: () => unreachable("http.downloadArchive"),
      },
    });
    const exitCode = await main(
      ["upgrade", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--version", "1.0.0", "--yes"],
      ports,
    );
    expect(exitCode).toBe(1);
  });

  test("edge case: an installed version newer than the default-resolved latest refuses the same way", async () => {
    const fakeManifest = {
      harness: "claude",
      sourceTag: "v2.0.0",
      installedAt: "2026-07-08T00:00:00.000Z",
      distributionVersion: semverOf("2.0.0"),
      requiredPaths: () => [], // FR-656-2: no required files to check against disk in this dispatch-only fixture
    } as unknown as Manifest;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "ok", value: fakeManifest }),
        write: () => unreachable("manifestIo.write"),
      },
      http: {
        getJson: async () => ({ type: "ok", value: [{ tag_name: "v1.5.0", draft: false, prerelease: false }] }),
        downloadArchive: () => unreachable("http.downloadArchive"),
      },
    });
    const exitCode = await main(["upgrade", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--yes"], ports);
    expect(exitCode).toBe(1);
  });
});

describe("main — upgrade, proceed reaches fetch (BR-U04, reachability order)", () => {
  test("a newer resolved version proceeds past the boundary check and only then touches the archive fetch", async () => {
    const fakeManifest = {
      harness: "claude",
      sourceTag: "v1.0.0",
      installedAt: "2026-07-08T00:00:00.000Z",
      distributionVersion: semverOf("1.0.0"),
      requiredPaths: () => [], // FR-656-2: no required files to check against disk in this dispatch-only fixture
    } as unknown as Manifest;
    let downloadArchiveCalled = false;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "ok", value: fakeManifest }),
        write: () => unreachable("manifestIo.write"),
      },
      http: {
        getJson: async () => ({ type: "ok", value: [{ tag_name: "v1.1.0", draft: false, prerelease: false }] }),
        downloadArchive: async () => {
          downloadArchiveCalled = true;
          return { type: "err", error: { type: "conn", detail: "stub network failure", status: null, isTransient: () => false, guidance: () => "n/a" } };
        },
      },
      createTmpWrite, // real: the boundary check must pass before a tmp dir is even needed
    });
    const exitCode = await main(["upgrade", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--yes"], ports);
    expect(downloadArchiveCalled).toBe(true);
    expect(exitCode).toBe(1); // stubbed fetch failure, but proves the boundary check let it through
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
    // FR-656-2: no required files to check against disk in this dispatch-only fixture.
    const fakeManifest = {
      harness: "claude",
      sourceTag: "v1.0.0",
      installedAt: "2026-07-08T00:00:00.000Z",
      requiredPaths: () => [],
    } as unknown as Manifest;
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
    // FR-656-2: no required files to check against disk in this dispatch-only fixture.
    const fakeManifest = {
      harness: "claude",
      sourceTag: "v1.0.0",
      installedAt: "2026-07-08T00:00:00.000Z",
      requiredPaths: () => [],
    } as unknown as Manifest;
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

describe("main — corrupt manifest is surfaced loudly, never treated as fresh (FR-742)", () => {
  test("install exits 1 without touching the network when the manifest is present but unreadable", async () => {
    let getJsonCalled = false;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "err", error: { type: "malformed", detail: "manifest is not valid JSON: SyntaxError" } }),
        write: () => unreachable("manifestIo.write"),
      },
      http: {
        getJson: async () => {
          getJsonCalled = true;
          return unreachable("http.getJson");
        },
        downloadArchive: () => unreachable("http.downloadArchive"),
      },
    });
    const exitCode = await main(["install", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--yes"], ports);
    expect(exitCode).toBe(1); // pre-fix: detect() reported 'none' and admitted the install, reaching the network
    expect(getJsonCalled).toBe(false);
  });

  test("upgrade exits 1 without touching the network when the manifest is present but unreadable", async () => {
    let getJsonCalled = false;
    const ports = fakePorts({
      manifestIo: {
        read: async () => ({ type: "err", error: { type: "malformed", detail: "manifest is not valid JSON: SyntaxError" } }),
        write: () => unreachable("manifestIo.write"),
      },
      http: {
        getJson: async () => {
          getJsonCalled = true;
          return unreachable("http.getJson");
        },
        downloadArchive: () => unreachable("http.downloadArchive"),
      },
    });
    const exitCode = await main(["upgrade", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--yes"], ports);
    expect(exitCode).toBe(1);
    expect(getJsonCalled).toBe(false);
  });

  test("install --force proceeds past the corrupt manifest onto the fresh-target path (E-B3b Q2=a)", async () => {
    // The corrupt-manifest guidance promises `install --force` reinstalls over
    // the unreadable manifest. Pre-fix, runInstall returned 1 at detect()
    // before ever consulting `parsed.force`, so the advertised recovery path
    // was a dead end (getJsonCalled stayed false, same error re-shown).
    let getJsonCalled = false;
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.join(" "));
    };
    try {
      const ports = fakePorts({
        manifestIo: {
          read: async () => ({ type: "err", error: { type: "malformed", detail: "manifest is not valid JSON: SyntaxError" } }),
          write: () => unreachable("manifestIo.write"),
        },
        http: {
          getJson: async () => {
            getJsonCalled = true;
            return { type: "err", error: { type: "conn", detail: "stub network failure", status: null, isTransient: () => false, guidance: () => "n/a" } };
          },
          downloadArchive: () => unreachable("http.downloadArchive"),
        },
      });
      const exitCode = await main(
        ["install", "--harness", "claude", "--target", NONEXISTENT_TARGET, "--yes", "--force"],
        ports,
      );
      // The stubbed network still fails, so the install exits 1 — but it got
      // PAST detect: the network was consulted and the override warning (not
      // the dead-end guidance) was printed.
      expect(exitCode).toBe(1);
      expect(getJsonCalled).toBe(true);
      const stderr = errors.join("\n");
      expect(stderr).toContain("--force: continuing anyway");
      expect(stderr).not.toContain("Re-run `amadeus-setup install --force`");
    } finally {
      console.error = origError;
    }
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
