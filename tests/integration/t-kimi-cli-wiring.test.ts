// t-kimi-cli-wiring: the cli.ts hook-wiring connection (FR-5a) — install and
// upgrade with --harness kimi end by running Bolt 3's runHooksMerge against
// the user-level KimiHome config, with the BR-I11 non-interactive stance
// (show the report, abort with the manual procedure; --yes is NOT consent).
//
// Mechanism mirrors setup-install-flow.test.ts: a codeload tar fixture is
// served by a fake Http into the REAL fetch/extract/apply/verify pipeline
// (mkdtemp target), while KimiHome is redirected to another mkdtemp via
// KIMI_CODE_HOME — the user's real ~/.kimi-code is never touched. The snippet
// fixture is the REAL shipped master, so a master/wiring drift fails here.
//
// covers: file:packages/setup/src/cli.ts

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { main, type CliPorts } from "../../packages/setup/src/cli.ts";
import { MANAGED_BLOCK_BEGIN, MANAGED_BLOCK_END } from "../../packages/setup/src/domain/kimi-hooks.ts";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import type { TtyIO } from "../../packages/setup/src/ports/tty.ts";
import { createApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite, createTmpWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createVerifyRead } from "../../packages/setup/src/ports/verify-read.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildCodeloadFixture } from "../lib/setup-codeload-fixture.ts";
import type { TarFixtureEntry } from "../lib/setup-tar-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SNIPPET_MASTER = join(HERE, "..", "..", "packages", "framework", "harness", "kimi", "hooks", "amadeus-hooks.snippet.toml");
const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases?per_page=100";
const TAGS_PATH = "/repos/amadeus-dlc/amadeus/tags?per_page=100";
const MANIFEST_RELATIVE_PATH = join("amadeus", ".installer", "amadeus-setup-manifest.json");

function kimiFixtureEntries(orgContent: string): TarFixtureEntry[] {
  return [
    { type: "file", name: "dist/kimi/.kimi-code/tools/amadeus-runtime.ts", content: Buffer.from("export const runtime = 1;\n") },
    { type: "file", name: "dist/kimi/.kimi-code/hooks/amadeus-hooks.snippet.toml", content: readFileSync(SNIPPET_MASTER) },
    { type: "file", name: "dist/kimi/amadeus/spaces/default/memory/org.md", content: Buffer.from(orgContent) },
  ];
}

function fakeHttp(archive: Buffer, tag: string): Http {
  return {
    async getJson(path: string) {
      if (path === RELEASES_PATH) return Result.ok([{ tag_name: tag, draft: false, prerelease: false }]);
      if (path === `/repos/amadeus-dlc/amadeus/git/ref/tags/${tag}`)
        return Result.ok({ ref: `refs/tags/${tag}`, object: { sha: "0".repeat(40), type: "commit" } });
      if (path === TAGS_PATH) return Result.ok([{ name: tag }]);
      throw new Error(`unexpected path in fixture: ${path}`);
    },
    async downloadArchive() {
      const stream = Readable.toWeb(Readable.from(archive)) as unknown as ReadableStream<Uint8Array>;
      return Result.ok(stream);
    },
  };
}

function nonInteractiveTty(): TtyIO {
  return {
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
  };
}

// Interactive tty with a scripted confirm answer. install with all flags given
// and a fresh target never runs the wizard or the conflict confirm, so the
// only confirm this can serve is the hook-wiring one.
function interactiveTty(answer: boolean, prompts: string[]): TtyIO {
  return {
    isTTY: true,
    select: () => {
      throw new Error("no wizard select expected in this test");
    },
    input: () => {
      throw new Error("no wizard input expected in this test");
    },
    confirm: async (prompt: string) => {
      prompts.push(prompt);
      return answer;
    },
  };
}

function realPorts(archive: Buffer, tag: string, tty: TtyIO, out: (message: string) => void): CliPorts {
  return {
    tty,
    manifestIo: createManifestIo(createFsRead(), createFsWrite()),
    http: fakeHttp(archive, tag),
    createTmpWrite,
    applyWrite: createApplyWrite(),
    verifyRead: createVerifyRead(),
    kimiHooks: {
      tty,
      fsRead: createFsRead(),
      fsWrite: createFsWrite(),
      applyWrite: createApplyWrite(),
      out,
    },
  };
}

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length > 0) (cleanups.pop() as () => void)();
});

function mkTemp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Points KimiHome at a mkdtemp for the duration of one test (the real
// ~/.kimi-code is never read or written).
function useFakeKimiHome(): string {
  const home = mkTemp("amadeus-t-kimi-cli-home-");
  const saved = process.env.KIMI_CODE_HOME;
  process.env.KIMI_CODE_HOME = home;
  cleanups.push(() => {
    if (saved === undefined) delete process.env.KIMI_CODE_HOME;
    else process.env.KIMI_CODE_HOME = saved;
  });
  return home;
}

function captureConsole(): { logs: string[]; errors: string[] } {
  const captured = { logs: [] as string[], errors: [] as string[] };
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args: unknown[]) => {
    captured.logs.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    captured.errors.push(args.map(String).join(" "));
  };
  cleanups.push(() => {
    console.log = origLog;
    console.error = origError;
  });
  return captured;
}

function backupFiles(home: string): string[] {
  return readdirSync(home).filter((name) => name.includes("amadeus-backup"));
}

describe("install --harness kimi — hook wiring (FR-5a)", () => {
  test("non-interactive aborts after the report with the manual procedure, config untouched (BR-I11; --yes is not consent)", async () => {
    const target = mkTemp("amadeus-t-kimi-cli-target-");
    const home = useFakeKimiHome();
    const out: string[] = [];
    const console_ = captureConsole();
    const archive = buildCodeloadFixture("amadeus-1.2.3", kimiFixtureEntries("# org rules v1\n"));
    const exitCode = await main(
      ["install", "--harness", "kimi", "--target", target, "--yes"],
      realPorts(archive, "v1.2.3", nonInteractiveTty(), (m) => out.push(m)),
    );

    expect(exitCode).toBe(1);
    // The project files were installed; only the config wiring was refused.
    expect(existsSync(join(target, ".kimi-code", "tools", "amadeus-runtime.ts"))).toBe(true);
    expect(existsSync(join(home, "config.toml"))).toBe(false);
    expect(backupFiles(home)).toEqual([]);
    const report = out.join("\n");
    expect(report).toContain("add the amadeus managed block");
    expect(report).toContain("needs interactive approval (re-run without --yes)");
    expect(report).toContain("To wire the hooks manually");
    // The manual procedure points at the installed snippet copy (the payload
    // tmp tree is gone by the time the user reads it).
    expect(report).toContain(join(target, ".kimi-code", "hooks", "amadeus-hooks.snippet.toml"));
    // A partially wired kimi setup is never reported as success.
    expect(console_.logs.join("\n")).not.toContain("Install complete.");
  });

  test("interactive approval writes the managed block into a fresh config and exits 0", async () => {
    const target = mkTemp("amadeus-t-kimi-cli-target-");
    const home = useFakeKimiHome();
    const out: string[] = [];
    const prompts: string[] = [];
    const console_ = captureConsole();
    const archive = buildCodeloadFixture("amadeus-1.2.3", kimiFixtureEntries("# org rules v1\n"));
    const exitCode = await main(
      ["install", "--harness", "kimi", "--target", target],
      realPorts(archive, "v1.2.3", interactiveTty(true, prompts), (m) => out.push(m)),
    );

    expect(exitCode).toBe(0);
    expect(prompts).toHaveLength(1); // the hook-wiring confirm is the only prompt
    const config = readFileSync(join(home, "config.toml"), "utf8");
    expect(config).toContain(MANAGED_BLOCK_BEGIN);
    expect(config).toContain(MANAGED_BLOCK_END);
    expect(config).toContain("amadeus-kimi-adapter.ts");
    expect(backupFiles(home)).toEqual([]); // no pre-existing config → no backup
    expect(out.join("\n")).toContain("managed block added to");
    expect(console_.logs.join("\n")).toContain("Install complete.");
  });

  test("interactive refusal leaves the config absent and exits 1 with the manual procedure", async () => {
    const target = mkTemp("amadeus-t-kimi-cli-target-");
    const home = useFakeKimiHome();
    const out: string[] = [];
    const console_ = captureConsole();
    const archive = buildCodeloadFixture("amadeus-1.2.3", kimiFixtureEntries("# org rules v1\n"));
    const exitCode = await main(
      ["install", "--harness", "kimi", "--target", target],
      realPorts(archive, "v1.2.3", interactiveTty(false, []), (m) => out.push(m)),
    );

    expect(exitCode).toBe(1);
    expect(existsSync(join(home, "config.toml"))).toBe(false);
    const report = out.join("\n");
    expect(report).toContain("No changes were made");
    expect(report).toContain("To wire the hooks manually");
    expect(console_.logs.join("\n")).not.toContain("Install complete.");
  });

  test("re-run against an already wired config is a noop exit 0, even non-interactive (idempotence)", async () => {
    const home = useFakeKimiHome();
    const console_ = captureConsole();
    // First install: interactive approval wires the config.
    const firstTarget = mkTemp("amadeus-t-kimi-cli-target-");
    const firstArchive = buildCodeloadFixture("amadeus-1.2.3", kimiFixtureEntries("# org rules v1\n"));
    expect(
      await main(
        ["install", "--harness", "kimi", "--target", firstTarget],
        realPorts(firstArchive, "v1.2.3", interactiveTty(true, []), () => {}),
      ),
    ).toBe(0);
    const wiredConfig = readFileSync(join(home, "config.toml"), "utf8");

    // Second install (different target, --yes): the noop path never consults
    // the non-interactive refusal, so a wired config stays a success.
    const secondTarget = mkTemp("amadeus-t-kimi-cli-target-");
    const out: string[] = [];
    const secondArchive = buildCodeloadFixture("amadeus-1.2.3", kimiFixtureEntries("# org rules v1\n"));
    const exitCode = await main(
      ["install", "--harness", "kimi", "--target", secondTarget, "--yes"],
      realPorts(secondArchive, "v1.2.3", nonInteractiveTty(), (m) => out.push(m)),
    );

    expect(exitCode).toBe(0);
    expect(out.join("\n")).toContain("already up to date");
    expect(readFileSync(join(home, "config.toml"), "utf8")).toBe(wiredConfig);
    expect(backupFiles(home)).toEqual([]);
    expect(console_.logs.join("\n")).toContain("Install complete.");
  });
});

describe("upgrade --harness kimi — hook wiring (FR-5a)", () => {
  test("upgrade reaches the same wiring step after apply (non-interactive aborts with the report)", async () => {
    const target = mkTemp("amadeus-t-kimi-cli-target-");
    const home = useFakeKimiHome();
    captureConsole();
    // v1 install: non-interactive, so the wiring aborts — but the manifest is
    // written before the wiring step, so the upgrade below detects v1.
    const v1Archive = buildCodeloadFixture("amadeus-1.0.0", kimiFixtureEntries("# org rules v1\n"));
    expect(
      await main(
        ["install", "--harness", "kimi", "--target", target, "--yes"],
        realPorts(v1Archive, "v1.0.0", nonInteractiveTty(), () => {}),
      ),
    ).toBe(1);
    const manifest = JSON.parse(readFileSync(join(target, MANIFEST_RELATIVE_PATH), "utf8"));
    expect(manifest.harness).toBe("kimi");

    const out: string[] = [];
    const v2Archive = buildCodeloadFixture("amadeus-1.1.0", [
      { type: "file", name: "dist/kimi/.kimi-code/tools/amadeus-runtime.ts", content: Buffer.from("export const runtime = 2;\n") },
      { type: "file", name: "dist/kimi/.kimi-code/hooks/amadeus-hooks.snippet.toml", content: readFileSync(SNIPPET_MASTER) },
      { type: "file", name: "dist/kimi/amadeus/spaces/default/memory/org.md", content: Buffer.from("# org rules v2\n") },
    ]);
    const exitCode = await main(
      ["upgrade", "--harness", "kimi", "--target", target, "--yes"],
      realPorts(v2Archive, "v1.1.0", nonInteractiveTty(), (m) => out.push(m)),
    );

    expect(exitCode).toBe(1);
    // Apply happened (the owned v2 file landed; user-preserved memory/ is
    // never touched by upgrade — FR-008); only the config wiring was refused.
    expect(readFileSync(join(target, ".kimi-code", "tools", "amadeus-runtime.ts"), "utf8")).toBe("export const runtime = 2;\n");
    expect(existsSync(join(home, "config.toml"))).toBe(false);
    const report = out.join("\n");
    expect(report).toContain("add the amadeus managed block");
    expect(report).toContain("To wire the hooks manually");
  });
});
