import { resolve } from "node:path";

export interface CoverageSourcePathContext {
  repoRoot: string;
  tempRoots: readonly string[];
}

const PACKAGE_HARNESS_DIRS = {
  claude: ".claude",
  codex: ".codex",
  kiro: ".kiro",
  "kiro-ide": ".kiro",
  cursor: ".cursor",
  opencode: ".opencode",
} as const;

function portablePath(path: string): string {
  return path.replace(/\\/g, "/");
}

// Collapse `.` / `..` without host path.resolve so Windows-style absolute
// paths stay lexical when this file is tested on POSIX.
function collapseDotSegments(path: string): string {
  const portable = portablePath(path);
  const winAbs = portable.match(/^([A-Za-z]:)(\/.*)$/);
  const posixAbs = portable.startsWith("/");
  const prefix = winAbs ? winAbs[1] : posixAbs ? "" : null;
  const body = winAbs ? winAbs[2] : portable;
  const out: string[] = [];
  for (const part of body.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length > 0) out.pop();
      continue;
    }
    out.push(part);
  }
  if (prefix === null) return out.join("/");
  return `${prefix}/${out.join("/")}`;
}

function absolutePath(path: string, repoRoot: string): string {
  const portable = portablePath(path);
  if (portable.startsWith("/") || /^[A-Za-z]:\//.test(portable)) {
    return collapseDotSegments(portable);
  }
  // Relative `..` must go through resolve() so a path that climbs out of the
  // repo (bun's `../../../../private/var/folders/...` SF records) still lands
  // on the real temp root and can match a known mapping.
  return collapseDotSegments(portablePath(resolve(repoRoot, portable)));
}

function pathUnderRoot(path: string, root: string, repoRoot: string): string | null {
  const absolute = absolutePath(path, repoRoot);
  const absoluteRoot = absolutePath(root, repoRoot).replace(/\/+$/, "") || "/";
  if (absoluteRoot === "/") return absolute.slice(1);
  const prefix = `${absoluteRoot}/`;
  return absolute.startsWith(prefix) ? absolute.slice(prefix.length) : null;
}

export function normalizeCoverageSourcePath(
  path: string,
  context: CoverageSourcePathContext,
): string {
  const normalizedPath = path.replace(/\\/g, "/");
  const sourceInRepo = pathUnderRoot(normalizedPath, context.repoRoot, context.repoRoot) !== null;
  if (!sourceInRepo) {
    for (const tempRoot of context.tempRoots) {
      const relativeToTemp = pathUnderRoot(normalizedPath, tempRoot, context.repoRoot);
      if (relativeToTemp === null) continue;
      const packagedHarness = relativeToTemp.match(
        /^amadeus-(?:pkg|candidate)-(kiro-ide|claude|codex|kiro|cursor|opencode)-[A-Za-z0-9]+\/(\.claude|\.codex|\.kiro|\.cursor|\.opencode)\/(.+)$/,
      );
      if (!packagedHarness) continue;
      const [, harness, harnessDir, source] = packagedHarness;
      if (PACKAGE_HARNESS_DIRS[harness as keyof typeof PACKAGE_HARNESS_DIRS] !== harnessDir) continue;
      return `packages/framework/core/${source}`;
    }
  }
  const generatedHarnessPrefixes = [
    ["dist/claude/.claude/", "packages/framework/core/"],
    ["dist/codex/.codex/", "packages/framework/core/"],
    ["dist/kiro/.kiro/", "packages/framework/core/"],
    ["dist/kiro-ide/.kiro/", "packages/framework/core/"],
    ["dist/cursor/.cursor/", "packages/framework/core/"],
    ["dist/opencode/.opencode/", "packages/framework/core/"],
    [".claude/", "packages/framework/core/"],
    [".codex/", "packages/framework/core/"],
    [".cursor/", "packages/framework/core/"],
    [".opencode/", "packages/framework/core/"],
  ] as const;
  for (const [from, to] of generatedHarnessPrefixes) {
    if (normalizedPath.startsWith(from)) {
      return `${to}${normalizedPath.slice(from.length)}`;
    }
  }
  return normalizedPath;
}

export function isCoverageSourceInsideRepo(
  path: string,
  context: CoverageSourcePathContext,
): boolean {
  return pathUnderRoot(path.replace(/\\/g, "/"), context.repoRoot, context.repoRoot) !== null;
}

// Drop SF records that remain outside the repo after normalizeCoverageSourcePath.
// Callers must normalize first so known mappings (amadeus-pkg-*, dist/<harness>
// prefixes) rewrite to in-repo paths and survive. Unmapped temp hosts then
// stay absolute-outside and are excluded with a loud warning (#2315).
export function excludeForeignLcovRecords(
  lcov: string,
  context: CoverageSourcePathContext,
): { lcov: string; excluded: string[] } {
  const excluded: string[] = [];
  const kept: string[] = [];
  const trimmed = lcov.replace(/\r\n/g, "\n").trim();
  if (trimmed.length === 0) return { lcov: "", excluded };

  for (const raw of trimmed.split(/\nend_of_record\b/)) {
    const record = raw.trim();
    if (record.length === 0) continue;
    const sfLine = record.split("\n").find((line) => line.startsWith("SF:"));
    if (sfLine === undefined) {
      kept.push(record);
      continue;
    }
    const source = sfLine.slice(3);
    if (isCoverageSourceInsideRepo(source, context)) {
      kept.push(record);
    } else {
      excluded.push(source);
    }
  }

  if (kept.length === 0) return { lcov: "", excluded };
  return { lcov: `${kept.join("\nend_of_record\n")}\nend_of_record`, excluded };
}

function escapeCoveragePathForWarning(path: string): string {
  return JSON.stringify(path);
}

export function formatForeignCoverageExclusionWarning(excluded: readonly string[]): string | null {
  if (excluded.length === 0) return null;
  const listed = excluded.map((path) => `  ${escapeCoveragePathForWarning(path)}`).join("\n");
  return `WARNING: excluded ${excluded.length} out-of-repo coverage source(s) from project totals (outside repo root and not a known mapping):\n${listed}\n`;
}
