// size: medium
// covers: hook:amadeus-dispatch, FR-3.2, BR-U4-1..7, ADR-A5

import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

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

const KNOWN_SLUGS = [
  "mint-presence",
  "session-start",
  "session-end",
  "audit-logger",
  "sensor-fire",
  "sync-statusline",
  "runtime-compile",
  "validate-state",
  "log-subagent",
  "stop",
] as const;

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

function writeCompleteHookTree(root: string): void {
  for (const slug of KNOWN_SLUGS) writeHook(root, slug);
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
  test("settings route exactly 11 hook references through the fixed 10-slug table", () => {
    const commands = SETTINGS_FILES.flatMap((path) =>
      collectCommands(JSON.parse(readFileSync(path, "utf8"))),
    ).filter((command) => command.includes("/.claude/hooks/"));

    expect(commands).toHaveLength(11);
    expect(commands.every((command) => command.includes("amadeus-dispatch.ts"))).toBe(true);
    expect(commands.filter((command) => command.endsWith(" mint-presence"))).toHaveLength(2);
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
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    dispatcher.kill("SIGTERM");
    const [exitCode, signal] = (await once(dispatcher, "exit")) as [
      number | null,
      NodeJS.Signals | null,
    ];
    expect(exitCode).toBeNull();
    expect(signal).toBe("SIGTERM");
    expect(readFileSync(marker, "utf8")).toBe("SIGTERM");
  }, 5_000);

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
