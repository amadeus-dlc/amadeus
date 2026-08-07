import { existsSync, realpathSync } from "node:fs";
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

function resolveProjectRoot(moduleDir: string, configuredRoot: string | undefined): string {
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

async function forwardToHook(hookPath: string, args: string[]): Promise<number> {
  const child = Bun.spawn({
    cmd: [process.execPath, hookPath, ...args],
    env: process.env,
    stdin: "inherit",
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

  const exitCode = await child.exited;
  for (const [signal, handler] of handlers) process.off(signal, handler);
  if (forwardedSignal !== undefined) process.kill(process.pid, forwardedSignal);
  return exitCode;
}

export async function main(
  argv: string[] = process.argv.slice(2),
  configuredRoot: string | undefined = process.env.CLAUDE_PROJECT_DIR,
): Promise<number> {
  try {
    const [rawSlug, ...hookArgs] = argv;
    const slug = parseHookSlug(rawSlug);
    const projectRoot = resolveProjectRoot(import.meta.dir, configuredRoot);
    if (ensureCompleteHookTree(projectRoot) === "not-built") {
      console.error(NOT_BUILT_MESSAGE);
      return 0;
    }
    return await forwardToHook(resolveHookPath(projectRoot, slug), hookArgs);
  } catch (error) {
    console.error(`amadeus-dispatch: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (import.meta.main) process.exit(await main());
