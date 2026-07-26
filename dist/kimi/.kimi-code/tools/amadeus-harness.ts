import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type HarnessType =
  | "claude-code"
  | "codex"
  | "cursor"
  | "opencode"
  | "kiro"
  | "kimi"
  | "unknown"
  | "manual";

export const HARNESS_DIR_TO_TYPE = {
  ".claude": "claude-code",
  ".codex": "codex",
  ".cursor": "cursor",
  ".opencode": "opencode",
  ".kiro": "kiro",
  ".kimi-code": "kimi",
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
};

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

export function rulesSubdir(): string {
  if (process.env.AMADEUS_RULES_SUBDIR) return process.env.AMADEUS_RULES_SUBDIR;
  if (process.env.AMADEUS_HARNESS_DIR) {
    return KNOWN_RULES_SUBDIR[process.env.AMADEUS_HARNESS_DIR] ?? "rules";
  }
  return shippedRulesSubdir() ?? KNOWN_RULES_SUBDIR[harnessDir()] ?? "rules";
}
