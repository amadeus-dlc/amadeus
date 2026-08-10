import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, win32 } from "node:path";
import { fileURLToPath } from "node:url";

export type HarnessType =
  | "claude-code"
  | "codex"
  | "cursor"
  | "opencode"
  | "kiro"
  | "kimi"
  | "pi"
  | "unknown"
  | "manual";

export const HARNESS_DIR_TO_TYPE = {
  ".claude": "claude-code",
  ".codex": "codex",
  ".cursor": "cursor",
  ".opencode": "opencode",
  ".kiro": "kiro",
  ".kimi-code": "kimi",
  ".pi": "pi",
} as const satisfies Readonly<
  Record<string, Exclude<HarnessType, "unknown" | "manual">>
>;

export type SupportedHarnessDir = keyof typeof HARNESS_DIR_TO_TYPE;

const HARNESS_TYPE_VALUES: ReadonlySet<string> = new Set([
  ...Object.values(HARNESS_DIR_TO_TYPE),
  "unknown",
  "manual",
]);

// Probe order is intentionally separate from the canonical mapping: it defines
// which marker wins when a development checkout contains multiple harnesses.
export const KNOWN_HARNESS_DIRS = [
  ".claude",
  ".kiro",
  ".codex",
  ".opencode",
  ".cursor",
  ".kimi-code",
  ".pi",
] as const;

type HarnessDirSource = "env" | "script-path" | "cwd-probe" | "fallback";

interface HarnessDirResolution {
  readonly dir: string;
  readonly source: HarnessDirSource;
}

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");
const HARNESS_TYPE_BY_DIR: Readonly<
  Record<string, Exclude<HarnessType, "unknown" | "manual">>
> = HARNESS_DIR_TO_TYPE;
const KNOWN_RULES_SUBDIR: Readonly<Record<string, string>> = {
  ".claude": "rules",
  ".kiro": "steering",
  ".codex": "amadeus-rules",
  ".kimi-code": "rules",
  ".pi": "rules",
};

// The rules subdir a GIVEN harness dir renames `rules/` to — the same mapping
// rulesSubdir() applies to the ambient harness, but for an explicitly named one.
// A cross-harness prose copy (the plugin staging seed) needs the target's rename,
// not the running process's (#2790). Unknown dirs keep the neutral `rules`.
export function rulesSubdirFor(dir: string): string {
  return KNOWN_RULES_SUBDIR[dir] ?? "rules";
}

export function isHarnessType(value: string): value is HarnessType {
  return HARNESS_TYPE_VALUES.has(value);
}

export function isHarnessDirName(name: string): boolean {
  return /^\.[a-z0-9][a-z0-9._-]*$/i.test(name);
}

function resolution(
  dir: string,
  source: HarnessDirSource,
): HarnessDirResolution {
  return Object.freeze({ dir, source });
}

function deriveNonEnvHarnessDir(): HarnessDirResolution {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  if (basename(scriptDir) === "tools") {
    const candidate = basename(dirname(scriptDir));
    if (isHarnessDirName(candidate)) {
      return resolution(candidate, "script-path");
    }
  }

  const cwd = process.cwd();
  for (const candidate of KNOWN_HARNESS_DIRS) {
    if (existsSync(join(cwd, candidate))) {
      return resolution(candidate, "cwd-probe");
    }
  }
  return resolution(".claude", "fallback");
}

let cachedNonEnvHarnessDir: HarnessDirResolution | null = null;

function resolveHarnessDir(): HarnessDirResolution {
  const envHarnessDir = process.env.AMADEUS_HARNESS_DIR;
  if (envHarnessDir) return resolution(envHarnessDir, "env");
  cachedNonEnvHarnessDir ??= deriveNonEnvHarnessDir();
  return cachedNonEnvHarnessDir;
}

export function harnessDir(): string {
  return resolveHarnessDir().dir;
}

export function detectHarnessType(): HarnessType {
  const explicitType = process.env.AMADEUS_HARNESS_TYPE;
  if (explicitType !== undefined) {
    return isHarnessType(explicitType) ? explicitType : "unknown";
  }
  if (process.env.CLAUDECODE === "1") return "claude-code";

  const detected = resolveHarnessDir();
  if (detected.source === "fallback") return "unknown";
  return HARNESS_TYPE_BY_DIR[detected.dir] ?? "unknown";
}

function shippedRulesSubdir(): string | null {
  try {
    const parsed = JSON.parse(
      readFileSync(join(DATA_DIR, "harness.json"), "utf-8"),
    ) as { rulesSubdir?: unknown };
    return typeof parsed.rulesSubdir === "string" &&
        parsed.rulesSubdir.length > 0
      ? parsed.rulesSubdir
      : null;
  } catch {
    return null;
  }
}

export function normalizeHarnessPackageName(name: unknown): string | null {
  return typeof name === "string" && name.length > 0 ? name : null;
}

export function harnessPackageName(): string | null {
  try {
    const parsed = JSON.parse(
      readFileSync(join(DATA_DIR, "harness.json"), "utf-8"),
    ) as { name?: unknown };
    return normalizeHarnessPackageName(parsed.name);
  } catch {
    return null;
  }
}

export type HarnessStageEntry =
  | { kind: "runner"; root: string }
  | { kind: "command"; path: string };

function validRelativeProjectPath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 &&
    !value.startsWith("/") && !win32.isAbsolute(value) &&
    !value.split(/[\\/]/u).includes("..");
}

/** Read the packaged native entry surface for composed stages. */
export function harnessStageEntry(dataDir: string = DATA_DIR): HarnessStageEntry | null {
  try {
    const parsed = JSON.parse(
      readFileSync(join(dataDir, "harness.json"), "utf-8"),
    ) as { stageEntry?: { kind?: unknown; root?: unknown; path?: unknown } };
    const entry = parsed.stageEntry;
    if (entry?.kind === "runner" && validRelativeProjectPath(entry.root)) {
      return { kind: "runner", root: entry.root };
    }
    if (entry?.kind === "command" && validRelativeProjectPath(entry.path)) {
      return { kind: "command", path: entry.path };
    }
    return null;
  } catch {
    return null;
  }
}

export function rulesSubdir(): string {
  if (process.env.AMADEUS_RULES_SUBDIR) return process.env.AMADEUS_RULES_SUBDIR;
  if (process.env.AMADEUS_HARNESS_DIR) {
    return KNOWN_RULES_SUBDIR[process.env.AMADEUS_HARNESS_DIR] ?? "rules";
  }
  return shippedRulesSubdir() ?? KNOWN_RULES_SUBDIR[harnessDir()] ?? "rules";
}
