// size: medium
// covers: hook:amadeus-dispatch, FR-3.2, BR-U4-1..7, ADR-A5

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  DISPATCH_TEST_SEAMS,
  HOOK_PATHS,
  main,
} from "../../packages/framework/harness/claude/hooks/amadeus-dispatch.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const DISPATCHER_SOURCE = join(
  REPO_ROOT,
  "packages",
  "framework",
  "harness",
  "claude",
  "hooks",
  "amadeus-dispatch.ts",
);
const ROOT_DISPATCHER = join(REPO_ROOT, ".claude", "hooks", "amadeus-dispatch.ts");
const SETTINGS_FILES = [
  join(REPO_ROOT, ".claude", "settings.json"),
  join(REPO_ROOT, ".claude", "settings.local.json.example"),
] as const;

// Derived from the dispatcher's own table rather than restated here: a new slot
// used to require editing this list, the reference count below, and the fixture
// writer in lockstep, and #2297 showed what happens when that lockstep slips.
const KNOWN_SLUGS = Object.keys(HOOK_PATHS) as (keyof typeof HOOK_PATHS)[];

// Settings reference the table more often than the table has slugs, because one
// slug is deliberately wired at two events: mint-presence fires on
// UserPromptSubmit AND on PostToolUse{AskUserQuestion}. That surplus is NOT
// derivable from HOOK_PATHS — it is a property of the settings wiring — so it is
// pinned here as a named constant and cross-checked against the mint-presence
// assertion below.
//
// MAINTENANCE: if a SECOND slug ever gains a second wiring point, this constant
// must be raised by hand. The slug table follows the dispatcher automatically;
// the duplicate count does not.
const DUPLICATE_SLUG_REFERENCES = 1;
const EXPECTED_HOOK_REFERENCES = KNOWN_SLUGS.length + DUPLICATE_SLUG_REFERENCES;

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temporaryProject(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-hook-dispatcher-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, ".claude", "hooks"), { recursive: true });
  return root;
}

function hookPath(root: string, slug: string): string {
  return join(root, ".claude", "hooks", `amadeus-${slug}.ts`);
}

function writeHook(root: string, slug: string, source = "process.exit(0);\n"): void {
  writeFileSync(hookPath(root, slug), source);
}

// Materialize EVERY path the dispatcher's completeness check looks for, taken
// from HOOK_PATHS itself — a slot added to the dispatcher is present in the
// fixture by construction, so ensureCompleteHookTree cannot fail here for a
// reason the test never meant to exercise.
function writeCompleteHookTree(root: string): void {
  for (const relativePath of Object.values(HOOK_PATHS)) {
    writeFileSync(join(root, relativePath), "process.exit(0);\n");
  }
}

function runDispatcher(
  root: string,
  slug: string,
  options: { args?: string[]; input?: string; cwd?: string; dispatcher?: string; withProjectDir?: boolean } = {},
) {
  const env = { ...process.env };
  if (options.withProjectDir === false) delete env.CLAUDE_PROJECT_DIR;
  else env.CLAUDE_PROJECT_DIR = root;
  return Bun.spawnSync({
    cmd: [process.execPath, options.dispatcher ?? DISPATCHER_SOURCE, slug, ...(options.args ?? [])],
    cwd: options.cwd,
    env,
    stdin: options.input === undefined ? undefined : Buffer.from(options.input),
    stdout: "pipe",
    stderr: "pipe",
  });
}

function text(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8");
}

function collectCommands(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectCommands);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [
    ...(typeof record.command === "string" ? [record.command] : []),
    ...Object.entries(record)
      .filter(([key]) => key !== "command" && key !== "statusLine")
      .flatMap(([, child]) => collectCommands(child)),
  ];
}

describe("Claude hook dispatcher", () => {
  test("routing and pipe branches are exercised in-process for coverage", async () => {
    const marked = temporaryProject();
    mkdirSync(join(marked, "amadeus"));
    writeFileSync(join(marked, ".claude", "hooks", "amadeus-dispatch.ts"), "// fixture\n");

    expect(DISPATCH_TEST_SEAMS.payloadCwd(JSON.stringify({ cwd: marked }))).toBe(marked);
    expect(DISPATCH_TEST_SEAMS.payloadCwd(JSON.stringify({ cwd: 1 }))).toBeUndefined();
    expect(DISPATCH_TEST_SEAMS.payloadCwd("not-json")).toBeUndefined();
    expect(DISPATCH_TEST_SEAMS.findPayloadProjectRoot(undefined)).toBeUndefined();
    expect(DISPATCH_TEST_SEAMS.findPayloadProjectRoot("relative")).toBeUndefined();
    expect(DISPATCH_TEST_SEAMS.findPayloadProjectRoot(join(marked, "missing"))).toBeUndefined();
    const markedRealpath = realpathSync(marked);
    expect(DISPATCH_TEST_SEAMS.findPayloadProjectRoot(marked)).toBe(markedRealpath);

    const missingMarker = temporaryProject();
    expect(DISPATCH_TEST_SEAMS.findPayloadProjectRoot(missingMarker)).toBeUndefined();
    const missingDispatcher = temporaryProject();
    mkdirSync(join(missingDispatcher, "amadeus"));
    expect(DISPATCH_TEST_SEAMS.findPayloadProjectRoot(missingDispatcher)).toBeUndefined();
    expect(
      DISPATCH_TEST_SEAMS.resolveProjectRoot(
        import.meta.dir,
        missingMarker,
        JSON.stringify({ cwd: marked }),
      ),
    ).toBe(markedRealpath);

    const written: string[] = [];
    await DISPATCH_TEST_SEAMS.writeHookInput(
      {
        write(input) {
          written.push(input);
        },
        end() {},
      },
      "payload",
    );
    expect(written).toEqual(["payload"]);
    await DISPATCH_TEST_SEAMS.writeHookInput(
      {
        write() {
          throw { code: "EPIPE" };
        },
        end() {
          throw new Error("unreachable");
        },
      },
      "ignored",
    );
    expect(DISPATCH_TEST_SEAMS.isBrokenPipe({ code: "EPIPE" })).toBe(true);
    expect(DISPATCH_TEST_SEAMS.isBrokenPipe(new Error("not a pipe"))).toBe(false);
    await expect(
      DISPATCH_TEST_SEAMS.writeHookInput(
        {
          write() {
            throw new Error("write failed");
          },
          end() {},
        },
        "rejected",
      ),
    ).rejects.toThrow("write failed");

    const directHook = join(marked, "direct-hook.ts");
    writeFileSync(directHook, "await Bun.stdin.text(); process.exit(23);\n");
    expect(await DISPATCH_TEST_SEAMS.forwardToHook(directHook, [], "direct payload")).toBe(23);

    writeCompleteHookTree(marked);
    expect(await main(["stop"], marked, "")).toBe(0);
  });

  test("settings route every hook reference through the dispatcher's slug table", () => {
    const commands = SETTINGS_FILES.flatMap((path) =>
      collectCommands(JSON.parse(readFileSync(path, "utf8"))),
    ).filter((command) => command.includes("/.claude/hooks/"));

    expect(commands).toHaveLength(EXPECTED_HOOK_REFERENCES);
    expect(commands.every((command) => command.includes("amadeus-dispatch.ts"))).toBe(true);
    // The one slug wired twice — this pins WHERE the surplus in
    // EXPECTED_HOOK_REFERENCES comes from, so the count and its cause cannot
    // drift apart silently.
    expect(commands.filter((command) => command.endsWith(" mint-presence"))).toHaveLength(
      1 + DUPLICATE_SLUG_REFERENCES,
    );
    expect(
      [...new Set(commands.map((command) => command.match(/amadeus-dispatch\.ts"? ([a-z-]+)$/)?.[1]))]
        .filter((slug): slug is string => slug !== undefined)
        .sort(),
    ).toEqual([...KNOWN_SLUGS].sort());
  });

  test("every known slug delegates when the generated hook tree is complete", () => {
    const root = temporaryProject();
    writeCompleteHookTree(root);

    for (const slug of KNOWN_SLUGS) {
      const result = runDispatcher(root, slug);
      expect(result.exitCode, slug).toBe(0);
      expect(text(result.stderr), slug).toBe("");
    }
  });

  test("unknown slugs fail loudly without interpreting path-like input", () => {
    const root = temporaryProject();
    writeCompleteHookTree(root);
    const result = runDispatcher(root, "../stop");

    expect(result.exitCode).toBe(1);
    expect(text(result.stderr)).toContain('unknown hook slug "../stop"');
    expect(text(result.stderr)).toContain(KNOWN_SLUGS.join(", "));
  });

  test("a wholly absent generated hook tree is a fresh-clone no-op with build guidance", () => {
    const root = temporaryProject();
    const result = runDispatcher(root, "stop");

    expect(result.exitCode).toBe(0);
    expect(text(result.stderr)).toBe(
      "amadeus-dispatch: hooks are not built yet (fresh clone?) — run `bun run build` to generate them\n",
    );
  });

  test("a partially generated hook tree fails integrity checking instead of silently no-oping", () => {
    const root = temporaryProject();
    writeHook(root, "stop", 'process.stderr.write("SHOULD_NOT_RUN\\n"); process.exit(0);\n');
    const result = runDispatcher(root, "stop");

    expect(result.exitCode).toBe(1);
    expect(text(result.stderr)).toContain("hook tree is incomplete");
    expect(text(result.stderr)).toContain("missing:");
    expect(text(result.stderr)).not.toContain("SHOULD_NOT_RUN");
  });

  test("child argv, stdin, stdout, stderr, and non-zero exit code pass through unchanged", () => {
    const root = temporaryProject();
    writeCompleteHookTree(root);
    writeHook(
      root,
      "stop",
      `const input = await Bun.stdin.text();
process.stdout.write(JSON.stringify({ args: process.argv.slice(2), input }));
process.stderr.write("child-stderr\\n");
process.exit(23);
`,
    );
    const result = runDispatcher(root, "stop", { args: ["alpha", "two words"], input: "payload\n" });

    expect(result.exitCode).toBe(23);
    expect(text(result.stdout)).toBe(
      JSON.stringify({ args: ["alpha", "two words"], input: "payload\n" }),
    );
    expect(text(result.stderr)).toBe("child-stderr\n");
  });

  test("hook payload cwd routes stale CLAUDE_PROJECT_DIR dispatch into the active worktree", () => {
    const main = temporaryProject();
    const worktree = temporaryProject();
    mkdirSync(join(main, "amadeus"));
    mkdirSync(join(worktree, "amadeus"));
    writeFileSync(join(worktree, ".claude", "hooks", "amadeus-dispatch.ts"), "// fixture\n");
    writeCompleteHookTree(main);
    writeCompleteHookTree(worktree);
    writeHook(main, "stop", 'process.stdout.write("MAIN\\n");\n');
    writeHook(
      worktree,
      "stop",
      'const input = await Bun.stdin.text(); process.stdout.write("WORKTREE\\n" + input);\n',
    );
    const input = ` \n${JSON.stringify({ cwd: worktree })}\n\t`;

    const result = runDispatcher(main, "stop", {
      cwd: worktree,
      input,
    });

    expect(result.exitCode).toBe(0);
    expect(text(result.stdout)).toBe(`WORKTREE\n${input}`);
    expect(text(result.stderr)).toBe("");
  });

  test("a payload cwd below the worktree root falls back to CLAUDE_PROJECT_DIR", () => {
    const main = temporaryProject();
    const worktree = temporaryProject();
    const child = join(worktree, "packages", "nested");
    mkdirSync(join(main, "amadeus"));
    mkdirSync(join(worktree, "amadeus"));
    mkdirSync(child, { recursive: true });
    writeFileSync(join(worktree, ".claude", "hooks", "amadeus-dispatch.ts"), "// fixture\n");
    writeCompleteHookTree(main);
    writeCompleteHookTree(worktree);
    writeHook(main, "stop", 'process.stdout.write("MAIN\\n");\n');
    writeHook(worktree, "stop", 'process.stdout.write("WORKTREE\\n");\n');

    const result = runDispatcher(main, "stop", {
      cwd: child,
      input: JSON.stringify({ cwd: child }),
    });

    expect(result.exitCode).toBe(0);
    expect(text(result.stdout)).toBe("MAIN\n");
    expect(text(result.stderr)).toBe("");
  });

  test("a payload cwd without the Amadeus marker falls back to CLAUDE_PROJECT_DIR", () => {
    const main = temporaryProject();
    const unmarked = temporaryProject();
    writeFileSync(join(unmarked, ".claude", "hooks", "amadeus-dispatch.ts"), "// fixture\n");
    writeCompleteHookTree(main);
    writeCompleteHookTree(unmarked);
    writeHook(main, "stop", 'process.stdout.write("MAIN\\n");\n');
    writeHook(unmarked, "stop", 'process.stdout.write("UNMARKED\\n");\n');

    const result = runDispatcher(main, "stop", {
      cwd: unmarked,
      input: JSON.stringify({ cwd: unmarked }),
    });

    expect(result.exitCode).toBe(0);
    expect(text(result.stdout)).toBe("MAIN\n");
    expect(text(result.stderr)).toBe("");
  });

  test("a dispatcher-named directory is not accepted as a payload project marker", () => {
    const main = temporaryProject();
    const malformed = temporaryProject();
    mkdirSync(join(malformed, "amadeus"));
    mkdirSync(join(malformed, ".claude", "hooks", "amadeus-dispatch.ts"));
    writeCompleteHookTree(main);
    writeCompleteHookTree(malformed);
    writeHook(main, "stop", 'process.stdout.write("MAIN\\n");\n');
    writeHook(malformed, "stop", 'process.stdout.write("MALFORMED\\n");\n');

    const result = runDispatcher(main, "stop", {
      cwd: malformed,
      input: JSON.stringify({ cwd: malformed }),
    });

    expect(result.exitCode).toBe(0);
    expect(text(result.stdout)).toBe("MAIN\n");
    expect(text(result.stderr)).toBe("");
  });

  test("a fresh marked worktree does not fall through to built hooks in the parent", () => {
    const main = temporaryProject();
    const worktree = temporaryProject();
    mkdirSync(join(worktree, "amadeus"));
    writeFileSync(join(worktree, ".claude", "hooks", "amadeus-dispatch.ts"), "// fixture\n");
    writeCompleteHookTree(main);
    writeHook(main, "stop", 'process.stdout.write("MAIN\\n");\n');

    const result = runDispatcher(main, "stop", {
      cwd: worktree,
      input: JSON.stringify({ cwd: worktree }),
    });

    expect(result.exitCode).toBe(0);
    expect(text(result.stdout)).toBe("");
    expect(text(result.stderr)).toBe(
      "amadeus-dispatch: hooks are not built yet (fresh clone?) — run `bun run build` to generate them\n",
    );
  });

  test("a large payload does not override a hook that exits without reading stdin", () => {
    const root = temporaryProject();
    writeCompleteHookTree(root);
    writeHook(root, "stop", "process.exit(23);\n");

    const result = runDispatcher(root, "stop", { input: "x".repeat(1024 * 1024) });

    expect(result.exitCode).toBe(23);
    expect(text(result.stdout)).toBe("");
    expect(text(result.stderr)).toBe("");
  });

  test("a generated hook symlink cannot escape the configured project root", () => {
    const root = temporaryProject();
    writeCompleteHookTree(root);
    const outsideRoot = temporaryProject();
    const outsideHook = join(outsideRoot, "outside.ts");
    writeFileSync(outsideHook, 'process.stderr.write("SHOULD_NOT_RUN\\n");\n');
    rmSync(hookPath(root, "stop"));
    symlinkSync(outsideHook, hookPath(root, "stop"));

    const result = runDispatcher(root, "stop");
    expect(result.exitCode).toBe(1);
    expect(text(result.stderr)).toContain('hook path escapes project root for slug "stop"');
    expect(text(result.stderr)).not.toContain("SHOULD_NOT_RUN");
  });

  test("SIGTERM received by the dispatcher is forwarded to the child and remains a signal exit", async () => {
    const root = temporaryProject();
    writeCompleteHookTree(root);
    const marker = join(root, "signal.txt");
    writeHook(
      root,
      "stop",
      `import { writeFileSync } from "node:fs";
process.on("SIGTERM", () => { writeFileSync(${JSON.stringify(marker)}, "SIGTERM"); process.exit(0); });
process.stdout.write("READY\\n");
setInterval(() => {}, 1000);
`,
    );
    const dispatcher = spawn(process.execPath, [DISPATCHER_SOURCE, "stop"], {
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    dispatcher.stdout.setEncoding("utf8");
    dispatcher.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    while (!stdout.includes("READY\n")) {
      await new Promise((resolve) => setTimeout(resolve, scaleTestTime(10)));
    }

    dispatcher.kill("SIGTERM");
    const [exitCode, signal] = (await once(dispatcher, "exit")) as [
      number | null,
      NodeJS.Signals | null,
    ];
    expect(exitCode).toBeNull();
    expect(signal).toBe("SIGTERM");
    expect(readFileSync(marker, "utf8")).toBe("SIGTERM");
  }, scaleTestTime(5_000));

  test("import.meta.dir fallback resolves a copied project while execution cwd is elsewhere", () => {
    const root = temporaryProject();
    writeCompleteHookTree(root);
    const copiedDispatcher = hookPath(root, "dispatch");
    mkdirSync(dirname(copiedDispatcher), { recursive: true });
    writeFileSync(copiedDispatcher, readFileSync(ROOT_DISPATCHER));
    const outsideCwd = temporaryProject();
    const result = runDispatcher(root, "stop", {
      cwd: outsideCwd,
      dispatcher: copiedDispatcher,
      withProjectDir: false,
    });

    expect(result.exitCode).toBe(0);
    expect(text(result.stderr)).toBe("");
  });
});
