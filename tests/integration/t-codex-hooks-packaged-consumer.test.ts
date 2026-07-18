// covers: issue:#770 consumer setup/upgrade ownership boundary
//
// The live agmsg bridge acceptance is intentionally separate: starting an
// external Codex app-server would make this setup test non-hermetic. This test
// exercises the deterministic filesystem side of that boundary with the real
// setup pipeline and an agmsg-compatible hooks writer.

import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { codexHooksDoctorCheck } from "../../packages/framework/harness/codex/tools/amadeus-codex-hooks.ts";
import { main } from "../../packages/setup/src/cli.ts";
import type { CliPorts } from "../../packages/setup/src/cli.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { createApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite, createTmpWrite } from "../../packages/setup/src/ports/fsops.ts";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { createVerifyRead } from "../../packages/setup/src/ports/verify-read.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildCodeloadFixture } from "../lib/setup-codeload-fixture.ts";
import type { TarFixtureEntry } from "../lib/setup-tar-fixture.ts";

const ROOT = resolve(import.meta.dir, "../..");
const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases?per_page=100";
const TAGS_PATH = "/repos/amadeus-dlc/amadeus/tags?per_page=100";
const ACTIVE_RELATIVE_PATH = ".codex/hooks.json";
const EXAMPLE_RELATIVE_PATH = ".codex/hooks.json.example";
const CANONICAL_SOURCE = join(ROOT, EXAMPLE_RELATIVE_PATH);
const HELPER_SOURCE_DIR = join(
  ROOT,
  "packages/framework/harness/codex/tools",
);
const HELPER_FILES = [
  "amadeus-codex-hooks.ts",
  "amadeus-codex-hooks-contract.ts",
  "amadeus-codex-hooks-migration.ts",
];
const GITIGNORE_SOURCE = join(
  ROOT,
  "packages/framework/harness/codex/dot-gitignore",
);
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function fakeHttp(archive: Buffer, tag: string): Http {
  return {
    async getJson(path: string) {
      if (path === RELEASES_PATH) {
        return Result.ok([{ tag_name: tag, draft: false, prerelease: false }]);
      }
      if (path === `/repos/amadeus-dlc/amadeus/git/ref/tags/${tag}`) {
        return Result.ok({
          ref: `refs/tags/${tag}`,
          object: { sha: "0".repeat(40), type: "commit" },
        });
      }
      if (path === TAGS_PATH) return Result.ok([{ name: tag }]);
      throw new Error(`unexpected path in fixture: ${path}`);
    },
    async downloadArchive() {
      const stream = Readable.toWeb(
        Readable.from(archive),
      ) as unknown as ReadableStream<Uint8Array>;
      return Result.ok(stream);
    },
  };
}

function realPorts(archive: Buffer, tag: string): CliPorts {
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
  };
}

function v1Entries(): TarFixtureEntry[] {
  const canonical = readFileSync(CANONICAL_SOURCE);
  return [
    {
      type: "file",
      name: "dist/codex/.codex/hooks.json",
      content: canonical,
    },
    {
      type: "file",
      name: "dist/codex/.codex/hooks.json.example",
      content: canonical,
    },
    {
      type: "file",
      name: "dist/codex/.codex/tools/amadeus-runtime.ts",
      content: Buffer.from("export const runtime = 1;\n"),
    },
    {
      type: "file",
      name: "dist/codex/.gitignore",
      content: Buffer.from("node_modules/\n"),
    },
    {
      type: "file",
      name: "dist/codex/amadeus/spaces/default/memory/org.md",
      content: Buffer.from("# Consumer rules\n"),
    },
  ];
}

function v2Entries(): TarFixtureEntry[] {
  return [
    {
      type: "file",
      name: "dist/codex/.codex/hooks.json.example",
      content: readFileSync(CANONICAL_SOURCE),
    },
    ...HELPER_FILES.map(
      (file): TarFixtureEntry => ({
        type: "file",
        name: `dist/codex/.codex/tools/${file}`,
        content: readFileSync(join(HELPER_SOURCE_DIR, file)),
      }),
    ),
    {
      type: "file",
      name: "dist/codex/.codex/tools/amadeus-runtime.ts",
      content: Buffer.from("export const runtime = 2;\n"),
    },
    {
      type: "file",
      name: "dist/codex/.gitignore",
      content: readFileSync(GITIGNORE_SOURCE),
    },
    {
      type: "file",
      name: "dist/codex/amadeus/spaces/default/memory/org.md",
      content: Buffer.from("# Consumer rules\n"),
    },
  ];
}

function run(cwd: string, cmd: string[]) {
  return Bun.spawnSync({ cmd, cwd, stderr: "pipe", stdout: "pipe" });
}

function git(cwd: string, ...args: string[]): string {
  const result = run(cwd, ["git", ...args]);
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trim();
}

function gitRaw(cwd: string, ...args: string[]): string {
  const result = run(cwd, ["git", ...args]);
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trimEnd();
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function gitIndexPath(projectDir: string): string {
  const raw = git(projectDir, "rev-parse", "--git-path", "index");
  return isAbsolute(raw) ? raw : resolve(projectDir, raw);
}

function amadeusCommandCount(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + amadeusCommandCount(item), 0);
  }
  if (value === null || typeof value !== "object") return 0;
  const record = value as Record<string, unknown>;
  const own =
    typeof record.command === "string" &&
    record.command.includes(".codex/hooks/amadeus-codex-adapter.ts")
      ? 1
      : 0;
  return (
    own +
    Object.values(record).reduce<number>(
      (count, item) => count + amadeusCommandCount(item),
      0,
    )
  );
}

function applyAgmsgMonitorWriter(projectDir: string): void {
  const activePath = join(projectDir, ACTIVE_RELATIVE_PATH);
  const parsed = JSON.parse(readFileSync(activePath, "utf8")) as {
    hooks: Record<
      string,
      Array<{ hooks?: Array<{ command?: string; type?: string }> }>
    >;
  };
  for (const event of ["SessionStart", "SessionEnd", "Stop"]) {
    parsed.hooks[event] = (parsed.hooks[event] ?? []).filter(
      (group) =>
        !group.hooks?.some((hook) =>
          hook.command?.includes("/.agents/skills/agmsg/"),
        ),
    );
  }
  parsed.hooks.SessionStart.push({
    hooks: [
      {
        type: "command",
        command: `bash ${join(projectDir, ".agents/skills/agmsg/scripts/session-start.sh")}`,
      },
    ],
  });
  parsed.hooks.SessionEnd.push({
    hooks: [
      {
        type: "command",
        command: `bash ${join(projectDir, ".agents/skills/agmsg/scripts/session-end.sh")}`,
      },
    ],
  });
  writeFileSync(activePath, JSON.stringify(parsed));
}

function agmsgGroupCount(
  hooks: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>,
  event: string,
): number {
  return (hooks[event] ?? []).filter((group) =>
    group.hooks?.some((hook) =>
      hook.command?.includes("/.agents/skills/agmsg/"),
    ),
  ).length;
}

describe("Codex packaged consumer hooks ownership", () => {
  test("fresh setup activates local hooks and remains clean after repeated monitor-writer application", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "amadeus-codex-consumer-fresh-"));
    tempDirs.push(fixtureRoot);
    const consumer = join(fixtureRoot, "consumer");
    const activePath = join(consumer, ACTIVE_RELATIVE_PATH);
    const canonicalPath = join(consumer, EXAMPLE_RELATIVE_PATH);
    const archive = buildCodeloadFixture("amadeus-2.0.0", v2Entries());

    expect(
      await main(
        ["install", "--harness", "codex", "--target", consumer, "--yes"],
        realPorts(archive, "v2.0.0"),
      ),
    ).toBe(0);
    expect(existsSync(activePath)).toBe(false);
    expect(codexHooksDoctorCheck(consumer).reason).toBe("ACTIVE_MISSING");

    git(consumer, "init", "-q", "-b", "main");
    git(consumer, "config", "user.email", "consumer@example.com");
    git(consumer, "config", "user.name", "Packaged Consumer Test");
    git(consumer, "config", "core.autocrlf", "false");
    git(consumer, "add", ".");
    git(consumer, "commit", "-qm", "install fresh v2 consumer");
    const canonicalBefore = readFileSync(canonicalPath);

    const activated = run(consumer, [
      "bun",
      join(consumer, ".codex", "tools", "amadeus-codex-hooks.ts"),
      "activate",
      "--project-dir",
      consumer,
    ]);
    expect(activated.exitCode, activated.stderr.toString()).toBe(0);
    applyAgmsgMonitorWriter(consumer);
    applyAgmsgMonitorWriter(consumer);

    expect(gitRaw(consumer, "status", "--short")).toBe("");
    expect(readFileSync(canonicalPath)).toEqual(canonicalBefore);
    expect(run(consumer, ["git", "check-ignore", "-q", "--", ACTIVE_RELATIVE_PATH]).exitCode).toBe(0);
    expect(git(consumer, "ls-files", "--error-unmatch", EXAMPLE_RELATIVE_PATH)).toBe(
      EXAMPLE_RELATIVE_PATH,
    );
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
    };
    expect(amadeusCommandCount(active)).toBe(9);
    expect(agmsgGroupCount(active.hooks, "SessionStart")).toBe(1);
    expect(agmsgGroupCount(active.hooks, "SessionEnd")).toBe(1);
    expect(agmsgGroupCount(active.hooks, "Stop")).toBe(0);
    for (const tracked of git(consumer, "ls-files").split("\n").filter(Boolean)) {
      expect(readFileSync(join(consumer, tracked), "utf8")).not.toContain(consumer);
    }
    expect(codexHooksDoctorCheck(consumer).pass).toBe(true);
    const installedDoctor = run(consumer, [
      "bun",
      join(consumer, ".codex", "tools", "amadeus-codex-hooks.ts"),
      "doctor",
      "--json",
      "--project-dir",
      consumer,
    ]);
    expect(installedDoctor.exitCode, installedDoctor.stderr.toString()).toBe(0);
    const installedCheck = JSON.parse(installedDoctor.stdout.toString()) as {
      pass: boolean;
      reason: string;
    };
    expect(installedCheck).toMatchObject({ pass: true, reason: "OK" });
  });

  test("setup upgrade preserves writer-owned active hooks until the consumer untracks them", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "amadeus-codex-consumer-"));
    tempDirs.push(fixtureRoot);
    const consumer = join(fixtureRoot, "consumer");
    const activePath = join(consumer, ACTIVE_RELATIVE_PATH);
    const backupPath = join(fixtureRoot, "hooks.json.backup");

    const v1Archive = buildCodeloadFixture("amadeus-1.0.0", v1Entries());
    expect(
      await main(
        ["install", "--harness", "codex", "--target", consumer, "--yes"],
        realPorts(v1Archive, "v1.0.0"),
      ),
    ).toBe(0);

    git(consumer, "init", "-q", "-b", "main");
    git(consumer, "config", "user.email", "consumer@example.com");
    git(consumer, "config", "user.name", "Packaged Consumer Test");
    git(consumer, "config", "core.autocrlf", "false");
    git(consumer, "add", ".");
    git(consumer, "commit", "-qm", "install v1 consumer");
    expect(
      git(consumer, "ls-files", "--error-unmatch", ACTIVE_RELATIVE_PATH),
    ).toBe(ACTIVE_RELATIVE_PATH);

    applyAgmsgMonitorWriter(consumer);
    applyAgmsgMonitorWriter(consumer);
    expect(gitRaw(consumer, "status", "--short")).toBe(
      ` M ${ACTIVE_RELATIVE_PATH}`,
    );
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>;
    };
    expect(amadeusCommandCount(active)).toBe(9);
    expect(agmsgGroupCount(active.hooks, "SessionStart")).toBe(1);
    expect(agmsgGroupCount(active.hooks, "SessionEnd")).toBe(1);
    expect(agmsgGroupCount(active.hooks, "Stop")).toBe(0);

    copyFileSync(activePath, backupPath);
    const activeBefore = readFileSync(activePath);
    const activeShaBefore = sha256(activePath);
    expect(sha256(backupPath)).toBe(activeShaBefore);
    const indexPath = gitIndexPath(consumer);
    const indexBefore = readFileSync(indexPath);

    const nextEntries = v2Entries();
    expect(
      nextEntries.some(
        (entry) =>
          "name" in entry &&
          entry.name === "dist/codex/.codex/hooks.json",
      ),
    ).toBe(false);
    const v2Archive = buildCodeloadFixture("amadeus-2.0.0", nextEntries);
    expect(
      await main(
        ["upgrade", "--harness", "codex", "--target", consumer, "--yes"],
        realPorts(v2Archive, "v2.0.0"),
      ),
    ).toBe(0);

    // Read the index before any post-upgrade Git command can refresh it.
    expect(readFileSync(indexPath)).toEqual(indexBefore);
    expect(readFileSync(activePath)).toEqual(activeBefore);
    expect(sha256(activePath)).toBe(activeShaBefore);
    expect(
      git(consumer, "ls-files", "--error-unmatch", ACTIVE_RELATIVE_PATH),
    ).toBe(ACTIVE_RELATIVE_PATH);
    expect(readFileSync(join(consumer, EXAMPLE_RELATIVE_PATH))).toEqual(
      readFileSync(CANONICAL_SOURCE),
    );
    for (const file of HELPER_FILES) {
      expect(readFileSync(join(consumer, ".codex", "tools", file))).toEqual(
        readFileSync(join(HELPER_SOURCE_DIR, file)),
      );
    }
    expect(readFileSync(join(consumer, ".gitignore"))).toEqual(
      readFileSync(GITIGNORE_SOURCE),
    );

    git(consumer, "rm", "--cached", "--", ACTIVE_RELATIVE_PATH);
    git(consumer, "add", "-A");
    git(consumer, "commit", "-qm", "adopt local Codex hooks ownership");

    expect(existsSync(activePath)).toBe(true);
    expect(sha256(activePath)).toBe(activeShaBefore);
    expect(sha256(backupPath)).toBe(activeShaBefore);
    expect(
      run(consumer, [
        "git",
        "ls-files",
        "--error-unmatch",
        "--",
        ACTIVE_RELATIVE_PATH,
      ]).exitCode,
    ).not.toBe(0);
    expect(
      run(consumer, ["git", "check-ignore", "-q", "--", ACTIVE_RELATIVE_PATH])
        .exitCode,
    ).toBe(0);
    expect(
      git(consumer, "ls-files", "--error-unmatch", EXAMPLE_RELATIVE_PATH),
    ).toBe(EXAMPLE_RELATIVE_PATH);
    expect(git(consumer, "diff", "--name-only", "--diff-filter=U")).toBe("");
    expect(gitRaw(consumer, "status", "--short")).toBe("");
    expect(codexHooksDoctorCheck(consumer).pass).toBe(true);
  });
});
