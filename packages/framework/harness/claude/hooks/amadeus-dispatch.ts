import { existsSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";

// Exported as the single source of the slug table: tests derive their slug set
// and their generated hook trees from this map instead of restating it, so a new
// slot cannot drift from the fixtures that exercise it.
export const HOOK_PATHS = {
  "mint-presence": ".claude/hooks/amadeus-mint-presence.ts",
  "session-start": ".claude/hooks/amadeus-session-start.ts",
  "session-end": ".claude/hooks/amadeus-session-end.ts",
  "audit-logger": ".claude/hooks/amadeus-audit-logger.ts",
  "sensor-fire": ".claude/hooks/amadeus-sensor-fire.ts",
  "sync-statusline": ".claude/hooks/amadeus-sync-statusline.ts",
  "runtime-compile": ".claude/hooks/amadeus-runtime-compile.ts",
  "validate-state": ".claude/hooks/amadeus-validate-state.ts",
  "log-subagent": ".claude/hooks/amadeus-log-subagent.ts",
  "log-subagent-start": ".claude/hooks/amadeus-log-subagent-start.ts",
  "plugin-compose": ".claude/hooks/amadeus-plugin-compose.ts",
  "subagent-model-guard": ".claude/hooks/amadeus-subagent-model-guard.ts",
  stop: ".claude/hooks/amadeus-stop.ts",
} as const;

type HookSlug = keyof typeof HOOK_PATHS;
type ForwardedSignal = "SIGINT" | "SIGHUP" | "SIGTERM";

const KNOWN_SLUGS = Object.keys(HOOK_PATHS) as HookSlug[];
const NOT_BUILT_MESSAGE =
  "amadeus-dispatch: hooks are not built yet (fresh clone?) — run `bun run build` to generate them";

function parseHookSlug(raw: string | undefined): HookSlug {
  if (raw !== undefined && Object.hasOwn(HOOK_PATHS, raw)) return raw as HookSlug;
  throw new Error(`unknown hook slug "${raw ?? ""}" — known: ${KNOWN_SLUGS.join(", ")}`);
}

function findRepositoryRoot(moduleDir: string): string {
  if (basename(dirname(moduleDir)) === ".claude") return dirname(dirname(moduleDir));

  let candidate = moduleDir;
  while (dirname(candidate) !== candidate) {
    if (existsSync(join(candidate, "package.json"))) return candidate;
    candidate = dirname(candidate);
  }
  throw new Error(`cannot resolve repository root from dispatcher path ${moduleDir}`);
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

// Claude pins CLAUDE_PROJECT_DIR to the launch checkout when EnterWorktree
// moves the session cwd. The payload cwd is the only current-worktree signal
// available before a generated core hook starts, so resolve it in this
// bootstrap dispatcher and replay the same payload to the selected hook.
function findPayloadProjectRoot(payloadCwd: string | undefined): string | undefined {
  if (payloadCwd === undefined || !isAbsolute(payloadCwd)) return undefined;

  let candidate: string;
  try {
    candidate = realpathSync(payloadCwd);
  } catch {
    return undefined;
  }
  if (
    isDirectory(join(candidate, "amadeus")) &&
    isFile(join(candidate, ".claude", "hooks", "amadeus-dispatch.ts"))
  ) {
    return candidate;
  }
  return undefined;
}

function payloadCwd(input: string): string | undefined {
  try {
    const payload = JSON.parse(input) as { cwd?: unknown };
    return typeof payload.cwd === "string" ? payload.cwd : undefined;
  } catch {
    return undefined;
  }
}

function resolveProjectRoot(
  moduleDir: string,
  configuredRoot: string | undefined,
  input: string,
): string {
  const payloadRoot = findPayloadProjectRoot(payloadCwd(input));
  if (payloadRoot !== undefined) return payloadRoot;

  if (configuredRoot !== undefined && configuredRoot.length > 0) {
    if (!isAbsolute(configuredRoot)) {
      throw new Error("CLAUDE_PROJECT_DIR must be an absolute path");
    }
    return realpathSync(configuredRoot);
  }
  return realpathSync(findRepositoryRoot(moduleDir));
}

function ensureCompleteHookTree(projectRoot: string): "not-built" | "complete" {
  const missing = KNOWN_SLUGS.filter((slug) => !existsSync(join(projectRoot, HOOK_PATHS[slug])));
  if (missing.length === KNOWN_SLUGS.length) return "not-built";
  if (missing.length > 0) {
    throw new Error(`hook tree is incomplete — missing: ${missing.join(", ")}; run \`bun run build\``);
  }
  return "complete";
}

function resolveHookPath(projectRoot: string, slug: HookSlug): string {
  const hookPath = realpathSync(join(projectRoot, HOOK_PATHS[slug]));
  const relativePath = relative(projectRoot, hookPath);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`hook path escapes project root for slug "${slug}"`);
  }
  return hookPath;
}

function isBrokenPipe(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EPIPE"
  );
}

interface HookInputSink {
  write(input: string): unknown;
  end(): unknown;
}

async function writeHookInput(sink: HookInputSink, input: string): Promise<void> {
  try {
    sink.write(input);
    await sink.end();
  } catch (error) {
    if (isBrokenPipe(error)) return;
    throw error;
  }
}

async function forwardToHook(hookPath: string, args: string[], input: string): Promise<number> {
  const child = Bun.spawn({
    cmd: [process.execPath, hookPath, ...args],
    env: process.env,
    stdin: "pipe",
    stdout: "inherit",
    stderr: "inherit",
  });
  let forwardedSignal: ForwardedSignal | undefined;
  const handlers = new Map<ForwardedSignal, () => void>();

  for (const signal of ["SIGINT", "SIGHUP", "SIGTERM"] as const) {
    const handler = () => {
      forwardedSignal = signal;
      child.kill(signal);
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }

  let exitCode: number;
  try {
    await writeHookInput(child.stdin, input);
    exitCode = await child.exited;
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
  if (forwardedSignal !== undefined) process.kill(process.pid, forwardedSignal);
  return exitCode;
}

// Bun coverage does not instrument spawned subprocesses. Keep the dispatcher
// integration tests subprocess-based for fidelity, and expose the same seams so
// the coverage run can also execute the routing and pipe branches in-process.
export const DISPATCH_TEST_SEAMS = {
  findPayloadProjectRoot,
  payloadCwd,
  resolveProjectRoot,
  isBrokenPipe,
  writeHookInput,
  forwardToHook,
};

async function readHookInput(stdinInput: string | undefined): Promise<string> {
  return stdinInput ?? (process.stdin.isTTY ? "" : await Bun.stdin.text());
}

export async function main(
  argv: string[] = process.argv.slice(2),
  configuredRoot: string | undefined = process.env.CLAUDE_PROJECT_DIR,
  stdinInput: string | undefined = undefined,
): Promise<number> {
  try {
    const [rawSlug, ...hookArgs] = argv;
    const slug = parseHookSlug(rawSlug);
    // stdin cannot be inherited after inspecting the payload cwd; read it once
    // and forward the original hook payload text unchanged.
    const input = await readHookInput(stdinInput);
    const projectRoot = resolveProjectRoot(import.meta.dir, configuredRoot, input);
    if (ensureCompleteHookTree(projectRoot) === "not-built") {
      console.error(NOT_BUILT_MESSAGE);
      return 0;
    }
    return await forwardToHook(resolveHookPath(projectRoot, slug), hookArgs, input);
  } catch (error) {
    console.error(`amadeus-dispatch: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (import.meta.main) process.exit(await main());
